const sequelize = require('../utils/db');
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

class SubcategoryRepository {
    async findBySlug(categoryId, slug) {
        const query = 'SELECT * FROM subcategories WHERE category_id = ? AND slug = ? LIMIT 1';
        const results = await sequelize.query(query, {
            replacements: [categoryId, slug],
            type: Sequelize.QueryTypes.SELECT
        });

        const subcategory = results && results.length > 0 ? results[0] : null;
        return subcategory;
    }

    async create(data) {
        const { category_id, name, slug } = data;
        const query = `
            INSERT INTO subcategories (category_id, name, slug, created_at, updated_at)
            VALUES (?, ?, ?, NOW(), NOW())
        `;
        const [id] = await sequelize.query(query, {
            replacements: [category_id, name, slug],
            type: Sequelize.QueryTypes.INSERT
        });
        return { id, category_id, name, slug };
    }

    async findOrCreate(categoryId, name, slug) {
        let subcategory = await this.findBySlug(categoryId, slug);
        if (!subcategory) {
            subcategory = await this.create({ category_id: categoryId, name, slug });
        }
        return subcategory;
    }

    async incrementLeadCount(subcategoryId, delta = 1) {
        const query = 'UPDATE subcategories SET lead_count = lead_count + ?, updated_at = NOW() WHERE id = ?';
        await sequelize.query(query, {
            replacements: [delta, subcategoryId],
            type: Sequelize.QueryTypes.UPDATE
        });
    }
}

module.exports = new SubcategoryRepository();
