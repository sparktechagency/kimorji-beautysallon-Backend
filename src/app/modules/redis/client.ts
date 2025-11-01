import Redis, { RedisClientOptions } from 'redis';
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisOptions: RedisClientOptions = {
    url: redisUrl,
}

const client = Redis.createClient(redisOptions);

client.on('connect', () => {
    console.log('Connected to Redis');
});

client.on('error', (err: any) => {
    console.log('Redis error:', err);
});

export default client;