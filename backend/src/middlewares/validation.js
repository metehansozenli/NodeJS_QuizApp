const { body, validationResult } = require('express-validator');

const validationMiddleware = {
    validate: (validations) => {
        return async (req, res, next) => {
            await Promise.all(validations.map(validation => validation.run(req)));

            const errors = validationResult(req);
            if (errors.isEmpty()) {
                return next();
            }

            res.status(400).json({ errors: errors.array() });
        };
    },

    quizValidation: [
        body('title').notEmpty().withMessage('Title is required'),
        body('description').notEmpty().withMessage('Description is required'),
        body('categoryId').isInt().withMessage('Valid category ID is required')
    ],

    userValidation: [
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    ]
};

module.exports = validationMiddleware; 