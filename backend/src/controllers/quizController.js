const quizRepository = require('../repositories/quizRepository');

const quizController = {
    getAllQuizzes: async (req, res) => {
        try {
            const quizzes = await quizRepository.findAll();
            res.json(quizzes);
        } catch (error) {
            console.error('Error fetching quizzes:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    getQuizzesByCategory: async (req, res) => {
        const { categoryId } = req.params;
        try {
            const quizzes = await quizRepository.findByCategory(categoryId);
            res.json(quizzes);
        } catch (error) {
            console.error('Error fetching quizzes by category:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    createQuiz: async (req, res) => {
        try {
            const quiz = await quizRepository.create(req.body);
            res.status(201).json(quiz);
        } catch (error) {
            console.error('Error creating quiz:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};

module.exports = quizController; 