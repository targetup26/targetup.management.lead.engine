const app = require('./src/app');
const config = require('./src/config');
const logger = require('./src/utils/logger');
// const worker = require('./src/queue/worker'); // Worker will be initialized here once created

const PORT = config.port || 4001;

const server = app.listen(PORT, () => {
    logger.info(`Lead Engine Microservice running on port ${PORT}`);
    logger.info(`Environment: ${config.env}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...', { error: err.message, stack: err.stack });
    server.close(() => {
        process.exit(1);
    });
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated');
    });
});
