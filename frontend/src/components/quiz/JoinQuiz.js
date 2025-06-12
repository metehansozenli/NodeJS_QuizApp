import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Avatar,
  ListItemAvatar,
} from '@mui/material';
import {
  Person as PersonIcon,
  Timer as TimerIcon,
  Quiz as QuizIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import socketService from '../../services/socket';

const JoinQuiz = () => {
  const { gameCode } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  
  const [joinForm, setJoinForm] = useState({
    gameCode: ''
  });
  const [gameState, setGameState] = useState('joining'); // joining, waiting, playing, finished
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [results, setResults] = useState(null);
  const [gameInfo, setGameInfo] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(null);
  const [score, setScore] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [gameStatus, setGameStatus] = useState('joining');
  const [bgMusicUrl, setBgMusicUrl] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (gameCode) {
      setJoinForm(prev => ({ ...prev, gameCode }));
    }
  }, [gameCode]);

  useEffect(()=>{
    if(gameCode && joinForm.gameCode===gameCode && !sessionId && gameState==='joining' && !loading){
      handleJoinGame();
    }
  },[gameCode,joinForm.gameCode,sessionId,gameState,loading]);

  // Socket listeners - only when sessionId is set
  useEffect(() => {
    if (!sessionId) return; // Only setup listeners when we have a sessionId

    console.log('Setting up socket listeners for sessionId:', sessionId);
    
    // Ensure socket is connected
    socketService.connect();
    console.log('Socket connection status:', socketService.socket?.connected);

    // Listen for session state updates
    socketService.on('sessionStateUpdate', (data) => {
      console.log('sessionStateUpdate received:', data);
      if (data.sessionId === sessionId) {
        setGameStatus(data.status);
        setParticipants(data.participants);
        if (data.background_music_url) {
          setBgMusicUrl(data.background_music_url);
        } else if (data.session?.background_music_url) {
          setBgMusicUrl(data.session.background_music_url);
        }
        // Update user's own score easily
        if (data.participants && user?.username) {
          const currentUser = data.participants.find(p => 
            p.username === (user?.username || 'Misafir') || p.userId === user?.id
          );
          if (currentUser && currentUser.score !== undefined) {
            setScore(currentUser.score);
          }
        }

        // Eğer aktif soru yayınlanıyorsa ve henüz bir soru görünmüyorsa ayarla
        if (data.activeQuestion) {
          const playerQuestion = {
            ...data.activeQuestion,
            options: data.activeQuestion.options?.map(opt => ({
              id: opt.id,
              option_text: opt.option_text
            }))
          };
          setCurrentQuestion(playerQuestion);
          setQuestionIndex((data.activeQuestion.index || 1) - 1);
          if (data.phase === 'question') {
            setGameState('question');
            setGameStatus('question');
          }
        }
      }
    });

    // Listen for user joined
    socketService.on('userJoined', (data) => {
      console.log('User joined event received:', data);
      if (data.sessionId === sessionId && data.username !== (user?.username || 'Misafir')) {
        // Add new participant to the list (exclude self)
        setParticipants(prev => {
          // Check if user already exists to prevent duplicates
          const exists = prev.find(p => p.username === data.username);
          if (exists) return prev;
          
          return [...prev, {
            username: data.username,
            userId: data.userId,
            joined_at: data.timestamp || new Date().toISOString()
          }];
        });
      }
    });

    // Listen for user left
    socketService.on('userLeft', (data) => {
      console.log('User left event received:', data);
      if (data.sessionId === sessionId) {
        // Remove participant from the list
        setParticipants(prev => prev.filter(p => p.username !== data.username));
      }
    });

    // Listen for session state update
    socketService.on('sessionStateUpdate', (data) => {
      console.log('Session state update received:', data);
      if (data.sessionId === sessionId) {
        // Update participants
        if (data.participants) {
          // Filter out host from participants list for players
          const playerParticipants = data.participants.filter(p => p.username !== 'Host');
          setParticipants(playerParticipants);
          
          // Update current user's score
          const currentUser = data.participants.find(p => 
            p.username === (user?.username || 'Misafir') || p.userId === user?.id
          );
          if (currentUser && currentUser.score !== undefined) {
            setScore(currentUser.score);
          }
        }
        
        // Update leaderboard
        if (data.leaderboard) {
          setResults(prev => ({ ...prev, leaderboard: data.leaderboard }));
        }
      }
    });

    // Listen for question updates
    socketService.on('showQuestion', (data) => {
      console.log('Show question event received:', data);
      // Players should receive questions (filter out is_correct for display)
      if (data.sessionId === sessionId && data.question) {
        const playerQuestion = {
          ...data.question,
          options: data.question.options?.map(opt => ({
            id: opt.id,
            option_text: opt.option_text
            // Don't include is_correct for players
          }))
        };
        
        setCurrentQuestion(playerQuestion);
        setQuestionIndex(data.question.index - 1 || 0);
        setGameState('question');  // Update game state
        setGameStatus('question');
        setSelectedAnswer(null);
        setTimeLeft(data.question.duration_seconds || 30);
        startTimer();
        console.log('Player question set:', playerQuestion);
      }
    });

    // Listen for correct answer
    socketService.on('showCorrectAnswer', (data) => {
      console.log('Show correct answer event received:', data);
      if (data.sessionId === sessionId) {
        // Update current question with correct flags so UI can highlight
        if (data.question) {
          setCurrentQuestion(data.question);
        }
        setGameState('reviewing');
        setGameStatus('reviewing');
      }
    });

    // Listen for session end
    socketService.on('sessionEnded', (data) => {
      console.log('Session ended event received:', data);
      if (data.sessionId === sessionId) {
        handleLeaveSession();
      }
    });

    // Listen for game started
    socketService.on('gameStarted', (data) => {
      console.log('Game started event received:', data);
      if (data.sessionId === sessionId) {
        setGameState('active');  // Update game state
        setGameStatus('active');
        console.log('Player game state changed to active');
      }
    });

    // Listen for remove participant (when host kicks player)
    socketService.on('removeParticipant', (data) => {
      console.log('Remove participant event received:', data);
      if (data.sessionId === sessionId && data.username === (user?.username || 'Misafir')) {
        // Player was kicked, leave session
        handleLeaveSession();
      }
    });

    // Listen for quiz completion
    socketService.on('quizCompleted', (data) => {
      console.log('Quiz completed event received:', data);
      if (data.sessionId === sessionId) {
        setGameState('finished');
        setGameStatus('finished');
        if (data.finalLeaderboard) {
          setResults({ leaderboard: data.finalLeaderboard });
        }
      }
    });

    // Listen for final leaderboard
    socketService.on('showFinalLeaderboard', (data) => {
      console.log('Final leaderboard received:', data);
      if (data.sessionId === sessionId) {
        setResults({ leaderboard: data.leaderboard });
      }
    });

    return () => {
      console.log('Cleaning up socket listeners');
      socketService.off('sessionStateUpdate');
      socketService.off('userJoined');
      socketService.off('userLeft');
      socketService.off('sessionStateUpdate');
      socketService.off('showQuestion');
      socketService.off('showCorrectAnswer');
      socketService.off('sessionEnded');
      socketService.off('gameStarted');
      socketService.off('removeParticipant');
      socketService.off('quizCompleted');
      socketService.off('showFinalLeaderboard');
    };
  }, [sessionId, user?.username]); // Remove timer from dependencies

  useEffect(() => {
    // Check if there's an active session in localStorage
    const savedSessionId = localStorage.getItem('sessionId');
    if (savedSessionId) {
      // Clear any existing session data
      localStorage.removeItem('sessionId');
      socketService.emit('leaveSession', { sessionId: savedSessionId });
    }

    // Clean up on unmount
    return () => {
      if (sessionId) {
        socketService.emit('leaveSession', { sessionId });
      }
    };
  }, []); // Empty dependency array since we want this to run only on mount

  const handleJoinGame = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Join session via API
      const response = await fetch('http://localhost:5000/api/session/addParticipant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: joinForm.gameCode,
          username: user?.username || 'Misafir'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Oyuna katılım başarısız');
      }

      const data = await response.json();
      console.log('Join game response:', data);
      
      // Set game info and session ID
      setGameInfo(data.game);
      setSessionId(data.game.id);
      setGameState('waiting');  // Set to waiting room
      setGameStatus('waiting'); // Also update gameStatus
      
      // Store in localStorage
      localStorage.setItem('playerSessionId', data.game.id);
      localStorage.setItem('playerGameCode', data.game.code);
      localStorage.setItem('playerUsername', user?.username || 'Misafir');

      // Join socket session
      socketService.emit('joinSession', {
        sessionId: data.game.id,
        username: user?.username || 'Misafir',
        userId: data.participant.user_id,
        isHost: false
      });

      console.log('Successfully joined session:', data.game.id);

    } catch (error) {
      console.error('Error joining game:', error);
      setError(error.message || 'Oyuna katılırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveSession = () => {
    if (sessionId) {
      socketService.emit('leaveSession', { sessionId });
      localStorage.removeItem('playerSessionId');
      localStorage.removeItem('playerGameCode');
      localStorage.removeItem('playerUsername');
      setSessionId(null);
      setGameStatus('joining');
      setParticipants([]);
      setCurrentQuestion(null);
      setQuestionIndex(null);
      navigate('/');
    }
  };

  const startTimer = () => {
    // Clear any existing timer first
    if (timer) {
      clearInterval(timer);
    }
    
    const newTimer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(newTimer);
          setTimer(null);
          if (selectedAnswer === null) {
            handleAnswerSelect(-1); // Zaman doldu, boş cevap gönder
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setTimer(newTimer);
  };

  const handleAnswerSelect = (optionIndex) => {
    if (selectedAnswer !== null) return; // Zaten cevap verilmiş
    
    setSelectedAnswer(optionIndex);
    
    // Submit answer via both socket and API for redundancy
    if (optionIndex >= 0 && currentQuestion?.options?.[optionIndex]) {
      const playerSessionId = localStorage.getItem('playerSessionId') || sessionId;
      const playerUsername = localStorage.getItem('playerUsername') || user?.username || 'Misafir';
      
      // Get proper userId - either from user object or from participant data
      let userId = user?.id;
      if (!userId && gameInfo?.participant?.user_id) {
        userId = gameInfo.participant.user_id;
      }
      if (!userId && gameInfo?.participant?.id) {
        userId = gameInfo.participant.id;
      }
      
      console.log('Submitting answer:', {
        userId,
        sessionId: playerSessionId,
        questionId: currentQuestion.id,
        optionId: currentQuestion.options[optionIndex].id,
        answer: optionIndex,
        username: playerUsername
      });

      // Submit via socket first (faster)
      socketService.emit('submitAnswer', {
        sessionId: playerSessionId,
        userId: userId,
        answer: optionIndex,
        optionId: currentQuestion.options[optionIndex].id
      });
      
      // Also submit via API for persistence
      fetch('http://localhost:5000/api/answer/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          sessionId: playerSessionId,
          questionId: currentQuestion.id,
          optionId: currentQuestion.options[optionIndex].id
        })
      }).then(response => {
        if (!response.ok) {
          console.error('Answer submit failed:', response.status);
        } else {
          console.log('Answer submitted successfully');
        }
      }).catch(err => {
        console.error('Answer submit error:', err);
      });
    } else if (optionIndex === -1) {
      // Time expired, no answer selected
      console.log('Time expired, no answer submitted');
    }
  };

  const handleAnswer = (option) => {
    if (selectedAnswer !== null) return; // Already answered
    
    setSelectedAnswer(option);
    
    // Submit answer
    socketService.emit('submitAnswer', {
      sessionId,
      answer: option,
      questionIndex
    });
  };

  const handleInputChange = (field, value) => {
    setJoinForm(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const renderJoinForm = () => (
    <div className="kahoot-container">
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <div className="kahoot-card">
          <div className="kahoot-title">
            🎮 Join the Quiz!
          </div>
          <div className="kahoot-subtitle">
            Enter the game code to get started
          </div>
          
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                borderRadius: '15px',
                background: 'linear-gradient(45deg, #ffebee, #ffcdd2)',
                border: '2px solid #f44336'
              }}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleJoinGame}>
            <TextField
              fullWidth
              label="🎯 Game Code"
              value={joinForm.gameCode}
              onChange={(e) => handleInputChange('gameCode', e.target.value)}
              margin="normal"
              required
              placeholder="Enter 6-digit code"
              inputProps={{ maxLength: 6 }}
              sx={{
                '& .MuiInputLabel-root': {
                  fontSize: '18px',
                  fontWeight: 500,
                },
                '& .MuiOutlinedInput-input': {
                  fontSize: '24px',
                  padding: '20px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  letterSpacing: '3px',
                },
                mb: 3,
              }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading || !joinForm.gameCode}
              sx={{
                height: '60px',
                fontSize: '18px',
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #4caf50 30%, #8bc34a 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #388e3c 30%, #689f38 90%)',
                  transform: 'translateY(-3px)',
                },
                '&:disabled': {
                  background: '#cccccc',
                  transform: 'none',
                },
                boxShadow: '0 8px 25px rgba(76, 175, 80, 0.4)',
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: 'white' }} />
              ) : (
                '🚀 Join Game!'
              )}
            </Button>
          </form>

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: '#666', mb: 2 }}>
              Don't have a code?
            </Typography>
            <Typography variant="body2" sx={{ color: '#999' }}>
              Ask your host for the 6-digit game code to join the quiz!
            </Typography>
          </Box>
        </div>
      </Container>
    </div>
  );
  const renderWaitingRoom = () => (
    <div className="kahoot-container">
      <Container maxWidth="md" sx={{ py: 4 }}>
        <div className="kahoot-card kahoot-card-large">
          <div className="kahoot-title">
            🎯 {gameInfo?.game?.title || 'Quiz Lobby'}
          </div>
          
          <Typography 
            variant="h6" 
            align="center" 
            sx={{ 
              color: '#666', 
              mb: 4,
              fontSize: '18px',
              fontWeight: 500 
            }}
          >
            {gameInfo?.game?.description || 'Waiting for the host to start the game...'}
          </Typography>

          <Box sx={{ 
            textAlign: 'center', 
            mb: 4,
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            borderRadius: '20px',
            p: 3,
            color: 'white'
          }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
              Game Code: {gameInfo?.game?.code || joinForm.gameCode}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Share this code with others to join!
            </Typography>
          </Box>

          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center',
            gap: 2,
            mb: 4 
          }}>
            <Chip
              icon={<PersonIcon />}
              label={`You: ${user?.username || 'Guest'}`}
              sx={{
                background: 'linear-gradient(45deg, #e91e63, #9c27b0)',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '16px',
                height: '40px',
                '& .MuiChip-icon': {
                  color: 'white'
                }
              }}
            />
          </Box>

          <Alert 
            severity="info" 
            sx={{ 
              mb: 4,
              borderRadius: '15px',
              background: 'linear-gradient(45deg, #e3f2fd, #bbdefb)',
              border: '2px solid #2196f3',
              fontSize: '16px',
              fontWeight: 500,
            }}
          >
            🎮 Get ready! The quiz will start when the host begins the game.
          </Alert>

          <div style={{ 
            background: 'rgba(102, 126, 234, 0.1)', 
            borderRadius: '20px', 
            padding: '30px',
            marginBottom: '30px'
          }}>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 'bold',
                color: '#333',
                textAlign: 'center',
                mb: 3 
              }}
            >
              🎊 Players in Lobby ({participants.length})
            </Typography>
            
            <Grid container spacing={2}>
              {participants.map((participant, index) => (
                <Grid item xs={6} sm={4} md={3} key={index}>
                  <Card className="participant-item" sx={{
                    textAlign: 'center',
                    background: 'linear-gradient(45deg, #667eea, #764ba2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '15px',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
                    }
                  }}>
                    <CardContent sx={{ py: 2 }}>
                      <Avatar sx={{ 
                        mx: 'auto', 
                        mb: 1, 
                        bgcolor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '18px'
                      }}>
                        {participant.username?.charAt(0)?.toUpperCase()}
                      </Avatar>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 'bold',
                          fontSize: '14px' 
                        }}
                      >
                        {participant.username}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {participants.length === 0 && (
              <Typography 
                variant="body1" 
                sx={{ 
                  textAlign: 'center',
                  color: '#666',
                  fontStyle: 'italic' 
                }}
              >
                No other players yet... Share the game code!
              </Typography>
            )}
          </div>

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={handleLeaveSession}
              sx={{
                borderRadius: '25px',
                px: 4,
                py: 2,
                fontWeight: 'bold',
                borderColor: '#f44336',
                color: '#f44336',
                '&:hover': {
                  borderColor: '#d32f2f',
                  background: 'rgba(244, 67, 54, 0.1)',
                  transform: 'translateY(-2px)',
                },
                boxShadow: '0 4px 15px rgba(244, 67, 54, 0.2)',
              }}
            >
              🚪 Leave Lobby
            </Button>
          </Box>
        </div>
      </Container>
    </div>
  );
  const renderQuestion = () => {
    if (!currentQuestion) return null;

    return (
      <div className="kahoot-container">
        <Container maxWidth="md" sx={{ py: 4 }}>
          <div className="kahoot-card kahoot-card-large">
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mb: 4,
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              borderRadius: '20px',
              p: 3,
              color: 'white'
            }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                Question {questionIndex + 1}
                {currentQuestion.total && ` / ${currentQuestion.total}`}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <div className="timer-circle" style={{
                  background: timeLeft <= 5 
                    ? 'linear-gradient(45deg, #f44336, #e91e63)'
                    : 'linear-gradient(45deg, #4caf50, #8bc34a)',
                  animation: timeLeft <= 5 ? 'pulse 1s infinite' : 'none'
                }}>
                  {timeLeft}
                </div>
                <Button
                  variant="outlined"
                  onClick={handleLeaveSession}
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    '&:hover': {
                      borderColor: 'white',
                      background: 'rgba(255,255,255,0.1)',
                    }
                  }}
                >
                  🚪 Leave
                </Button>
              </Box>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              {/* Medya */}
              {currentQuestion.image_url && (
                <Box sx={{ textAlign:'center', mb:2 }}>
                  <img src={currentQuestion.image_url} alt="soru görsel" style={{maxWidth:'100%', maxHeight:300}} />
                </Box>
              )}
              {currentQuestion.video_url && (
                <Box sx={{ textAlign:'center', mb:2 }}>
                  {currentQuestion.video_url.includes('youtube') ? (
                    <iframe
                      width="560"
                      height="315"
                      src={currentQuestion.video_url.replace('watch?v=','embed/')}
                      title="video"
                      frameBorder="0"
                      allowFullScreen
                    />
                  ) : (
                    <video src={currentQuestion.video_url} controls style={{maxWidth:'100%', maxHeight:300}} />
                  )}
                </Box>
              )}
            </Box>
            
            <Typography 
              variant="h4" 
              sx={{ 
                mb: 4, 
                fontWeight: 'bold',
                color: '#333',
                textAlign: 'center',
                lineHeight: 1.3
              }}
            >
              {currentQuestion.question_text}
            </Typography>
            
            <Grid container spacing={3}>
              {currentQuestion.options?.map((option, index) => (
                <Grid item xs={12} sm={6} key={option.id || index}>
                  <div
                    className={`answer-option ${selectedAnswer === index ? 'selected' : ''}`}
                    onClick={() => handleAnswerSelect(index)}
                    style={{
                      pointerEvents: selectedAnswer !== null ? 'none' : 'auto',
                      opacity: selectedAnswer !== null && selectedAnswer !== index ? 0.6 : 1,
                      minHeight: '100px',
                      position: 'relative',
                    }}
                  >
                    <Box sx={{ 
                      position: 'absolute',
                      top: '10px',
                      left: '15px',
                      background: 'rgba(255,255,255,0.2)',
                      borderRadius: '50%',
                      width: '30px',
                      height: '30px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '16px',
                    }}>
                      {String.fromCharCode(65 + index)}
                    </Box>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 'bold',
                        textAlign: 'center',
                        mt: 1
                      }}
                    >
                      {option.option_text}
                    </Typography>
                  </div>
                </Grid>
              ))}
            </Grid>
            
            {selectedAnswer !== null && (
              <Alert 
                severity="success" 
                sx={{ 
                  mt: 4,
                  borderRadius: '15px',
                  background: 'linear-gradient(45deg, #e8f5e8, #c8e6c9)',
                  border: '2px solid #4caf50',
                  fontSize: '16px',
                  fontWeight: 'bold',
                }}
              >
                ✅ Answer submitted! Waiting for other players...
              </Alert>
            )}
            
            {gameStatus === 'reviewing' && (
              <Alert 
                severity="info" 
                sx={{ 
                  mt: 4,
                  borderRadius: '15px',
                  background: 'linear-gradient(45deg, #e3f2fd, #bbdefb)',
                  border: '2px solid #2196f3',
                  fontSize: '16px',
                  fontWeight: 'bold',
                }}
              >
                📊 Showing correct answer, moving to next question...
              </Alert>
            )}
          </div>
        </Container>
      </div>
    );
  };
  const renderResults = () => (
    <div className="kahoot-container">
      <Container maxWidth="md" sx={{ py: 4 }}>
        <div className="kahoot-card kahoot-card-large">
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ fontSize: '80px', marginBottom: '20px' }}>🏆</div>
            <Typography 
              variant="h2" 
              sx={{ 
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                mb: 2
              }}
            >
              Game Complete!
            </Typography>
            <Typography variant="h6" sx={{ color: '#666' }}>
              Thanks for playing! Here are the final results.
            </Typography>
          </div>

          <Box sx={{ 
            textAlign: 'center', 
            mb: 4,
            background: 'linear-gradient(45deg, #e91e63, #9c27b0)',
            borderRadius: '20px',
            p: 4,
            color: 'white'
          }}>
            <Typography variant="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
              {score}
            </Typography>
            <Typography variant="h5" sx={{ opacity: 0.9 }}>
              Your Final Score
            </Typography>
          </Box>

          {results?.leaderboard && (
            <div style={{ 
              background: 'rgba(102, 126, 234, 0.1)', 
              borderRadius: '20px', 
              padding: '30px',
              marginBottom: '30px'
            }}>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 'bold',
                  color: '#333',
                  textAlign: 'center',
                  mb: 3
                }}
              >
                🏅 Final Leaderboard
              </Typography>
              <List sx={{ width: '100%' }}>
                {results.leaderboard.map((player, index) => (
                  <ListItem 
                    key={index}
                    sx={{
                      background: player.username === user?.username 
                        ? 'linear-gradient(45deg, #fff3e0, #ffe0b2)'
                        : index === 0 
                          ? 'linear-gradient(45deg, #fff8e1, #fff3c4)'
                          : 'white',
                      borderRadius: '15px',
                      mb: 2,
                      border: player.username === user?.username ? '3px solid #ff9800' : '2px solid #e0e0e0',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ 
                        bgcolor: index === 0 ? '#ffd700' : 
                                index === 1 ? '#c0c0c0' : 
                                index === 2 ? '#cd7f32' : '#667eea',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        width: 50,
                        height: 50,
                      }}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#333' }}>
                          {player.username}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#667eea' }}>
                          {player.score} points
                        </Typography>
                      }
                    />
                    {player.username === user?.username && (
                      <Chip 
                        label="🎯 You!" 
                        sx={{
                          background: 'linear-gradient(45deg, #ff9800, #ffc107)',
                          color: 'white',
                          fontWeight: 'bold',
                        }}
                      />
                    )}
                    {index === 0 && (
                      <Chip 
                        label="👑 Winner!" 
                        sx={{
                          background: 'linear-gradient(45deg, #ffd700, #ffeb3b)',
                          color: '#333',
                          fontWeight: 'bold',
                        }}
                      />
                    )}
                  </ListItem>
                ))}
              </List>
            </div>
          )}

          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              onClick={() => navigate('/')}
              size="large"
              sx={{
                borderRadius: '25px',
                px: 4,
                py: 2,
                fontSize: '18px',
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)',
                  transform: 'translateY(-3px)',
                },
                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
              }}
            >
              🏠 Back to Home
            </Button>
          </Box>
        </div>
      </Container>
    </div>
  );

  const renderGameScreen = () => {
    // Always show the appropriate screen based on current game state
    if (!sessionId || gameState === 'joining') {
      return renderJoinForm();
    }
    
    if (gameState === 'waiting' || gameStatus === 'waiting') {
      return renderWaitingRoom();
    }
    
    if ((gameState === 'active' || gameStatus === 'active') && !currentQuestion) {
      // Game is active but no question yet, show waiting room with "game started" message
      return (
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom align="center">
              Oyun Başladı!
            </Typography>
            <Typography variant="body1" align="center" color="textSecondary" paragraph>
              İlk soru hazırlanıyor...
            </Typography>
            {renderWaitingRoom()}
          </Paper>
        </Container>
      );
    }
    
    if ((gameState === 'question' || gameStatus === 'question') && currentQuestion) {
      return renderQuestion();
    }
    
    if (gameState === 'reviewing' || gameStatus === 'reviewing') {
      return (
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom align="center">
              Cevap Gösteriliyor
            </Typography>
            <Typography variant="body1" align="center" color="textSecondary" paragraph>
              Sonraki soruya geçiliyor...
            </Typography>
            {currentQuestion && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {currentQuestion.question_text}
                </Typography>
                <Grid container spacing={2}>
                  {currentQuestion.options?.map((option, index) => (
                    <Grid item xs={12} sm={6} key={option.id || index}>
                      <Card sx={{ 
                        bgcolor: option.is_correct ? 'success.light' : 
                                 selectedAnswer === index ? 'error.light' : 'background.paper',
                        border: 2,
                        borderColor: option.is_correct ? 'success.main' : 
                                    selectedAnswer === index ? 'error.main' : 'divider'
                      }}>
                        <CardContent>
                          <Typography variant="body1">
                            {String.fromCharCode(65 + index)}: {option.option_text}
                            {option.is_correct && ' ✓ (Doğru)'}
                            {selectedAnswer === index && !option.is_correct && ' ✗ (Seçiminiz)'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Paper>
        </Container>
      );
    }
    
    if (gameState === 'finished' || gameStatus === 'finished') {
      return renderResults();
    }
    
    // Default fallback
    return renderWaitingRoom();
  };

  // Play / pause background music
  useEffect(() => {
    if (!bgMusicUrl) return;

    const isYouTube = bgMusicUrl.includes('youtube.com') || bgMusicUrl.includes('youtu.be');

    // Clean previous
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (!isYouTube) {
      // Direct audio file (mp3, ogg ...)
      audioRef.current = new Audio(bgMusicUrl);
      audioRef.current.loop = true;
      audioRef.current.volume = 0.6;
      audioRef.current.play().catch(() => {});
    } else {
      // For YouTube links, we cannot use <audio>; handled by hidden iframe element appended to body
      const videoIdMatch = bgMusicUrl.match(/(?:v=|\.be\/)([A-Za-z0-9_-]{11})/);
      if (videoIdMatch) {
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${videoIdMatch[1]}?autoplay=1&loop=1&playlist=${videoIdMatch[1]}&controls=0&mute=0`;
        iframe.style.display = 'none';
        iframe.setAttribute('data-quiz-bg', 'true');
        document.body.appendChild(iframe);
        audioRef.current = {
          pause: () => {
            iframe.parentNode && iframe.parentNode.removeChild(iframe);
          }
        };
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [bgMusicUrl]);

  return (
    <>
      {renderGameScreen()}
      {error && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
          <Alert 
            severity="error" 
            sx={{ 
              borderRadius: '15px',
              background: 'linear-gradient(45deg, #ffebee, #ffcdd2)',
              border: '2px solid #f44336',
              fontWeight: 'bold',
            }}
          >
            {error}
          </Alert>
        </div>
      )}
    </>
  );
};

export default JoinQuiz;
