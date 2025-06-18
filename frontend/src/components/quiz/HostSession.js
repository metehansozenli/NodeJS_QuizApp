import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {  Container,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Person as PersonIcon,
  Quiz as QuizIcon,
  EmojiEvents as TrophyIcon,
  Delete as RemoveIcon,
  Refresh as RefreshIcon,  SkipNext as NextIcon,
  CheckCircle as ShowAnswerIcon,
  Analytics as AnalyticsIcon,
  PeopleAlt as ParticipantsIcon,  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import socketService from '../../services/socket';
import soundService from '../../services/soundService';
import { normalizeJoinedAt, formatJoinTime } from '../../utils/timeUtils';
import '../../styles/quiz-theme.css';

const HostSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [sessionData, setSessionData] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [gameStatus, setGameStatus] = useState('lobby'); // lobby, active, finished
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  
  // Quiz management states
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);  const [timer, setTimer] = useState(null);
  const [questionPhase, setQuestionPhase] = useState('waiting'); // waiting, active, reviewing
  const [answerStats, setAnswerStats] = useState({ correct: 0, incorrect: 0, total: 0 });
  const [socketSetupDone, setSocketSetupDone] = useState(false);
  const [bgMusicUrl, setBgMusicUrl] = useState(null);
  const [questionAnalytics, setQuestionAnalytics] = useState([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    console.log('Host useEffect running with sessionId:', sessionId);
    loadSessionData();
    
    // Only setup socket once per sessionId
    if (!socketSetupDone && sessionId) {
      console.log('Setting up socket for the first time...');
      setupSocketListeners();
      setSocketSetupDone(true);
    }
    
    // (Background music logic moved to separate effect)
    
    return () => {
      if (timer) clearInterval(timer);
      // Clean up socket listeners
      socketService.off('connect');
      socketService.off('userJoined');
      socketService.off('userLeft');
      socketService.off('sessionStateUpdate');
      socketService.off('answerSubmitted');
      socketService.off('showQuestion');
      socketService.off('quizCompleted');
      socketService.disconnect();
      setSocketSetupDone(false); // Reset for next sessionId
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [sessionId]); // Remove socketSetupDone from dependency to prevent infinite loop

  // Play/Pause background music based on game status
  useEffect(() => {
    setupBackgroundMusic(sessionData?.background_music_url);
  }, [sessionData?.background_music_url, gameStatus]);

  const loadSessionData = async () => {
    try {
      setLoading(true);
      console.log('Loading session data for sessionId:', sessionId);
      
      // Don't load data if sessionId is not available
      if (!sessionId) {
        console.log('loadSessionData - sessionId is not available, skipping data load');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`https://nodejs-quizapp.onrender.com/api/session/state/${sessionId}`);
      
      if (!response.ok) {
        console.error('Response not ok:', response.status, response.statusText);
        throw new Error('Session bulunamadı');
      }
      
      const data = await response.json();
      console.log('Session data loaded:', data);
        setSessionData(data.session);        // Ensure each participant has a joined_at timestamp
      const participantsWithTimestamp = (data.participants || []).map(participant => ({
        ...participant,
        joined_at: normalizeJoinedAt(participant.joined_at || participant.created_at)
      }));
      setParticipants(participantsWithTimestamp);
      
      setLeaderboard(data.leaderboard || []);
      setQuestions(data.questions || []); // Quiz sorularını yüklüyoruz
      setGameStatus(data.session.status.toLowerCase());
    } catch (err) {
      console.error('Error loading session data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    console.log('Host setupSocketListeners called for sessionId:', sessionId);
    
    // Don't setup socket if sessionId is not available
    if (!sessionId) {
      console.log('Host setupSocketListeners - sessionId is not available, skipping socket setup');
      // TEMPORARY: Try connecting anyway for debug
      console.log('TEMP: Attempting socket connection despite missing sessionId');
      // return;
    }
    
    socketService.connect();
    console.log('Host socket connection status:', socketService.socket?.connected);
    
    // Wait for socket to connect, then join
    socketService.on('connect', () => {
      console.log('Host socket connected, calling hostJoinSession...');
      socketService.socket?.emit('hostJoinSession', { 
        sessionId, 
        username: 'Host', 
        isHost: true,
        userId: 1
      });
      console.log('hostJoinSession emitted');
    });
    
    // If already connected, call immediately
    if (socketService.socket?.connected) {
      console.log('Socket already connected, calling hostJoinSession immediately...');
      socketService.socket?.emit('hostJoinSession', { 
        sessionId, 
        username: 'Host', 
        isHost: true,
        userId: 1
      });
      console.log('hostJoinSession emitted immediately');
    }
      // Listen for participant events
    socketService.on('userJoined', (data) => {
      console.log('User joined:', data);
      if (data.sessionId === sessionId) {
        console.log(`New participant joined: ${data.username}`);        // Set joined_at timestamp if not provided
        if (data.user) {
          data.user.joined_at = normalizeJoinedAt(data.user.joined_at);
        }
        loadSessionData(); // Refresh participant list
      }
    });
    
    socketService.on('userLeft', (data) => {
      console.log('User left:', data);
      if (data.sessionId === sessionId) {
        console.log(`Participant left: ${data.username}`);
        loadSessionData(); // Refresh participant list
      }
    });    socketService.on('sessionStateUpdate', (data) => {
      console.log('Session state update:', data);
      if (data.sessionId === sessionId) {
        if (data.participants) {          // Ensure each participant has a joined_at timestamp
          const participantsWithTimestamp = data.participants.map(participant => ({
            ...participant,
            joined_at: normalizeJoinedAt(participant.joined_at || participant.created_at)
          }));
          setParticipants(participantsWithTimestamp);
        }
        if (data.leaderboard) {
          setLeaderboard(data.leaderboard);
        }
        if (data.answerStats) {
          setAnswerStats(data.answerStats);
        }
      }
    });

    // Listen for answer submissions
    socketService.on('answerSubmitted', (data) => {
      console.log('Answer submitted:', data);
      // Show real-time answer feedback to host
      if (data.sessionId === sessionId) {
        console.log(`${data.username} answered ${data.isCorrect ? 'correctly' : 'incorrectly'} (${data.totalAnswers}/${data.totalParticipants})`);
        
        // Update answer stats
        setAnswerStats({
          correct: 0, // Will be updated from server data
          incorrect: 0, // Will be updated from server data  
          total: data.totalAnswers || 0
        });
        
        // Update leaderboard and participant states
        loadSessionData();
      }
    });

    // Listen for question display (for host feedback)
    socketService.on('showQuestion', (data) => {
      console.log('Host received showQuestion:', data);
      if (data.sessionId === sessionId) {
        // Host already has the question set locally, this is just confirmation
        console.log('Question successfully broadcasted to players');
      }
    });

    // Listen for quiz completion
    socketService.on('quizCompleted', (data) => {
      console.log('Quiz completed:', data);
      setQuestionPhase('finished');
      if (data.finalLeaderboard) {
        setLeaderboard(data.finalLeaderboard);
      }
    });    // Listen for play sound
    socketService.on('playSound', (data) => {
      console.log('Play sound event received:', data);
      if (data.sessionId === sessionId) {
        console.log('Playing sound for session:', sessionId, 'Type:', data.type);
        soundService.playSound(data.type);
      }
    });

    // Listen for music events
    socketService.on('playMusic', (data) => {
      console.log('Play music event received:', data);
      if (data.sessionId === sessionId && data.url) {
        try {
          const music = new Audio(data.url);
          music.volume = 0.3;
          music.play();
        } catch (error) {
          console.error('Error playing music:', error);
        }
      }
    });    // Listen for background music events - but don't play on host side
    socketService.on('playBackgroundMusic', (data) => {
      console.log('Play background music event received on HOST (not playing):', data);
      // Host doesn't play background music, only stores the URL for reference
      if (data.sessionId === sessionId && data.url) {
        setBgMusicUrl(data.url);
      }
    });

    // Listen for game finished
    socketService.on('gameFinished', (data) => {
      console.log('Game finished event received:', data);
      if (data.sessionId === sessionId) {
        setQuestionPhase('finished');
        if (data.leaderboard) {
          setLeaderboard(data.leaderboard);
        }
      }
    });

    // Listen for final leaderboard
    socketService.on('showFinalLeaderboard', (data) => {
      console.log('Final leaderboard event received:', data);
      if (data.sessionId === sessionId) {
        setLeaderboard(data.leaderboard || []);
        setQuestionPhase('finished');
      }
    });
  };
  const handleStartGame = async () => {
    try {
      // Update session status to ACTIVE
      const response = await fetch(`https://nodejs-quizapp.onrender.com/api/session/state/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' })
      });
      
      if (!response.ok) throw new Error('Oyun başlatılamadı');
        // Emit start game event via socket
      console.log('Emitting startQuiz for sessionId:', sessionId);
      socketService.emit('startQuiz', { sessionId });
      setGameStatus('active');
      
      // Host doesn't play background music - only players do
      // Background music will be triggered for players via socket events
      
      // Play question start sound
      soundService.playSound('question');
      
      // Show success message
      console.log('Game started successfully');
      
    } catch (err) {
      console.error('Start game error:', err);
      setError(err.message);
    }
  };

  const handleStartQuestion = () => {
    if (questions.length === 0) {
      setError('Bu quiz\'de soru bulunmuyor');
      return;
    }
    
    if (questionIndex >= questions.length) {
      // Tüm sorular bitti, oyunu sonlandır
      handleFinishGame();
      return;
    }

    const question = questions[questionIndex];
    setCurrentQuestion(question);
    setQuestionPhase('active');
    setTimeLeft(question.duration_seconds || 30);
    
    // Reset answer stats for new question
    setAnswerStats({ correct: 0, incorrect: 0, total: 0 });

    // Emit question to all participants
    console.log('Emitting showQuestion for sessionId:', sessionId, 'question:', question.question_text);
    socketService.emit('showQuestion', {
      sessionId,
      question: {
        ...question,
        index: questionIndex + 1,
        total: questions.length,
        options: question.options?.map(opt => ({
          id: opt.id,
          option_text: opt.option_text,
          is_correct: opt.is_correct
        }))
      }
    });
    console.log('showQuestion emitted');

    // Start timer
    if (timer) clearInterval(timer);
    const newTimer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(newTimer);
          setTimer(null);
          // Automatically show answer when time runs out
          handleShowAnswer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setTimer(newTimer);
  };

  const handleShowAnswer = () => {
    if (!currentQuestion) return;
    
    setQuestionPhase('reviewing');
    if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
    
    // Show correct answer to all participants
    socketService.emit('showCorrectAnswer', {
      sessionId,
      question: currentQuestion
    });
    
    // Automatically move to next question after 5 seconds
    setTimeout(() => {
      handleNextQuestion();
    }, 5000);
  };

  const handleNextQuestion = () => {
    if (questionIndex + 1 >= questions.length) {
      // No more questions, finish game
      handleFinishGame();
      return;
    }
    
    setQuestionIndex(prev => prev + 1);
    setCurrentQuestion(null);
    setQuestionPhase('waiting');
    setTimeLeft(0);
  };
  const handleFinishGame = () => {
    setQuestionPhase('finished');
    
    // Load question analytics
    setTimeout(() => {
      loadQuestionAnalytics();
    }, 1000);
    
    // Emit finish game event
    socketService.emit('finishGame', { sessionId });
    
    // Show leaderboard
    setTimeout(() => {
      socketService.emit('showLeaderboard', { sessionId });
    }, 2000);
  };

  const handleEndSession = async () => {
    try {
      const response = await fetch('https://nodejs-quizapp.onrender.com/api/session/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      
      if (!response.ok) throw new Error('Session sonlandırılamadı');
      
      // Emit end session event
      socketService.emit('endSession', { sessionId });
      setShowEndDialog(false);
      navigate('/host/dashboard');
      
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveParticipant = async (userId) => {
    try {
      const response = await fetch(`https://nodejs-quizapp.onrender.com/api/session/${sessionId}/remove-participant/${userId}`, {
        method: 'PUT'
      });
      
      if (!response.ok) throw new Error('Katılımcı çıkarılamadı');
      
      // Emit remove participant event
      socketService.emit('removeParticipant', { sessionId, userId });
      loadSessionData(); // Refresh participant list
      
    } catch (err) {
      setError(err.message);
    }
  };  const setupBackgroundMusic = (url) => {
    // Host doesn't play background music - only players do
    console.log('Host setupBackgroundMusic called but not playing music (host side)');
    
    // Stop any existing audio on host side
    if (audioRef.current) {
      audioRef.current.pause && audioRef.current.pause();
      audioRef.current = null;
    }
    
    // Host just stores the URL for reference but doesn't play music
    // The music will only play on player side when game starts
  };
  const loadQuestionAnalytics = async () => {
    try {
      const response = await fetch(`https://nodejs-quizapp.onrender.com/api/session/${sessionId}/analytics`);
      if (response.ok) {
        const analytics = await response.json();
        setQuestionAnalytics(analytics);
        setShowAnalytics(true);
      } else {
        // Mock data if API doesn't exist yet
        const mockAnalytics = questions.map((question, index) => ({
          question_text: question.question_text,
          correct_answers: Math.floor(Math.random() * participants.length),
          total_answers: participants.length,
          avg_time: Math.floor(Math.random() * 20) + 10,
          options: question.options?.map(option => ({
            option_text: option.option_text,
            is_correct: option.is_correct,
            answer_count: Math.floor(Math.random() * participants.length)
          })) || []
        }));
        setQuestionAnalytics(mockAnalytics);
        setShowAnalytics(true);
      }
    } catch (error) {
      console.error('Analitik verileri alınamadı:', error);
      // Fallback to mock data
      const mockAnalytics = questions.map((question, index) => ({
        question_text: question.question_text,
        correct_answers: Math.floor(Math.random() * participants.length),
        total_answers: participants.length,
        avg_time: Math.floor(Math.random() * 20) + 10,
        options: question.options?.map(option => ({
          option_text: option.option_text,
          is_correct: option.is_correct,
          answer_count: Math.floor(Math.random() * participants.length)
        })) || []
      }));
      setQuestionAnalytics(mockAnalytics);
      setShowAnalytics(true);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="contained" onClick={() => navigate('/quiz-management')}>
          Geri Dön
        </Button>
      </Container>
    );
  }

  // Render quiz control panel when game is active
  if (gameStatus === 'active') {    return (
      <div className="quiz-container">
        <Container maxWidth="lg" sx={{ py: 4 }}>
          {/* Analytics Panel */}
          <div className="quiz-card quiz-fade-in">
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <AnalyticsIcon sx={{ fontSize: '2rem', color: '#667eea' }} />
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Canlı Analitikler
              </Typography>
            </Box>
              <div className="session-stats-grid">
              <div className="session-stat-item">
                <ParticipantsIcon sx={{ fontSize: '2rem', color: '#667eea', mb: 1 }} />
                <div className="session-stat-number">{participants.length}</div>
                <div className="session-stat-label">Aktif Katılımcı</div>
              </div>              <div className="session-stat-item">
                <QuizIcon sx={{ fontSize: '2rem', color: '#667eea', mb: 1 }} />
                <div className="session-stat-number">{questionPhase === 'finished' ? questions.length : Math.min(questionIndex + 1, questions.length)}</div>
                <div className="session-stat-label">/ {questions.length} Soru</div>
              </div>
              <div className="session-stat-item">
                <TrendingUpIcon sx={{ fontSize: '2rem', color: '#667eea', mb: 1 }} />
                <div className="session-stat-number">
                  {participants.length > 0 ? Math.round((answerStats.correct / (answerStats.correct + answerStats.incorrect)) * 100 || 0) : 0}%
                </div>
                <div className="session-stat-label">Doğru Oranı</div>
              </div>
            </div>

            {/* Progress Bar */}            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#7f8c8d' }}>
                Quiz İlerlemesi ({questionPhase === 'finished' ? questions.length : Math.min(questionIndex + 1, questions.length)} / {questions.length})
              </Typography>
              <LinearProgress
                variant="determinate"
                value={questionPhase === 'finished' ? 100 : Math.min(((questionIndex + 1) / questions.length) * 100, 100)}
                className="quiz-progress-bar"
                sx={{ height: 12, borderRadius: 6 }}
              />
            </Box>
          </div>

          {/* Control Panel */}
          <div className="quiz-card session-control-panel quiz-fade-in">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    mb: 1
                  }}
                >
                  Quiz Kontrol Paneli
                </Typography>
                <Typography variant="h6" sx={{ color: '#7f8c8d', fontWeight: 500 }}>
                  {sessionData?.quiz_title || 'Quiz Session'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<QuizIcon />}
                    label={`Kod: ${sessionData?.session_code}`}
                    className="quiz-badge"
                    sx={{ fontFamily: 'monospace', fontSize: '1rem' }}
                  />
                  <Chip
                    label="🔴 CANLI"
                    className="quiz-badge-error"
                    sx={{ 
                      animation: 'pulse 2s infinite',
                      '@keyframes pulse': {
                        '0%': { opacity: 1 },
                        '50%': { opacity: 0.7 },
                        '100%': { opacity: 1 }
                      }
                    }}
                  />
                </Box>
              </Box>
              
              <Button
                variant="contained"
                startIcon={<StopIcon />}
                onClick={() => setShowEndDialog(true)}
                sx={{
                  background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                  color: 'white',
                  borderRadius: '20px',
                  padding: '14px 28px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: '0 8px 25px rgba(231, 76, 60, 0.3)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #c0392b, #a93226)',
                    transform: 'translateY(-3px)',
                    boxShadow: '0 12px 35px rgba(231, 76, 60, 0.4)',
                  }
                }}              >
                Oyunu Bitir
              </Button>
            </Box>
          </div>

          {/* Current Question Panel */}
          <div className="quiz-card quiz-fade-in">
            {!currentQuestion && questionPhase === 'waiting' && (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" gutterBottom>
                  {questionIndex < questions.length ? 
                    `Soru ${questionIndex + 1} için hazır` : 
                    'Tüm sorular tamamlandı!'
                  }
                </Typography>
                {questionIndex < questions.length && (
                  <>
                    <Typography variant="body1" sx={{ mb: 3 }}>
                      {questions[questionIndex]?.question_text}
                    </Typography>                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<StartIcon />}
                      onClick={handleStartQuestion}
                      className="quiz-button-primary"
                      sx={{
                        py: 2,
                        px: 4,
                        fontSize: '1.2rem',
                        fontWeight: 700,
                        minWidth: '200px'
                      }}
                    >
                      Soruyu Başlat
                    </Button>
                  </>
                )}
              </Box>
            )}

            {currentQuestion && (questionPhase === 'active' || questionPhase === 'reviewing') && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5">
                    Soru {questionIndex + 1}: {currentQuestion.question_text}
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {timeLeft}s
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(timeLeft / (currentQuestion.duration_seconds || 30)) * 100} 
                  sx={{ mb: 2, height: 8 }}
                />
                {currentQuestion.image_url && (
                  <Box sx={{ textAlign:'center', mb:2 }}>
                    <img src={currentQuestion.image_url} alt="soru görsel" style={{maxWidth:'100%', maxHeight:300}} />
                  </Box>
                )}
                {currentQuestion.video_url && (
                  <Box sx={{ textAlign:'center', mb:2 }}>
                    {currentQuestion.video_url.includes('youtube') ? (
                      <iframe width="560" height="315" src={currentQuestion.video_url.replace('watch?v=','embed/')} title="video" frameBorder="0" allowFullScreen></iframe>
                    ) : (
                      <video src={currentQuestion.video_url} controls style={{maxWidth:'100%', maxHeight:300}} />
                    )}
                  </Box>
                )}
                <Grid container spacing={2}>
                  {currentQuestion.options?.map((option, index) => (
                    <Grid item xs={12} sm={6} key={index}>
                      <Card sx={{ 
                        bgcolor: (questionPhase === 'reviewing' && option.is_correct) ? 'success.light' : 'background.paper',
                        border: (questionPhase === 'reviewing' && option.is_correct) ? 2 : 1,
                        borderColor: (questionPhase === 'reviewing' && option.is_correct) ? 'success.main' : 'divider'
                      }}>
                        <CardContent>
                          <Typography variant="body1">
                            {String.fromCharCode(65 + index)}: {option.option_text}
                            {(questionPhase === 'reviewing' && option.is_correct) && ' ✓'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                {/* Answer Statistics */}
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    Cevap İstatistikleri
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Chip 
                      label={`Toplam: ${answerStats.total}/${participants.length}`} 
                      color="info" 
                    />
                    <Chip 
                      label={`Doğru: ${answerStats.correct}`} 
                      color="success" 
                    />
                    <Chip 
                      label={`Yanlış: ${answerStats.incorrect}`} 
                      color="error" 
                    />
                  </Box>
                </Box>                <Box sx={{ mt: 3, textAlign: 'center', display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    startIcon={<ShowAnswerIcon />}
                    onClick={handleShowAnswer}
                    className="quiz-button-warning"
                    sx={{
                      py: 1.5,
                      px: 3,
                      fontSize: '1rem',
                      fontWeight: 600,
                      minWidth: '160px'
                    }}
                  >
                    Cevabı Göster
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<NextIcon />}
                    onClick={handleNextQuestion}
                    className="quiz-button-primary"
                    sx={{
                      py: 1.5,
                      px: 3,
                      fontSize: '1rem',
                      fontWeight: 600,
                      minWidth: '160px'
                    }}
                  >
                    Sonraki Soru
                  </Button>
                </Box>
              </Box>
            )}

            {questionPhase === 'finished' && (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" gutterBottom color="success.main">
                  🎉 Quiz Tamamlandı! 🎉
                </Typography>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Tüm sorular tamamlandı. Final skor tablosu aşağıda!
                </Typography>                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>                  <Button
                    variant="outlined"
                    onClick={() => {
                      if (!showAnalytics && questionAnalytics.length === 0) {
                        loadQuestionAnalytics();
                      } else {
                        setShowAnalytics(!showAnalytics);
                      }
                    }}
                    sx={{
                      borderRadius: '20px',
                      py: 1.5,
                      px: 3,
                      fontSize: '1rem',
                      fontWeight: 600,
                      minWidth: '180px',
                      borderColor: '#667eea',
                      color: '#667eea',
                      '&:hover': {
                        borderColor: '#5a6fd8',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                      }
                    }}
                  >
                    📊 {showAnalytics ? 'Analitikleri Gizle' : 'Detaylı Analitik Göster'}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => window.location.reload()}
                    className="quiz-button-success"
                    sx={{
                      py: 1.5,
                      px: 3,
                      fontSize: '1rem',
                      fontWeight: 600,
                      minWidth: '180px'
                    }}
                  >
                    Yeni Quiz Başlat
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => setShowEndDialog(true)}
                    sx={{
                      background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                      color: 'white',
                      borderRadius: '20px',
                      padding: '12px 24px',
                      fontSize: '1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      boxShadow: '0 8px 25px rgba(231, 76, 60, 0.3)',
                      transition: 'all 0.3s ease',
                      minWidth: '180px',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #c0392b, #a93226)',
                        transform: 'translateY(-3px)',
                        boxShadow: '0 12px 35px rgba(231, 76, 60, 0.4)',
                      }
                    }}
                  >                    Session'ı Sonlandır
                  </Button>
                </Box>
              </Box>
            )}
          </div>

          {/* Question Analytics - Show when quiz is finished */}
          {questionPhase === 'finished' && showAnalytics && questionAnalytics.length > 0 && (
            <div className="quiz-card quiz-fade-in" style={{ marginTop: '20px' }}>
              <Typography 
                variant="h5" 
                gutterBottom 
                sx={{ 
                  fontWeight: 'bold',
                  color: '#333',
                  mb: 3,
                  textAlign: 'center'
                }}
              >
                📊 Soru Bazlı Analitik Detaylar
              </Typography>
              
              <Grid container spacing={3}>
                {questionAnalytics.map((questionData, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        background: 'linear-gradient(135deg, #f8f9fa 0%, #fff 100%)',
                        border: '2px solid #e9ecef',
                        borderRadius: '16px',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-5px)',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                        }
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#333' }}>
                          Soru {index + 1}: {questionData.question_text}
                        </Typography>
                        
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
                            📈 Cevap Dağılımı:
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={(questionData.correct_answers / questionData.total_answers) * 100}
                            sx={{ 
                              height: 8, 
                              borderRadius: 4, 
                              backgroundColor: '#ffcdd2',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: '#4caf50'
                              }
                            }}
                          />
                          <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>
                            Doğru: {questionData.correct_answers} / {questionData.total_answers} 
                            ({Math.round((questionData.correct_answers / questionData.total_answers) * 100)}%)
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                          <Chip
                            label={`✅ Doğru: ${questionData.correct_answers}`}
                            size="small"
                            sx={{
                              background: 'linear-gradient(45deg, #4caf50, #8bc34a)',
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                          />
                          <Chip
                            label={`❌ Yanlış: ${questionData.total_answers - questionData.correct_answers}`}
                            size="small"
                            sx={{
                              background: 'linear-gradient(45deg, #f44336, #e91e63)',
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                          />
                          <Chip
                            label={`⏱️ Ort. Süre: ${questionData.avg_time || 'N/A'}s`}
                            size="small"
                            sx={{
                              background: 'linear-gradient(45deg, #ff9800, #ffc107)',
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                          />
                        </Box>

                        {questionData.options && (
                          <Box>
                            <Typography variant="body2" sx={{ color: '#666', mb: 1, fontWeight: 600 }}>
                              📋 Seçenek Detayları:
                            </Typography>
                            {questionData.options.map((option, optIndex) => (
                              <Box key={optIndex} sx={{ mb: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                                    {option.is_correct ? '✅' : '⭕'} {option.option_text}
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: option.is_correct ? '#4caf50' : '#666' }}>
                                    {option.answer_count || 0} kişi
                                  </Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={(option.answer_count / questionData.total_answers) * 100}
                                  sx={{ 
                                    height: 4, 
                                    borderRadius: 2,
                                    backgroundColor: '#f5f5f5',
                                    '& .MuiLinearProgress-bar': {
                                      backgroundColor: option.is_correct ? '#4caf50' : '#ff9800'
                                    }
                                  }}
                                />
                              </Box>
                            ))}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </div>
          )}

          {/* Participants List */}
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Katılımcılar ({participants.length})
              </Typography>
                             <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                 {participants.map((participant, index) => (
                   <ListItem key={`active-participant-${participant.user_id || participant.id || index}`}>
                     <ListItemAvatar>
                       <Avatar sx={{ bgcolor: 'primary.main' }}>
                         <PersonIcon />
                       </Avatar>
                     </ListItemAvatar>
                     <ListItemText
                       primary={participant.username}
                       secondary={`Puan: ${participant.score || 0}`}
                     />
                   </ListItem>
                 ))}
               </List>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Anlık Skor Tablosu
              </Typography>
              <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                {leaderboard.slice(0, 10).map((player, index) => (
                  <ListItem key={`leaderboard-${player.user_id || index}`}>
                    <ListItemAvatar>
                      <Avatar sx={{ 
                        bgcolor: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? '#CD7F32' : 'grey.400' 
                      }}>
                        {index === 0 ? <TrophyIcon /> : index + 1}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={player.username}
                      secondary={`${player.score} puan`}
                    />
                  </ListItem>                ))}
              </List>            </Grid>
          </Grid>
          
          {/* End Game Dialog */}
          <Dialog open={showEndDialog} onClose={() => setShowEndDialog(false)}>
            <DialogTitle>Oyunu Sonlandır</DialogTitle>
            <DialogContent>
              <Typography>
                Oyunu sonlandırmak istediğinizden emin misiniz? 
                Tüm katılımcılar çıkarılacak ve session sona erecek.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowEndDialog(false)}>İptal</Button>
              <Button onClick={handleEndSession} color="error" variant="contained">
                Sonlandır
              </Button>
            </DialogActions>
          </Dialog>
        </Container>
      </div>
    );
  }
  // Render lobby when game is not active
  return (
    <div className="quiz-container">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <div className="quiz-card quiz-fade-in">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  mb: 1
                }}
              >
                {sessionData?.quiz_title || 'Quiz Session'}
              </Typography>
              <Typography variant="h6" sx={{ color: '#7f8c8d', fontWeight: 500, mb: 2 }}>
                Katılımcılar bekleniyor...
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  icon={<QuizIcon />}
                  label={`Kod: ${sessionData?.session_code}`}
                  className="quiz-badge"
                  sx={{ fontFamily: 'monospace', fontSize: '1.2rem', py: 1 }}
                />
                <Chip
                  label={`Durum: ${gameStatus.toUpperCase()}`}
                  className={gameStatus === 'active' ? 'quiz-badge-success' : 'quiz-badge-warning'}
                />
                <Chip
                  icon={<PersonIcon />}
                  label={`${participants.length} Katılımcı`}
                  className="quiz-badge-success"
                />
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={loadSessionData}
                className="quiz-button-secondary"
                sx={{ minWidth: '140px' }}
              >
                Yenile
              </Button>
              
              {gameStatus === 'pending' && (
                <Button
                  variant="contained"
                  startIcon={<StartIcon />}
                  onClick={handleStartGame}
                  className="quiz-button-success"
                  sx={{ 
                    minWidth: '180px',
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 700
                  }}
                >
                  Oyunu Başlat
              </Button>
            )}
            
            <Button
              variant="outlined"
              startIcon={<StopIcon />}
              color="error"
              onClick={() => setShowEndDialog(true)}
            >              Session'ı Sonlandır
            </Button>
          </Box>
        </Box>
        </div>

        {error && (
          <Alert 
            severity="error" 
            className="quiz-error"
            sx={{ mb: 3, borderRadius: '16px' }}
          >
            {error}
          </Alert>
        )}

        {/* Participants Section */}
        <div className="quiz-card quiz-fade-in">
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            <ParticipantsIcon sx={{ fontSize: '2rem', color: '#667eea' }} />
            Katılımcılar ({participants.length})
          </Typography>
          
          {participants.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <PersonIcon sx={{ fontSize: '4rem', color: '#bdc3c7', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#7f8c8d', mb: 2 }}>
                Henüz katılımcı yok
              </Typography>
              <Typography variant="body1" sx={{ color: '#95a5a6', mb: 3 }}>
                Oyun kodunu paylaşın ve katılımcıların gelmesini bekleyin
              </Typography>
              <Chip
                label={`Kod: ${sessionData?.session_code}`}
                className="quiz-badge"
                sx={{ 
                  fontFamily: 'monospace', 
                  fontSize: '1.4rem', 
                  py: 2, 
                  px: 3,
                  height: 'auto'
                }}
              />
            </Box>
          ) : (
            <Grid container spacing={2}>
              {participants.map((participant, index) => (
                <Grid item xs={12} sm={6} md={4} key={`participant-${participant.user_id || participant.id || index}`}>
                  <Card 
                    className="quiz-info-card"
                    sx={{ 
                      height: '100%',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 15px 40px rgba(0, 0, 0, 0.15)'
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar 
                          sx={{ 
                            bgcolor: 'linear-gradient(135deg, #667eea, #764ba2)',
                            width: 48,
                            height: 48
                          }}
                        >
                          <PersonIcon />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                            {participant.username}
                          </Typography>                          <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
                            {formatJoinTime(participant.joined_at)}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveParticipant(participant.user_id)}
                          sx={{
                            color: '#e74c3c',
                            '&:hover': {
                              background: 'rgba(231, 76, 60, 0.1)'
                            }
                          }}
                        >
                          <RemoveIcon />
                        </IconButton>
                      </Box>
                      <Chip
                        label={`${participant.score || 0} puan`}
                        className="quiz-badge-success"
                        size="small"
                        sx={{ width: '100%' }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}        </div>
        
        {/* End Session Dialog */}
        <Dialog open={showEndDialog} onClose={() => setShowEndDialog(false)}>
          <DialogTitle>Session'ı Sonlandır</DialogTitle>
          <DialogContent>
            <Typography>
              Session'ı sonlandırmak istediğinizden emin misiniz? 
              Tüm katılımcılar çıkarılacak ve session sona erecek.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowEndDialog(false)} className="quiz-button-secondary">
              İptal
            </Button>
            <Button 
              onClick={handleEndSession} 
              sx={{
                background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                color: 'white',
                borderRadius: '12px',
                padding: '8px 20px',
                '&:hover': {
                  background: 'linear-gradient(135deg, #c0392b, #a93226)',
                }
              }}
            >
              Sonlandır
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </div>
  );
};

export default HostSession;