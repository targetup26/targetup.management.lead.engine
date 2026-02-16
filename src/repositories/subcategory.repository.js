const sequelize = require('../utils/db');
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class SubcategoryRepository {
    async findBySlug(categoryId, slug) {
        const query = 'SELECT * FROM subcategories WHERE category_id = :categoryId AND slug = :slug LIMIT 1';
        const [results] = await sequelize.query(query, {
            replacements: { categoryId, slug },
            type: Sequelize.QueryTypes.SELECT
        });
        return results;
    }

    async create(data) {
        const id = uuidv4();
        const { category_id, name, slug } = data;
        const query = `
            INSERT INTO subcategories (id, category_id, name, slug, created_at, updated_at)
            VALUES (:id, :category_id, :name, :slug, NOW(), NOW())
        `;
        await sequelize.query(query, {
            replacements: { id, category_id, name, slug },
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
        const query = 'UPDATE subcategories SET lead_count = lead_count + :delta, updated_at = NOW() WHERE id = :subcategoryId';
        await sequelize.query(query, {
            replacements: { subcategoryId, delta },
            type: Sequelize.QueryTypes.UPDATE
        });
    }
}

module.exports = new SubcategoryRepository();
