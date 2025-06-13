const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/categories', require('./routes/categories'));
app.use('/api/quizzes', require('./routes/quizzes'));

// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 