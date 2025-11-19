
import { JobsOptions } from 'bullmq';
import { ExtendedJobsOptions } from './rate.limit.interface';
const defaultOptions: ExtendedJobsOptions = {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: false,
    rateLimiter: { max: 50, duration: 1000 },
};

export { defaultOptions };