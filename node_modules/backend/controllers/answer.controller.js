// Controller for answer submissions
const db = require('../config/db_config');
const { activeSessions } = require('../sockets/socket');

// Real-time quiz answer submission
exports.submitRealTimeAnswer = async (req, res) => {
  try {
    const { userId, sessionId, questionId, optionId } = req.body;
    
    console.log('Submit answer request:', { userId, sessionId, questionId, optionId });
    
    // Validate required fields
    if (!userId || !sessionId || !questionId || !optionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate userId is a number
    if (isNaN(parseInt(userId))) {
      console.error('Invalid userId provided:', userId);
      return res.status(400).json({ error: 'Invalid userId - must be a number' });
    }
    
    const numericUserId = parseInt(userId);
    
    // Validate session exists and is active
    const sessionRes = await db.query('SELECT * FROM live_sessions WHERE id = $1 AND status = $2', [sessionId, 'ACTIVE']);
    if (sessionRes.rowCount === 0) {
      return res.status(400).json({ error: 'Session not found or not active' });
    }
    
    // Check if option exists and get correctness
    const optionRes = await db.query('SELECT is_correct FROM options WHERE id = $1 AND question_id = $2', [optionId, questionId]);
    if (optionRes.rowCount === 0) {
      return res.status(400).json({ error: 'Option not found' });
    }
    
    const isCorrect = optionRes.rows[0].is_correct;
    
    // Find or create participant
    let participantRes = await db.query('SELECT id FROM participants WHERE session_id = $1 AND user_id = $2', [sessionId, numericUserId]);
    if (participantRes.rowCount === 0) {
      // Create participant if not exists
      const insertRes = await db.query(
        'INSERT INTO participants (session_id, user_id, score, status) VALUES ($1, $2, 0, TRUE) RETURNING id',
        [sessionId, numericUserId]
      );
      participantRes = insertRes;
    }
    const participantId = participantRes.rows[0].id;
    
    // Check if answer already submitted for this question
    const existingAnswer = await db.query(
      'SELECT id FROM answers WHERE participant_id = $1 AND question_id = $2',
      [participantId, questionId]
    );
    
    if (existingAnswer.rowCount > 0) {
      return res.status(400).json({ error: 'Answer already submitted for this question' });
    }
    
    // Submit answer
    await db.query(
      'INSERT INTO answers (participant_id, question_id, selected_option_id, is_correct, answered_at) VALUES ($1, $2, $3, $4, NOW())',
      [participantId, questionId, optionId, isCorrect]
    );
    
    // Update score if correct – use question.points
    if (isCorrect) {
      const pointsRes = await db.query('SELECT points FROM questions WHERE id = $1', [questionId]);
      const basePoints = pointsRes.rows[0]?.points || 10;
      await db.query('UPDATE participants SET score = score + $1 WHERE id = $2', [basePoints, participantId]);
    }
    
    // Update in-memory session state for real-time leaderboard
    if (activeSessions[sessionId]) {
      const state = activeSessions[sessionId];
      if (!state.answers[numericUserId]) {
        state.answers[numericUserId] = {
          answer: optionId,
          correct: isCorrect,
          timestamp: Date.now(),
          userId: numericUserId
        };
      }
    }
    
    console.log('Answer submitted successfully:', { userId: numericUserId, isCorrect });
    
    res.status(201).json({ 
      success: true, 
      isCorrect,
      message: isCorrect ? 'Correct answer!' : 'Incorrect answer'
    });
  } catch (error) {
    console.error('Error submitting real-time answer:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.submitAnswer = async (req, res) => {
  try {
    // userId, sessionId, questionId, optionId body'den alınacak
    const { userId, sessionId, questionId, optionId } = req.body;
    // Doğru mu kontrolü
    const optionRes = await db.query('SELECT is_correct FROM options WHERE id = $1', [optionId]);
    if (optionRes.rowCount === 0) {
      return res.status(400).json({ error: 'Option not found' });
    }
    const isCorrect = optionRes.rows[0].is_correct;
    // Katılımcı kaydını bul
    const participantRes = await db.query('SELECT id FROM participants WHERE session_id = $1 AND user_id = $2', [sessionId, userId]);
    if (participantRes.rowCount === 0) {
      return res.status(400).json({ error: 'Participant not found' });
    }
    const participantId = participantRes.rows[0].id;
    // Cevabı kaydet
    await db.query(
      'INSERT INTO answers (participant_id, question_id, selected_option_id, is_correct, answered_at) VALUES ($1, $2, $3, $4, NOW())',
      [participantId, questionId, optionId, isCorrect]
    );
    // Doğruysa puan artır – question.points kadar
    if (isCorrect) {
      const pointsRes = await db.query('SELECT points FROM questions WHERE id = $1', [questionId]);
      const basePoints = pointsRes.rows[0]?.points || 10;
      await db.query('UPDATE participants SET score = score + $1 WHERE id = $2', [basePoints, participantId]);
    }
    res.status(201).json({ success: true, isCorrect });
  } catch (error) {
    console.error('Error submitting answer:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getAnswers = async (req, res) => {
  try {
    const { question_id } = req.params;
    console.log('Fetching answers for question_id:', question_id); // Debug log

    const result = await db.query('SELECT * FROM answers WHERE question_id = $1', [question_id]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching answers:', error.message); // Error log
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getUserAnswers = async (req, res) => {
  try {
    const user_id = req.user.id; // Assuming user ID is available from auth middleware
    console.log('Fetching answers for user_id:', user_id); // Debug log

    const result = await db.query('SELECT * FROM answers WHERE user_id = $1', [user_id]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching user answers:', error.message); // Error log
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.checkAnswer = async (req, res) => {
  try {
    const { question_id, answer_text } = req.body;
    console.log('Checking answer for question_id:', question_id); // Debug log

    const question = await db.query('SELECT question_text FROM questions WHERE id = $1', [question_id]);
    if (question.rowCount === 0) {
      console.warn('Question not found for question_id:', question_id); // Warning log
      return res.status(404).json({ error: 'Question not found' });
    }

    const isCorrect = question.rows[0].question_text === answer_text;
    res.status(200).json({ isCorrect });
  } catch (error) {
    console.error('Error checking answer:', error.message); // Error log
    res.status(500).json({ error: 'Internal server error' });
  }
};
