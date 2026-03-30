/**
 * Lead Engine Configuration Module
 * Centralized configuration with environment variable validation
 */

let dbConfig = {};

if (process.env.DATABASE_URL) {
    try {
        const dbUrl = new URL(process.env.DATABASE_URL);
        dbConfig = {
            host: dbUrl.hostname,
            user: dbUrl.username,
            password: decodeURIComponent(dbUrl.password),
            name: dbUrl.pathname.substring(1),
            dialect: 'mysql'
        };
    } catch (e) {
        console.error('Failed to parse DATABASE_URL', e);
    }
} else {
    dbConfig = {
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        name: process.env.DB_NAME || 'team_attendance',
        dialect: 'mysql'
    };
}

const requiredEnv = [
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
    internalToken: process.env.INTERNAL_TOKEN || 'targetup2025@!$$5hgrg642365423rjtgfDFGWdfiu34ui5n@$dfuh23j4t2nrkead6gfg',

    db: dbConfig,

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
