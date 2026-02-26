const sequelize = require('../utils/db');
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

class CategoryRepository {
    async findBySlug(slug) {
        const query = 'SELECT * FROM categories WHERE slug = ? LIMIT 1';
        const results = await sequelize.query(query, {
            replacements: [slug],
            type: Sequelize.QueryTypes.SELECT
        });

        const category = results && results.length > 0 ? results[0] : null;
        logger.debug('CategoryRepository.findBySlug validation', { slug, found: !!category });
        return category;
    }

    async create(data) {
        const { name, slug } = data;
        const query = `
            INSERT INTO categories (name, slug, created_at, updated_at)
            VALUES (?, ?, NOW(), NOW())
        `;
        const [id] = await sequelize.query(query, {
            replacements: [name, slug],
            type: Sequelize.QueryTypes.INSERT
        });
        return { id, name, slug };
    }

    async findOrCreate(name, slug) {
        let category = await this.findBySlug(slug);
        if (!category) {
            category = await this.create({ name, slug });
        }
        return category;
    }

    async incrementLeadCount(categoryId, delta = 1) {
        const query = 'UPDATE categories SET lead_count = lead_count + ?, updated_at = NOW() WHERE id = ?';
        await sequelize.query(query, {
            replacements: [delta, categoryId],
            type: Sequelize.QueryTypes.UPDATE
        });
    }
}

module.exports = new CategoryRepository();
