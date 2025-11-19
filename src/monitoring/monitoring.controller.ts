import { Request, Response, NextFunction } from 'express';
import { logger } from '../shared/logger';
import colors from 'colors';
import cluster from 'cluster';

// Request tracking middleware
export const requestMonitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Add request ID to request object
    (req as any).requestId = requestId;

    // Track request count
    if ((global as any).monitoringService) {
        (global as any).monitoringService.incrementRequests();
    }

    // Log request details
    const logRequest = () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        const method = req.method;
        const url = req.originalUrl || req.url;
        const userAgent = req.get('user-agent') || 'unknown';
        const ip = req.ip || req.socket.remoteAddress || 'unknown';

        // Color code based on status
        let statusColor = colors.green;
        if (statusCode >= 500) {
            statusColor = colors.red;
            // Track error
            if ((global as any).monitoringService) {
                (global as any).monitoringService.incrementErrors();
            }
        } else if (statusCode >= 400) {
            statusColor = colors.yellow;
        }

        // Log format: [Worker PID] METHOD URL STATUS DURATION IP
        logger.info(
            colors.cyan(`[Worker ${process.pid}]`),
            colors.bold(method),
            url,
            statusColor(`${statusCode}`),
            colors.gray(`${duration}ms`),
            colors.gray(`IP: ${ip}`)
        );

        // Warn on slow requests (>1000ms)
        if (duration > 1000) {
            logger.warn(
                colors.bgYellow.black(`⚠️  SLOW REQUEST [${process.pid}]:`),
                `${method} ${url} took ${duration}ms`
            );
        }

        // Track response time for metrics
        if (process.send) {
            process.send({
                type: 'response_time',
                data: {
                    duration,
                    statusCode,
                    method,
                    url
                }
            });
        }
    };

    // Capture response
    res.on('finish', logRequest);
    res.on('close', () => {
        if (!res.writableEnded) {
            logRequest();
        }
    });

    next();
};

// Health check endpoint
export const healthCheckHandler = (req: Request, res: Response) => {
    const metrics = (global as any).monitoringService?.getMetrics() || {};
    const memory = process.memoryUsage();
    const uptime = process.uptime();

    const health = {
        status: 'healthy',
        worker: {
            pid: process.pid,
            id: cluster.worker?.id,
            uptime: Math.floor(uptime),
            uptimeFormatted: formatUptime(uptime)
        },
        memory: {
            heapUsed: Math.round(memory.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(memory.heapTotal / 1024 / 1024), // MB
            external: Math.round(memory.external / 1024 / 1024), // MB
            rss: Math.round(memory.rss / 1024 / 1024), // MB
            usagePercent: Math.round((memory.heapUsed / memory.heapTotal) * 100)
        },
        metrics: {
            requests: metrics.requests || 0,
            errors: metrics.errors || 0,
            errorRate: metrics.requests > 0
                ? ((metrics.errors / metrics.requests) * 100).toFixed(2) + '%'
                : '0%'
        },
        timestamp: new Date().toISOString()
    };

    // Set status based on health
    if (health.memory.usagePercent > 90) {
        health.status = 'unhealthy';
        res.status(503);
    } else if (health.memory.usagePercent > 75) {
        health.status = 'degraded';
    }

    res.json(health);
};

// Metrics endpoint (only for master or monitoring tools)
export const metricsHandler = (req: Request, res: Response) => {
    if (!cluster.isPrimary && !req.query.worker) {
        return res.status(403).json({
            error: 'Metrics endpoint only available on master process or with worker flag'
        });
    }

    const metrics = (global as any).monitoringService?.getMetrics() || {};

    res.json({
        worker: {
            pid: process.pid,
            id: cluster.worker?.id
        },
        metrics,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        timestamp: new Date().toISOString()
    });
};

// Error tracking middleware
export const errorMonitoringMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
    // Track error
    if ((global as any).monitoringService) {
        (global as any).monitoringService.incrementErrors();
    }

    // Log detailed error info
    logger.error(
        colors.bgRed.white(`❌ ERROR [Worker ${process.pid}]:`),
        '\n',
        colors.red('Message:'), err.message,
        '\n',
        colors.red('Stack:'), err.stack,
        '\n',
        colors.red('Request:'), req.method, req.originalUrl,
        '\n',
        colors.red('Body:'), JSON.stringify(req.body, null, 2)
    );

    // Send error alert for critical errors
    if (err.message.includes('CRITICAL') || err.name === 'DatabaseError') {
        if (process.send) {
            process.send({
                type: 'critical_error',
                data: {
                    message: err.message,
                    stack: err.stack,
                    url: req.originalUrl,
                    method: req.method,
                    worker: process.pid
                }
            });
        }
    }

    next(err);
};

// Utility function
function formatUptime(seconds: number): string {
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