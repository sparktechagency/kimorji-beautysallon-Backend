import { Queue, Worker, QueueEvents, JobsOptions, Job, ConnectionOptions } from 'bullmq'
import nodemailer from 'nodemailer'

type JobData = {
    type: 'email' | 'push' | 'sms'
    email?: string
    subject?: string
    message?: string
}

const connection: ConnectionOptions = {
    url: process.env.REDIS_URL ?? 'redis://redis:6379'
}

export const notificationQueue = new Queue<JobData>('notifications', { connection })

const defaultOptions: JobsOptions = {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: false
}

export async function enqueueNotification(data: JobData) {
    await notificationQueue.add('send', data, defaultOptions)
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
})

export const notificationWorker = new Worker<JobData>(
    'notifications',
    async (job: Job<JobData>) => {
        const { type, email, subject, message } = job.data

        if (type === 'email' && email && subject && message) {
            await transporter.sendMail({
                from: process.env.SMTP_USER,
                to: email,
                subject,
                html: message
            })
            console.log('Email sent to:', email)
        }
    },
    { connection, concurrency: 100 }
)

new QueueEvents('notifications', { connection })

notificationWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed: ${err.message}`)
})

notificationWorker.on('completed', job => {
    console.log(`Job ${job.id} completed`)
})
