const { Worker } = require('bullmq');
const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');
const apifyService = require('../services/apify.service');
const leadRepository = require('../repositories/lead.repository');
const classificationService = require('../services/classification.service');

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

        // 3. Execution
        const run = await apifyService.startActor(input);

        // 4. Fetch Results
        const results = await apifyService.getDatasetItems(run.defaultDatasetId);
        logger.info(`Fetched ${results.length} results from Apify`, { searchId });

        // 5. Store Results in DB with Classification
        const leads = [];
        for (const item of results) {
            // Classify the lead
            const rawLead = {
                business_name: item.title,
                address: item.address,
                city: item.city || city,
                phone: item.phone,
                website: item.website,
                google_maps_url: item.url,
                rating: item.totalScore,
                reviews: item.reviewsCount,
                google_types: item.categoryName ? [item.categoryName.toLowerCase()] : [],
                search_keyword: keyword
            };

            const classification = await classificationService.classify(rawLead);
            logger.info(`Lead classified`, {
                business: rawLead.business_name,
                category: classification.categoryName,
                catId: classification.category_id
            });

            leads.push({
                ...rawLead,
                category_id: classification.category_id,
                subcategory_id: classification.subcategory_id,
                classification_confidence: classification.confidence
            });
        }

        await leadRepository.bulkInsertLeads(searchId, leads);

        // 6. Update Job Status to 'completed'
        await leadRepository.updateJobStatus(searchId, 'completed', {
            leads_extracted: leads.length
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
