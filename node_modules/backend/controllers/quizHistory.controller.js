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
    console.log(`🏆 Saving session results for sessionId: ${sessionId}`);
    
    // Session ve quizId'yi bul
    const sessionRes = await db.query('SELECT * FROM live_sessions WHERE id = $1', [sessionId]);
    if (sessionRes.rowCount === 0) {
      console.log(`❌ Session ${sessionId} not found for history save`);
      return;
    }
    
    const quizId = sessionRes.rows[0].quiz_id;
    console.log(`📝 Found quiz ID: ${quizId} for session: ${sessionId}`);      // Katılımcı skorlarını participants tablosundan al (en güncel veriler)
    const participants = await db.query('SELECT user_id, score FROM participants WHERE session_id = $1', [sessionId]);
    console.log(`👥 Found ${participants.rowCount} participants with scores:`, participants.rows);
    
    let savedCount = 0;
    let updatedCount = 0;
    
    for (const p of participants.rows) {
      console.log(`💾 Saving/updating quiz_history: user_id=${p.user_id}, score=${p.score}, quiz_id=${quizId}, session_id=${sessionId}`);
      
      // ON CONFLICT kullanarak duplicate'ları handle et
      const result = await db.query(`
        INSERT INTO quiz_history (user_id, quiz_id, session_id, score, played_at) 
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (user_id, session_id) 
        DO UPDATE SET 
          score = EXCLUDED.score,
          played_at = NOW()
        RETURNING (xmax = 0) AS inserted
      `, [p.user_id, quizId, sessionId, p.score]);
      
      if (result.rows[0].inserted) {
        savedCount++;
      } else {
        updatedCount++;
      }
    }
    
    console.log(`✅ Successfully processed ${participants.rowCount} participants: ${savedCount} new records, ${updatedCount} updated records`);
  } catch (err) {
    console.error('❌ Error saving session results to quiz_history:', err);
    throw err; // Re-throw to let caller know about the error
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

// Yardımcı fonksiyon: Quiz history'yi participants tablosuna göre yeniden oluştur
exports.rebuildQuizHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log(`🔄 Rebuilding quiz history for session: ${sessionId}`);
    
    // Önce bu session için mevcut quiz_history kayıtlarını sil
    await db.query('DELETE FROM quiz_history WHERE session_id = $1', [sessionId]);
    console.log(`🗑️ Deleted existing quiz_history records for session: ${sessionId}`);
    
    // Yeniden oluştur
    await exports.saveSessionResults(sessionId);
    
    res.json({ 
      success: true, 
      message: `Quiz history rebuilt successfully for session ${sessionId}` 
    });
  } catch (err) {
    console.error('Error rebuilding quiz history:', err);
    res.status(500).json({ error: 'Failed to rebuild quiz history' });
  }
};

// Tüm quiz history'yi participants tablosuna göre yeniden oluştur
exports.rebuildAllQuizHistory = async (req, res) => {
  try {
    console.log(`🔄 Rebuilding ALL quiz history from participants table`);
    
    // Tüm quiz_history'yi temizle
    await db.query('DELETE FROM quiz_history');
    console.log(`🗑️ Deleted all quiz_history records`);
    
    // Tüm bitmiş sessionları bul
    const sessions = await db.query('SELECT id FROM live_sessions WHERE status = $1', ['ENDED']);
    console.log(`📋 Found ${sessions.rowCount} ended sessions to rebuild`);
    
    let rebuilt = 0;
    for (const session of sessions.rows) {
      try {
        await exports.saveSessionResults(session.id);
        rebuilt++;
      } catch (err) {
        console.error(`❌ Failed to rebuild session ${session.id}:`, err);
      }
    }
    
    res.json({ 
      success: true, 
      message: `Quiz history rebuilt successfully for ${rebuilt}/${sessions.rowCount} sessions`
    });
  } catch (err) {
    console.error('Error rebuilding all quiz history:', err);
    res.status(500).json({ error: 'Failed to rebuild all quiz history' });
  }
};

// Debug: Compare quiz_history vs participants scores
exports.compareScores = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Quiz history'den skorları al
    const historyScores = await db.query(
      'SELECT user_id, score FROM quiz_history WHERE session_id = $1 ORDER BY user_id',
      [sessionId]
    );
    
    // Participants'ten skorları al
    const participantScores = await db.query(
      'SELECT user_id, score FROM participants WHERE session_id = $1 ORDER BY user_id',
      [sessionId]
    );
    
    const comparison = {
      sessionId,
      historyScores: historyScores.rows,
      participantScores: participantScores.rows,
      differences: []
    };
    
    // Farkları bul
    participantScores.rows.forEach(p => {
      const historyRecord = historyScores.rows.find(h => h.user_id === p.user_id);
      if (!historyRecord) {
        comparison.differences.push({
          user_id: p.user_id,
          issue: 'Missing in history',
          participant_score: p.score,
          history_score: null
        });
      } else if (historyRecord.score !== p.score) {
        comparison.differences.push({
          user_id: p.user_id,
          issue: 'Score mismatch',
          participant_score: p.score,
          history_score: historyRecord.score
        });
      }
    });
    
    res.json(comparison);
  } catch (err) {
    console.error('Error comparing scores:', err);
    res.status(500).json({ error: 'Failed to compare scores' });
  }
};
