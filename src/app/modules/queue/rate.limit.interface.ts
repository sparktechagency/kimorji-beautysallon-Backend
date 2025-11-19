import { JobsOptions } from 'bullmq';
import e from 'express';

interface ExtendedJobsOptions extends JobsOptions {
    rateLimiter?: {
        max: number;
        duration: number;
    };
}
export { ExtendedJobsOptions };