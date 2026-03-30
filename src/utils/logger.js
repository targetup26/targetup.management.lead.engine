const winston = require('winston');
const config = require('../config');
const path = require('path');

const logFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});

const logger = winston.createLogger({
    level: config.logging.level || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'lead-engine' },
    transports: [
        new winston.transports.File({
            filename: path.join(config.logging.dir, 'error.log'),
            level: 'error'
        }),
        new winston.transports.File({
            filename: path.join(config.logging.dir, 'combined.log')
        })
    ]
});

// We ALWAYS log to the console in modern Docker environments (like Coolify)
// so that the logs can be easily viewed in the dashboard.
logger.add(new winston.transports.Console({
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        logFormat
    )
}));

module.exports = logger;
