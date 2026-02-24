const { Sequelize } = require('sequelize');
const sequelize = require('../utils/db');
const logger = require('../utils/logger');

/**
 * Lead Repository - Database operations for leads
 */
class LeadRepository {

    /**
     * Create a new lead extraction job
     * @param {Object} jobData - Job data
     * @returns {Promise<Object>} - Created job
     */
    async createJob(jobData) {
        try {
            const { id, keyword, city, country, limit, source, user_id } = jobData;
            const query = `
                INSERT INTO lead_jobs (id, status, leads_extracted, \`query\`, created_at, updated_at, user_id)
                VALUES (:id, 'PENDING', 0, :query, NOW(), NOW(), :user_id)
                ON DUPLICATE KEY UPDATE 
                    \`query\` = :query,
                    updated_at = NOW()
            `;

            await sequelize.query(query, {
                replacements: {
                    id,
                    query: JSON.stringify({
                        business_type: keyword || '',
                        city: city || '',
                        country: country || 'us',
                        max_results: limit || 50
                    }),
                    user_id: user_id || null
                },
                type: Sequelize.QueryTypes.INSERT
            });

            logger.info('Lead job created in database', { jobId: id });
            return { id, status: 'pending' };
        } catch (error) {
            logger.error('Failed to create lead job', {
                message: error.message,
                sql: error.sql,
                detail: error.original ? error.original.message : 'No original error',
                jobData
            });
            throw error;
        }
    }

    /**
     * Update job status and additional fields
     * @param {string} jobId - UUID of the job
     * @param {string} status - New status
     * @param {Object} additionalFields - Additional fields to update
     * @returns {Promise<number>} - Number of affected rows
     */
    async updateJobStatus(jobId, status, additionalFields = {}) {
        try {
            const fields = Object.keys(additionalFields)
                .map(k => `${k} = :${k}`)
                .join(', ');

            const query = fields
                ? `UPDATE lead_jobs SET status = :status, ${fields} WHERE id = :jobId`
                : `UPDATE lead_jobs SET status = :status WHERE id = :jobId`;

            const [result] = await sequelize.query(query, {
                replacements: { jobId, status, ...additionalFields },
                type: Sequelize.QueryTypes.UPDATE
            });

            logger.debug('Job status updated', { jobId, status, fields: additionalFields });
            return result;
        } catch (error) {
            logger.error('Failed to update job status', {
                jobId,
                status,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Bulk insert leads
     * @param {string} jobId - UUID of the extraction job
     * @param {Array} leads - Array of lead objects
     * @returns {Promise<number>} - Number of inserted rows
     */
    async bulkInsertLeads(jobId, leads) {
        if (!leads || leads.length === 0) {
            logger.warn('No leads to insert', { jobId });
            return 0;
        }

        try {
            const values = leads.map(l => [
                this.generateUUID(),
                jobId,
                l.title || l.business_name || l.name || 'Unknown',
                l.address || l.fullAddress || null,
                l.city || null,
                l.phone || l.phoneNumber || null,
                l.email || null,
                l.website || l.url || null,
                l.rating || l.totalScore || null,
                l.url || l.google_url || null,
                JSON.stringify(l)
            ]);

            // Use INSERT IGNORE to skip duplicates
            const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())').join(', ');
            const flatValues = values.flat();

            const query = `
                INSERT INTO leads 
                (id, extraction_job_id, business_name, address, city, phone, email, website, rating, google_url, raw_data, created_at, updated_at) 
                VALUES ${placeholders}
            `;

            const [result] = await sequelize.query(query, {
                replacements: flatValues,
                type: Sequelize.QueryTypes.INSERT
            });

            logger.info('Leads inserted successfully', {
                jobId,
                attempted: leads.length,
                inserted: result
            });

            return result;
        } catch (error) {
            logger.error('Failed to insert leads', {
                jobId,
                count: leads.length,
                message: error.message,
                sql: error.sql,
                detail: error.original ? error.original.message : 'No original error'
            });
            throw error;
        }
    }

    /**
     * Check if a lead with given phone or email already exists
     * @param {string} phone 
     * @param {string} email 
     * @returns {Promise<boolean>}
     */
    async checkDuplicate(phone, email, url) {
        if (!phone && !email && !url) return false;

        try {
            let query = 'SELECT id FROM leads WHERE ';
            const conditions = [];
            const replacements = {};

            if (phone) {
                conditions.push('phone = :phone');
                replacements.phone = phone;
            }
            if (email) {
                conditions.push('email = :email');
                replacements.email = email;
            }
            if (url) {
                conditions.push('google_url = :url');
                replacements.url = url;
            }

            if (conditions.length === 0) return false;

            query += conditions.join(' OR ') + ' LIMIT 1';

            const [results] = await sequelize.query(query, {
                replacements,
                type: Sequelize.QueryTypes.SELECT
            });

            return results.length > 0;
        } catch (error) {
            logger.error('Failed to check duplicate', {
                phone,
                email,
                url,
                message: error.message,
                detail: error.original ? error.original.message : 'No original error'
            });
            return false;
        }
    }

    /**
     * Generate UUID v4
     * @returns {string}
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

module.exports = new LeadRepository();
