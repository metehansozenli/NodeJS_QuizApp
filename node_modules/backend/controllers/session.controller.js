// Controller for real-time session logic
const db = require('../config/db_config');
const quizHistoryController = require('./quizHistory.controller');

// 6 haneli session code üretici
function generateSessionCode() {
  // 6 haneli, sadece rakamdan oluşan, dizi olmayan string üret
  return (Math.floor(100000 + Math.random() * 900000)).toString();
}

exports.startSession = async (req, res) => {
  try {
    const { quizId, quiz_Id } = req.body;
    const sessionCode = generateSessionCode();
    const status = 'PENDING';
    const started_at = new Date().toISOString().split('T')[0]; // DATE format için
    const host_id = req.user?.id || 1;
    
    const finalQuizId = quizId || quiz_Id;
    
    console.log('Starting session for quiz:', finalQuizId, 'with host:', host_id);
    
    // Create session - UUID otomatik generate olacak
    const result = await db.query(
      'INSERT INTO live_sessions (started_at, quiz_id, status, host_id, session_code) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [started_at, finalQuizId, status, host_id, sessionCode]
    );

    const session = result.rows[0];

    // Get quiz details
    const quizResult = await db.query('SELECT * FROM quizzes WHERE id = $1', [finalQuizId]);
    const quiz = quizResult.rows[0];

    // Frontend Redux store uyumluluğu için response formatı
    res.status(201).json({
      message: 'Session started successfully',
      id: session.id,
      sessionId: session.id, // Frontend için ek field
      code: session.session_code,
      session_code: session.session_code, // Frontend için ek field
      quiz,
      status: session.status,
      host_id: session.host_id,
      success: true // Success flag for frontend
    });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.endSession = async (req, res) => {
  try {
    const sessionId = req.body?.sessionId || req.params?.sessionId;
    const ended_at = new Date().toISOString().split('T')[0]; // DATE format

    const result = await db.query(
      'UPDATE live_sessions SET status = $1, ended_at = $2 WHERE id = $3 RETURNING *',
      ['ENDED', ended_at, sessionId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Participants'ları da ended durumuna getir
    await db.query(
      'UPDATE participants SET status = $1, ended_at = $2 WHERE session_id = $3',
      [false, ended_at, sessionId]
    );

    // Save history for all participants
    try {
      await quizHistoryController.saveSessionResults(sessionId);
    } catch(historyErr){
      console.error('Failed to save session results to history', historyErr);
    }

    res.json({ 
      success: true, 
      message: 'Session ended successfully' 
    });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// To be edited if necessary
exports.getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log('Fetching session with sessionId:', sessionId); 

    // Fetch the session details from the database
    const result = await db.query('SELECT * FROM live_sessions WHERE id = $1', [sessionId]);

    if (result.rowCount === 0) {
      console.warn('Session not found for sessionId:', sessionId);
      return res.status(404).json({ error: 'Session not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching session:', error.message); 
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Katılımcı ekleme (by session code)
exports.addParticipant = async (req, res) => {
  try {
    console.log('addParticipant - full request body:', req.body);
    const { code, username } = req.body;
    
    console.log('addParticipant called with code:', code, 'username:', username);
    
    if (!code || !username) {
      console.log('Missing parameters - code:', !!code, 'username:', !!username);
      return res.status(400).json({ error: 'Code and username are required' });
    }

    // Session'ı koda göre bul
    const sessionCheck = await db.query(
      'SELECT ls.*, q.title, q.description FROM live_sessions ls JOIN quizzes q ON ls.quiz_id = q.id WHERE ls.session_code = $1',
      [code]
    );

    if (sessionCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Session not found with this code' });
    }

    const session = sessionCheck.rows[0];
    
    if (session.status === 'COMPLETED' || session.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Session has ended' });
    }

    // Geçici user oluştur veya mevcut user'ı bul
    let user;
    const userCheck = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (userCheck.rowCount > 0) {
      user = userCheck.rows[0];
    } else {
      // Geçici user oluştur
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('temp123', 10);
      const userResult = await db.query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING *',
        [username, hashedPassword, 'user']
      );
      user = userResult.rows[0];
    }    // Katılımcıyı session'a ekle
    const participantCheck = await db.query(
      'SELECT * FROM participants WHERE session_id = $1 AND user_id = $2',
      [session.id, user.id]
    );

    let participant;
    if (participantCheck.rowCount > 0) {
      // Katılımcı zaten var, sadece status'u güncelle ve joined_at'i resetle
      const result = await db.query(
        'UPDATE participants SET status = TRUE, joined_at = $3, score = 0 WHERE session_id = $1 AND user_id = $2 RETURNING *',
        [session.id, user.id, new Date()]
      );
      participant = result.rows[0];
      console.log('Updated existing participant:', participant);
    } else {
      // Yeni katılımcı ekle
      const result = await db.query(
        'INSERT INTO participants (session_id, user_id, joined_at, status, score) VALUES ($1, $2, $3, TRUE, 0) RETURNING *',
        [session.id, user.id, new Date()]
      );      participant = result.rows[0];
      console.log('Added new participant:', participant);
    }

    res.status(201).json({
      message: 'Participant added successfully',
      game: {
        id: session.id,
        code: session.session_code,
        title: session.title,
        description: session.description,
        status: session.status
      },
      participant: {
        ...participant,
        username: user.username      }
    });

    // Notify other participants about new user (if socket.io is available)
    if (global.io) {
      global.io.to(session.id.toString()).emit('userJoined', {
        username: user.username,
        userId: user.id,
        sessionId: session.id,
        timestamp: new Date().toISOString()
      });
    }  } catch (error) {
    console.error('Error adding participant:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Session'daki katılımcıları listeleme
exports.getParticipants = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await db.query(
      `SELECT p.*, u.username 
       FROM participants p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.session_id = $1 AND p.status = TRUE
       ORDER BY p.joined_at ASC`,
      [sessionId]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching participants:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Katılımcı çıkarma (artık silmek yerine status'u false yapıyor)
exports.removeParticipant = async (req, res) => {
  try {
    const { sessionId, userId } = req.params;

    const result = await db.query(
      'UPDATE participants SET status = FALSE WHERE session_id = $1 AND user_id = $2 RETURNING *',
      [sessionId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    res.status(200).json({
      message: 'Participant removed successfully',
      participant: result.rows[0]
    });
  } catch (error) {
    console.error('Error removing participant:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Session detaylarını katılımcılarla birlikte getirme
exports.getSessionWithParticipants = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Session bilgilerini al
    const sessionResult = await db.query(
      `SELECT ls.*, q.title as quiz_title, u.username as host_name
       FROM live_sessions ls
       JOIN quizzes q ON ls.quiz_id = q.id
       JOIN users u ON ls.host_id = u.id
       WHERE ls.id = $1`,
      [sessionId]
    );

    if (sessionResult.rowCount === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Katılımcıları al
    const participantsResult = await db.query(
      `SELECT p.*, u.username 
       FROM participants p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.session_id = $1 
       ORDER BY p.joined_at ASC`,
      [sessionId]
    );

    const session = sessionResult.rows[0];
    session.participants = participantsResult.rows;

    res.status(200).json(session);
  } catch (error) {
    console.error('Error fetching session details:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Aktif sessionları listeleme
exports.getActiveSessions = async (req, res) => {
  try {    const result = await db.query(
      `SELECT ls.*, q.title as quiz_title, u.username as host_name,
       (SELECT COUNT(*) FROM participants p WHERE p.session_id = ls.id) as participant_count
       FROM live_sessions ls
       JOIN quizzes q ON ls.quiz_id = q.id
       JOIN users u ON ls.host_id = u.id
       WHERE ls.status = 'PENDING' OR ls.status = 'ACTIVE'
       ORDER BY ls.started_at DESC`,
      []
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching active sessions:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Session durumunu kontrol etme
exports.checkSessionStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await db.query(
      'SELECT status FROM live_sessions WHERE id = $1',
      [sessionId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Session not found' 
      });
    }

    const session = result.rows[0];
    
    if (session.status === 'ENDED') {
      return res.status(400).json({ 
        success: false, 
        error: 'Session has ended' 
      });
    }

    res.json({ 
      success: true, 
      status: session.status
    });
  } catch (error) {
    console.error('Error checking session status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Liderlik tablosu
exports.getLeaderboard = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await db.query(
      `SELECT p.user_id, u.username, p.score
       FROM participants p
       JOIN users u ON p.user_id = u.id
       WHERE p.session_id = $1
       ORDER BY p.score DESC, p.joined_at ASC`,
      [sessionId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching leaderboard:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Aktif session state endpoint'i
exports.getSessionState = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await db.query(`
      SELECT ls.*, q.title as quiz_title, q.id as quiz_id, q.background_music_url
      FROM live_sessions ls
      LEFT JOIN quizzes q ON ls.quiz_id = q.id
      WHERE ls.id = $1
    `, [sessionId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = result.rows[0];
    
    // Get participants - status boolean olarak değişti
    const participantsResult = await db.query(`
      SELECT u.username, p.score, p.user_id, p.joined_at, p.id
      FROM participants p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.session_id = $1 AND p.status = true
    `, [sessionId]);

    const participants = participantsResult.rows;

    // Get quiz questions with options if session is ACTIVE
    let questions = [];
    if (session.status === 'ACTIVE' || session.status === 'PENDING') {
      const questionsResult = await db.query(
        'SELECT * FROM questions WHERE quiz_id = $1 ORDER BY id',
        [session.quiz_id]
      );

      questions = await Promise.all(
        questionsResult.rows.map(async (question) => {
          const optionsResult = await db.query(
            'SELECT * FROM options WHERE question_id = $1 ORDER BY id',
            [question.id]
          );
          return {
            ...question,
            options: optionsResult.rows,
          };
        })
      );
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        session_code: session.session_code,
        quiz: {
          title: session.quiz_title,
          id: session.quiz_id
        },
        status: session.status,
        background_music_url: session.background_music_url
      },
      participants: participants,
      questions: questions, // Quiz sorularını ekliyorum
      leaderboard: participants.sort((a, b) => b.score - a.score),
      phase: 'LOBBY',
      timeRemaining: 0,
      currentQuestion: null
    });
  } catch (error) {
    console.error('Error getting session state:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateSessionState = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { status } = req.body;

    console.log('updateSessionState called with:', { sessionId, status });

    // Only allow specific status updates
    const allowedStatuses = ['PENDING', 'ACTIVE', 'PAUSED', 'ENDED'];
    if (status && !allowedStatuses.includes(status)) {
      console.log('Invalid status provided:', status);
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await db.query(
      'UPDATE live_sessions SET status = $1 WHERE id = $2 RETURNING *',
      [status, sessionId]
    );

    console.log('Update result:', result.rowCount);

    if (result.rowCount === 0) {
      console.log('Session not found:', sessionId);
      return res.status(404).json({ error: 'Session not found' });
    }

    console.log('Session status updated successfully');
    res.json({ 
      success: true, 
      session: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating session state:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getSessionById = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await db.query(`
      SELECT ls.*, q.title as quiz_title, q.description as quiz_description,
             COUNT(p.id) as participant_count
      FROM live_sessions ls
      LEFT JOIN quizzes q ON ls.quiz_id = q.id
      LEFT JOIN participants p ON ls.id = p.session_id
      WHERE ls.id = $1
      GROUP BY ls.id, q.title, q.description
    `, [sessionId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = result.rows[0];
    res.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        quiz: {
          title: session.quiz_title,
          description: session.quiz_description
        },
        participant_count: session.participant_count,
        created_at: session.started_at
      }
    });
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getSessionGame = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get session with quiz details
    const sessionResult = await db.query(`
      SELECT ls.*, q.title, q.description, q.id as quiz_id
      FROM live_sessions ls
      JOIN quizzes q ON ls.quiz_id = q.id
      WHERE ls.id = $1
    `, [sessionId]);

    if (sessionResult.rowCount === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    // Get participants
    const participantsResult = await db.query(`
      SELECT u.username, p.score, p.user_id
      FROM participants p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.session_id = $1
    `, [sessionId]);

    const participants = participantsResult.rows.map(p => ({
      username: p.username || `User${p.user_id}`,
      score: p.score || 0,
      userId: p.user_id
    }));

    res.json({
      success: true,
      game: {
        id: session.quiz_id,
        title: session.title,
        description: session.description,
        status: session.status
      },
      participants: participants,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Error getting session game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.submitAnswer = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionId, answerId, optionId, selected_option_id } = req.body;
    const userId = req.user?.id || req.body.userId;
    const finalOptionId = selected_option_id || optionId || answerId;

    // Get or create participant
    let participantResult = await db.query(
      'SELECT id FROM participants WHERE session_id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    let participantId;
    if (participantResult.rowCount === 0) {
      // Create participant - status boolean değeri
      const insertResult = await db.query(
        'INSERT INTO participants (session_id, user_id, score, status) VALUES ($1, $2, 0, $3) RETURNING id',
        [sessionId, userId, true]
      );
      participantId = insertResult.rows[0].id;
    } else {
      participantId = participantResult.rows[0].id;
    }

    // Check if answer is correct
    const optionResult = await db.query(
      'SELECT is_correct FROM options WHERE id = $1',
      [finalOptionId]
    );

    const isCorrect = optionResult.rowCount > 0 ? optionResult.rows[0].is_correct : false;

    // Save answer - column name: selected_option_id, answered_at (DATE)
    const answerResult = await db.query(
      'INSERT INTO answers (participant_id, question_id, selected_option_id, is_correct, answered_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [participantId, questionId, finalOptionId, isCorrect, new Date().toISOString().split('T')[0]]
    );

    // Update participant score if correct
    if (isCorrect) {
      await db.query(
        'UPDATE participants SET score = score + 10 WHERE id = $1',
        [participantId]
      );
    }

    res.json({
      success: true,
      answer: answerResult.rows[0],
      correct: isCorrect
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getActivePublicSessions = async (req,res)=>{
  try{
    const result = await db.query(`
      SELECT ls.id as session_id, ls.session_code, q.title, q.description
      FROM live_sessions ls
      JOIN quizzes q ON q.id = ls.quiz_id
      WHERE ls.status = 'PENDING' AND q.is_public = true
      ORDER BY ls.started_at DESC`);
    res.json(result.rows);
  }catch(err){
    console.error('Error fetching active public sessions',err);
    res.status(500).json({error:'Failed to fetch active sessions'});
  }
};

