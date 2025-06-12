const userRepository = require('../repositories/userRepository');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const authService = {
    register: async (userData) => {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        return await userRepository.create({
            ...userData,
            password: hashedPassword
        });
    },

    login: async ({ email, password }) => {
        const user = await userRepository.findByEmail(email);
        if (!user) {
            throw new Error('User not found');
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            throw new Error('Invalid password');
        }

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return { token, user };
    }
};

module.exports = authService; 