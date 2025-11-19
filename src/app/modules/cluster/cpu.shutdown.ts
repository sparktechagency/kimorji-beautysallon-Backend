import mongoose from 'mongoose';
import colors from 'colors';
import { errorLogger, logger } from '../../../shared/logger';

const SHUTDOWN_TIMEOUT_MS = 30000;

declare global {
    var isShuttingDown: boolean;
    var httpServer: import('http').Server | import('https').Server | undefined;
    var socketServer: import('socket.io').Server | undefined;
}

export async function gracefulShutdown(signal: string): Promise<void> {
    // Prevent duplicate shutdown attempts
    if (global.isShuttingDown) {
        logger.warn(colors.yellow('⚠️  Shutdown already in progress...'));
        return;
    }

    global.isShuttingDown = true;

    logger.info(colors.gray.black(`\n${'='.repeat(60)}`));
    logger.info(colors.gray.black(`  WORKER ${process.pid} - GRACEFUL SHUTDOWN (${signal})  `));
    logger.info(colors.gray.black(`${'='.repeat(60)}\n`));

    // Set a force shutdown timer (safety net)
    const forceShutdownTimer = setTimeout(() => {
        errorLogger.error(colors.bgRed.white(`\n⚠️  FORCE SHUTDOWN after ${SHUTDOWN_TIMEOUT_MS}ms\n`));
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    // Make sure timer doesn't prevent exit
    forceShutdownTimer.unref();

    try {
        const shutdownSteps = [
            {
                name: 'HTTP Server',
                action: async () => {
                    const server = global.httpServer;
                    if (server && server.listening) {
                        await new Promise<void>((resolve, reject) => {
                            const timeout = setTimeout(() => {
                                reject(new Error('HTTP server close timeout'));
                            }, 10000);

                            server.close((err) => {
                                clearTimeout(timeout);
                                if (err) reject(err);
                                else resolve();
                            });
                        });
                    }
                }
            },
            {
                name: 'Socket.IO Server',
                action: async () => {
                    const io = global.socketServer;
                    if (io) {
                        // Disconnect all clients first
                        io.disconnectSockets(true);

                        await new Promise<void>((resolve, reject) => {
                            const timeout = setTimeout(() => {
                                reject(new Error('Socket.IO close timeout'));
                            }, 10000);

                            io.close((err) => {
                                clearTimeout(timeout);
                                if (err) reject(err);
                                else resolve();
                            });
                        });
                    }
                }
            },
            {
                name: 'MongoDB Connection',
                action: async () => {
                    if (mongoose.connection.readyState !== 0) {
                        await mongoose.connection.close(false);
                    }
                }
            }
        ];

        // Execute shutdown steps sequentially
        for (const step of shutdownSteps) {
            try {
                logger.info(colors.cyan(`⏳ Closing: ${step.name}...`));
                await step.action();
                logger.info(colors.green(`✅ ${step.name} closed`));
            } catch (error) {
                errorLogger.error(colors.red(`❌ Failed to close ${step.name}:`), error);
                // Continue with other steps
            }
        }

        // Clear the force shutdown timer
        clearTimeout(forceShutdownTimer);

        logger.info(colors.bgGreen.black(`\n${'='.repeat(60)}`));
        logger.info(colors.bgGreen.black(`  ✓ WORKER ${process.pid} SHUTDOWN COMPLETE  `));
        logger.info(colors.bgGreen.black(`${'='.repeat(60)}\n`));

        process.exit(0);
    } catch (error) {
        clearTimeout(forceShutdownTimer);
        errorLogger.error(colors.bgRed.white('\n❌ CRITICAL ERROR DURING SHUTDOWN:\n'), error);
        process.exit(1);
    }
}

