import os from 'os';
import cluster from 'cluster';
import { logger, errorLogger } from '../shared/logger';
import colors from 'colors';

interface WorkerMetrics {
    pid: number;
    workerId: number;
    requests: number;
    errors: number;
    startTime: number;
    lastHealthCheck: number;
    memory: NodeJS.MemoryUsage;
    cpu: number;
    status: 'healthy' | 'unhealthy' | 'warning';
}

interface SystemMetrics {
    totalRequests: number;
    totalErrors: number;
    avgResponseTime: number;
    activeWorkers: number;
    cpuUsage: number;
    memoryUsage: number;
    uptime: number;
}

class MonitoringService {
    private workerMetrics: Map<number, WorkerMetrics> = new Map();
    private systemMetrics: SystemMetrics = {
        totalRequests: 0,
        totalErrors: 0,
        avgResponseTime: 0,
        activeWorkers: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        uptime: 0
    };
    private monitoringInterval: NodeJS.Timeout | null = null;
    private alertsEnabled: boolean = true;

    // Thresholds for alerts
    private readonly THRESHOLDS = {
        CPU_WARNING: 70,
        CPU_CRITICAL: 85,
        MEMORY_WARNING: 75,
        MEMORY_CRITICAL: 90,
        ERROR_RATE_WARNING: 5, // %
        ERROR_RATE_CRITICAL: 10, // %
        RESPONSE_TIME_WARNING: 500, // ms
        RESPONSE_TIME_CRITICAL: 1000, // ms
        WORKER_RESTART_THRESHOLD: 3 // restarts in 5 minutes
    };

    constructor() {
        if (cluster.isPrimary) {
            this.initializeMasterMonitoring();
        } else {
            this.initializeWorkerMonitoring();
        }
    }

    // ============= MASTER PROCESS MONITORING =============
    private initializeMasterMonitoring(): void {
        logger.info(colors.bgCyan.white('📊 Monitoring Service initialized in Master'));

        // Listen to worker messages
        cluster.on('message', (worker, message) => {
            if (message.type === 'metrics') {
                this.updateWorkerMetrics(worker.id, message.data);
            }
        });

        // Start periodic monitoring
        this.monitoringInterval = setInterval(() => {
            this.collectSystemMetrics();
            this.checkHealthAlerts();
            this.logMetrics();
        }, 30000); // Every 30 seconds

        // Log detailed report every 5 minutes
        setInterval(() => {
            this.generateDetailedReport();
        }, 300000);
    }

    private updateWorkerMetrics(workerId: number, data: Partial<WorkerMetrics>): void {
        const existing = this.workerMetrics.get(workerId);
        this.workerMetrics.set(workerId, {
            ...existing,
            ...data,
            lastHealthCheck: Date.now()
        } as WorkerMetrics);
    }

    private collectSystemMetrics(): void {
        const workers = Object.values(cluster.workers || {}).filter(w => w);

        // Calculate total requests and errors
        let totalRequests = 0;
        let totalErrors = 0;
        let totalWorkerMemory = 0;

        this.workerMetrics.forEach(metrics => {
            totalRequests += metrics.requests || 0;
            totalErrors += metrics.errors || 0;
            totalWorkerMemory += metrics.memory?.heapUsed || 0;
        });

        // Calculate system-wide metrics
        const cpus = os.cpus();
        const totalCpuTime = cpus.reduce((acc, cpu) => {
            return acc + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
        }, 0);
        const idleCpuTime = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
        const cpuUsage = 100 - (idleCpuTime / totalCpuTime * 100);

        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;

        this.systemMetrics = {
            totalRequests,
            totalErrors,
            avgResponseTime: 0, // Calculate from response time tracking
            activeWorkers: workers.length,
            cpuUsage: Math.round(cpuUsage * 100) / 100,
            memoryUsage: Math.round(memoryUsage * 100) / 100,
            uptime: process.uptime()
        };
    }

    private checkHealthAlerts(): void {
        if (!this.alertsEnabled) return;

        // Check CPU usage
        if (this.systemMetrics.cpuUsage >= this.THRESHOLDS.CPU_CRITICAL) {
            this.sendAlert('CRITICAL', 'CPU', `CPU usage at ${this.systemMetrics.cpuUsage.toFixed(2)}%`);
        } else if (this.systemMetrics.cpuUsage >= this.THRESHOLDS.CPU_WARNING) {
            this.sendAlert('WARNING', 'CPU', `CPU usage at ${this.systemMetrics.cpuUsage.toFixed(2)}%`);
        }

        // Check Memory usage
        if (this.systemMetrics.memoryUsage >= this.THRESHOLDS.MEMORY_CRITICAL) {
            this.sendAlert('CRITICAL', 'MEMORY', `Memory usage at ${this.systemMetrics.memoryUsage.toFixed(2)}%`);
        } else if (this.systemMetrics.memoryUsage >= this.THRESHOLDS.MEMORY_WARNING) {
            this.sendAlert('WARNING', 'MEMORY', `Memory usage at ${this.systemMetrics.memoryUsage.toFixed(2)}%`);
        }

        // Check Error rate
        const errorRate = this.systemMetrics.totalRequests > 0
            ? (this.systemMetrics.totalErrors / this.systemMetrics.totalRequests) * 100
            : 0;

        if (errorRate >= this.THRESHOLDS.ERROR_RATE_CRITICAL) {
            this.sendAlert('CRITICAL', 'ERROR_RATE', `Error rate at ${errorRate.toFixed(2)}%`);
        } else if (errorRate >= this.THRESHOLDS.ERROR_RATE_WARNING) {
            this.sendAlert('WARNING', 'ERROR_RATE', `Error rate at ${errorRate.toFixed(2)}%`);
        }

        // Check individual worker health
        this.workerMetrics.forEach((metrics, workerId) => {
            const timeSinceLastCheck = Date.now() - metrics.lastHealthCheck;
            if (timeSinceLastCheck > 60000) { // 1 minute
                this.sendAlert('WARNING', 'WORKER_UNRESPONSIVE', `Worker ${workerId} (PID: ${metrics.pid}) not responding`);
            }
        });
    }

    private sendAlert(level: 'WARNING' | 'CRITICAL', type: string, message: string): void {
        const alert = {
            timestamp: new Date().toISOString(),
            level,
            type,
            message,
            metrics: this.systemMetrics
        };

        if (level === 'CRITICAL') {
            errorLogger.error(colors.bgRed.white(`🚨 CRITICAL ALERT: ${type}`), message);
            // Send to external services (Slack, Email, etc.)
            this.sendToExternalService(alert);
        } else {
            logger.warn(colors.bgYellow.black(`⚠️  WARNING: ${type}`), message);
        }

        // Save to alert history for dashboard
        this.saveAlertToHistory(alert);
    }

    private sendToExternalService(alert: any): void {
        // Implement Slack webhook
        // Implement Email notification
        // Implement SMS notification
        // Example:
        /*
        fetch('YOUR_SLACK_WEBHOOK_URL', {
            method: 'POST',
            body: JSON.stringify({
                text: `🚨 ${alert.level}: ${alert.type}\n${alert.message}`
            })
        });
        */
    }

    private saveAlertToHistory(alert: any): void {
        // Save to database or file for historical tracking
        // This can be used for dashboard visualization
    }

    private logMetrics(): void {
        logger.info(colors.cyan('\n' + '='.repeat(70)));
        logger.info(colors.cyan('📊 SYSTEM METRICS'));
        logger.info(colors.cyan('='.repeat(70)));
        logger.info(colors.white(`Active Workers: ${this.systemMetrics.activeWorkers}`));
        logger.info(colors.white(`Total Requests: ${this.systemMetrics.totalRequests}`));
        logger.info(colors.white(`Total Errors: ${this.systemMetrics.totalErrors}`));
        logger.info(colors.white(`CPU Usage: ${this.systemMetrics.cpuUsage.toFixed(2)}%`));
        logger.info(colors.white(`Memory Usage: ${this.systemMetrics.memoryUsage.toFixed(2)}%`));
        logger.info(colors.white(`Uptime: ${this.formatUptime(this.systemMetrics.uptime)}`));
        logger.info(colors.cyan('='.repeat(70) + '\n'));
    }

    private generateDetailedReport(): void {
        logger.info(colors.bgBlue.white('\n' + '='.repeat(70)));
        logger.info(colors.bgBlue.white('📈 DETAILED SYSTEM REPORT'));
        logger.info(colors.bgBlue.white('='.repeat(70)));

        // System overview
        logger.info(colors.yellow('\n🖥️  SYSTEM OVERVIEW:'));
        logger.info(colors.white(`   Total Memory: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`));
        logger.info(colors.white(`   Free Memory: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`));
        logger.info(colors.white(`   CPU Cores: ${os.cpus().length}`));
        logger.info(colors.white(`   Platform: ${os.platform()} ${os.arch()}`));
        logger.info(colors.white(`   Node Version: ${process.version}`));

        // Worker details
        logger.info(colors.yellow('\n👷 WORKER METRICS:'));
        this.workerMetrics.forEach((metrics, workerId) => {
            const memoryMB = (metrics.memory?.heapUsed || 0) / 1024 / 1024;
            const uptime = (Date.now() - metrics.startTime) / 1000;

            logger.info(colors.cyan(`\n   Worker ${workerId} (PID: ${metrics.pid}):`));
            logger.info(colors.white(`      Status: ${this.getStatusEmoji(metrics.status)} ${metrics.status}`));
            logger.info(colors.white(`      Requests: ${metrics.requests}`));
            logger.info(colors.white(`      Errors: ${metrics.errors}`));
            logger.info(colors.white(`      Memory: ${memoryMB.toFixed(2)} MB`));
            logger.info(colors.white(`      Uptime: ${this.formatUptime(uptime)}`));
        });

        logger.info(colors.bgBlue.white('\n' + '='.repeat(70) + '\n'));
    }

    // ============= WORKER PROCESS MONITORING =============
    private initializeWorkerMonitoring(): void {
        let requestCount = 0;
        let errorCount = 0;
        const startTime = Date.now();

        logger.info(colors.green(`📊 Monitoring initialized in Worker ${process.pid}`));

        // Send metrics to master every 10 seconds
        setInterval(() => {
            if (process.send) {
                process.send({
                    type: 'metrics',
                    data: {
                        pid: process.pid,
                        workerId: cluster.worker?.id,
                        requests: requestCount,
                        errors: errorCount,
                        startTime,
                        memory: process.memoryUsage(),
                        cpu: process.cpuUsage().user / 1000000, // Convert to seconds
                        status: this.getWorkerStatus()
                    }
                });
            }
        }, 10000);

        // Expose methods to track requests and errors
        (global as any).monitoringService = {
            incrementRequests: () => requestCount++,
            incrementErrors: () => errorCount++,
            getMetrics: () => ({
                requests: requestCount,
                errors: errorCount,
                memory: process.memoryUsage(),
                uptime: (Date.now() - startTime) / 1000
            })
        };
    }

    private getWorkerStatus(): 'healthy' | 'unhealthy' | 'warning' {
        const memory = process.memoryUsage();
        const memoryUsagePercent = (memory.heapUsed / memory.heapTotal) * 100;

        if (memoryUsagePercent > 90) return 'unhealthy';
        if (memoryUsagePercent > 75) return 'warning';
        return 'healthy';
    }

    // ============= UTILITY METHODS =============
    private formatUptime(seconds: number): string {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

        return parts.join(' ');
    }

    private getStatusEmoji(status: string): string {
        switch (status) {
            case 'healthy': return '✅';
            case 'warning': return '⚠️';
            case 'unhealthy': return '❌';
            default: return '❓';
        }
    }

    // Public methods
    public getSystemMetrics(): SystemMetrics {
        return { ...this.systemMetrics };
    }

    public getWorkerMetrics(): Map<number, WorkerMetrics> {
        return new Map(this.workerMetrics);
    }

    public enableAlerts(): void {
        this.alertsEnabled = true;
        logger.info(colors.green('✅ Alerts enabled'));
    }

    public disableAlerts(): void {
        this.alertsEnabled = false;
        logger.info(colors.yellow('⚠️  Alerts disabled'));
    }

    public cleanup(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            logger.info(colors.blue('Monitoring service stopped'));
        }
    }
}

// Export singleton instance
export const monitoringService = new MonitoringService();