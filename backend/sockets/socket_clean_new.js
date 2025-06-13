// Central socket event handler
const sessionController = require('../controllers/session.controller');
const db = require('../config/db_config');

// Memory tabanlı session state yönetimi
const activeSessions = {};

// Yardımcı: State publish
function publishSessionState(io, sessionId) {
  const state = activeSessions[sessionId];
  if (state) {
    // Calculate answer statistics
    const answers = Object.values(state.answers || {});
    const answerStats = {
      total: answers.length,
      correct: answers.filter(a => a.correct).length,
      incorrect: answers.filter(a => !a.correct).length
    };
    
    const stateData = {
      ...state,
      sessionId,
      answerStats,
      timestamp: new Date().toISOString()
    };
    
    console.log('📡 Publishing sessionStateUpdate:', {
      sessionId,
      phase: state.phase,
      participantsCount: state.participants?.length,
      timestamp: stateData.timestamp
    });
    
    io.to(sessionId).emit('sessionStateUpdate', stateData);
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
    io.to(sessionId).emit('playMusic', { 
      type: 'question', 
      url: extra.musicUrl || null,
      sessionId: sessionId
    });
  }
  if (phase === 'answer') {
    io.to(sessionId).emit('playSound', { 
      type: 'answer', 
      url: extra.soundUrl || null,
      sessionId: sessionId
    });
  }
  if (phase === 'leaderboard') {
    io.to(sessionId).emit('showLeaderboard', state.leaderboard || []);
  }  if (phase === 'finished') {
    // Emit gameFinished event with proper data
    io.to(sessionId).emit('gameFinished', { 
      leaderboard: state.leaderboard,
      sessionId: sessionId
    });
    
    // Also emit quizCompleted for backward compatibility
    const finalLeaderboard = calculateFinalLeaderboard(sessionId);
    io.to(sessionId).emit('quizCompleted', {
      sessionId: sessionId,
      finalLeaderboard: finalLeaderboard,
      winner: finalLeaderboard.length > 0 ? finalLeaderboard[0] : null
    });
  }
}

// Katılımcı ekle helper
function addParticipantToSession(io, sessionId, userId, username, socketId) {
  // Don't add host as participant
  if (username === 'Host') {
    console.log('Skipping host addition to participants list');
    return;
  }

  if (!activeSessions[sessionId]) {
    activeSessions[sessionId] = {
      phase: 'lobby',
      participants: [],
      leaderboard: [],
      activeQuestion: null,
      questionStartTime: null,
      questionDuration: null,
      answers: {},
      currentQuestionIndex: 0,
      background_music_url: null
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
  
  // Kullanıcı katılma sesi için emit - tüm kullanıcılara gönder
  console.log('Emitting userJoined event for:', username);
  io.to(sessionId).emit('userJoined', {
    sessionId,
    participant: {
      id: userId,
      username,
      score: 0
    },
    playSound: true
  });
  
  console.log(`Participant ${username} added to session ${sessionId}`);
}

// Skor ve leaderboard güncelle
function updateLeaderboard(sessionId) {
  const state = activeSessions[sessionId];
  if (!state) return;
  // Sadece mevcut puanlara göre sırala
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
  return [...state.participants].sort((a, b) => b.score - a.score);
}

module.exports = (io) => {
  // Set global io for helper functions
  global.io = io;
  
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // Reconnection handling
    socket.on('reconnect_attempt', () => {
      console.log('Socket attempting to reconnect:', socket.id);
    });

    socket.on('reconnect', () => {
      console.log('Socket reconnected:', socket.id);
      if (socket.sessionId) {
        // Rejoin session room
        socket.join(socket.sessionId);
        // Resync session state
        publishSessionState(io, socket.sessionId);
      }
    });

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

        // Update session status to ACTIVE
        await db.query(
          'UPDATE live_sessions SET status = $1 WHERE id = $2',
          ['ACTIVE', data.sessionId]
        );

        // Initialize memory state
        if (data.sessionId) {
          activeSessions[data.sessionId] = {
            phase: 'lobby',
            participants: [],
            leaderboard: [],
            activeQuestion: null,
            questionStartTime: null,
            questionDuration: null,
            answers: {},
            currentQuestionIndex: 0,
            background_music_url: null
          };
        }

        // Notify all clients about session start
        io.to(data.sessionId).emit('sessionStateChanged', {
          phase: 'lobby',
          sessionId: data.sessionId
        });

      } catch (err) {
        console.error('Error in startSession:', err);
        callback({ error: err.message });
      }
    });

    // Start quiz event
    socket.on('startQuiz', async (data) => {
      try {
        const { sessionId } = data;
        console.log('startQuiz event received:', data);
        
        if (!activeSessions[sessionId]) {
          console.error('Session not found:', sessionId);
          return;
        }

        // Get quiz data from database
        const quizData = await getQuizData(sessionId);
        if (!quizData || !quizData.questions || quizData.questions.length === 0) {
          console.error('No questions found for session:', sessionId);
          return;
        }

        // Update session state
        activeSessions[sessionId] = {
          ...activeSessions[sessionId],
          phase: 'starting',
          questions: quizData.questions,
          currentQuestionIndex: 0,
          startTime: Date.now(),
          background_music_url: quizData.background_music_url
        };        // Broadcast quiz start to all clients
        io.to(sessionId).emit('gameStarted', {
          sessionId,
          startTime: Date.now(),
          totalQuestions: quizData.questions.length
        });        // Send background music event - use default if none specified, but only to players (not host)
        const backgroundMusicUrl = quizData.background_music_url || '/assets/soundEffects/background-music-224633.mp3';
          // Send background music only to players, not to host
        const room = io.sockets.adapter.rooms.get(sessionId);
        console.log('🎵 DEBUG: Room participants for background music:', room ? room.size : 'No room found');
        
        if (room) {
          room.forEach(socketId => {
            const socket = io.sockets.sockets.get(socketId);
            console.log('🎵 DEBUG: Checking socket:', {
              socketId,
              isHost: socket?.isHost,
              username: socket?.username,
              hasSocket: !!socket
            });
            
            if (socket && !socket.isHost && socket.username !== 'Host') {
              console.log('🎵 Sending background music to player:', socket.username);
              socket.emit('playBackgroundMusic', {
                sessionId: sessionId,
                url: backgroundMusicUrl,
                volume: 0.3
              });
              console.log('🎵 Background music event sent to:', socket.username, 'with URL:', backgroundMusicUrl);
            } else if (socket && socket.isHost) {
              console.log('🎵 Skipping background music for host:', socket.username);
            } else {              console.log('🎵 Skipping socket - no valid player:', {
                hasSocket: !!socket,
                isHost: socket?.isHost,
                username: socket?.username
              });
            }
          });
        }

        // Start countdown
        setTimeout(() => {
          if (activeSessions[sessionId]) {
            activeSessions[sessionId].phase = 'question';
            activeSessions[sessionId].questionStartTime = Date.now();
            activeSessions[sessionId].questionDuration = quizData.questions[0].duration_seconds || 30;
            activeSessions[sessionId].activeQuestion = quizData.questions[0];
              // Send question to host with correct answers
            const hostSockets = [...io.sockets.sockets.values()].filter(s => s.isHost && s.sessionId === sessionId);
            hostSockets.forEach(hostSocket => {
              hostSocket.emit('showQuestion', {
                sessionId,
                question: {
                  ...quizData.questions[0],
                  index: 1,
                  total: quizData.questions.length,
                  options: quizData.questions[0].options?.map(opt => ({
                    id: opt.id,
                    option_text: opt.option_text,
                    is_correct: opt.is_correct
                  }))
                },
                isHost: true
              });
            });

            // Send question to players without correct answers
            const playerSockets = [...io.sockets.sockets.values()].filter(s => !s.isHost && s.sessionId === sessionId);
            playerSockets.forEach(playerSocket => {
              playerSocket.emit('showQuestion', {
                sessionId,
                question: {
                  ...quizData.questions[0],
                  index: 1,
                  total: quizData.questions.length,
                  options: quizData.questions[0].options?.map(opt => ({
                    id: opt.id,
                    option_text: opt.option_text
                    // is_correct field excluded for players
                  }))
                },
                isHost: false
              });
            });
          }
        }, 5000); // 5 saniye bekle

      } catch (err) {
        console.error('Error in startQuiz:', err);
      }
    });

    // Host starts a specific question
    socket.on('showQuestion', (data) => {
      const { sessionId, question } = data;
      console.log('❓ SHOW QUESTION EVENT RECEIVED:', { sessionId, questionText: question?.question_text });
      if (!activeSessions[sessionId]) return;
      const state = activeSessions[sessionId];      state.activeQuestion = question;
      state.questionStartTime = Date.now();
      state.questionDuration = question.duration_seconds || 30;
      state.answers = {};
      state.currentQuestionIndex = question.index - 1;
      
      console.log('❓ Question details:', {
        id: question.id,
        text: question.question_text,
        points: question.points,
        duration: question.duration_seconds
      });
      
      setPhase(io, sessionId, 'question');
        // Send question to host with correct answers
      const hostSockets = [...io.sockets.sockets.values()].filter(s => s.isHost && s.sessionId === sessionId);
      hostSockets.forEach(hostSocket => {
        hostSocket.emit('showQuestion', {
          question: {
            ...question,
            options: question.options?.map(opt => ({
              id: opt.id,
              option_text: opt.option_text,
              is_correct: opt.is_correct
            }))
          },
          sessionId: sessionId,
          questionStartTime: state.questionStartTime,
          questionDuration: state.questionDuration,
          isHost: true
        });
      });

      // Send question to players without correct answers  
      const playerSockets = [...io.sockets.sockets.values()].filter(s => !s.isHost && s.sessionId === sessionId);
      playerSockets.forEach(playerSocket => {
        playerSocket.emit('showQuestion', {
          question: {
            ...question,
            options: question.options?.map(opt => ({
              id: opt.id,
              option_text: opt.option_text
              // is_correct field excluded for players
            }))
          },
          sessionId: sessionId,
          questionStartTime: state.questionStartTime,
          questionDuration: state.questionDuration,
          isHost: false
        });
      });
        
        console.log(`Question ${question.index} shown to session: ${sessionId}, sent to ${io.sockets.adapter.rooms.get(sessionId)?.size || 0} clients`);
    });    // Host shows correct answer
    socket.on('showCorrectAnswer', (data) => {
      const { sessionId, question, correctAnswer } = data;
      const state = activeSessions[sessionId];
      if (!state) return;
      
      console.log(`🔍 Showing correct answer for session: ${sessionId}`);
      setPhase(io, sessionId, 'reviewing');
      
      // Use the active question from state to ensure we have complete data including is_correct
      const completeQuestion = state.activeQuestion || question;
        // Broadcast correct answer to all participants with is_correct information
      io.to(sessionId).emit('showCorrectAnswer', {
        question: {
          ...completeQuestion,
          options: completeQuestion.options?.map(opt => ({
            id: opt.id,
            option_text: opt.option_text,
            is_correct: opt.is_correct // Include correct answer info for review phase
          }))
        },
        correctAnswer,
        sessionId
      });
        // Her kullanıcının cevabına göre ses efekti gönder
      state.participants.forEach(participant => {
        if (participant.userId && state.answers[participant.userId]) {
          const userAnswer = state.answers[participant.userId];
          const isCorrect = userAnswer.correct;
          
          console.log(`Sending sound to user ${participant.username} (${participant.userId}): ${isCorrect ? 'correct' : 'wrong'}`);
          
          // Kullanıcıya özel ses efekti gönder
          const userSocket = [...io.sockets.sockets.values()].find(s => s.userId === participant.userId);
          if (userSocket) {
            userSocket.emit('playSound', {
              type: isCorrect ? 'correct-answer' : 'wrong-answer',
              sessionId: sessionId,
              personal: true // Bu ses efekti sadece bu kullanıcı için
            });
            console.log(`Sound effect sent to ${participant.username}: ${isCorrect ? 'correct-answer' : 'wrong-answer'}`);
          } else {
            console.log(`Socket not found for user ${participant.username} (${participant.userId})`);
          }
        } else {
          console.log(`No answer found for user ${participant.username} (${participant.userId}), sending wrong sound`);
          // Cevap vermemiş kullanıcılar için yanlış ses
          const userSocket = [...io.sockets.sockets.values()].find(s => s.userId === participant.userId);
          if (userSocket) {
            userSocket.emit('playSound', {
              type: 'wrong-answer',
              sessionId: sessionId,
              personal: true
            });
            console.log(`Wrong answer sound sent to ${participant.username} (no answer given)`);
          }
        }
      });
      
      updateLeaderboard(sessionId);
      
      console.log(`Correct answer shown for session: ${sessionId} with personalized sound effects`);
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
        const { sessionId } = data;
        
        // First end the session in database
        const req = { body: { sessionId }, params: { sessionId } };
        const res = {
          status: (code) => ({
            json: (result) => {
              if (callback && typeof callback === 'function') {
                callback({ code, ...result });
              }
            }
          }),
          json: (result) => {
            if (callback && typeof callback === 'function') {
              callback(result);
            }
          }
        };
        
        await sessionController.endSession(req, res);
        
        // Clean up session state
        if (activeSessions[sessionId]) {
          delete activeSessions[sessionId];
        }
        
        // Notify all participants
        io.in(sessionId).emit('sessionEnded', {
          sessionId,
          message: 'Session has been ended by host'
        });
        
      } catch (err) {
        console.error('Error ending session:', err);
        if (callback && typeof callback === 'function') {
          callback({ error: err.message });
        }
      }
    });

    // Host join session event - doesn't add to participants list
    socket.on('hostJoinSession', (data) => {
      console.log('🏠 HOST JOIN EVENT RECEIVED:', data);
      socket.sessionId = data.sessionId;
      socket.username = 'Host';
      socket.isHost = true;
      socket.userId = data.userId;
      socket.join(data.sessionId);
      console.log(`🏠 HOST SUCCESSFULLY JOINED ROOM: ${data.sessionId}, Room size: ${io.sockets.adapter.rooms.get(data.sessionId)?.size || 0}`);
    });

    // Join session event with improved error handling
    socket.on('joinSession', async (data, callback) => {
      try {
        console.log('joinSession event received:', data);
        console.log('Socket ID:', socket.id, 'Room joining:', data.sessionId);
        
        // Check session status
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
          return;
        }

        // Set socket properties
        socket.sessionId = data.sessionId;
        socket.username = data.username;
        socket.userId = data.userId || null;
        socket.isHost = data.isHost || false;
        
        // Join room
        socket.join(data.sessionId);
        
        // Add participant to session state only if not host
        if (!data.isHost && data.username !== 'Host') {
          addParticipantToSession(io, data.sessionId, socket.userId, data.username, socket.id);
          
          // Kullanıcı katılım sesini çal
          io.to(data.sessionId).emit('playSound', {
            type: 'user-join',
            sessionId: data.sessionId
          });
        }
        
        // Notify all participants only if a real player joined (not host)
        if (!data.isHost && data.username !== 'Host') {
          io.in(data.sessionId).emit('userJoined', {
            username: data.username,
            userId: socket.userId,
            sessionId: data.sessionId,
            timestamp: new Date().toISOString()
          });
        }
        
        // Publish updated session state
        publishSessionState(io, data.sessionId);
        
        if (callback && typeof callback === 'function') {
          callback({
            success: true,
            username: data.username,
            sessionId: data.sessionId
          });
        }
        
        console.log(`Player ${data.username} successfully joined session ${data.sessionId}. Room members:`, io.sockets.adapter.rooms.get(data.sessionId)?.size || 0);
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
      
      // Find participant username
      const participant = state.participants.find(p => p.userId === userId);
      const username = participant ? participant.username : 'Unknown';
        // PUAN HESABI
      let pointsEarned = 0;      if (isCorrect) {
        // Temel puan (soruya özgü)
        const basePoints = state.activeQuestion?.points || 10;
        
        console.log('🎯 Question data for scoring:', {
          questionId: state.activeQuestion?.id,
          questionPoints: state.activeQuestion?.points,
          basePointsUsed: basePoints,
          activeQuestionObject: state.activeQuestion
        });
          // Hız bonusu hesaplama - maksimum basePoints'in %30'u kadar
        const responseTimeSec = (now - state.questionStartTime) / 1000;
        const maxTimeBonus = Math.floor(basePoints * 0.3); // Temel puanın %30'u
        
        // Zaman bonusu - hızlı cevap verenler daha çok bonus alır
        // Eğer responseTime >= questionDuration ise bonus 0
        let timeBonus = 0;
        if (responseTimeSec < state.questionDuration) {
          const timeRatio = responseTimeSec / state.questionDuration; // 0-1 arası
          timeBonus = Math.floor(maxTimeBonus * (1 - timeRatio)); // Hızlı cevap = yüksek bonus
        }
        
        pointsEarned = basePoints + timeBonus;
        
        console.log(`Score calculation for ${username}: base=${basePoints}, timeBonus=${timeBonus}, total=${pointsEarned}, responseTime=${responseTimeSec}s, maxTime=${state.questionDuration}s`);
      }
      
      if (participant) {
        participant.score = (participant.score || 0) + pointsEarned;
        
        // Veritabanındaki participant score'unu güncelle
        db.query(
          'UPDATE participants SET score = $1 WHERE session_id = $2 AND user_id = $3',
          [participant.score, sessionId, userId]
        ).catch(err => {
          console.error('Error updating participant score in database:', err);
        });
      }state.answers[userId] = { 
        answer, 
        optionId,
        correct: isCorrect,
        timestamp: now,
        userId: userId,
        username: username,
        points: pointsEarned
      };
      
      // Ses efektleri timer bitiminde çalacak, burada çalmıyor
      // io.to(sessionId).emit('playSound', { 
      //   type: isCorrect ? 'correct-answer' : 'wrong-answer',
      //   sessionId: sessionId
      // });
      
      // Notify host about answer submission
      io.in(sessionId).emit('answerSubmitted', {
        sessionId,
        userId,
        username,
        isCorrect,
        totalAnswers: Object.keys(state.answers).length,
        totalParticipants: state.participants.length
      });
      
      updateLeaderboard(sessionId);
      publishSessionState(io, sessionId);
    });    

    // Oyun fazı geçişi event'i (host tetikler)
    socket.on('setPhase', (data) => {
      const { sessionId, phase, extra } = data;
      setPhase(io, sessionId, phase, extra);
    });

    // Get current session state event
    socket.on('getSessionState', async (data, callback) => {
      try {
        const { sessionId } = data;
        const sessionState = activeSessions[sessionId];
        
        if (!sessionState) {
          // Database'den session state'i getir
          const result = await db.query(
            'SELECT state FROM live_sessions WHERE id = $1',
            [sessionId]
          );
          
          if (result.rowCount > 0 && result.rows[0].state) {
            const dbState = JSON.parse(result.rows[0].state);
            activeSessions[sessionId] = dbState;
          }
        }
        
        if (callback && typeof callback === 'function') {
          callback({
            success: true,
            state: activeSessions[sessionId] || {
              phase: 'lobby',
              participants: [],
              leaderboard: [],
              activeQuestion: null,
              questionStartTime: null,
              questionDuration: null,
              answers: {},
              currentQuestionIndex: 0
            }
          });
        }
        
        publishSessionState(io, sessionId);
      } catch (err) {
        console.error('Error getting session state:', err);
        if (callback && typeof callback === 'function') {
          callback({ success: false, error: 'Session durumu alınırken hata oluştu' });
        }
      }
    });

    // Oyun tekrar başlatma event'i (host tetikler)
    socket.on('restartGame', (data) => {
      const { sessionId } = data;
      restartGame(io, sessionId);
    });    // Finish game event (host tetikler)
    socket.on('finishGame', (data) => {
      const { sessionId } = data;
      const state = activeSessions[sessionId];
      if (!state) return;
      
      // Calculate final leaderboard
      const finalLeaderboard = calculateFinalLeaderboard(sessionId);
      
      // Update session phase
      state.phase = 'finished';
      
      // Determine winner and send appropriate sounds
      if (finalLeaderboard.length > 0) {
        const winner = finalLeaderboard[0];
        
        // Send win/lose sounds to each participant
        state.participants.forEach(participant => {
          const isWinner = participant.userId === winner.userId;
          io.to(sessionId).emit('playSound', {
            type: isWinner ? 'game-win' : 'game-lose',
            sessionId: sessionId,
            targetUserId: participant.userId // Optional: target specific user
          });
        });
      }
      
      // Notify all participants about quiz completion
      io.in(sessionId).emit('quizCompleted', {
        sessionId,
        finalLeaderboard,
        winner: finalLeaderboard.length > 0 ? finalLeaderboard[0] : null,
        message: 'Quiz tamamlandı!'
      });
      
      publishSessionState(io, sessionId);
    });

    // Show leaderboard event (host tetikler)  
    socket.on('showLeaderboard', (data) => {
      const { sessionId } = data;
      const finalLeaderboard = calculateFinalLeaderboard(sessionId);
      
      io.in(sessionId).emit('showFinalLeaderboard', {
        sessionId,
        leaderboard: finalLeaderboard
      });
    });    

    // Leave session event
    socket.on('leaveSession', async (data) => {
      try {
        const { sessionId } = data;
        
        if (socket.sessionId === sessionId) {
          // Remove from session
          const sessionState = activeSessions[sessionId];
          if (sessionState) {
            sessionState.participants = sessionState.participants.filter(
              p => p.socketId !== socket.id
            );
            
                        // Update database - only for real users, not host
            if (socket.userId && socket.username !== 'Host' && typeof socket.userId === 'number') {
              await db.query(
               'UPDATE participants SET status = $1, ended_at = $2 WHERE session_id = $3 AND user_id = $4',
               [false, new Date().toISOString().split('T')[0], sessionId, socket.userId]
             );
            }
            
            // Notify others
            socket.to(sessionId).emit('userLeft', {
              username: socket.username,
              userId: socket.userId,
              sessionId: sessionId
            });
            
            publishSessionState(io, sessionId);
          }
          
          socket.leave(sessionId);
          socket.sessionId = null;
          socket.username = null;
          socket.userId = null;
        }
      } catch (err) {
        console.error('Error leaving session:', err);
      }
    });

    // Improved disconnect handling
    socket.on('disconnect', async () => {
      try {
        if (socket.isHost && socket.sessionId) {
          // Notify all participants
          io.to(socket.sessionId).emit('sessionEnded', { 
            reason: 'Host disconnected'
          });

          // Update database
                     await db.query(
             'UPDATE live_sessions SET status = $1, ended_at = $2 WHERE id = $3',
             ['ENDED', new Date().toISOString().split('T')[0], socket.sessionId]
           );

          // Clean up session from memory
          delete activeSessions[socket.sessionId];

        } else if (socket.sessionId && socket.username) {
          // Handle participant disconnect
          const sessionState = activeSessions[socket.sessionId];
          if (sessionState) {
            // Remove participant from session state
            sessionState.participants = sessionState.participants.filter(
              p => p.username !== socket.username && p.socketId !== socket.id
            );
            
            // Remove from leaderboard
            sessionState.leaderboard = sessionState.leaderboard.filter(
              p => p.username !== socket.username
            );
            
            // Update database - only for real users, not host
            if (socket.userId && socket.username !== 'Host' && typeof socket.userId === 'number') {
              await db.query(
               'UPDATE participants SET status = $1, ended_at = $2 WHERE session_id = $3 AND user_id = $4',
               [false, new Date().toISOString().split('T')[0], socket.sessionId, socket.userId]
             );
            }
            
            // Notify remaining participants
            io.to(socket.sessionId).emit('userLeft', { 
              username: socket.username,
              userId: socket.userId,
              sessionId: socket.sessionId
            });
            
            // Update session state
            publishSessionState(io, socket.sessionId);
          }
        }
      } catch (err) {
        console.error('Error in disconnect handler:', err);
      }
    });

    // Session state updated event - frontend için
    socket.on('sessionStateUpdated', (data) => {
      const { sessionId } = data;
      publishSessionState(io, sessionId);
    });
  });
};

module.exports.activeSessions = activeSessions;
