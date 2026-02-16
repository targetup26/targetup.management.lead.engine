require('dotenv').config();
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const sequelize = require('./utils/db');
const worker = require('./queue/worker');

const PORT = config.port || 4001;

async function startServer() {
    try {
        // Authenticate database connection
        await sequelize.authenticate();
        logger.info('Database connection established successfully');

        // Sync models if needed (be careful with existing data!)
        // await sequelize.sync({ alter: false }); 

        const server = app.listen(PORT, () => {
            logger.info(`Lead Engine Microservice running on port ${PORT}`);
            logger.info(`Environment: ${config.env}`);
        });

        // Initialize queue worker
        logger.info('Lead extraction worker started');

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (err) => {
            logger.error('UNHANDLED REJECTION! 💥 Shutting down...', { error: err.message, stack: err.stack });
            server.close(() => {
                process.exit(1);
            });
        });

        process.on('SIGTERM', () => {
            logger.info('SIGTERM received. Shutting down gracefully');
            server.close(async () => {
                await worker.close();
                logger.info('Process terminated');
            });
        });

    } catch (error) {
        logger.error('Unable to start Lead Engine server', { error: error.message });
        process.exit(1);
    }
}

startServer();
