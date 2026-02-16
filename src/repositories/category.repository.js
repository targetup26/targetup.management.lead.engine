const sequelize = require('../utils/db');
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class CategoryRepository {
    async findBySlug(slug) {
        const query = 'SELECT * FROM categories WHERE slug = :slug LIMIT 1';
        const [results] = await sequelize.query(query, {
            replacements: { slug },
            type: Sequelize.QueryTypes.SELECT
        });
        return results;
    }

    async create(data) {
        const id = uuidv4();
        const { name, slug } = data;
        const query = `
            INSERT INTO categories (id, name, slug, created_at, updated_at)
            VALUES (:id, :name, :slug, NOW(), NOW())
        `;
        await sequelize.query(query, {
            replacements: { id, name, slug },
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
        const query = 'UPDATE categories SET lead_count = lead_count + :delta, updated_at = NOW() WHERE id = :categoryId';
        await sequelize.query(query, {
            replacements: { categoryId, delta },
            type: Sequelize.QueryTypes.UPDATE
        });
    }
}

module.exports = new CategoryRepository();
