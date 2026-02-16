const leadRepository = require('../repositories/lead.repository');
const leadQueue = require('../queue/queue');
const logger = require('../utils/logger');
const LeadExtractionDTO = require('../dtos/LeadExtractionDTO');
const { asyncHandler } = require('../utils/errorHandler');

/**
 * Search Controller
 * Handles internal API requests for lead extraction
 */
class SearchController {
    /**
     * Start a new lead extraction search
     * POST /internal/start-search
     */
    startSearch = asyncHandler(async (req, res) => {
        const { searchId, keyword, city, limit, country, source } = req.body;
        //aa
        // Validate required fields
        if (!searchId) {
            return res.status(400).json({
                success: false,
                error: 'searchId is required'
            });
        }

        // Validate input using DTO
        const validation = LeadExtractionDTO.validate({
            keyword,
            city,
            country,
            limit
        });

        if (!validation.isValid) {
            logger.warn('Invalid search input', { searchId, errors: validation.errors });
            return res.status(400).json({
                success: false,
                errors: validation.errors
            });
        }

        // Initialize job in database
        await leadRepository.createJob({
            id: searchId,
            keyword,
            city,
            country,
            limit,
            source,
            user_id: req.user?.id // If auth is present
        });

        // Add job to queue
        const job = await leadQueue.add('extract', {
            searchId,
            keyword,
            city,
            limit: parseInt(limit) || 50,
            country: country || 'us',
            source: source || 'unknown'
        }, {
            jobId: searchId, // Use searchId as jobId for easy tracking
            removeOnComplete: false,
            removeOnFail: false
        });

        logger.info('Job queued successfully', {
            jobId: job.id,
            searchId,
            keyword,
            city
        });

        res.status(202).json({
            success: true,
            message: 'Job queued successfully',
            jobId: job.id,
            searchId: searchId
        });
    });

    /**
     * Get job status
     * GET /internal/job/:jobId
     */
    getJobStatus = asyncHandler(async (req, res) => {
        const { jobId } = req.params;

        const job = await leadQueue.getJob(jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'Job not found'
            });
        }

        const state = await job.getState();
        const progress = job.progress || 0;
        const failedReason = job.failedReason;

        logger.debug('Job status requested', { jobId, state, progress });

        res.json({
            success: true,
            jobId: job.id,
            state,
            progress,
            data: job.data,
            failedReason,
            attemptsMade: job.attemptsMade,
            timestamp: job.timestamp
        });
    });

    /**
     * Health check endpoint
     * GET /health
     */
    healthCheck = asyncHandler(async (req, res) => {
        const apifyService = require('../services/apify.service');

        // Check Apify connection
        const apifyHealthy = await apifyService.healthCheck();

        // Check Redis connection via Queue
        let queueHealth = false;
        try {
            await leadQueue.getJobCounts();
            queueHealth = true;
        } catch (error) {
            logger.error('Health check queue error', { error: error.message });
        }

        const healthy = apifyHealthy && queueHealth;

        res.status(healthy ? 200 : 503).json({
            status: healthy ? 'ok' : 'degraded',
            service: 'lead-engine',
            checks: {
                apify: apifyHealthy,
                redis: queueHealth
            },
            timestamp: new Date().toISOString()
        });
    });
}

module.exports = new SearchController();
