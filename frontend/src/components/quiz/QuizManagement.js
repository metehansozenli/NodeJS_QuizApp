import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  IconButton,

} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Edit as EditIcon,

  Share as ShareIcon,
  People as PeopleIcon,
  Quiz as QuizIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { getQuiz, deleteQuiz } from '../../store/slices/quizSlice';
import socketService from '../../services/socket';
import api from '../../services/api';
import soundService from '../../services/soundService';

const QuizManagement = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { currentQuiz, loading, error: apiError } = useSelector(state => state.quiz);
  const { currentSession } = useSelector(state => state.session);
  const { user } = useSelector(state => state.auth);

  const [participants, setParticipants] = useState([]);
  const [gameStatus, setGameStatus] = useState('waiting');
  const [sessionCode, setSessionCode] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [quizId, setQuizId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState(null);

  const handleFinishGame = useCallback(() => {
    const currentSessionId = sessionId || localStorage.getItem('sessionId');

    setGameStatus('finished');
    soundService.stopBackgroundMusic();

    // Emit game finished event
    socketService.emit('finishGame', {
      sessionId: currentSessionId
    });

    // Show final leaderboard after 3 seconds
    setTimeout(() => {
      socketService.emit('showLeaderboard', {
        sessionId: currentSessionId
      });
    }, 3000);
  }, [sessionId]);

  const handleEndQuestion = useCallback(() => {
    const currentSessionId = sessionId || localStorage.getItem('sessionId');
    if (!currentSessionId || !currentQuestion) return;

    // Show correct answer
    socketService.emit('showCorrectAnswer', {
      sessionId: currentSessionId,
      question: currentQuestion,
      correctAnswer: currentQuestion?.options?.findIndex(opt => opt.is_correct)
    });

    setGameStatus('reviewing');

    // Move to next question or finish game
    setTimeout(() => {
      if (!currentQuiz || !currentQuiz.questions || questionIndex + 1 >= currentQuiz.questions.length) {
        handleFinishGame();
      } else {
        setQuestionIndex(prev => prev + 1);
        setGameStatus('waiting');
        setCurrentQuestion(null);

        // Start next question after a short delay
        setTimeout(() => {
          const nextQuestion = currentQuiz.questions[questionIndex + 1];
          setCurrentQuestion(nextQuestion);
          setGameStatus('question');

          socketService.emit('showQuestion', {
            sessionId: currentSessionId,
            question: nextQuestion,
            questionIndex: questionIndex + 1,
            isHost: true
          });

          // Start question timer
          setTimeout(() => {
            handleEndQuestion();
          }, (nextQuestion.duration_seconds || 30) * 1000);
        }, 3000);
      }
    }, 5000);
  }, [sessionId, currentQuestion, currentQuiz, questionIndex, handleFinishGame]);

  const handleStartQuestion = useCallback(() => {
    console.log('handleStartQuestion called');
    console.log('currentQuiz:', currentQuiz);
    console.log('questionIndex:', questionIndex);
    console.log('questions length:', currentQuiz?.questions?.length);

    if (currentQuiz && currentQuiz.questions && questionIndex < currentQuiz.questions.length) {
      const question = currentQuiz.questions[questionIndex];
      const currentSessionId = sessionId || localStorage.getItem('sessionId');

      console.log('Starting question:', question);
      console.log('Session ID:', currentSessionId);

      setCurrentQuestion(question);
      setGameStatus('question');

      // Emit real-time question to all participants
      socketService.emit('showQuestion', {
        sessionId: currentSessionId,
        question: {
          ...question,
          index: questionIndex + 1,
          total: currentQuiz.questions.length
        }
      });

      console.log('Question emitted to socket');

      // Start question timer
      setTimeout(() => {
        handleEndQuestion();
      }, (question.duration_seconds || 30) * 1000);
    } else {
      console.error('Cannot start question - invalid state:', {
        hasCurrentQuiz: !!currentQuiz,
        hasQuestions: !!currentQuiz?.questions,
        questionIndex,
        questionsLength: currentQuiz?.questions?.length
      });
    }
  }, [currentQuiz, questionIndex, sessionId, handleEndQuestion]);

  const loadSessionState = useCallback(async (sessionId) => {
    try {
      const response = await api.get(`/session/${sessionId}/state`);
      const sessionData = response.data;

      setSessionCode(sessionData.session?.session_code || '');
      setGameStatus(sessionData.session?.status || 'waiting');
      setParticipants(sessionData.participants || []);

      // Connect to socket
      connectToSession(sessionId);
    } catch (error) {
      console.error('Session state loading error:', error);
      // If session not found, clear localStorage and redirect
      localStorage.removeItem('sessionId');
      localStorage.removeItem('quizId');
      localStorage.removeItem('hostId');
      navigate('/host/dashboard');
    }
  }, [navigate]);

  useEffect(() => {
    // Clear any old session data on component mount
    const clearOldData = () => {
      localStorage.removeItem('sessionId');
      localStorage.removeItem('quizId');
      localStorage.removeItem('hostId');
    };

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // If we have sessionId from URL params, use it
    if (sessionId) {
      clearOldData(); // Clear old data first
      loadSessionState(sessionId);
      return;
    }

    // If no session ID, redirect to dashboard
    clearOldData();
    navigate('/host/dashboard');
  }, [sessionId, navigate, loadSessionState]);

  useEffect(() => {
    if (currentSession) {
      setSessionCode(currentSession.code);
      setGameStatus(currentSession.status);
      connectToSession(currentSession.id);
    }
  }, [currentSession]);

  // Setup socket listeners only once
  useEffect(() => {
    const setupSocketListeners = () => {
      // Clear any existing listeners first
      socketService.off('userJoined');
      socketService.off('userLeft');
      socketService.off('sessionStateUpdate');
      socketService.off('gameStarted');
      socketService.off('sessionEnded');

      // Setup socket listeners
      socketService.on('userJoined', (userData) => {
        // Don't add host to participants list
        if (userData.username === 'Host') return;
        setParticipants(prev => {
          const exists = prev.find(p => p.username === userData.username);
          if (exists) {
            return prev;
          }
          const newParticipants = [...prev, { ...userData, id: userData.userId }];
          return newParticipants;
        });
        if (userData.sessionId === sessionId) {
          soundService.playUserJoin();
        }
      });

      socketService.on('userLeft', (userData) => {
        // Filter out host from participants
        if (userData.username === 'Host') return;

        setParticipants(prev => {
          const newParticipants = prev.filter(p => p.username !== userData.username);
          return newParticipants;
        });
      });

      socketService.on('sessionStateUpdate', (state) => {
        if (state.participants) {
          // Filter out host from participants list
          const newParticipants = state.participants
            .filter(p => p.username !== 'Host')
            .map(p => ({
              id: p.userId,
              username: p.username,
              score: p.score || 0
            }));

          setParticipants(newParticipants);
        }
      });

      socketService.on('gameStarted', () => {
        console.log('Game started event received - automatically starting first question');
        setGameStatus('active');
        soundService.playBackgroundMusic();

        // Automatically start the first question
        setTimeout(() => {
          if (currentQuiz && currentQuiz.questions && currentQuiz.questions.length > 0) {
            console.log('Auto-starting first question...');
            handleStartQuestion();
          }
        }, 1000);
      });

      socketService.on('sessionEnded', () => {
        setGameStatus('finished');
        soundService.stopAllSounds();
      });

      socketService.on('autoNextQuestion', (data) => {
        // Auto progress to next question
        if (currentQuiz && questionIndex + 1 < (currentQuiz.questions?.length || 0)) {
          setQuestionIndex(prev => prev + 1);
          setGameStatus('waiting');
          setCurrentQuestion(null);
        } else {
          // No more questions, finish the game
          handleFinishGame();
        }
      });

      // **ADD MISSING LISTENER: showQuestion**
      socketService.on('showQuestion', (questionData) => {
        if (questionData.question) {
          setCurrentQuestion(questionData.question);
          setGameStatus('question');
        }
      });
      // **ADD MISSING LISTENER: showCorrectAnswer**
      socketService.on('showCorrectAnswer', (data) => {
        setGameStatus('reviewing');
      });
    };

    setupSocketListeners();
    
    // Cleanup on unmount
    return () => {
      socketService.off('userJoined');
      socketService.off('userLeft');
      socketService.off('sessionStateUpdate');
      socketService.off('gameStarted');
      socketService.off('sessionEnded');
      socketService.off('autoNextQuestion');
      socketService.off('showQuestion');
      socketService.off('showCorrectAnswer');
      soundService.stopAllSounds();
    };
  }, [sessionId, currentQuiz, questionIndex, handleFinishGame, handleStartQuestion]);

  const connectToSession = (sessionId) => {
    socketService.connect();

    // Join as host
    socketService.emit('joinSession', {
      sessionId: sessionId,
      username: 'Host',
      isHost: true
    }, (response) => {
      if (response && response.success) {
        // Request current session state after joining
        setTimeout(() => {
          socketService.emit('getSessionState', { sessionId });
        }, 500);
        setIsHost(true);
      }
    });
  };

  const handleGoToHostSession = () => {
    const currentSessionId = sessionId || localStorage.getItem('sessionId');
    if (currentSessionId) {
      navigate(`/host/session/${currentSessionId}`);
    }
  };

  const handleStartSession = async () => {
    const currentSessionId = sessionId || localStorage.getItem('sessionId');
    if (!currentSessionId) {
      console.error('Session ID not found');
      return;
    }

    try {
      // Update local state
      setGameStatus('active');

      // Start the quiz game
      socketService.emit('startQuiz', { 
        sessionId: currentSessionId,
        quiz: currentQuiz
      });

      // Start showing questions
      if (currentQuiz?.questions?.length > 0) {
        const firstQuestion = currentQuiz.questions[0];
        setCurrentQuestion(firstQuestion);
        setQuestionIndex(0);
        
        // Notify all participants about the first question
        socketService.emit('showQuestion', {
          sessionId: currentSessionId,
          question: firstQuestion,
          questionIndex: 0,
          isHost: true
        });

        // Start question timer
        setTimeout(() => {
          handleEndQuestion();
        }, (firstQuestion.duration_seconds || 30) * 1000);
      }

      console.log('Quiz game started, showing first question');
    } catch (error) {
      console.error('Error starting session:', error);
      setError('Oyun başlatılırken bir hata oluştu');
    }
  };

  const handleEndSession = async () => {
    const currentSessionId = sessionId || localStorage.getItem('sessionId');
    if (!currentSessionId) return;

    try {
      await api.post('/session/end', { sessionId: currentSessionId });

      // Clear localStorage
      localStorage.removeItem('sessionId');
      localStorage.removeItem('quizId');
      localStorage.removeItem('hostId');

      // Disconnect socket
      socketService.disconnect();

      // Navigate to dashboard
      navigate('/host/dashboard');
    } catch (error) {
      console.error('Session sonlandırma hatası:', error);
    }
  };

  const handleDeleteQuiz = async () => {
    const currentQuizId = quizId || localStorage.getItem('quizId');
    if (!currentQuizId) return;

    try {
      await dispatch(deleteQuiz(currentQuizId)).unwrap();

      // Clear localStorage and navigate
      localStorage.removeItem('sessionId');
      localStorage.removeItem('quizId');
      localStorage.removeItem('hostId');

      navigate('/host/dashboard');
    } catch (error) {
      console.error('Quiz silme hatası:', error);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sessionCode);
    // Burada snackbar ile başarılı kopyalama mesajı gösterebilirsiniz
  };

  const handleShare = () => {
    const shareData = {
      title: currentQuiz?.title,
      text: `${currentQuiz?.title} quiz'ine katılın!`,
      url: `${window.location.origin}/join/${sessionCode}`
    };

    if (navigator.share) {
      navigator.share(shareData);
    } else {
      setShareDialogOpen(true);
    }
  };

  const refreshParticipants = async () => {
    const currentSessionId = sessionId || localStorage.getItem('sessionId');
    if (!currentSessionId) {
      console.error('Session ID not found');
      return;
    }

    try {
      // Get fresh session state from server
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/sessions/${currentSessionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch session state');
      }
      const data = await response.json();
      setParticipants(data.participants || []);
    } catch (error) {
      console.error('Error refreshing participants:', error);
      setError('Katılımcı listesi yenilenirken bir hata oluştu');
    }
  };

  useEffect(() => {
    if (gameStatus === 'active' && currentQuestion) {
      // Notify all participants about the current question
      socketService.emit('showQuestion', {
        sessionId,
        question: currentQuestion,
        questionIndex
      });
    }
  }, [gameStatus, currentQuestion, questionIndex, sessionId]);

  useEffect(() => {
    // Listen for participant updates
    socketService.on('participantsUpdated', (data) => {
      if (data.sessionId === sessionId) {
        setParticipants(data.participants);
      }
    });

    // Listen for question updates
    socketService.on('questionUpdated', (data) => {
      if (data.sessionId === sessionId) {
        setCurrentQuestion(data.question);
        setQuestionIndex(data.questionIndex);
      }
    });

    // Listen for session state updates
    socketService.on('sessionStateUpdated', (data) => {
      if (data.sessionId === sessionId) {
        setGameStatus(data.status);
      }
    });

    // Listen for game started event
    socketService.on('gameStarted', (data) => {
      if (data.sessionId === sessionId) {
        setGameStatus('active');
      }
    });

    // Listen for session end
    socketService.on('sessionEnded', (data) => {
      if (data.sessionId === sessionId) {
        setGameStatus('finished');
        setCurrentQuestion(null);
        setQuestionIndex(0);
      }
    });

    return () => {
      socketService.off('participantsUpdated');
      socketService.off('questionUpdated');
      socketService.off('sessionStateUpdated');
      socketService.off('gameStarted');
      socketService.off('sessionEnded');
    };
  }, [sessionId]);

  const handleLeaveSession = () => {
    const currentSessionId = sessionId || localStorage.getItem('sessionId');
    if (currentSessionId) {
      socketService.emit('leaveSession', { sessionId: currentSessionId });
    }
    localStorage.removeItem('sessionId');
    navigate('/');
  };

  const renderWaitingRoom = () => (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          {currentQuiz?.title || 'Quiz Bekleme Odası'}
        </Typography>
        
        <Typography variant="body1" align="center" color="textSecondary" paragraph>
          {currentQuiz?.description || 'Oyunun başlamasını bekliyoruz...'}
        </Typography>

        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Chip
            icon={<PersonIcon />}
            label={`Host: ${user?.username || 'Misafir'}`}
            color="primary"
            sx={{ mr: 1 }}
          />
          <Chip
            icon={<QuizIcon />}
            label={`Kod: ${sessionId}`}
            variant="outlined"
          />
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          {isHost ? 'Oyunu başlatmak için aşağıdaki butona tıklayın.' : 'Oyunun başlamasını bekliyorsunuz.'}
        </Alert>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Katılımcılar ({participants.length})
          </Typography>
          <IconButton onClick={refreshParticipants} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
        
        <Grid container spacing={2}>
          {participants.map((participant, index) => (
            <Grid item xs={6} sm={4} md={3} key={index}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Avatar sx={{ mx: 'auto', mb: 1, bgcolor: 'primary.main' }}>
                    {participant.username?.charAt(0)?.toUpperCase()}
                  </Avatar>
                  <Typography variant="body2">
                    {participant.username}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
          {isHost && (
            <Button
              variant="contained"
              color="primary"
              onClick={handleGoToHostSession}
            >
              Host Paneline Git
            </Button>
          )}
          <Button
            variant="outlined"
            color="error"
            onClick={handleLeaveSession}
          >
            Lobiden Ayrıl
          </Button>
        </Box>
      </Paper>
    </Container>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (apiError) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{apiError}</Alert>
      </Container>
    );
  }

  if (!currentQuiz) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info">Quiz yükleniyor...</Alert>
      </Container>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting': return 'warning';
      case 'question': return 'info';
      case 'reviewing': return 'secondary';
      case 'finished': return 'success';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'waiting': return 'Bekliyor';
      case 'question': return 'Soru Aktif';
      case 'reviewing': return 'Değerlendirme';
      case 'finished': return 'Tamamlandı';
      default: return 'Bilinmiyor';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* No Quiz State */}
      {!loading && !currentQuiz && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Quiz bulunamadı veya yüklenemedi.
        </Alert>
      )}

      {/* Main Content - Only render when quiz is loaded */}
      {!loading && currentQuiz && (
        <>
          {/* Quiz Header */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={8}>
                <Typography variant="h4" gutterBottom>
                  {currentQuiz.title}
                </Typography>
                <Typography color="textSecondary" paragraph>
                  {currentQuiz.description}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<QuizIcon />}
                    label={`${currentQuiz.questions?.length || 0} Soru`}
                    variant="outlined"
                  />
                  <Chip
                    icon={<PeopleIcon />}
                    label={`${participants.length} Katılımcı`}
                    variant="outlined"
                  />
                  {sessionCode && (
                    <Chip
                      label={`Kod: ${sessionCode}`}
                      color="primary"
                      onClick={handleCopyCode}
                      onDelete={handleCopyCode}
                      deleteIcon={<CopyIcon />}
                    />
                  )}
                  <Chip
                    label={getStatusText(gameStatus)}
                    color={getStatusColor(gameStatus)}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {!currentSession ? (
                    <Button
                      variant="contained"
                      startIcon={<StartIcon />}
                      onClick={handleGoToHostSession}
                      size="large"
                      fullWidth
                    >
                      Host Paneline Git
                    </Button>
                  ) : (
                    <>
                      {/* Always show Host Panel button */}
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<StartIcon />}
                        onClick={handleGoToHostSession}
                        size="large"
                        fullWidth
                        sx={{ mb: 1 }}
                      >
                        Host Paneline Git
                      </Button>

                      {/* Show question controls when game is active */}
                      {gameStatus === 'active' && questionIndex < (currentQuiz.questions?.length || 0) && (
                        <Button
                          variant="contained"
                          onClick={handleStartQuestion}
                          fullWidth
                        >
                          {questionIndex === 0 ? 'İlk Soruyu Başlat' : 'Sonraki Soruyu Başlat'}
                        </Button>
                      )}
                      {gameStatus === 'question' && (
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={handleEndQuestion}
                          fullWidth
                        >
                          Soruyu Bitir
                        </Button>
                      )}
                      {(questionIndex >= (currentQuiz.questions?.length || 0) || gameStatus === 'finished') && (
                        <Button
                          variant="contained"
                          color="error"
                          onClick={handleEndSession}
                          fullWidth
                        >
                          Oturumu Bitir
                        </Button>
                      )}
                      {/* Add session termination button for lobby/waiting phase */}
                      {gameStatus === 'waiting' && (
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<StopIcon />}
                          onClick={handleEndSession}
                          fullWidth
                          sx={{ mt: 1 }}
                        >
                          Oturumu Sonlandır
                        </Button>
                      )}
                    </>
                  )}

                  {/* Only show edit button, remove delete quiz button from lobby */}
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => navigate(`/quiz/${quizId}/edit`)}
                    fullWidth
                    sx={{ mt: 1 }}
                  >
                    Quiz'i Düzenle
                  </Button>

                  {sessionCode && (
                    <Button
                      variant="outlined"
                      startIcon={<ShareIcon />}
                      onClick={handleShare}
                      fullWidth
                    >
                      Paylaş
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Paper>

          <Grid container spacing={3}>
            {/* Game Control Panel */}
            {currentSession && (
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Oyun Kontrolü</Typography>
                    <Chip
                      label={`Soru ${questionIndex + 1}/${currentQuiz.questions?.length || 0}`}
                      color="primary"
                    />
                  </Box>

                  {currentQuestion && (
                    <Card sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Aktif Soru:
                        </Typography>
                        <Typography variant="body1" paragraph>
                          {currentQuestion.question_text}
                        </Typography>
                        <Grid container spacing={1}>
                          {currentQuestion.options?.map((option, index) => (
                            <Grid item xs={12} sm={6} key={index}>
                              <Typography
                                variant="body2"
                                sx={{
                                  p: 1,
                                  borderRadius: 1,
                                  bgcolor: option.is_correct ? 'success.light' : 'grey.100',
                                  color: option.is_correct ? 'success.contrastText' : 'text.primary'
                                }}
                              >
                                {String.fromCharCode(65 + index)}) {option.option_text || option.text}
                                {option.is_correct && ' ✓'}
                              </Typography>
                            </Grid>
                          ))}
                        </Grid>
                      </CardContent>
                    </Card>
                  )}
                  {gameStatus === 'waiting' && questionIndex === 0 && (
                    <Alert severity="info">
                      Katılımcıların katılmasını bekleyin, ardından "Oyunu Başlat" butonuna tıklayın.
                    </Alert>
                  )}

                  {gameStatus === 'active' && questionIndex === 0 && (
                    <Alert severity="success">
                      Oyun başlatıldı! İlk soruyu başlatmak için "İlk Soruyu Başlat" butonuna tıklayın.
                    </Alert>
                  )}

                  {gameStatus === 'finished' && (
                    <Alert severity="success">
                      Quiz tamamlandı! Sonuçları görüntüleyebilirsiniz.
                    </Alert>
                  )}
                </Paper>
              </Grid>
            )}

            {/* Participants Panel */}
            <Grid item xs={12} md={currentSession ? 4 : 12}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Katılımcılar ({participants.length})
                  </Typography>
                  {currentSession && (
                    <IconButton onClick={refreshParticipants}>
                      <RefreshIcon />
                    </IconButton>
                  )}
                </Box>

                {participants.length === 0 ? (
                  <Typography color="textSecondary" align="center" sx={{ py: 3 }}>
                    {currentSession ? 'Henüz katılımcı yok' : 'Oturum başlatıldığında katılımcılar görünecek'}
                  </Typography>
                ) : (
                  <List>
                    {participants.map((participant, index) => (
                      <React.Fragment key={participant.id}>
                        <ListItem>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {participant.username?.charAt(0)?.toUpperCase() || index + 1}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={participant.username}
                            secondary={`Skor: ${participant.score || 0}`}
                          />
                        </ListItem>
                        {index < participants.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* Share Dialog */}
          <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)}>
            <DialogTitle>Quiz Paylaş</DialogTitle>
            <DialogContent>
              <TextField
                fullWidth
                label="Katılım Kodu"
                value={sessionCode}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <IconButton onClick={handleCopyCode}>
                      <CopyIcon />
                    </IconButton>
                  )
                }}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Katılım Linki"
                value={`${window.location.origin}/join/${sessionCode}`}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <IconButton onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join/${sessionCode}`)}>
                      <CopyIcon />
                    </IconButton>
                  )
                }}
                margin="normal"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShareDialogOpen(false)}>Kapat</Button>
            </DialogActions>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
            <DialogTitle>Quiz'i Sil</DialogTitle>
            <DialogContent>
              <Typography>
                "{currentQuiz?.title || 'Bu quiz'}" quiz'ini silmek istediğinizden emin misiniz?
                Bu işlem geri alınamaz.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
              <Button onClick={handleDeleteQuiz} color="error" variant="contained">
                Sil
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Container>
  );
};

export default QuizManagement;