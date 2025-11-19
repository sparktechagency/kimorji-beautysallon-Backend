import { logger, errorLogger } from '../shared/logger';
import colors from 'colors';
import config from '../config';

interface AlertConfig {
    slack?: {
        webhookUrl: string;
        enabled: boolean;
    };
    email?: {
        enabled: boolean;
        recipients: string[];
        smtpConfig: any;
    };
    discord?: {
        webhookUrl: string;
        enabled: boolean;
    };
}

interface Alert {
    level: 'INFO' | 'WARNING' | 'CRITICAL';
    type: string;
    message: string;
    timestamp: string;
    details?: any;
}

class AlertService {
    private config: AlertConfig;
    private alertHistory: Alert[] = [];
    private readonly MAX_HISTORY = 100;
    private cooldownMap: Map<string, number> = new Map();
    private readonly COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 minutes

    constructor() {
        this.config = {
            slack: {
                webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
                enabled: !!process.env.SLACK_WEBHOOK_URL && process.env.NODE_ENV === 'production'
            },
            email: {
                enabled: false, // Configure as needed
                recipients: process.env.ALERT_EMAILS?.split(',') || [],
                smtpConfig: {} // Configure SMTP
            },
            discord: {
                webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
                enabled: !!process.env.DISCORD_WEBHOOK_URL && process.env.NODE_ENV === 'production'
            }
        };

        if (config.node_env === 'production') {
            logger.info(colors.green('🔔 Alert Service initialized'));
            if (this.config.slack?.enabled) {
                logger.info(colors.green('   ✅ Slack alerts enabled'));
            }
            if (this.config.discord?.enabled) {
                logger.info(colors.green('   ✅ Discord alerts enabled'));
            }
        }
    }

    // Main alert method
    async sendAlert(level: Alert['level'], type: string, message: string, details?: any): Promise<void> {
        // Skip in development
        if (config.node_env !== 'production') {
            return;
        }

        // Check cooldown to prevent alert spam
        const alertKey = `${level}-${type}`;
        if (this.isInCooldown(alertKey)) {
            logger.warn(colors.yellow(`⏸️  Alert cooldown active for: ${alertKey}`));
            return;
        }

        const alert: Alert = {
            level,
            type,
            message,
            timestamp: new Date().toISOString(),
            details
        };

        // Save to history
        this.saveToHistory(alert);

        // Set cooldown
        this.setCooldown(alertKey);

        // Send to configured channels
        try {
            const promises = [];

            if (this.config.slack?.enabled) {
                promises.push(this.sendToSlack(alert));
            }

            if (this.config.discord?.enabled) {
                promises.push(this.sendToDiscord(alert));
            }

            if (this.config.email?.enabled && level === 'CRITICAL') {
                promises.push(this.sendEmail(alert));
            }

            await Promise.allSettled(promises);

        } catch (error) {
            errorLogger.error('Failed to send alert:', error);
        }
    }

    // Slack integration
    private async sendToSlack(alert: Alert): Promise<void> {
        if (!this.config.slack?.webhookUrl) return;

        const color = this.getAlertColor(alert.level);
        const emoji = this.getAlertEmoji(alert.level);

        const payload = {
            username: 'Kimojr Beauty Monitor',
            icon_emoji: ':robot_face:',
            attachments: [
                {
                    color,
                    title: `${emoji} ${alert.level}: ${alert.type}`,
                    text: alert.message,
                    fields: [
                        {
                            title: 'Environment',
                            value: config.node_env,
                            short: true
                        },
                        {
                            title: 'Timestamp',
                            value: new Date(alert.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
                            short: true
                        }
                    ],
                    footer: 'Kimojr Beauty Monitoring System',
                    ts: Math.floor(Date.now() / 1000)
                }
            ]
        };

        // Add details if available
        if (alert.details) {
            payload.attachments[0].fields.push({
                title: 'Details',
                value: JSON.stringify(alert.details, null, 2),
                short: false
            } as any);
        }

        try {
            const response = await fetch(this.config.slack.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Slack API error: ${response.status}`);
            }

            logger.info(colors.green('✅ Alert sent to Slack'));
        } catch (error) {
            errorLogger.error('Failed to send Slack alert:', error);
        }
    }

    // Discord integration
    private async sendToDiscord(alert: Alert): Promise<void> {
        if (!this.config.discord?.webhookUrl) return;

        const color = this.getAlertColorHex(alert.level);
        const emoji = this.getAlertEmoji(alert.level);

        const payload = {
            username: 'Kimojr Beauty Monitor',
            embeds: [
                {
                    title: `${emoji} ${alert.level}: ${alert.type}`,
                    description: alert.message,
                    color: parseInt(color.replace('#', ''), 16),
                    fields: [
                        {
                            name: 'Environment',
                            value: config.node_env,
                            inline: true
                        },
                        {
                            name: 'Timestamp',
                            value: new Date(alert.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
                            inline: true
                        }
                    ],
                    footer: {
                        text: 'Kimojr Beauty Monitoring System'
                    },
                    timestamp: alert.timestamp
                }
            ]
        };

        // Add details if available
        if (alert.details) {
            payload.embeds[0].fields.push({
                name: 'Details',
                value: '```json\n' + JSON.stringify(alert.details, null, 2) + '\n```',
                inline: false
            });
        }

        try {
            const response = await fetch(this.config.discord.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Discord API error: ${response.status}`);
            }

            logger.info(colors.green('✅ Alert sent to Discord'));
        } catch (error) {
            errorLogger.error('Failed to send Discord alert:', error);
        }
    }

    // Email integration (basic implementation)
    private async sendEmail(alert: Alert): Promise<void> {
        // Implement using nodemailer or your preferred email service
        // This is a placeholder
        logger.info(colors.yellow('📧 Email alert would be sent (not implemented)'));
    }

    // Utility methods
    private isInCooldown(key: string): boolean {
        const lastSent = this.cooldownMap.get(key);
        if (!lastSent) return false;
        return Date.now() - lastSent < this.COOLDOWN_PERIOD;
    }

    private setCooldown(key: string): void {
        this.cooldownMap.set(key, Date.now());
    }

    private saveToHistory(alert: Alert): void {
        this.alertHistory.unshift(alert);
        if (this.alertHistory.length > this.MAX_HISTORY) {
            this.alertHistory.pop();
        }
    }

    private getAlertColor(level: Alert['level']): string {
        switch (level) {
            case 'CRITICAL': return 'danger';
            case 'WARNING': return 'warning';
            case 'INFO': return 'good';
            default: return '#808080';
        }
    }

    private getAlertColorHex(level: Alert['level']): string {
        switch (level) {
            case 'CRITICAL': return '#FF0000';
            case 'WARNING': return '#FFA500';
            case 'INFO': return '#00FF00';
            default: return '#808080';
        }
    }

    private getAlertEmoji(level: Alert['level']): string {
        switch (level) {
            case 'CRITICAL': return '🚨';
            case 'WARNING': return '⚠️';
            case 'INFO': return 'ℹ️';
            default: return '📢';
        }
    }

    // Public methods
    public getAlertHistory(): Alert[] {
        return [...this.alertHistory];
    }

    public clearHistory(): void {
        this.alertHistory = [];
        logger.info(colors.blue('Alert history cleared'));
    }

    public testAlert(): void {
        this.sendAlert(
            'INFO',
            'TEST',
            'This is a test alert from Kimojr Beauty monitoring system',
            {
                message: 'If you received this, alerts are working correctly!',
                timestamp: new Date().toISOString()
            }
        );
    }
}

// Export singleton
export const alertService = new AlertService();

// Predefined alert templates
export const AlertTemplates = {
    // System alerts
    HIGH_CPU: (usage: number) => ({
        level: 'WARNING' as const,
        type: 'HIGH_CPU_USAGE',
        message: `CPU usage is at ${usage.toFixed(2)}%`,
        details: { cpuUsage: usage, threshold: 70 }
    }),

    CRITICAL_CPU: (usage: number) => ({
        level: 'CRITICAL' as const,
        type: 'CRITICAL_CPU_USAGE',
        message: `CRITICAL: CPU usage reached ${usage.toFixed(2)}%`,
        details: { cpuUsage: usage, threshold: 85 }
    }),

    HIGH_MEMORY: (usage: number) => ({
        level: 'WARNING' as const,
        type: 'HIGH_MEMORY_USAGE',
        message: `Memory usage is at ${usage.toFixed(2)}%`,
        details: { memoryUsage: usage, threshold: 75 }
    }),

    CRITICAL_MEMORY: (usage: number) => ({
        level: 'CRITICAL' as const,
        type: 'CRITICAL_MEMORY_USAGE',
        message: `CRITICAL: Memory usage reached ${usage.toFixed(2)}%`,
        details: { memoryUsage: usage, threshold: 90 }
    }),

    // Worker alerts
    WORKER_CRASHED: (pid: number, workerId: number) => ({
        level: 'CRITICAL' as const,
        type: 'WORKER_CRASHED',
        message: `Worker ${workerId} (PID: ${pid}) has crashed`,
        details: { pid, workerId }
    }),

    WORKER_UNRESPONSIVE: (pid: number, workerId: number) => ({
        level: 'WARNING' as const,
        type: 'WORKER_UNRESPONSIVE',
        message: `Worker ${workerId} (PID: ${pid}) is not responding`,
        details: { pid, workerId }
    }),

    // Application alerts
    HIGH_ERROR_RATE: (rate: number) => ({
        level: 'WARNING' as const,
        type: 'HIGH_ERROR_RATE',
        message: `Error rate is at ${rate.toFixed(2)}%`,
        details: { errorRate: rate, threshold: 5 }
    }),

    DATABASE_CONNECTION_FAILED: (error: string) => ({
        level: 'CRITICAL' as const,
        type: 'DATABASE_CONNECTION_FAILED',
        message: `Database connection failed: ${error}`,
        details: { error }
    }),

    SLOW_RESPONSE_TIME: (avgTime: number) => ({
        level: 'WARNING' as const,
        type: 'SLOW_RESPONSE_TIME',
        message: `Average response time is ${avgTime}ms`,
        details: { avgResponseTime: avgTime, threshold: 500 }
    })
};