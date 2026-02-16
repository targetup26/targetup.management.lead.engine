/**
 * Lead Engine Configuration Module
 * Centralized configuration with environment variable validation
 */

const requiredEnv = [
    'INTERNAL_TOKEN',
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'REDIS_HOST',
    'APIFY_API_TOKEN'
];

// Validate critical environment variables
const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length > 0 && process.env.NODE_ENV === 'production') {
    console.error('FATAL ERROR: Missing critical environment variables:');
    missingEnv.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease check your .env file or environment settings.');
    process.exit(1);
}

const config = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 4001,
    internalToken: process.env.INTERNAL_TOKEN || 'dev-internal-token',

    db: {
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        name: process.env.DB_NAME || 'team_attendance',
        dialect: 'mysql'
    },

    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined
    },

    apify: {
        token: process.env.APIFY_API_TOKEN,
        actorId: process.env.APIFY_ACTOR_ID || 'compass/crawler-google-places',
        timeout: parseInt(process.env.APIFY_TIMEOUT) || 300000 // 5 minutes
    },

    queue: {
        concurrency: parseInt(process.env.WORKER_CONCURRENCY) || 3,
        maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
        backoffDelay: parseInt(process.env.BACKOFF_DELAY) || 5000,
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 10,
        rateLimitDuration: parseInt(process.env.RATE_LIMIT_DURATION) || 60000
    },

    logging: {
        level: process.env.LOG_LEVEL || 'info',
        dir: process.env.LOG_DIR || './logs'
    }
};

module.exports = config;
