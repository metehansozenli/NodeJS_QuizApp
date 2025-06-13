// Controller for admin dashboard
const db = require('../config/db_config');

exports.getAnalytics = async (req, res) => {
  try {
    const userCount = await db.query('SELECT COUNT(*) FROM users');
    const quizCount = await db.query('SELECT COUNT(*) FROM quizzes');
    const questionCount = await db.query('SELECT COUNT(*) FROM questions');

    res.status(200).json({
      users: userCount.rows[0].count,
      quizzes: quizCount.rows[0].count,
      questions: questionCount.rows[0].count,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const result = await db.query('SELECT id, username, created_at FROM users');
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    res.status(200).json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

exports.getQuizzes = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM quizzes');
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
};

exports.deleteQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    await db.query('DELETE FROM quizzes WHERE id = $1', [quizId]);
    res.status(200).json({ message: 'Quiz deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
};

exports.getQuestions = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM questions');
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    await db.query('DELETE FROM questions WHERE id = $1', [questionId]);
    res.status(200).json({ message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete question' });
  }
};
