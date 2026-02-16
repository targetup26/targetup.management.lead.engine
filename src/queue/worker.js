const { Worker } = require('bullmq');
const config = require('../config');
const logger = require('../utils/logger');
const apifyService = require('../services/apify.service');
const leadRepository = require('../repositories/lead.repository');
const Redis = require('ioredis');

// Implementation of the worker that processes jobs from the 'lead-extraction' queue
const connection = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null
});

const worker = new Worker('lead-extraction', async (job) => {
    const { searchId, keyword, city, country, limit } = job.data;
    logger.info(`Processing job ${job.id}`, { searchId, keyword, city });

    try {
        // 1. Update job status to 'processing'
        await leadRepository.updateJobStatus(searchId, 'processing');

        // 2. Prepare Apify Input (Google Maps Crawler)
        const input = {
            searchStringsArray: [`${keyword} in ${city}, ${country}`],
            maxCrawledPlaces: limit,
            language: 'en',
            maxAutomaticZoomOuts: 0,
            zoomLevel: 15
        };

        // 3. Execution (This is a blocking call in this simple implementation, 
        // strictly for the "LeadRequestPage" flow. In production, we'd use webhooks 
        // but for now we wait for the actor to finish)
        const run = await apifyService.startActor(input);

        // 4. Fetch Results
        const results = await apifyService.getDatasetItems(run.defaultDatasetId);
        logger.info(`Fetched ${results.length} results from Apify`, { searchId });

        // 5. Store Results in DB
        // Map Apify results to our simplified Lead model
        const leads = results.map(item => ({
            business_name: item.title,
            address: item.address,
            city: item.city || city,
            phone: item.phone,
            website: item.website,
            google_url: item.url,
            rating: item.totalScore,
            reviews: item.reviewsCount,
            category: item.categoryName
        }));

        await leadRepository.bulkInsertLeads(searchId, leads);

        // 6. Update Job Status to 'completed'
        await leadRepository.updateJobStatus(searchId, 'completed', {
            total_results: leads.length
        });

        logger.info(`Job ${job.id} completed successfully`, { searchId, count: leads.length });
        return { success: true, count: leads.length };

    } catch (error) {
        logger.error(`Job ${job.id} failed`, { error: error.message, stack: error.stack });

        // Update DB status
        await leadRepository.updateJobStatus(searchId, 'failed', {
            error_message: error.message
        });

        throw error;
    }

}, {
    connection,
    concurrency: config.queue.concurrency,
    limiter: {
        max: config.queue.rateLimitMax,
        duration: config.queue.rateLimitDuration
    }
});

worker.on('completed', (job) => {
    logger.debug(`Job ${job.id} finished`);
});

worker.on('failed', (job, err) => {
    logger.error(`Job ${job.id} failed with error ${err.message}`);
});

module.exports = worker;
