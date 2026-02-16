const leadRepository = require('../repositories/lead.repository');
const logger = require('../utils/logger');

/**
 * Deduplication Service
 * Filters duplicate leads based on phone and email
 */
class DeduplicationService {
    /**
     * Filter out duplicate leads from a batch
     * @param {Array} leads - Array of lead objects
     * @returns {Promise<Array>} - Array of unique leads
     */
    async filterDuplicates(leads) {
        const uniqueLeads = [];
        const seen = new Set();
        let duplicatesInBatch = 0;
        let duplicatesInDB = 0;

        for (const lead of leads) {
            // Priority unique identifiers: placeId -> url -> contact_info
            const phone = lead.phone || lead.phoneNumber || '';
            const email = lead.email || '';
            const url = lead.url || lead.google_url || '';
            const placeId = lead.placeId || lead.id || ''; // Apify placeId is usually the most stable

            const key = placeId || url || (phone && email ? `${phone}_${email}` : null);

            // If we have NO way to identify this lead uniquely, we still don't want to lose it
            // but for deduplication we need a key. If no key, we'll just allow it if it has a name.
            if (!key) {
                if (lead.title || lead.business_name) {
                    uniqueLeads.push(lead);
                }
                continue;
            }

            // Check if duplicate in current batch
            if (seen.has(key)) {
                logger.debug('Duplicate detected in batch', { key, name: lead.title });
                duplicatesInBatch++;
                continue;
            }

            // Check if exists in database
            const exists = await leadRepository.checkDuplicate(phone, email, url);
            if (exists) {
                logger.debug('Duplicate exists in database', { key, name: lead.title });
                duplicatesInDB++;
                continue;
            }

            seen.add(key);
            uniqueLeads.push(lead);
        }

        logger.info('Deduplication complete', {
            total: leads.length,
            unique: uniqueLeads.length,
            duplicatesInBatch,
            duplicatesInDB,
            duplicatesTotal: duplicatesInBatch + duplicatesInDB
        });

        return uniqueLeads;
    }

    /**
     * Check if a single lead is duplicate
     * @param {string} phone 
     * @param {string} email 
     * @returns {Promise<boolean>}
     */
    async isDuplicate(phone, email) {
        if (!phone && !email) return false;
        return await leadRepository.checkDuplicate(phone, email);
    }
}

module.exports = new DeduplicationService();
