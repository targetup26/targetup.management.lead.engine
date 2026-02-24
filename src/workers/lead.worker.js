const { Worker } = require('bullmq');
const Redis = require('ioredis');
const config = require('../config');
const apifyService = require('../services/apify.service');
const deduplicationService = require('../services/deduplication.service');
const leadRepository = require('../repositories/lead.repository');
const categoryRepository = require('../repositories/category.repository');
const subcategoryRepository = require('../repositories/subcategory.repository');
const classificationService = require('../services/classification.service');
const LeadExtractionDTO = require('../dtos/LeadExtractionDTO');
const logger = require('../utils/logger');

// Create Redis connection for worker
const connection = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
});

/**
 * Lead Extraction Worker
 * Processes jobs from the lead-extraction queue
 */
const worker = new Worker('lead-extraction', async (job) => {
    const { searchId, keyword, city, limit, country, source } = job.data;

    logger.info('Processing lead extraction job', {
        jobId: job.id,
        searchId,
        keyword,
        city,
        attempt: job.attemptsMade + 1
    });

    try {
        // 1. Update job status to 'running'
        await leadRepository.updateJobStatus(searchId, 'running', {
            started_at: new Date()
        });

        // 2. Map data to Apify schema
        const apifyInput = LeadExtractionDTO.toApifySchema({
            keyword: keyword,
            city: city,
            country: country || 'us',
            limit: limit || 50
        });

        logger.debug('Apify input prepared', { searchId, apifyInput });

        // 3. Call Apify scraper
        await job.updateProgress(20);
        const result = await apifyService.runScraper(apifyInput);

        logger.info('Apify scraping completed', {
            searchId,
            runId: result.runId,
            rawCount: result.items.length
        });

        // 4. Deduplicate leads
        await job.updateProgress(60);
        const uniqueLeads = await deduplicationService.filterDuplicates(result.items);

        logger.info('Deduplication complete', {
            searchId,
            total: result.items.length,
            unique: uniqueLeads.length,
            duplicates: result.items.length - uniqueLeads.length
        });

        // 5. Classify leads and prepare for insertion
        await job.updateProgress(75);
        const classifiedLeads = [];
        const categoryStats = {}; // To track lead counts for batch update

        for (const lead of uniqueLeads) {
            const classification = await classificationService.classify(lead);

            classifiedLeads.push({
                ...lead,
                category_id: classification.category_id,
                subcategory_id: classification.subcategory_id,
                classification_confidence: classification.confidence
            });

            // Track for batch update
            categoryStats[classification.category_id] = (categoryStats[classification.category_id] || 0) + 1;
            categoryStats[classification.subcategory_id] = (categoryStats[classification.subcategory_id] || 0) + 1;
        }

        // 6. Insert leads into database
        await job.updateProgress(85);
        const insertedCount = await leadRepository.bulkInsertLeads(searchId, classifiedLeads);

        // 7. Batch Update Category Counters (Optimization)
        for (const [id, count] of Object.entries(categoryStats)) {
            // Check if it's a category or subcategory by checking repository (simpler here to try both)
            // In a more complex system we'd separate them better, but for now this works.
            await Promise.all([
                categoryRepository.incrementLeadCount(id, count).catch(() => { }),
                subcategoryRepository.incrementLeadCount(id, count).catch(() => { })
            ]);
        }

        // 8. Update job status to 'completed'
        await leadRepository.updateJobStatus(searchId, 'completed', {
            leads_extracted: insertedCount,
            apify_run_id: result.runId,
            completed_at: new Date()
        });

        await job.updateProgress(100);

        logger.info('Job completed successfully', {
            searchId,
            insertedCount,
            duration: Date.now() - job.timestamp
        });

        return {
            success: true,
            insertedCount,
            duplicates: result.items.length - uniqueLeads.length,
            apifyRunId: result.runId
        };

    } catch (error) {
        logger.error('Job failed', {
            searchId,
            jobId: job.id,
            attempt: job.attemptsMade + 1,
            maxAttempts: job.opts.attempts,
            error: error.message,
            stack: error.stack
        });

        // Update job status to 'failed' only if this is the last attempt
        if (job.attemptsMade + 1 >= job.opts.attempts) {
            await leadRepository.updateJobStatus(searchId, 'failed', {
                error_message: error.message,
                retry_count: job.attemptsMade + 1,
                completed_at: new Date()
            });
        } else {
            // Update retry count for intermediate failures
            await leadRepository.updateJobStatus(searchId, 'pending', {
                retry_count: job.attemptsMade + 1
            });
        }

        throw error; // Re-throw to let BullMQ handle retry
    }
}, {
    connection,
    concurrency: config.queue.concurrency,
    limiter: {
        max: config.queue.rateLimitMax,
        duration: config.queue.rateLimitDuration
    }
});

// Worker event handlers
worker.on('completed', (job, result) => {
    logger.info('Worker completed job', {
        jobId: job.id,
        searchId: job.data.searchId,
        result
    });
});

worker.on('failed', (job, err) => {
    logger.error('Worker failed job', {
        jobId: job?.id,
        searchId: job?.data?.searchId,
        attempt: job?.attemptsMade,
        error: err.message
    });
});

worker.on('error', (err) => {
    logger.error('Worker error', { error: err.message });
});

logger.info('Lead extraction worker started', {
    concurrency: config.queue.concurrency,
    rateLimit: `${config.queue.rateLimitMax} jobs per ${config.queue.rateLimitDuration}ms`
});

module.exports = worker;
