const { ApifyClient } = require('apify-client');
const config = require('../config');
const logger = require('../utils/logger');

class ApifyService {
    constructor() {
        if (!config.apify.token) {
            logger.warn('Apify API token is missing. Service will not function correctly.');
        }

        this.client = new ApifyClient({
            token: config.apify.token,
        });

        this.actorId = config.apify.actorId;
    }

    /**
     * Start an actor run
     * @param {Object} input - Actor input
     * @returns {Promise<Object>} - Run object
     */
    async startActor(input) {
        try {
            logger.info('Starting Apify actor', { actorId: this.actorId, input: JSON.stringify(input).substring(0, 100) + '...' });

            const run = await this.client.actor(this.actorId).call(input, {
                timeout: config.apify.timeout
            });

            logger.info('Apify actor run finished', { runId: run.id, status: run.status });
            return run;
        } catch (error) {
            logger.error('Failed to start Apify actor', { error: error.message });
            throw error;
        }
    }

    /**
     * Fetch dataset items from a run
     * @param {string} datasetId 
     * @returns {Promise<Array>}
     */
    async getDatasetItems(datasetId) {
        try {
            const { items } = await this.client.dataset(datasetId).listItems();
            return items;
        } catch (error) {
            logger.error('Failed to fetch dataset items', { datasetId, error: error.message });
            throw error;
        }
    }

    /**
     * Check connection health
     */
    async healthCheck() {
        try {
            const user = await this.client.user().get();
            return !!user;
        } catch (error) {
            logger.error('Apify health check failed', { error: error.message });
            return false;
        }
    }
}

module.exports = new ApifyService();
