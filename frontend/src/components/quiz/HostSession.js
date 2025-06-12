import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Paper,
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
  Divider,
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
  Refresh as RefreshIcon,
  SkipNext as NextIcon,
  CheckCircle as ShowAnswerIcon,
} from '@mui/icons-material';
import socketService from '../../services/socket';
import { apiService } from '../../services/api';

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
  const [timeLeft, setTimeLeft] = useState(0);
  const [timer, setTimer] = useState(null);
  const [questionPhase, setQuestionPhase] = useState('waiting'); // waiting, active, reviewing
  const [answerStats, setAnswerStats] = useState({ correct: 0, incorrect: 0, total: 0 });
  const [socketSetupDone, setSocketSetupDone] = useState(false);
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
      
      const response = await fetch(`http://localhost:5000/api/session/state/${sessionId}`);
      
      if (!response.ok) {
        console.error('Response not ok:', response.status, response.statusText);
        throw new Error('Session bulunamadı');
      }
      
      const data = await response.json();
      console.log('Session data loaded:', data);
      
      setSessionData(data.session);
      setParticipants(data.participants || []);
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
        console.log(`New participant joined: ${data.username}`);
        loadSessionData(); // Refresh participant list
      }
    });
    
    socketService.on('userLeft', (data) => {
      console.log('User left:', data);
      if (data.sessionId === sessionId) {
        console.log(`Participant left: ${data.username}`);
        loadSessionData(); // Refresh participant list
      }
    });
    
    socketService.on('sessionStateUpdate', (data) => {
      console.log('Session state update:', data);
      if (data.sessionId === sessionId) {
        if (data.participants) {
          setParticipants(data.participants);
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
    });
  };

  const handleStartGame = async () => {
    try {
      // Update session status to ACTIVE
      const response = await fetch(`http://localhost:5000/api/session/state/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' })
      });
      
      if (!response.ok) throw new Error('Oyun başlatılamadı');
      
      // Emit start game event via socket
      console.log('Emitting startQuiz for sessionId:', sessionId);
      socketService.emit('startQuiz', { sessionId });
      setGameStatus('active');
      
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
        total: questions.length
      }
    });
    console.log('showQuestion emitted');

    // Start timer
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
    
    // Emit finish game event
    socketService.emit('finishGame', { sessionId });
    
    // Show leaderboard
    setTimeout(() => {
      socketService.emit('showLeaderboard', { sessionId });
    }, 2000);
  };

  const handleEndSession = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/session/end', {
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
      const response = await fetch(`http://localhost:5000/api/session/${sessionId}/remove-participant/${userId}`, {
        method: 'PUT'
      });
      
      if (!response.ok) throw new Error('Katılımcı çıkarılamadı');
      
      // Emit remove participant event
      socketService.emit('removeParticipant', { sessionId, userId });
      loadSessionData(); // Refresh participant list
      
    } catch (err) {
      setError(err.message);
    }
  };

  const setupBackgroundMusic = (url) => {
    if (!url) {
      if (audioRef.current) audioRef.current.pause();
      return;
    }

    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');

    // Stop previous
    if (audioRef.current) {
      audioRef.current.pause && audioRef.current.pause();
      audioRef.current = null;
    }

    if (!isYouTube) {
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = 0.6;
      audioRef.current = audio;
      if (gameStatus === 'active') {
        audio.play().catch(() => {});
      }
    } else {
      const videoIdMatch = url.match(/(?:v=|\.be\/)([A-Za-z0-9_-]{11})/);
      if (videoIdMatch) {
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${videoIdMatch[1]}?autoplay=1&loop=1&playlist=${videoIdMatch[1]}&controls=0&mute=0`;
        iframe.style.display = 'none';
        iframe.setAttribute('data-quiz-bg', 'true');
        document.body.appendChild(iframe);
        audioRef.current = {
          pause: () => iframe.parentNode && iframe.parentNode.removeChild(iframe)
        };
      }
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
  if (gameStatus === 'active') {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="h4" gutterBottom>
                Quiz Kontrol Paneli
              </Typography>
              <Typography variant="h6" color="textSecondary">
                {sessionData?.quiz_title || 'Quiz Session'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Chip
                  icon={<QuizIcon />}
                  label={`Kod: ${sessionData?.session_code}`}
                  color="primary"
                  size="large"
                />
                <Chip
                  label={`Soru: ${questionIndex + 1}/${questions.length}`}
                  color="info"
                />
                <Chip
                  label={`Katılımcı: ${participants.length}`}
                  color="success"
                />
              </Box>
            </Box>
            
            <Button
              variant="outlined"
              startIcon={<StopIcon />}
              color="error"
              onClick={() => setShowEndDialog(true)}
            >
              Oyunu Bitir
            </Button>
          </Box>

          {/* Current Question Panel */}
          <Paper sx={{ p: 3, mb: 4, bgcolor: 'grey.50' }}>
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
                    </Typography>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<StartIcon />}
                      onClick={handleStartQuestion}
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
                </Box>

                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={<ShowAnswerIcon />}
                    onClick={handleShowAnswer}
                    sx={{ mr: 2 }}
                  >
                    Cevabı Göster
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<NextIcon />}
                    onClick={handleNextQuestion}
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
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => window.location.reload()}
                  >
                    Yeni Quiz Başlat
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setShowEndDialog(true)}
                  >
                    Session'ı Sonlandır
                  </Button>
                </Box>
              </Box>
            )}
          </Paper>

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
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>
        </Paper>

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
    );
  }

  // Render lobby when game is not active
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {sessionData?.quiz_title || 'Quiz Session'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                icon={<QuizIcon />}
                label={`Kod: ${sessionData?.session_code}`}
                color="primary"
                size="large"
              />
              <Chip
                label={`Durum: ${gameStatus.toUpperCase()}`}
                color={gameStatus === 'active' ? 'success' : 'default'}
              />
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadSessionData}
            >
              Yenile
            </Button>
            
            {gameStatus === 'pending' && (
              <Button
                variant="contained"
                startIcon={<StartIcon />}
                onClick={handleStartGame}
                color="success"
                size="large"
              >
                Oyunu Başlat
              </Button>
            )}
            
            <Button
              variant="outlined"
              startIcon={<StopIcon />}
              color="error"
              onClick={() => setShowEndDialog(true)}
            >
              Session'ı Sonlandır
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={4}>
          {/* Participants */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Katılımcılar ({participants.length})
            </Typography>
            
            {participants.length === 0 ? (
              <Alert severity="info">
                Henüz katılımcı yok. Oyun kodunu paylaşın: <strong>{sessionData?.session_code}</strong>
              </Alert>
            ) : (
              <List>
                {participants.map((participant, index) => (
                  <ListItem key={`participant-${participant.user_id || participant.id || index}`}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={participant.username}
                      secondary={`Katıldı: ${new Date(participant.joined_at).toLocaleTimeString()}`}
                    />
                    <IconButton
                      color="error"
                      onClick={() => handleRemoveParticipant(participant.user_id)}
                      size="small"
                    >
                      <RemoveIcon />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Grid>

          {/* Leaderboard */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Skor Tablosu
            </Typography>
            
            {leaderboard.length === 0 ? (
              <Alert severity="info">
                Henüz skor verisi yok.
              </Alert>
            ) : (
              <List>
                {leaderboard.map((player, index) => (
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
                  </ListItem>
                ))}
              </List>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* End Session Dialog */}
      <Dialog open={showEndDialog} onClose={() => setShowEndDialog(false)}>
        <DialogTitle>Session'ı Sonlandır</DialogTitle>
        <DialogContent>
          <Typography>
            Bu session'ı sonlandırmak istediğinizden emin misiniz? 
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
  );
};

export default HostSession; 