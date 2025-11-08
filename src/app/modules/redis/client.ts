import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL ?? 'redis://redis:6379';

export const redis = createClient({
    url: redisUrl,
    socket: {
        family: 4,
        reconnectStrategy: (retries) => Math.min(retries * 200, 2000),
    },
});

redis.on('connect', () => console.log('[Redis] connecting...', redisUrl));
redis.on('ready', () => console.log('[Redis] ready'));
redis.on('end', () => console.log('[Redis] connection closed'));
redis.on('reconnecting', () => console.log('[Redis] reconnecting...'));
redis.on('error', (err) => console.error('[Redis] error:', err?.message));

export async function initRedis() {
    if (!redis.isOpen) {
        await redis.connect();
    }
    // Optional sanity check
    try {
        await redis.ping();
        console.log('[Redis] PING ok');
    } catch (e: any) {
        console.error('[Redis] PING failed:', e?.message);
    }
}


