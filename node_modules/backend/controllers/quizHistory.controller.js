// Controller for quiz history
const db = require('../config/db_config');

exports.getQuizHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await db.query('SELECT * FROM quiz_history WHERE user_id = $1', [userId]);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quiz history' });
  }
};

exports.addQuizHistory = async (req, res) => {
  try {
    const { userId, quizId, sessionId, score } = req.body;
    await db.query('INSERT INTO quiz_history (user_id, quiz_id, session_id, score, played_at) VALUES ($1, $2, $3, $4, NOW())', [userId, quizId, sessionId, score]);
    res.status(201).json({ message: 'Quiz history added successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add quiz history' });
  }
};

exports.saveSessionResults = async (sessionId) => {
  // Bu fonksiyon session bitiminde çağrılır
  // Katılımcıların skorlarını quiz_history tablosuna kaydeder
  try {
    // Session ve quizId'yi bul
    const sessionRes = await db.query('SELECT * FROM live_sessions WHERE id = $1', [sessionId]);
    if (sessionRes.rowCount === 0) return;
    const quizId = sessionRes.rows[0].quiz_id;
    // Katılımcı skorlarını al
    const participants = await db.query('SELECT user_id, score FROM participants WHERE session_id = $1', [sessionId]);
    for (const p of participants.rows) {
      await db.query('INSERT INTO quiz_history (user_id, quiz_id, session_id, score, played_at) VALUES ($1, $2, $3, $4, NOW())', [p.user_id, quizId, sessionId, p.score]);
    }
  } catch (err) {
    // Hata logla
  }
};

exports.getQuizHistoryByQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const result = await db.query('SELECT * FROM quiz_history WHERE quiz_id = $1', [quizId]);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quiz history for quiz' });
  }
};

exports.getQuizHistoryDetail = async (req, res) => {
  try {
    const { sessionId } = req.params;
    // Katılımcı skorları ve kullanıcı adları ile birlikte getir
    const result = await db.query(
      `SELECT qh.*, u.username FROM quiz_history qh JOIN users u ON qh.user_id = u.id WHERE qh.session_id = $1`,
      [sessionId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quiz history detail' });
  }
};

// List history for a specific player (user)
exports.getPlayerHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await db.query(
      `SELECT qh.*, q.title
       FROM quiz_history qh
       JOIN quizzes q ON q.id = qh.quiz_id
       WHERE qh.user_id = $1
       ORDER BY qh.played_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching player history', err);
    res.status(500).json({ error: 'Failed to fetch player history' });
  }
};

// List sessions hosted by a host (completed)
exports.getHostHistory = async (req, res) => {
  try {
    const { hostId } = req.params;
    const result = await db.query(
      `SELECT ls.id as session_id, ls.started_at, ls.ended_at, q.title,
              (SELECT COUNT(*) FROM participants p WHERE p.session_id = ls.id) as participant_count,
              (SELECT MAX(score) FROM participants p WHERE p.session_id = ls.id) as top_score
       FROM live_sessions ls
       JOIN quizzes q ON q.id = ls.quiz_id
       WHERE ls.host_id = $1 AND ls.status = 'ENDED'
       ORDER BY ls.ended_at DESC NULLS LAST, ls.started_at DESC`,
      [hostId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching host history', err);
    res.status(500).json({ error: 'Failed to fetch host history' });
  }
};

// Session detail: leaderboard + answers
exports.getSessionHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Leaderboard
    const leaderboardRes = await db.query(
      `SELECT p.user_id, u.username, p.score
       FROM participants p
       JOIN users u ON u.id = p.user_id
       WHERE p.session_id = $1
       ORDER BY p.score DESC`,
      [sessionId]
    );

    // Question details
    const questionRes = await db.query(
      `SELECT q.id as question_id, q.question_text, u.username, a.is_correct
       FROM questions q
       JOIN answers a ON a.question_id = q.id
       JOIN participants p ON p.id = a.participant_id
       JOIN users u ON u.id = p.user_id
       WHERE p.session_id = $1
       ORDER BY q.id, u.username`,
      [sessionId]
    );

    res.json({ leaderboard: leaderboardRes.rows, answers: questionRes.rows });
  } catch (err) {
    console.error('Error fetching session history detail', err);
    res.status(500).json({ error: 'Failed to fetch session history detail' });
  }
};
