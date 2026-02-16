const logger = require('../utils/logger');
const categoryRepository = require('../repositories/category.repository');
const subcategoryRepository = require('../repositories/subcategory.repository');

/**
 * Classification Service
 * Automatically classifies leads into categories and subcategories
 */
class ClassificationService {
    constructor() {
        // Normalization mapping as per requirements
        this.categoryMapping = {
            'gym': 'Fitness',
            'fitness_center': 'Fitness',
            'restaurant': 'Food & Beverage',
            'cafe': 'Food & Beverage',
            'bar': 'Food & Beverage',
            'dentist': 'Medical',
            'doctor': 'Medical',
            'hospital': 'Medical',
            'real_estate_agency': 'Real Estate',
            'car_dealer': 'Automotive',
            'car_repair': 'Automotive'
        };

        // Keyword mapping for broader categories
        this.keywordMapping = {
            'fitness': 'Fitness',
            'workout': 'Fitness',
            'food': 'Food & Beverage',
            'eat': 'Food & Beverage',
            'health': 'Medical',
            'clinic': 'Medical',
            'home': 'Real Estate',
            'property': 'Real Estate',
            'car': 'Automotive',
            'vehicle': 'Automotive'
        };
    }

    /**
     * Classify a lead based on its data
     * @param {Object} leadData - Raw lead data from scraper
     * @returns {Promise<Object>} - Classification result { category, subcategory, confidence }
     */
    async classify(leadData) {
        const signals = this.extractSignals(leadData);
        const scores = this.calculateScores(signals);

        // Find highest score
        let bestCategory = 'General';
        let maxScore = 0;

        for (const [category, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                bestCategory = category;
            }
        }

        // Normalize category name
        const normalizedCategoryName = this.normalizeCategory(bestCategory);
        const categorySlug = this.slugify(normalizedCategoryName);

        // Dynamic Category Creation
        const category = await categoryRepository.findOrCreate(normalizedCategoryName, categorySlug);

        // Subcategory Logic: Use the most specific signal (Google type or keyword)
        const subcategoryName = this.determineSubcategory(signals, bestCategory);
        const subcategorySlug = this.slugify(subcategoryName);

        // Dynamic Subcategory Creation
        const subcategory = await subcategoryRepository.findOrCreate(category.id, subcategoryName, subcategorySlug);

        return {
            category_id: category.id,
            subcategory_id: subcategory.id,
            confidence: Math.min(maxScore, 100), // Max confidence is 100
            categoryName: normalizedCategoryName,
            subcategoryName: subcategoryName
        };
    }

    /**
     * Extract business signals from lead data
     */
    extractSignals(leadData) {
        return {
            googleTypes: leadData.google_types || leadData.types || [],
            title: leadData.business_name || leadData.title || '',
            keyword: leadData.search_keyword || '',
            industry: leadData.industry || '',
            description: leadData.description || ''
        };
    }

    /**
     * Calculate scores based on weights
     */
    calculateScores(signals) {
        const scores = {};

        // 1. Google Types (+50 each)
        signals.googleTypes.forEach(type => {
            const mapped = this.categoryMapping[type] || null;
            if (mapped) {
                scores[mapped] = (scores[mapped] || 0) + 50;
            }
        });

        // 2. Title Match (+30)
        const titleLower = signals.title.toLowerCase();
        Object.entries(this.keywordMapping).forEach(([keyword, category]) => {
            if (titleLower.includes(keyword)) {
                scores[category] = (scores[category] || 0) + 30;
            }
        });

        // 3. Search Keyword Match (+20)
        const keywordLower = signals.keyword.toLowerCase();
        Object.entries(this.keywordMapping).forEach(([keyword, category]) => {
            if (keywordLower.includes(keyword)) {
                scores[category] = (scores[category] || 0) + 20;
            }
        });

        return scores;
    }

    /**
     * Normalize category name using mapping
     */
    normalizeCategory(name) {
        // In this implementation, scores are already mapped to final names
        return name || 'General';
    }

    /**
     * Determine a subcategory based on the most relevant signal
     */
    determineSubcategory(signals, parentCategory) {
        // Use the first Google type that matches the category as subcategory
        // Otherwise use the keyword or title fragment
        for (const type of signals.googleTypes) {
            if (this.categoryMapping[type] === parentCategory) {
                return this.capitalize(type.replace(/_/g, ' '));
            }
        }

        // Fallback to title keywords if no types match
        if (signals.industry) return this.capitalize(signals.industry);

        return 'General ' + parentCategory;
    }

    slugify(text) {
        return text.toString().toLowerCase()
            .replace(/\s+/g, '-')           // Replace spaces with -
            .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
            .replace(/\-\-+/g, '-')         // Replace multiple - with single -
            .replace(/^-+/, '')             // Trim - from start of text
            .replace(/-+$/, '');            // Trim - from end of text
    }

    capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }
}

module.exports = new ClassificationService();
