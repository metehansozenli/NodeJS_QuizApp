// Controller for user data and leaderboard
const db = require('../config/db_config');

exports.getUserData = async (req, res) => {
  // Fetch user data logic
};

exports.getLeaderboard = async (req, res) => {
  try {
    // Fetch top users based on their scores
    const result = await db.query(
      `SELECT u.username, SUM(qh.score) AS total_score
       FROM users u
       JOIN quiz_history qh ON u.id = qh.user_id
       GROUP BY u.username
       ORDER BY total_score DESC
       LIMIT 10`
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching leaderboard:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};
