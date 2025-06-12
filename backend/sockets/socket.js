// Central socket event handler
const sessionController = require('../controllers/session.controller');
const db = require('../config/db_config');

// Memory tabanlı session state yönetimi
const activeSessions = {};

// Yardımcı: State publish
function publishSessionState(io, sessionId) {
  const state = activeSessions[sessionId];
  if (state) {
    io.to(sessionId).emit('sessionStateUpdate', state);
  }
}

// Oyun fazı değişimi ve özel eventler
function setPhase(io, sessionId, phase, extra = {}) {
  const state = activeSessions[sessionId];
  if (!state) return;
  state.phase = phase;
  publishSessionState(io, sessionId);
  
  // Faz bazlı özel eventler
  if (phase === 'question') {
    io.to(sessionId).emit('playMusic', { type: 'question', url: extra.musicUrl || null });
  }
  if (phase === 'answer') {
    io.to(sessionId).emit('playSound', { type: 'answer', url: extra.soundUrl || null });
  }
  if (phase === 'leaderboard') {
    io.to(sessionId).emit('showLeaderboard', state.leaderboard || []);
  }
  if (phase === 'finished') {
    io.to(sessionId).emit('gameFinished', { leaderboard: state.leaderboard });
  }
}

// Katılımcı ekle helper
function addParticipantToSession(io, sessionId, userId, username, socketId) {
  if (!activeSessions[sessionId]) {
    activeSessions[sessionId] = {
      phase: 'lobby',
      participants: [],
      leaderboard: [],
      activeQuestion: null,
      questionStartTime: null,
      questionDuration: null,
      answers: {},
      currentQuestionIndex: 0
    };
  }
  const state = activeSessions[sessionId];
  
  // Remove any existing participant with same username or userId to prevent duplicates
  state.participants = state.participants.filter(
    p => p.username !== username && p.userId !== userId && p.socketId !== socketId
  );
  
  // Add new participant
  const participant = { userId, username, score: 0, socketId };
  state.participants.push(participant);
  publishSessionState(io, sessionId);
  console.log(`Participant ${username} added to session ${sessionId}`);
}

// Skor ve leaderboard güncelle
function updateLeaderboard(sessionId) {
  const state = activeSessions[sessionId];
  if (!state) return;
  
  // Update participant scores based on current answers
  state.participants.forEach(participant => {
    let totalScore = 0;
    
    // Calculate score from all answers
    Object.values(state.answers).forEach(answer => {
      if (answer.userId === participant.userId && answer.correct) {
        // Base points for correct answer
        totalScore += 10;
        
        // Time bonus (max 5 points for fast answers)
        if (state.questionStartTime) {
          const responseTime = (answer.timestamp - state.questionStartTime) / 1000;
          const timeBonus = Math.max(0, 5 - Math.floor(responseTime / 2));
          totalScore += timeBonus;
        }
      }
    });
    
    participant.score = totalScore;
  });
  
  // Update leaderboard with sorted participants
  state.leaderboard = [...state.participants].sort((a, b) => b.score - a.score);
  
  publishSessionState(global.io, sessionId);
}

// Oyun tekrar başlatma
function restartGame(io, sessionId) {
  if (!activeSessions[sessionId]) return;
  const state = activeSessions[sessionId];
  state.phase = 'lobby';
  state.activeQuestion = null;
  state.questionStartTime = null;
  state.questionDuration = null;
  state.answers = {};
  state.leaderboard = [];
  state.participants.forEach(p => p.score = 0);
  publishSessionState(io, sessionId);
  io.to(sessionId).emit('gameRestarted');
}

// Final leaderboard hesaplama
function calculateFinalLeaderboard(sessionId) {
  const state = activeSessions[sessionId];
  if (!state) return [];
  
  // Calculate scores based on correct answers and response time
  const participants = state.participants.map(participant => {
    let score = 0;
    const userAnswers = Object.values(state.answers).filter(a => a.userId === participant.userId);
    
    userAnswers.forEach(answer => {
      if (answer.correct) {
        // Base points for correct answer
        score += 10;
        // Bonus points for speed (max 5 extra points)
        const responseTime = answer.timestamp - state.questionStartTime;
        const timeBonus = Math.max(0, 5 - Math.floor(responseTime / 1000));
        score += timeBonus;
      }
    });
    
    return {
      ...participant,
      score,
      correctAnswers: userAnswers.filter(a => a.correct).length
    };
  });
  
  // Sort by score descending
  return participants.sort((a, b) => b.score - a.score);
}

module.exports = (io) => {
  // Set global io for helper functions
  global.io = io;
  
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // Start session event
    socket.on('startSession', async (data, callback) => {
      try {
        socket.isHost = true;
        socket.quizId = data.quiz_Id;
        socket.sessionId = data.sessionId;
        
        const req = { body: data };
        const res = {
          status: (code) => ({ json: (result) => callback({ code, ...result }) }),
          json: (result) => callback(result)
        };
        await sessionController.startSession(req, res);

        // Memory state başlat
        if (data.sessionId) {
          activeSessions[data.sessionId] = {
            phase: 'lobby',
            participants: [],
            leaderboard: [],
            activeQuestion: null,
            questionStartTime: null,
            questionDuration: null,
            answers: {},
            currentQuestionIndex: 0
          };
        }
      } catch (err) {
        callback({ error: err.message });
      }
    });    // Real-time quiz game events
    socket.on('startQuiz', async (data) => {
      const { sessionId } = data;
      console.log('startQuiz event received for session:', sessionId);
      
      // **DATABASE UPDATE: Set session status to ACTIVE**
      try {
        await db.query(
          'UPDATE live_sessions SET status = $1 WHERE id = $2',
          ['ACTIVE', sessionId]
        );
        console.log(`Session ${sessionId} status updated to ACTIVE in database`);
      } catch (dbError) {
        console.error('Error updating session status to ACTIVE:', dbError);
      }
      
      if (!activeSessions[sessionId]) {
        activeSessions[sessionId] = {
          phase: 'starting',
          participants: [],
          leaderboard: [],
          activeQuestion: null,
          questionStartTime: null,
          questionDuration: null,
          answers: {},
          currentQuestionIndex: 0
        };
      }
      
      setPhase(io, sessionId, 'starting');
      io.to(sessionId).emit('gameStarted', { 
        sessionId,
        timestamp: new Date().toISOString() 
      });
      console.log(`Quiz started for session: ${sessionId}`);
    });

    // Host starts a specific question
    socket.on('showQuestion', (data) => {
      const { sessionId, question } = data;
      console.log('showQuestion event received:', { sessionId, questionText: question?.question_text });
      if (!activeSessions[sessionId]) return;
      const state = activeSessions[sessionId];
      state.activeQuestion = question;
      state.questionStartTime = Date.now();
      state.questionDuration = question.duration_seconds || 30;
      state.answers = {};
      state.currentQuestionIndex = question.index - 1;
      setPhase(io, sessionId, 'question');
        // Host'a tam soru (doğru cevap dahil)
      console.log(`Sending question to HOST for session: ${sessionId}`);
      io.to(sessionId).emit('showQuestion', {
        sessionId: sessionId,
        question: {
          ...question,
          options: question.options?.map(opt => ({
            id: opt.id,
            option_text: opt.option_text,
            is_correct: opt.is_correct // host için doğru cevap
          })),
          showCorrect: true // host ekranı için
        },
        isHost: true // Updated: use isHost instead of forHost
      });
        // Oyunculara sadece soru ve şıklar (doğru cevap yok)
      console.log(`Sending question to PLAYERS for session: ${sessionId}`);
      console.log(`Active participants in session: ${state.participants?.length || 0}`);
      
      // Debug: List all participants
      if (state.participants) {
        state.participants.forEach(p => {
          console.log(`  - Participant: ${p.username} (${p.userId}) - Socket: ${p.socketId}`);
        });
      }
      
      // Debug: List all sockets in this room
      const roomSockets = io.sockets.adapter.rooms.get(sessionId);
      console.log(`Sockets in room ${sessionId}: ${roomSockets ? Array.from(roomSockets) : 'none'}`);
      
      const playerQuestionData = {
        sessionId: sessionId,
        question: {
          ...question,
          options: question.options?.map(opt => ({
            id: opt.id,
            option_text: opt.option_text
          })),
          showCorrect: false // oyuncu ekranı için
        },
        isHost: false // Updated: use isHost instead of forHost
      };
      
      console.log('PLAYER question data:', JSON.stringify(playerQuestionData, null, 2));
      
      io.to(sessionId).except(socket.id).emit('showQuestion', playerQuestionData);
      
      console.log(`Question ${question.index} shown to session: ${sessionId}`);
      
      // AUTOMATIC PROGRESSION: Set timer for showing correct answer
      setTimeout(() => {
        // Show correct answer to all participants
        io.to(sessionId).emit('showCorrectAnswer', {
          question: question,
          sessionId: sessionId
        });
        console.log(`Correct answer shown for session: ${sessionId}`);
        
        // AUTOMATIC PROGRESSION: Set timer for next question
        setTimeout(() => {
          const nextQuestionIndex = (state.currentQuestionIndex || 0) + 1;
          
          // Check if there are more questions (this would need actual quiz data)
          // For now, emit the autoNextQuestion event - frontend will handle the logic
          io.to(sessionId).emit('autoNextQuestion', {
            sessionId: sessionId,
            nextIndex: nextQuestionIndex
          });
          console.log(`Auto next question signal sent for session: ${sessionId}`);
          
        }, 4000); // 4 seconds to show correct answer
        
      }, (question.duration_seconds || 30) * 1000); // Question duration in milliseconds
    });

    // Host shows correct answer
    socket.on('showCorrectAnswer', (data) => {
      const { sessionId, question, correctAnswer } = data;
      if (!activeSessions[sessionId]) return;
      
      setPhase(io, sessionId, 'showingAnswer');
      
      // Broadcast correct answer to all participants
      io.to(sessionId).emit('showCorrectAnswer', {
        question,
        correctAnswer,
        sessionId
      });
      
      updateLeaderboard(sessionId);
      
      console.log(`Correct answer shown for session: ${sessionId}`);
    });

    // Host finishes the game
    socket.on('finishGame', (data) => {
      const { sessionId } = data;
      if (!activeSessions[sessionId]) return;
      
      setPhase(io, sessionId, 'finished');
      
      // Calculate final leaderboard
      const finalLeaderboard = calculateFinalLeaderboard(sessionId);
      
      io.to(sessionId).emit('finishGame', { sessionId });
      io.to(sessionId).emit('showLeaderboard', { 
        leaderboard: finalLeaderboard,
        sessionId 
      });
      
      console.log(`Game finished for session: ${sessionId}`);
    });

    // End session event
    socket.on('endSession', async (data, callback) => {
      try {
        const req = { body: data };
        const res = {
          status: (code) => ({ json: (result) => callback({ code, ...result }) }),
          json: (result) => callback(result)
        };
        await sessionController.endSession(req, res);
      } catch (err) {
        callback({ error: err.message });
      }
    });

    // Join session event    
    socket.on('joinSession', async (data, callback) => {
      try {
        console.log('joinSession event received:', data);
        
        // Session durumunu kontrol et
        const req = { params: { sessionId: data.sessionId } };
        let sessionValid = false;
        let sessionError = null;
        
        const res = {
          status: (code) => ({
            json: (result) => {
              if (code === 200 && result.success) {
                sessionValid = true;
              } else {
                sessionError = { ...result, code };
              }
              return res;
            }
          }),
          json: (result) => {
            if (result.success) {
              sessionValid = true;
            } else {
              sessionError = result;
            }
            return res;
          }
        };
        
        await sessionController.checkSessionStatus(req, res);
        
        if (!sessionValid && sessionError) {
          if (callback && typeof callback === 'function') {
            callback(sessionError);
          }
          return;        }

        socket.sessionId = data.sessionId;
        socket.username = data.username;
        socket.isHost = data.isHost || false;
        
        // **DATABASE: Only add participants to database if not host**
        let userId = data.userId;
        try {
          if (!data.isHost && !userId) {
            // Check if user exists by username
            const userCheck = await db.query('SELECT * FROM users WHERE username = $1', [data.username]);
            
            if (userCheck.rowCount > 0) {
              userId = userCheck.rows[0].id;            } else {
              // Create temporary user if doesn't exist
              const userResult = await db.query(
                'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING *',
                [data.username, 'temp', 'player']
              );
              userId = userResult.rows[0].id;            }
          }
          
          // Only add to participants table if not host
          if (!data.isHost && userId) {
            // Ensure participant entry exists in database
            const participantCheck = await db.query(
              'SELECT * FROM participants WHERE session_id = $1 AND user_id = $2',
              [data.sessionId, userId]
            );

            if (participantCheck.rowCount > 0) {            // Update existing participant status
            await db.query(
              'UPDATE participants SET status = TRUE, joined_at = $3, score = 0 WHERE session_id = $1 AND user_id = $2',
              [data.sessionId, userId, new Date()]
            );
          } else {
            // Create new participant entry
            await db.query(
              'INSERT INTO participants (session_id, user_id, joined_at, status, score) VALUES ($1, $2, $3, TRUE, 0)',
              [data.sessionId, userId, new Date()]
            );
          }
          
          console.log(`Database synchronized: User ${data.username} (${userId}) joined session ${data.sessionId}`);
          } else if (data.isHost) {
            console.log(`Host ${data.username} joined session ${data.sessionId} (not added to participants)`);
          }
        } catch (dbError) {
          console.error('Error synchronizing user with database:', dbError);
          // Fall back to socket ID if database operation fails
          if (!data.isHost) {
            userId = socket.id;
          }
        }
          socket.userId = userId;
        socket.join(data.sessionId);
        
        // Only add to memory session if not host
        if (!data.isHost) {
          addParticipantToSession(io, data.sessionId, socket.userId, data.username, socket.id);
          
          io.in(data.sessionId).emit('userJoined', {
            username: data.username,
            userId: socket.userId,
            sessionId: data.sessionId,
            timestamp: new Date().toISOString()
          });
        }
        
        publishSessionState(io, data.sessionId);
        
        if (callback && typeof callback === 'function') {
          callback({
            success: true,
            username: data.username,
            sessionId: data.sessionId
          });
        }
      } catch (err) {
        console.error('Error in joinSession:', err);
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: 'Quiz oturumuna katılırken bir hata oluştu' });
        }
      }
    });

    // Cevap gönderme (validasyonlu)
    socket.on('submitAnswer', (data) => {
      const { sessionId, userId, answer, optionId } = data;
      const state = activeSessions[sessionId];
      if (!state || state.phase !== 'question') return;
      
      // Süre kontrolü
      const now = Date.now();
      if (now - state.questionStartTime > state.questionDuration * 1000) return;
      
      // Aynı kullanıcıdan birden fazla cevap engelle
      if (state.answers[userId]) return;
      
      // Check if answer is correct (find correct option index)
      const correctOptionIndex = state.activeQuestion?.options?.findIndex(opt => opt.is_correct);
      const isCorrect = answer === correctOptionIndex || optionId === state.activeQuestion?.options?.[correctOptionIndex]?.id;
      
      state.answers[userId] = { 
        answer, 
        optionId,
        correct: isCorrect,
        timestamp: now,
        userId: userId
      };
      
      updateLeaderboard(sessionId);
      publishSessionState(io, sessionId);
    });    

    // Oyun fazı geçişi event'i (host tetikler)
    socket.on('setPhase', (data) => {
      const { sessionId, phase, extra } = data;
      setPhase(io, sessionId, phase, extra);
    });

    // Get current session state event
    socket.on('getSessionState', (data) => {
      const { sessionId } = data;
      publishSessionState(io, sessionId);
    });

    // Oyun tekrar başlatma event'i (host tetikler)
    socket.on('restartGame', (data) => {
      const { sessionId } = data;
      restartGame(io, sessionId);    });    

    // Refresh participants event (for host)
    socket.on('refreshParticipants', (data) => {
      const { sessionId } = data;
      const targetSessionId = sessionId || socket.sessionId;
      
      if (targetSessionId && activeSessions[targetSessionId]) {
        // Send current session state to requester
        publishSessionState(io, targetSessionId);
        console.log(`Participants refreshed for session: ${targetSessionId}`);
      }
    });    // Leave session event
    socket.on('leaveSession', async (data) => {
      const { sessionId, username, userId } = data;
      const targetSessionId = sessionId || socket.sessionId;
      const targetUsername = username || socket.username;
      const targetUserId = userId || socket.userId;
      
      if (targetSessionId) {
        // Remove from socket room
        socket.leave(targetSessionId);
        
        // Remove from active session state (use multiple criteria to ensure cleanup)
        if (activeSessions[targetSessionId]) {
          activeSessions[targetSessionId].participants = 
            activeSessions[targetSessionId].participants.filter(p => 
              p.userId !== targetUserId && 
              p.username !== targetUsername && 
              p.socketId !== socket.id
            );
          
          // Also remove from leaderboard if exists
          activeSessions[targetSessionId].leaderboard = 
            activeSessions[targetSessionId].leaderboard.filter(p => 
              p.userId !== targetUserId && 
              p.username !== targetUsername
            );
          
          // Publish updated session state
          publishSessionState(io, targetSessionId);
        }
        
        // **DATABASE UPDATE: Set participant status to FALSE**
        try {
          if (targetUserId) {
            await db.query(
              'UPDATE participants SET status = FALSE WHERE session_id = $1 AND user_id = $2',
              [targetSessionId, targetUserId]
            );
            console.log(`Database updated: Participant ${targetUsername} (${targetUserId}) status set to FALSE in session ${targetSessionId}`);
          }
        } catch (dbError) {
          console.error('Error updating participant status in database:', dbError);
        }
        
        // Notify other participants
        io.to(targetSessionId).emit('userLeft', { 
          username: targetUsername,
          userId: targetUserId,
          sessionId: targetSessionId,
          timestamp: new Date().toISOString()
        });
        
        // Clear socket session data
        socket.sessionId = null;
        socket.username = null;
        socket.userId = null;
        
        console.log(`User ${targetUsername} left session ${targetSessionId}`);
      }
    });

    // Disconnect event
    socket.on('disconnect', async () => {
      if (socket.isHost && socket.sessionId) {
        io.to(socket.sessionId).emit('sessionEnded', { 
          reason: 'Host disconnected'
        });

        // Clean up session from activeSessions
        delete activeSessions[socket.sessionId];

        // End session in database
        const req = {
          body: {
            sessionId: socket.sessionId,
            status: false,
            ended_At: new Date().toISOString().slice(0, 19).replace('T', ' ')
          }
        };
        const res = {
          status: () => ({ json: () => {} }),
          json: () => {}
        };
        await sessionController.endSession(req, res);      } else if (socket.sessionId && socket.username) {
        // If a regular participant disconnects, remove from activeSessions
        const sessionState = activeSessions[socket.sessionId];
        if (sessionState) {
          // Remove participant from session state
          sessionState.participants = sessionState.participants.filter(
            p => p.username !== socket.username && p.socketId !== socket.id
          );
          
          // Also remove from leaderboard if exists
          sessionState.leaderboard = sessionState.leaderboard.filter(
            p => p.username !== socket.username
          );
          
          // Update session state for all participants
          publishSessionState(io, socket.sessionId);
        }

        // **DATABASE UPDATE: Set participant status to FALSE on disconnect**
        try {
          if (socket.userId) {
            await db.query(
              'UPDATE participants SET status = FALSE WHERE session_id = $1 AND user_id = $2',
              [socket.sessionId, socket.userId]
            );
            console.log(`Database updated: Participant ${socket.username} (${socket.userId}) status set to FALSE on disconnect from session ${socket.sessionId}`);
          }
        } catch (dbError) {
          console.error('Error updating participant status on disconnect:', dbError);
        }

        // Emit userLeft event
        io.to(socket.sessionId).emit('userLeft', { 
          username: socket.username,
          userId: socket.userId || socket.id
        });
      }
      console.log('Socket disconnected:', socket.id, socket.username || 'unknown user');
    });
  });
};

module.exports.activeSessions = activeSessions;
