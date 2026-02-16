const logger = require('./logger');

/**
 * Validates internal service authentication token
 */
function validateInternalToken(req, res, next) {
    const token = req.headers['x-internal-token'];

    if (!token || token !== process.env.INTERNAL_TOKEN) {
        logger.warn('Unauthorized access attempt', {
            ip: req.ip,
            path: req.path,
            headers: req.headers
        });
        return res.status(401).json({
            success: false,
            error: 'Unauthorized'
        });
    }

    logger.debug('Internal token validated', { path: req.path });
    next();
}

module.exports = { validateInternalToken };
