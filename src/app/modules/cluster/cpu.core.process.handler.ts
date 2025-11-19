import { logger } from '../../../shared/logger';
import { gracefulShutdown } from './cpu.shutdown';
import colors from 'colors';
import cluster from 'cluster';

export async function setupProcessHandlers() {
    // CRITICAL: Only setup in worker processes
    if (cluster.isPrimary) {
        logger.warn('⚠️ Process handlers should not be set up in master process');
        return;
    }

    const processId = process.pid;

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
        logger.error(colors.bgRed.white(`❌ Worker ${processId} UNCAUGHT EXCEPTION:`), error);
        await gracefulShutdown('uncaughtException');
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
        logger.error(colors.bgRed.white(`❌ Worker ${processId} UNHANDLED REJECTION:`));
        logger.error('Rejection at:', promise, 'reason:', reason);
        gracefulShutdown('unhandledRejection');
    });

    // Signal handlers for graceful shutdown
    process.on('SIGINT', async () => {
        logger.info(colors.bgYellow.black(`⚠️ Worker ${processId} SIGINT signal received. Graceful shutdown initiated.`));
        await gracefulShutdown('SIGINT');
    });

    process.on('SIGTERM', async () => {
        logger.info(colors.bgYellow.black(`⚠️ Worker ${processId} SIGTERM signal received. Graceful shutdown initiated.`));
        await gracefulShutdown('SIGTERM');
    });

    process.on('SIGUSR2', async () => {
        logger.info(colors.bgYellow.black(`⚠️ Worker ${processId} SIGUSR2 signal received. Graceful shutdown initiated.`));
        await gracefulShutdown('SIGUSR2');
    });

    // Handle warnings
    process.on('warning', (warning) => {
        logger.warn(colors.yellow(`⚠️ Worker ${processId} Warning:`), warning.name, warning.message);
    });

    logger.info(colors.green(`✅ Worker ${processId} Process handlers registered successfully`));
}
