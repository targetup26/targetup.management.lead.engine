const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search.controller');
const { validateInternalToken } = require('../utils/auth');

// Internal routes (require authentication token)
router.post('/internal/start-search', validateInternalToken, searchController.startSearch);
router.get('/internal/job/:jobId', validateInternalToken, searchController.getJobStatus);

// Public health check
router.get('/health', searchController.healthCheck);

module.exports = router;
