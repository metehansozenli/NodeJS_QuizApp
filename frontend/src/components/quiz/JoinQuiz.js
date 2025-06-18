import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  ExitToApp,
} from '@mui/icons-material';
import socketService from '../../services/socket';
import soundService from '../../services/soundService';
import { useAuth } from '../../contexts/AuthContext';

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
  const [sessionId, setSessionId] = useState(null);  const [gameStatus, setGameStatus] = useState('joining');
  const [showAnswersAfterTimer, setShowAnswersAfterTimer] = useState(false);  const [timerSoundPlayed, setTimerSoundPlayed] = useState(false);
  const currentQuestionRef = useRef(null);
  const selectedAnswerRef = useRef(null);
  const participantsRef = useRef([]);

  // Ses yönetimi için state
  const [sounds, setSounds] = useState({
    backgroundMusic: null,
    timerSound: null,
    userJoinSound: null,
    correctAnswerSound: null,
    wrongAnswerSound: null,
    gameWinSound: null,
    gameLoseSound: null
  });  // Score display modal state  // Score display modal state
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scoreModalData, setScoreModalData] = useState(null);
  const [userAnswerResult, setUserAnswerResult] = useState(null);
  const [backgroundMusic, setBackgroundMusic] = useState(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  // Ses çalma fonksiyonu
  const playSound = (type, volume = 0.5) => {
    try {
      let soundUrl;
      switch (type) {
        case 'background':
          soundUrl = '/assets/soundEffects/background-music-224633.mp3';
          break;
        case 'timer':
          soundUrl = '/assets/soundEffects/mixkit-fini-countdown-927.wav';
          break;
        case 'user-join':
          soundUrl = '/assets/soundEffects/user-join.wav';
          break;
        case 'correct-answer':
          soundUrl = '/assets/soundEffects/mixkit-true-answer-notification-951.wav';
          break;
        case 'wrong-answer':
          soundUrl = '/assets/soundEffects/mixkit-wrong-answer-fail-notification-946.wav';
          break;
        case 'game-win':
          soundUrl = '/assets/soundEffects/mixkit-game-champion.wav';
          break;
        case 'game-lose':
          soundUrl = '/assets/soundEffects/mixkit-game-loser.wav';
          break;
        default:
          return;
      }

      const sound = new Audio(soundUrl);
      sound.volume = volume;
      
      if (type === 'background') {
        sound.loop = true;
        if (sounds.backgroundMusic) {
          sounds.backgroundMusic.pause();
        }
        setSounds(prev => ({ ...prev, backgroundMusic: sound }));
      } else if (type === 'timer') {
        // Timer ses efekti için eski ses varsa durdur
        if (sounds.timerSound) {
          sounds.timerSound.pause();
          sounds.timerSound.currentTime = 0;
        }
        setSounds(prev => ({ ...prev, timerSound: sound }));
      }
      
      sound.play();
    } catch (error) {
      console.error(`Error playing ${type} sound:`, error);
    }
  };

  // Ses durdurma fonksiyonu
  const stopSound = (type) => {
    try {
      if (sounds[type]) {
        sounds[type].pause();
        sounds.timerSound.currentTime = 0;
      }
    } catch (error) {
      console.error(`Error stopping ${type} sound:`, error);
    }
  };  // Tüm sesleri durdur
  const stopAllSounds = () => {
    try {
      // State'teki sesleri durdur
      Object.keys(sounds).forEach(type => {
        if (type !== 'backgroundMusic') { // backgroundMusic hariç
          stopSound(type);
        }
      });
      
      // Background müziği de durdur
      stopBackgroundMusic();
      
      // Sayfadaki tüm audio elementlerini durdur (ekstra güvenlik)
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (e) {
          console.warn('Could not stop audio element:', e);
        }
      });
      
      // Timer'ı da durdur
      if (timer) {
        clearInterval(timer);
        setTimer(null);
      }
      
      console.log('🔇 All sounds stopped completely');
    } catch (error) {
      console.error('❌ Error in stopAllSounds:', error);
    }
  };

  // Background müzik kontrol fonksiyonları
  const startBackgroundMusic = () => {
    if (!backgroundMusic) {
      const audio = new Audio('/assets/soundEffects/background-music-224633.mp3');
      audio.loop = true;
      audio.volume = 0.3;
      setBackgroundMusic(audio);
      
      audio.play().then(() => {
        setIsMusicPlaying(true);
        console.log('🎵 Background music started');
      }).catch(error => {
        console.error('Error starting background music:', error);
      });
    } else if (!isMusicPlaying) {
      backgroundMusic.play().then(() => {
        setIsMusicPlaying(true);
        console.log('🎵 Background music resumed');
      }).catch(error => {
        console.error('Error resuming background music:', error);
      });
    }
  };
  const stopBackgroundMusic = () => {
    try {
      if (backgroundMusic) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0; // Başa sar
        setIsMusicPlaying(false);
        console.log('🔇 Background music stopped completely');
      }
    } catch (error) {
      console.error('❌ Error stopping background music:', error);
    }
  };

  const toggleBackgroundMusic = () => {
    if (isMusicPlaying) {
      stopBackgroundMusic();
    } else {
      startBackgroundMusic();
    }
  };

  useEffect(() => {
    if (gameCode) {
      setJoinForm(prev => ({ ...prev, gameCode }));
    }
  }, [gameCode]);

  // Keep refs updated with current state values
  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  useEffect(() => {
    selectedAnswerRef.current = selectedAnswer;
  }, [selectedAnswer]);

  useEffect(()=>{
    if(gameCode && joinForm.gameCode===gameCode && !sessionId && gameState==='joining' && !loading){
      handleJoinGame();
    }
  },[gameCode,joinForm.gameCode,sessionId,gameState,loading]);  // Socket listeners - only when sessionId is set
  useEffect(() => {
    if (!sessionId || !user?.username) return; // Only setup listeners when we have both sessionId and user

    console.log('🔧 Setting up socket listeners for sessionId:', sessionId);
    
    // Ensure socket is connected
    socketService.connect();
    console.log('🔌 Socket connection status:', socketService.socket?.connected);

    // Clean up function to remove all listeners
    const cleanup = () => {
      console.log('🧹 Cleaning up socket listeners');
      socketService.off('sessionStateUpdate');
      socketService.off('userJoined');
      socketService.off('userLeft');
      socketService.off('showQuestion');
      socketService.off('answerSubmitted');
      socketService.off('showCorrectAnswer');
      socketService.off('sessionEnded');
      socketService.off('gameStarted');
      socketService.off('removeParticipant');
      socketService.off('quizCompleted');
      socketService.off('showFinalLeaderboard');
      socketService.off('playBackgroundMusic');
      socketService.off('playMusic');
      socketService.off('playSound');
      socketService.off('gameFinished');
      socketService.off('finishGame');
    };

    // Clean up first to prevent duplicates
    cleanup();// Listen for session state updates
    socketService.on('sessionStateUpdate', (data) => {
      console.log('🚀 sessionStateUpdate received:', {
        sessionId: data.sessionId,
        phase: data.phase,
        participantsCount: data.participants?.length,
        timestamp: new Date().toISOString(),
        fullData: data
      });
        if (data.sessionId === sessionId) {
        setGameStatus(data.status);        setParticipants(data.participants);
        participantsRef.current = data.participants; // Ref'i de güncelle
        if (data.background_music_url) {
          // Background music URL removed
        } else if (data.session?.background_music_url) {
          // Background music URL removed  
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

        // Score modal'ı göster eğer phase 'reviewing' - state kontrolü olmadan zorla
        console.log('🔍 Checking score modal conditions:', {
          phase: data.phase,
          participantsLength: data.participants?.length,
          hasParticipants: data.participants && data.participants.length > 0,
          sessionMatches: data.sessionId === sessionId
        });
        
        if (data.phase === 'reviewing' && data.participants && data.participants.length > 0) {
          console.log('✅ FORCING score modal open from sessionStateUpdate:', data.participants);
          
          const playerParticipants = data.participants.filter(p => p.username !== 'Host');
          const sortedParticipants = playerParticipants.sort((a, b) => (b.score || 0) - (a.score || 0));
          
          console.log('📊 Score modal participants:', {
            allParticipants: data.participants,
            playerParticipants,
            sortedParticipants
          });
          
          // Kullanıcının güncel puanını participants listesinden al
          const currentUser = data.participants.find(p => 
            p.username === (user?.username || 'Misafir') || p.userId === user?.id
          );
          const currentUserScore = currentUser ? currentUser.score : score;
          
          const modalData = {
            participants: sortedParticipants,
            userScore: currentUserScore,
            currentUser: user?.username || 'Misafir'
          };
          
          console.log('🎯 Setting score modal data:', modalData);
          
          // FORCE modal to open by setting both data and show state simultaneously
          setScoreModalData(modalData);
          setShowScoreModal(true);
          
          console.log('🚀 SCORE MODAL FORCED OPEN!');

          // Hide score modal after 5 seconds
          setTimeout(() => {
            console.log('⏰ Auto-closing score modal after 5 seconds');
            setShowScoreModal(false);
          }, 5000);
        } else {
          console.log('❌ Score modal NOT opened - phase:', data.phase, 'participants:', data.participants?.length);
        }

        // Eğer aktif soru yayınlanıyorsa ve henüz bir soru görünmüyorsa ayarla
        if (data.activeQuestion) {
          const playerQuestion = {
            ...data.activeQuestion,
            options: data.activeQuestion.options?.map(opt => ({
              id: opt.id,
              option_text: opt.option_text,
              is_correct: opt.is_correct
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
      if (data.sessionId === sessionId && data.participant) {
        if (data.playSound && data.participant.username !== (user?.username || 'Misafir')) {
          soundService.playUserJoin();
        }
        
        // Katılımcı listesini güncelle
        setParticipants(prev => {
          const newParticipants = [...prev];
          const existingIndex = newParticipants.findIndex(p => 
            (p.userId && data.participant.id && p.userId === data.participant.id) || 
            (p.username && data.participant.username && p.username === data.participant.username)
          );
          
          if (existingIndex === -1) {
            newParticipants.push({
              userId: data.participant.id || null,
              username: data.participant.username || 'Misafir',
              score: data.participant.score || 0,
              joined_at: new Date().toISOString()
            });
          } else {
            newParticipants[existingIndex] = {
              ...newParticipants[existingIndex],
              score: data.participant.score || 0
            };
          }
          
          return newParticipants;
        });
      }
    });

    // Listen for user left
    socketService.on('userLeft', (data) => {
      console.log('User left event received:', data);
      if (data.sessionId === sessionId) {
        // Remove participant from the list
        setParticipants(prev => prev.filter(p => p.username !== data.username));
      }    });

    // Listen for question updates
    socketService.on('showQuestion', (data) => {
      console.log('Show question event received:', data);
      
      // Önce mevcut timer'ı ve sesini durdur (koşul kontrolünden önce)
      stopTimer();
      
      if (data.sessionId === sessionId && data.question) {
        const playerQuestion = {
          ...data.question,
          options: data.question.options?.map(opt => ({
            id: opt.id,
            option_text: opt.option_text,
            is_correct: opt.is_correct
          }))
        };
        
        console.log('Processed question options:', playerQuestion.options); // Debug log        setCurrentQuestion(playerQuestion);
        setQuestionIndex(data.question.index - 1 || 0);
        setGameState('question');
        setGameStatus('question');        setSelectedAnswer(null);
        setUserAnswerResult(null); // Yeni soru için cevap sonucunu temizle
        setShowAnswersAfterTimer(false); // Yeni soru geldiğinde cevap gösterimini resetle
        setTimerSoundPlayed(false); // Timer ses flag'ini resetle
        setShowScoreModal(false); // Score modal'ını kapat
        setTimeLeft(data.question.duration_seconds || 30);
        startTimer();
      }    });    
    
    // Listen for answer submission result
    socketService.on('answerSubmitted', (data) => {
      console.log('Answer submitted event received:', data);
      
      if (data.sessionId === sessionId) {
        // Kullanıcının kendi cevabı mı kontrol et
        const currentUserId = user?.id || gameInfo?.participant?.user_id || gameInfo?.participant?.id;
        const currentUsername = user?.username || localStorage.getItem('playerUsername') || 'Misafir';
        
        if (data.userId === currentUserId || data.username === currentUsername) {
          console.log('This is our answer result:', {
            isCorrect: data.isCorrect,
            userId: data.userId,
            username: data.username
          });
          
          // Kullanıcının cevabının doğru/yanlış bilgisini sakla
          setUserAnswerResult({
            isCorrect: data.isCorrect,
            timestamp: Date.now()
          });
        }
      }
    });
    
    // Listen for correct answer
    socketService.on('showCorrectAnswer', (data) => {
      console.log('Show correct answer event received:', data);
      console.log('Debug - showCorrectAnswer data.question.options:', data.question?.options);
      
      if (data.sessionId === sessionId) {
        // Timer'ı durdur çünkü cevap gösterimi başlıyor
        stopTimer();
        
        if (data.question) {
          // Update question with correct answer information
          const updatedQuestion = {
            ...data.question,
            options: data.question.options?.map(opt => ({
              id: opt.id,
              option_text: opt.option_text,
              is_correct: opt.is_correct
            }))
          };
          setCurrentQuestion(updatedQuestion);
        }

                // Timer 0'a ulaştığında kullanıcının cevabına göre ses efekti çal
          const currentSelectedAnswer = selectedAnswerRef.current;
          
          // Eğer kullanıcı cevap verdiyse ses efekti çal
          if (currentSelectedAnswer !== null && userAnswerResult) {
            const isCorrect = userAnswerResult.isCorrect;
            console.log('Playing sound effect on timer expiry:', { 
              selectedAnswer: currentSelectedAnswer, 
              isCorrect,
              userAnswerResult 
            });
            
            setTimeout(() => {
              try {
                if (isCorrect) {
                  playSound('correct-answer');
                } else {
                  playSound('wrong-answer');
                }
                console.log('✅ Sound effect played successfully on timer expiry');
              } catch (error) {
                console.error('❌ Sound effect play error on timer expiry:', error);
              }
            }, 500); // 500ms gecikme ile ses efekti çal
          } else {
            console.log('❌ No sound effect played on timer expiry:', {
              selectedAnswer: currentSelectedAnswer,
              hasUserAnswerResult: !!userAnswerResult,
              userAnswerResult
            });
          }
            // TIMER BİTİMİNDE SCORE MODAL AÇMA
          console.log('🚀 Timer expired - Opening score modal');
          console.log('🔍 Current states:', {
            participants: participants,
            participantsLength: participants?.length,
            participantsRef: participantsRef.current,
            participantsRefLength: participantsRef.current?.length,
            showScoreModal: showScoreModal,
            scoreModalData: scoreModalData,
            user: user?.username || 'Misafir'
          });
          
          setTimeout(() => {
            const currentParticipants = participantsRef.current || participants;
            if (currentParticipants && currentParticipants.length > 0) {
              console.log('✅ Opening score modal on timer expiry:', currentParticipants);
              
              const playerParticipants = currentParticipants.filter(p => p.username !== 'Host');
              const sortedParticipants = playerParticipants.sort((a, b) => (b.score || 0) - (a.score || 0));
              
              const currentUser = currentParticipants.find(p => 
                p.username === (user?.username || 'Misafir') || p.userId === user?.id
              );
              const currentUserScore = currentUser ? currentUser.score : score;
              
              const modalData = {
                participants: sortedParticipants,
                userScore: currentUserScore,
                currentUser: user?.username || 'Misafir'
              };
              
              console.log('🎯 Setting score modal data:', modalData);
              setScoreModalData(modalData);
              setShowScoreModal(true);
              console.log('🚀 Score modal state set to TRUE on timer expiry!');

              // Hide score modal after 5 seconds
              setTimeout(() => {
                setShowScoreModal(false);
                console.log('⏰ Score modal auto-closed after 5 seconds');
              }, 5000);            } else {
              console.log('❌ Score modal not opened - no participants on timer expiry');
              console.log('❌ Participants state:', participants);
              console.log('❌ Participants ref:', participantsRef.current);
            }
          }, 1000); // 1 saniye sonra modal aç
            if (currentSelectedAnswer === null) {
            // Kullanıcı cevap vermemişse bir işlem yap
            console.log('No answer selected, timer expired');
            handleAnswerSelect(-1);
          } else {
            console.log('Timer expired with answer:', currentSelectedAnswer);
          }

        // setGameState('reviewing');
        // setGameStatus('reviewing');
      }
    });

    // Listen for session end
    socketService.on('sessionEnded', (data) => {
      console.log('Session ended event received:', data);
      if (data.sessionId === sessionId) {
        handleLeaveSession();
      }
    });    // Listen for game started
    socketService.on('gameStarted', (data) => {
      console.log('Game started event received:', data);
      if (data.sessionId === sessionId) {
        setGameState('active');
        setGameStatus('active');
        soundService.playBackgroundMusic();
        
        // Background müziği başlat
        startBackgroundMusic();
      }
    });

    // Listen for remove participant (when host kicks player)
    socketService.on('removeParticipant', (data) => {
      console.log('Remove participant event received:', data);
      if (data.sessionId === sessionId && data.username === (user?.username || 'Misafir')) {
        // Player was kicked, leave session
        handleLeaveSession();
      }
    });    // Listen for quiz completion
    socketService.on('quizCompleted', (data) => {
      console.log('Quiz completed event received:', data);
      if (data.sessionId === sessionId) {
        soundService.stopBackgroundMusic();
        setGameState('finished');
        setGameStatus('finished');
        
        // Background müziği durdur
        stopBackgroundMusic();
        
        if (data.finalLeaderboard) {
          setResults({ leaderboard: data.finalLeaderboard });
        }
        
        if (data.winner) {
          const isWinner = data.winner.username === (user?.username || 'Misafir');
          if (isWinner) {
            soundService.playGameWin();
          } else {
            soundService.playGameLose();
          }
        }
      }
    });    // Listen for final leaderboard
    socketService.on('showFinalLeaderboard', (data) => {
      console.log('Final leaderboard received:', data);
      if (data.sessionId === sessionId) {
        // Sonuç tablosu gösterilmeye başladığında müziği durdur
        console.log('🔇 Stopping background music for final leaderboard');
        stopBackgroundMusic();
        
        setResults({ leaderboard: data.leaderboard });
      }    });// Listen for background music
    socketService.on('playBackgroundMusic', (data) => {
      console.log('🎵 Background music event received:', data);
      console.log('🎵 Current sessionId:', sessionId);
      console.log('🎵 Event sessionId:', data.sessionId);
      console.log('🎵 URL:', data.url);
        if (data.sessionId === sessionId) {
        // Socket event sadece bgMusicUrl state'ini güncellesin
        // Gerçek oynatma işini mevcut YouTube sistemi (useEffect) halletsin
        console.log('🎵 Setting bgMusicUrl state to:', data.url);
        // Background music URL removed
      } else {
        console.log('🚫 Background music event ignored - session mismatch');
      }
    });

    // Listen for music
    socketService.on('playMusic', (data) => {
      console.log('Music event received:', data);
      if (data.sessionId === sessionId && data.url) {
        try {
          const music = new Audio(data.url);
          music.volume = 0.3;
          music.play();
        } catch (error) {
          console.error('Error playing music:', error);
        }
      }
    });

    // Listen for sound effects
    socketService.on('playSound', (data) => {
      console.log('Sound event received:', data);
      if (data.sessionId === sessionId && data.type) {
        // Eğer personal: true ise, bu kullanıcının kişisel ses efekti (doğru cevap gösteriminde)
        if (data.personal) {
          console.log('Playing personal sound effect:', data.type);
          try {
            soundService.playSound(data.type);
            console.log('Sound played successfully:', data.type);
          } catch (error) {
            console.error('Error playing sound:', error);
          }
          return;
        }
        
        // Diğer durumlarda normal ses efektlerini çal (timer hariç answer sounds)
        if (data.type === 'correct-answer' || data.type === 'wrong-answer') {
          console.log('Skipping non-personal answer sound');
          return;
        }        console.log('Playing general sound effect:', data.type);
        soundService.playSound(data.type);
      }
    });

    // Return cleanup function for useEffect
    return () => {
      console.log('🧹 Cleaning up socket listeners');
      // Clean up first - call our defined cleanup function
      cleanup();
    };
  }, [sessionId, user?.username]); // Only depend on sessionId and username changes

  useEffect(() => {
    // Check if there's an active session in localStorage
    const savedSessionId = localStorage.getItem('sessionId');
    if (savedSessionId) {
      // Clear any existing session data
      localStorage.removeItem('sessionId');
      socketService.emit('leaveSession', { sessionId: savedSessionId });
      // Tüm sesleri durdur
      stopAllSounds();
      stopBackgroundMusic();
    }

    // Clean up on unmount
    return () => {
      console.log('🧹 Cleaning up component - stopping all sounds');
      // Tüm sesleri durdur
      stopAllSounds();
      
      // Background müziği durdur
      stopBackgroundMusic();
      
      if (sessionId) {
        socketService.emit('leaveSession', { sessionId });
      }
    };
  }, []); // Empty dependency array since we want this to run only on mount

  // Sonuç ekranı için müzik kontrolü
  useEffect(() => {
    if (gameState === 'finished' || gameStatus === 'finished') {
      console.log('🎮 Game finished - stopping all sounds except background music');
      stopBackgroundMusic()
      // Tüm sesleri durdur ama arka plan müziğini koru
      Object.keys(sounds).forEach(type => {
        if (type !== 'backgroundMusic') {
          stopSound(type);
        }
      });
      
      // Arka plan müziğini düşük sesle çal
      if (sounds.backgroundMusic) {
        sounds.backgroundMusic.volume = 0.2;
      }
    }
  }, [gameState, gameStatus]);

  // Yeni oyuna girildiğinde müzik kontrolü
  useEffect(() => {
    if (gameState === 'joining' && !sessionId) {
      console.log('🎮 New game joining - stopping background music');
      stopBackgroundMusic();
    }
  }, [gameState, sessionId]);

  const handleJoinGame = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Join session via API
      const response = await fetch('https://nodejs-quizapp.onrender.com/api/session/addParticipant', {
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
      // Tüm sesleri durdur
      stopAllSounds();
      
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
  
  const stopTimer = () => {
    console.log('Stopping timer, current timer ID:', timer);
    
    if (timer) {
      clearInterval(timer);
      setTimer(null);
      console.log('Timer stopped and cleared');
    }
    
    // Timer sesini durdur (playSound ile çalıştırılan)
    stopSound('timer');
    console.log('Timer sound stopped');
    
    // Timer sound flag'ini resetle
    setTimerSoundPlayed(false);
    
    // TimeLeft'i de sıfırla (isteğe bağlı)
    // setTimeLeft(0);
  };
  
  const startTimer = () => {
    // Önce mevcut timer'ı temizle
    if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
    
    // Timer sound flag'ini resetle
    setTimerSoundPlayed(false);
    console.log('Starting new timer');
    
    const newTimer = setInterval(() => {
      setTimeLeft(prev => {        // Timer ses efekti sadece son 5 saniyede ve sadece bir kez çalsın
        if (prev === 9) {
          setTimerSoundPlayed(current => {
            if (!current) {
              try {
                playSound('timer', 0.1); // Daha düşük ses seviyesi
              } catch (error) {
                console.error('Timer sound play error:', error);
              }
              return true;
            }
            return current;
          });
        }
        if (prev <= 1) {
          clearInterval(newTimer);
          setTimer(null);

          // Timer bitiminde showCorrectAnswer event'ini tetikle
          console.log('🔥 Timer expired - triggering showCorrectAnswer event');
          socketService.emit('showCorrectAnswer', {
            sessionId: sessionId,
            questionId: currentQuestion?.id
          });
          
          return 0;
        }
        
        return prev - 1;
      });
    }, 1000);
    
    // Yeni timer'ı state'e kaydet
    setTimer(newTimer);
    console.log('Timer started with interval ID:', newTimer);
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
      fetch('https://nodejs-quizapp.onrender.com/api/answer/submit', {
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
            🎮 Quiz'e Katıl!
          </div>
          <div className="kahoot-subtitle">
            Başlamak için oyun kodunu girin
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

          <form onSubmit={handleJoinGame}>            <TextField
              fullWidth
              label="Oyun Kodu"
              value={joinForm.gameCode}
              onChange={(e) => handleInputChange('gameCode', e.target.value)}
              margin="normal"
              required
              placeholder="6 haneli kodu girin"
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
                '🚀 Oyuna Katıl!'
              )}
            </Button>
          </form>

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: '#666', mb: 2 }}>
              Kodunuz yok mu?
            </Typography>
            <Typography variant="body2" sx={{ color: '#999' }}>
              Quiz'e katılmak için ev sahibinizden 6 haneli oyun kodunu isteyin!
            </Typography>
          </Box>
        </div>
      </Container>
    </div>
  );
  const renderWaitingRoom = () => (
    <div className="kahoot-container">
      <Container maxWidth="md" sx={{ py: 4 }}>
        <div className="kahoot-card kahoot-card-large">          <div className="kahoot-title">
            {gameInfo?.game?.title || 'Quiz Lobby'}
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
            {gameInfo?.game?.description || 'Ev sahibinin oyunu başlatmasını bekleyin...'}
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
              Oyun Kodu: {gameInfo?.game?.code || joinForm.gameCode}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Bu kodu başkalarıyla paylaşın!
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
              label={`Sen: ${user?.username || 'Misafir'}`}
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
            🎮 Hazır ol! Ev sahibi oyunu başlattığında quiz başlayacak.
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
              🎊 Lobideki Oyuncular ({participants.length})
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
                Henüz başka oyuncu yok... Oyun kodunu paylaşın!
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
              }}              >
                🚪 Lobi'den Ayrıl
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
                Soru {questionIndex + 1}
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
                  🚪 Ayrıl
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
              {currentQuestion.options?.map((option, index) => {
                // Determine the class for reviewing state
                let optionClass = 'answer-option';
                if (selectedAnswer === index) {
                  optionClass += ' selected';
                }
                
                // Add correct/incorrect classes during reviewing OR when timer expires
                if (gameStatus === 'reviewing' || timeLeft === 0) {
                  if (option.is_correct) {
                    optionClass += ' correct-show';
                  } else if (selectedAnswer === index && !option.is_correct) {
                    optionClass += ' incorrect';
                  }
                }
                
                // Determine background color based on state
                let backgroundColor = 'linear-gradient(45deg, #667eea, #764ba2)';
                let borderColor = 'rgba(255,255,255,0.3)';
              
                
                if (timeLeft === 0 || gameStatus === 'reviewing') {
                  if (option.is_correct) {
                    // Doğru cevap her zaman yeşil
                    backgroundColor = 'linear-gradient(45deg, #4caf50, #8bc34a)'; // Green for correct
                    borderColor = '#4caf50';
                  } else if (selectedAnswer === index && !option.is_correct) {
                    // Yanlış seçilen cevap kırmızı
                    backgroundColor = 'linear-gradient(45deg, #f44336, #e91e63)'; // Red for wrong selected
                    borderColor = '#f44336';
                  } else {
                    // Seçilmeyen ve yanlış olan cevaplar gri
                    backgroundColor = 'linear-gradient(45deg, #9e9e9e, #757575)'; // Gray for unselected
                    borderColor = '#9e9e9e';
                  }
                } else if (selectedAnswer === index) {
                  backgroundColor = 'linear-gradient(45deg, #ff9800, #ffc107)'; // Orange for selected (during timer)
                  borderColor = '#ff9800';
                }
                
                return (
                  <Grid item xs={12} sm={6} key={option.id || index}>
                    <div
                      className={optionClass}
                      onClick={() => handleAnswerSelect(index)}
                      style={{
                        pointerEvents: selectedAnswer !== null || timeLeft === 0 ? 'none' : 'auto',
                        opacity: (selectedAnswer !== null && selectedAnswer !== index && timeLeft > 0) ? 0.6 : 1,
                        minHeight: '120px',
                        position: 'relative',
                        background: backgroundColor,
                        border: `3px solid ${borderColor}`,
                        borderRadius: '20px',
                        cursor: selectedAnswer !== null || timeLeft === 0 ? 'default' : 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        boxShadow: timeLeft === 0 || gameStatus === 'reviewing' 
                          ? option.is_correct 
                            ? '0 0 20px rgba(76, 175, 80, 0.6)' 
                            : selectedAnswer === index && !option.is_correct
                              ? '0 0 20px rgba(244, 67, 54, 0.6)'
                              : '0 4px 15px rgba(0,0,0,0.2)'
                          : selectedAnswer === index
                            ? '0 0 20px rgba(255, 152, 0, 0.6)'
                            : '0 4px 15px rgba(102, 126, 234, 0.4)',
                        transform: selectedAnswer === index ? 'scale(1.02)' : 'scale(1)',
                      }}
                    >
                      <Box sx={{ 
                        position: 'absolute',
                        top: '15px',
                        left: '20px',
                        background: 'rgba(255,255,255,0.2)',
                        borderRadius: '50%',
                        width: '35px',
                        height: '35px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        color: 'white',
                        border: '2px solid rgba(255,255,255,0.4)',
                      }}>
                        {String.fromCharCode(65 + index)}
                      </Box>
                      
                      {/* Show correct/wrong icons when timer expires */}
                      {(timeLeft === 0 || gameStatus === 'reviewing') && (
                        <Box sx={{
                          position: 'absolute',
                          top: '15px',
                          right: '20px',
                          fontSize: '24px',
                          fontWeight: 'bold',
                        }}>
                          {option.is_correct ? '✅' : selectedAnswer === index && !option.is_correct ? '❌' : ''}
                        </Box>
                      )}
                      
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 'bold',
                          textAlign: 'center',
                          color: 'white',
                          fontSize: '18px',
                          lineHeight: 1.3,
                          px: 3,
                        }}
                      >
                        {option.option_text}
                      </Typography>
                    </div>
                  </Grid>
                );
              })}
            </Grid>
            
            {selectedAnswer !== null && timeLeft > 0 && gameStatus !== 'reviewing' && (
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
                ✅ Cevap gönderildi! Diğer oyuncular bekleniyor...
              </Alert>
            )}
            
            {(gameStatus === 'reviewing' || timeLeft === 0) && (
              <Alert 
                severity={selectedAnswer !== null && currentQuestion.options?.[selectedAnswer]?.is_correct ? "success" : "info"}
                sx={{ 
                  mt: 4,
                  borderRadius: '15px',
                  background: selectedAnswer !== null && currentQuestion.options?.[selectedAnswer]?.is_correct 
                    ? 'linear-gradient(45deg, #e8f5e8, #c8e6c9)'
                    : 'linear-gradient(45deg, #e3f2fd, #bbdefb)',
                  border: selectedAnswer !== null && currentQuestion.options?.[selectedAnswer]?.is_correct 
                    ? '2px solid #4caf50'
                    : '2px solid #2196f3',
                  fontSize: '16px',
                  fontWeight: 'bold',
                }}
              >
                {selectedAnswer !== null && currentQuestion.options?.[selectedAnswer]?.is_correct 
                  ? '🎉 Doğru! Tebrikler!' 
                  : selectedAnswer !== null 
                    ? '❌ Yanlış cevap. Doğru cevap yeşil ile vurgulanmıştır.'
                    : '⏰ Süre doldu! Doğru cevap yeşil ile vurgulanmıştır.'
                }
              </Alert>
            )}
          </div>
        </Container>
      </div>
    );
  };  const renderScoreModal = () => {
    console.log('🎭 renderScoreModal called!', {
      showScoreModal,
      scoreModalData,
      timestamp: new Date().toISOString()
    });
    
    return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999, // Çok yüksek z-index
        animation: 'fadeIn 0.5s ease-in-out'
      }}
      onClick={(e) => {
        console.log('🎯 Score modal overlay clicked!');
        e.stopPropagation();
      }}
    >
      <Paper
        elevation={20}
        sx={{
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          borderRadius: '25px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          p: 4,
          textAlign: 'center',
          position: 'relative',
          transform: 'scale(0.8)',
          animation: 'scaleIn 0.5s ease-out forwards'
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
            🏆
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            Anlık Skor Durumu
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            Şu andaki sıralama
          </Typography>
        </Box>

        {scoreModalData && (
          <>
            {console.log('Rendering score modal with data:', scoreModalData)}
            {console.log('Participants array:', scoreModalData.participants)}
            {console.log('Participants length:', scoreModalData.participants?.length)}
            
            {/* User's Own Score */}
            <Box
              sx={{
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '15px',
                p: 3,
                mb: 3,
                border: '2px solid rgba(255, 255, 255, 0.3)'
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
                Senin Puanın
              </Typography>
              <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#FFE082' }}>
                {scoreModalData.userScore}
              </Typography>
            </Box>

            {/* Leaderboard */}
            <Box
              sx={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '15px',
                p: 2
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                🥇 Top 5 Oyuncu
              </Typography>
              <List sx={{ p: 0 }}>
                {scoreModalData.participants.slice(0, 5).map((participant, index) => {
                  const isCurrentUser = participant.username === scoreModalData.currentUser;
                  const position = index + 1;
                  
                  return (
                    <ListItem
                      key={`score-${participant.userId || index}`}
                      sx={{
                        background: isCurrentUser 
                          ? 'rgba(255, 224, 130, 0.3)' 
                          : 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '10px',
                        mb: 1,
                        border: isCurrentUser ? '2px solid #FFE082' : 'none',
                        py: 1
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor: position === 1 ? '#FFD700' : 
                                    position === 2 ? '#C0C0C0' : 
                                    position === 3 ? '#CD7F32' : '#8e8e93',
                            color: position <= 3 ? '#000' : '#fff',
                            fontWeight: 'bold',
                            width: 40,
                            height: 40
                          }}
                        >
                          {position === 1 ? '🥇' : 
                           position === 2 ? '🥈' : 
                           position === 3 ? '🥉' : position}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: isCurrentUser ? 'bold' : 'medium',
                              color: 'white'
                            }}
                          >
                            {participant.username}
                            {isCurrentUser && ' (Sen)'}
                          </Typography>
                        }
                        secondary={
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontWeight: 'bold', 
                              color: '#FFE082' 
                            }}
                          >
                            {participant.score || 0} puan
                          </Typography>
                        }
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Box>

            {/* Auto-close timer */}
            <Box sx={{ mt: 3 }}>
              <LinearProgress 
                variant="determinate" 
                value={100} 
                sx={{ 
                  mt: 1,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#FFE082',
                    animation: 'shrink 5s linear forwards'
                  }
                }}
              />
            </Box>
          </>
        )}
      </Paper>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes scaleIn {
            from { transform: scale(0.8); }
            to { transform: scale(1); }
          }
          
          @keyframes shrink {
            from { width: 100%; }
            to { width: 0%; }
          }        `}
      </style>
    </div>
  );
  };

  const renderResults = () => {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h4" gutterBottom align="center">
            Oyun Sonuçları
          </Typography>
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
              Final Puanınız
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
                🏅 Final Skor Tablosu
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
        </Paper>
      </Container>
    );
  };

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

  return (
    <>
      {renderGameScreen()}
      {console.log('🔄 RENDER: showScoreModal=', showScoreModal, 'participants=', participants?.length)}
      {showScoreModal && console.log('🎭 RENDERING SCORE MODAL NOW!')}
      {showScoreModal && renderScoreModal()}
        {/* BACKGROUND MUSIC TOGGLE BUTTON */}
      {(gameState === 'active' || gameState === 'question' || gameState === 'reviewing') && (
        <button 
          style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            zIndex: 10000,
            padding: '12px',
            backgroundColor: isMusicPlaying ? '#4CAF50' : '#ff4444',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '18px',
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease'
          }}
          onClick={toggleBackgroundMusic}
          title={isMusicPlaying ? 'Müziği Kapat' : 'Müziği Aç'}
        >
          {isMusicPlaying ? '🎵' : '🔇'}
        </button>
      )}

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
