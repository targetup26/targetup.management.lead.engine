const { Queue } = require('bullmq');
const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');

// Create Redis connection for BullMQ
const connection = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
});

connection.on('connect', () => {
    logger.info('Redis connection established for queue');
});

connection.on('error', (error) => {
    logger.error('Redis connection error', { error: error.message });
});

// Create BullMQ queue
const leadQueue = new Queue('lead-extraction', {
    connection,
    defaultJobOptions: {
        attempts: config.queue.maxRetries,
        backoff: {
            type: 'exponential',
            delay: config.queue.backoffDelay
        },
        removeOnComplete: {
            age: 86400, // Keep completed jobs for 24 hours
            count: 1000 // Keep last 1000 completed jobs
        },
        removeOnFail: {
            age: 604800 // Keep failed jobs for 7 days
        }
    }
});

leadQueue.on('error', (error) => {
    logger.error('Queue error', { error: error.message });
});

logger.info('Lead extraction queue initialized', {
    concurrency: config.queue.concurrency,
    maxRetries: config.queue.maxRetries
});

module.exports = leadQueue;
