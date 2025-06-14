import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Alert,
  Box,
  Chip
} from '@mui/material';
import {
  Quiz as QuizIcon,
  PlayArrow as PlayIcon,
  Public as PublicIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import api from '../../services/api';
import '../../styles/quiz-theme.css';

const BrowseQuizzes = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await api.get('/quiz/fetchQuizList');
        setQuizzes(res.data || []);
      } catch (err) {
        setError('Quiz listesi alınamadı');
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, []);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await api.get('/session/public-active');
        setSessions(res.data || []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchSessions();  }, []);

  if (loading) {
    return (
      <div className="quiz-container">
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <div className="quiz-loading">
            <CircularProgress size={60} sx={{ color: '#667eea', mb: 3 }} />
            <Typography variant="h6" sx={{ color: '#667eea', fontWeight: 600 }}>
              Quiz'ler yükleniyor...
            </Typography>
          </div>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-container">
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert 
            severity="error"
            className="quiz-error"
            sx={{ 
              borderRadius: '16px',
              fontSize: '1.1rem',
              fontWeight: 500
            }}
          >
            {error}
          </Alert>
        </Container>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Başlık */}
        <div className="quiz-card quiz-fade-in">
          <Typography 
            variant="h3" 
            className="quiz-title"
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: 2,
              mb: 2
            }}
          >
            <PublicIcon sx={{ fontSize: '3rem', color: '#667eea' }} />
            Herkese Açık Quiz'ler
          </Typography>
          <Typography 
            variant="h6" 
            className="quiz-subtitle"
            sx={{ textAlign: 'center', color: '#7f8c8d' }}
          >
            Keşfet, katıl ve eğlen! Binlerce quiz arasından seçim yap.
          </Typography>
        </div>

        {/* Quiz Listesi */}
        <div className="quiz-card quiz-fade-in">
          <Grid container spacing={3}>
            {quizzes.map((quiz) => (
              <Grid item xs={12} sm={6} md={4} key={quiz.id}>
                <Card 
                  className="quiz-info-card"
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2)'
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <QuizIcon sx={{ color: '#667eea', fontSize: '1.5rem' }} />
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 700,
                          color: '#2c3e50',
                          lineHeight: 1.2
                        }}
                      >
                        {quiz.title}
                      </Typography>
                    </Box>
                    
                    <Typography 
                      variant="body2" 
                      color="textSecondary" 
                      sx={{ 
                        mb: 3,
                        lineHeight: 1.6,
                        fontSize: '1rem',
                        minHeight: '3em'
                      }}
                    >
                      {quiz.description?.slice(0, 120)}
                      {quiz.description?.length > 120 && '...'}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        icon={<QuizIcon />}
                        label={`${quiz.questions_count || 0} Soru`}
                        className="quiz-badge"
                        size="small"
                      />
                      {quiz.is_public && (
                        <Chip
                          icon={<PublicIcon />}
                          label="Herkese Açık"
                          className="quiz-badge-success"
                          size="small"
                        />
                      )}
                    </Box>
                  </CardContent>
                  
                  <CardActions sx={{ p: 3, pt: 0 }}>
                    <Button 
                      variant="contained"
                      fullWidth
                      startIcon={<PlayIcon />}
                      className="quiz-button-primary"
                      onClick={() => navigate('/join', { state: { quizId: quiz.id }})}
                      sx={{ 
                        py: 1.5,
                        fontSize: '1rem',
                        fontWeight: 600
                      }}
                    >
                      Quiz'e Katıl
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </div>

        {/* Aktif Oyunlar */}
        {sessions.length > 0 && (
          <div className="quiz-card quiz-fade-in">
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <PlayIcon sx={{ fontSize: '2rem', color: '#667eea' }} />
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
                Aktif Oyunlar
              </Typography>
            </Box>
            
            <Grid container spacing={3}>
              {sessions.map((session) => (
                <Grid item xs={12} sm={6} md={4} key={session.session_id}>
                  <Card 
                    className="quiz-info-card"
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      border: '2px solid rgba(102, 126, 234, 0.3)',
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05))',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        borderColor: '#667eea',
                        boxShadow: '0 20px 50px rgba(102, 126, 234, 0.3)'
                      }
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <PlayIcon sx={{ color: '#e74c3c', fontSize: '1.5rem' }} />
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 700,
                            color: '#2c3e50',
                            lineHeight: 1.2
                          }}
                        >
                          {session.title}
                        </Typography>
                      </Box>
                      
                      <Typography 
                        variant="body2" 
                        color="textSecondary" 
                        sx={{ 
                          mb: 3,
                          lineHeight: 1.6,
                          fontSize: '1rem',
                          minHeight: '3em'
                        }}
                      >
                        {session.description?.slice(0, 120)}
                        {session.description?.length > 120 && '...'}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          icon={<CodeIcon />}
                          label={`Kod: ${session.session_code}`}
                          className="quiz-badge-warning"
                          size="small"
                          sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                        />
                        <Chip
                          label="🔴 CANLI"
                          className="quiz-badge-error"
                          size="small"
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
                    </CardContent>
                    
                    <CardActions sx={{ p: 3, pt: 0 }}>
                      <Button 
                        variant="contained"
                        fullWidth
                        startIcon={<PlayIcon />}
                        className="quiz-button-primary"
                        onClick={() => navigate(`/join/${session.session_code}`)}
                        sx={{ 
                          py: 1.5,
                          fontSize: '1rem',
                          fontWeight: 600,
                          background: 'linear-gradient(135deg, #e74c3c, #c0392b) !important'
                        }}
                      >
                        Hemen Katıl
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </div>
        )}

        {/* Quiz yoksa mesaj */}
        {quizzes.length === 0 && !loading && (
          <div className="quiz-card quiz-fade-in">
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <QuizIcon sx={{ fontSize: '4rem', color: '#bdc3c7', mb: 2 }} />
              <Typography 
                variant="h5" 
                sx={{ 
                  color: '#7f8c8d',
                  fontWeight: 600,
                  mb: 2
                }}
              >
                Henüz herkese açık quiz bulunmuyor
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  color: '#95a5a6',
                  fontSize: '1.1rem'
                }}
              >
                Yakında yeni quiz'ler eklenecek. Daha sonra tekrar kontrol edin!
              </Typography>
            </Box>
          </div>
        )}
      </Container>
    </div>
  );
};

export default BrowseQuizzes; 