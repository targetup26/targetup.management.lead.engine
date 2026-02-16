#!/usr/bin/env node

/**
 * Retroactive Lead Classification Script
 * 
 * Processes all existing leads that don't have category assignments
 * and classifies them using the ClassificationService.
 * 
 * Usage: node lead-engine/scripts/classify-legacy-leads.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { sequelize, Lead, Category, Subcategory } = require('../../backend/src/models');
const classificationService = require('../src/services/classification.service');
const logger = require('../src/utils/logger');

const BATCH_SIZE = 100;
let processedCount = 0;
let classifiedCount = 0;
let errorCount = 0;

/**
 * Main execution function
 */
async function main() {
    try {
        logger.info('🚀 Starting retroactive lead classification...');

        // Get total count of unclassified leads
        const totalUnclassified = await Lead.count({
            where: {
                category_id: null
            }
        });

        logger.info(`📊 Found ${totalUnclassified} unclassified leads`);

        if (totalUnclassified === 0) {
            logger.info('✅ No unclassified leads found. Exiting.');
            process.exit(0);
        }

        // Process in batches
        let offset = 0;
        while (offset < totalUnclassified) {
            const leads = await Lead.findAll({
                where: {
                    category_id: null
                },
                limit: BATCH_SIZE,
                offset: offset,
                raw: true
            });

            if (leads.length === 0) break;

            logger.info(`\n📦 Processing batch ${Math.floor(offset / BATCH_SIZE) + 1} (${leads.length} leads)...`);

            // Process each lead in the batch
            for (const lead of leads) {
                try {
                    // Classify the lead
                    const classification = await classificationService.classify({
                        google_types: lead.google_types ? JSON.parse(lead.google_types) : [],
                        business_name: lead.business_name,
                        search_keyword: lead.business_type || '',
                        industry: lead.industry || '',
                        description: lead.description || ''
                    });

                    // Update the lead with classification
                    await Lead.update({
                        category_id: classification.category_id,
                        subcategory_id: classification.subcategory_id
                    }, {
                        where: { id: lead.id }
                    });

                    // Increment category/subcategory counters
                    await Category.increment('lead_count', {
                        where: { id: classification.category_id }
                    });

                    await Subcategory.increment('lead_count', {
                        where: { id: classification.subcategory_id }
                    });

                    classifiedCount++;
                    processedCount++;

                    if (processedCount % 10 === 0) {
                        logger.info(`   ✓ Processed ${processedCount}/${totalUnclassified} leads...`);
                    }

                } catch (error) {
                    errorCount++;
                    logger.error(`   ✗ Failed to classify lead ${lead.id}: ${error.message}`);
                    processedCount++;
                }
            }

            offset += BATCH_SIZE;
        }

        // Final summary
        logger.info('\n' + '='.repeat(60));
        logger.info('🎉 Retroactive Classification Complete!');
        logger.info('='.repeat(60));
        logger.info(`Total Processed: ${processedCount}`);
        logger.info(`Successfully Classified: ${classifiedCount}`);
        logger.info(`Errors: ${errorCount}`);
        logger.info(`Success Rate: ${((classifiedCount / processedCount) * 100).toFixed(2)}%`);
        logger.info('='.repeat(60));

        process.exit(0);

    } catch (error) {
        logger.error('❌ Fatal error during classification:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    logger.info('\n\n⚠️  Received SIGINT. Shutting down gracefully...');
    logger.info(`Processed ${processedCount} leads before interruption.`);
    await sequelize.close();
    process.exit(0);
});

// Run the script
main().catch(error => {
    logger.error('Unhandled error:', error);
    process.exit(1);
});
