const helpers = {
    generateRandomCode: (length = 6) => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    },

    calculateScore: (correctAnswers, totalQuestions, timeBonus = 0) => {
        const baseScore = (correctAnswers / totalQuestions) * 100;
        return Math.round(baseScore + timeBonus);
    },

    formatDate: (date) => {
        return new Date(date).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
};

module.exports = helpers; 