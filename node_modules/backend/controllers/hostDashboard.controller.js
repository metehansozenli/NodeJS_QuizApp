// Controller for host dashboard (host-specific quiz/session management)
const db = require('../config/db_config');

exports.getHostQuizzes = async (req, res) => {
  try {
    const hostId = req.user.id;
    const result = await db.query('SELECT * FROM quizzes WHERE created_by = $1', [hostId]);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch host quizzes' });
  }
};

exports.getHostSessions = async (req, res) => {
  try {
    const hostId = req.user.id;
    const result = await db.query('SELECT * FROM live_sessions WHERE host_id = $1 ORDER BY started_at DESC', [hostId]);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch host sessions' });
  }
};

exports.getQuizQuestions = async (req, res) => {
  try {
    const { quizId } = req.params;
    const hostId = req.user.id;
    // Host'a ait quiz mi kontrolü
    const quizCheck = await db.query('SELECT * FROM quizzes WHERE id = $1 AND created_by = $2', [quizId, hostId]);
    if (quizCheck.rowCount === 0) return res.status(403).json({ error: 'Unauthorized' });
    const result = await db.query('SELECT * FROM questions WHERE quiz_id = $1', [quizId]);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quiz questions' });
  }
};

exports.getHostAnalytics = async (req, res) => {
  try {
    const hostId = req.user.id;
    const quizCount = await db.query('SELECT COUNT(*) FROM quizzes WHERE created_by = $1', [hostId]);
    const sessionCount = await db.query('SELECT COUNT(*) FROM live_sessions WHERE host_id = $1', [hostId]);
    res.status(200).json({
      quizzes: quizCount.rows[0].count,
      sessions: sessionCount.rows[0].count
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};
