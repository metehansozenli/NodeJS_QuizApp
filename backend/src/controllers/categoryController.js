const categoryRepository = require('../repositories/categoryRepository');

const categoryController = {
    getAllCategories: async (req, res) => {
        try {
            const categories = await categoryRepository.findAll();
            res.json(categories);
        } catch (error) {
            console.error('Error fetching categories:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    createCategory: async (req, res) => {
        try {
            const category = await categoryRepository.create(req.body);
            res.status(201).json(category);
        } catch (error) {
            console.error('Error creating category:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};

module.exports = categoryController; 