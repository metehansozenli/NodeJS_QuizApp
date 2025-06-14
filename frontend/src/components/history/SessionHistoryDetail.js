import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  CircularProgress, 
  Alert, 
  Table, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableBody, 
  Paper,
  Box,
  Chip,
  Avatar,
  Grid
} from '@mui/material';
import { 
  EmojiEvents as TrophyIcon,
  Quiz as QuizIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon 
} from '@mui/icons-material';
import api from '../../services/api';
import '../../styles/quiz-theme.css';

const SessionHistoryDetail = () => {
  const { sessionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await api.get(`/quiz-history/session/${sessionId}/detail`);
        setData(res.data);
      } catch (err) {
        setError('Detay getirilemedi');
      } finally {
        setLoading(false);
      }
    };
    if (sessionId) fetchDetail();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="quiz-container">
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <div className="quiz-card quiz-loading">
            <CircularProgress size={60} sx={{ color: '#667eea', mb: 3 }} />
            <Typography variant="h6" sx={{ color: '#667eea', fontWeight: 600 }}>
              Oturum detayları yükleniyor...
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

  if (!data) return null;

  const { leaderboard = [], answers = [] } = data;

  // Liderlik tablosunda sıralama için renk şeması
  const getRankColor = (index) => {
    switch (index) {
      case 0: return 'linear-gradient(135deg, #FFD700, #FFA500)'; // Altın
      case 1: return 'linear-gradient(135deg, #C0C0C0, #A8A8A8)'; // Gümüş
      case 2: return 'linear-gradient(135deg, #CD7F32, #A0522D)'; // Bronz
      default: return 'linear-gradient(135deg, #667eea, #764ba2)';
    }
  };

  const getRankIcon = (index) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}`;
    }
  };

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
            <TrophyIcon sx={{ fontSize: '3rem', color: '#667eea' }} />
            Oturum Detayları
          </Typography>
          <Typography 
            variant="h6" 
            className="quiz-subtitle"
            sx={{ textAlign: 'center', color: '#7f8c8d' }}
          >
            Quiz oturumunun detaylı sonuçları ve liderlik tablosu
          </Typography>
        </div>

        {/* Liderlik Tablosu */}
        <div className="quiz-card quiz-fade-in">
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <TrophyIcon sx={{ fontSize: '2rem', color: '#667eea' }} />
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
              Liderlik Tablosu
            </Typography>
          </Box>
          
          <Paper className="quiz-table" elevation={0}>
            <Table>
              <TableHead className="quiz-table-header">
                <TableRow>
                  <TableCell 
                    sx={{ 
                      color: 'white !important',
                      fontWeight: '600 !important',
                      fontSize: '1.1rem !important'
                    }}
                  >
                    Sıralama
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      color: 'white !important',
                      fontWeight: '600 !important',
                      fontSize: '1.1rem !important'
                    }}
                  >
                    Oyuncu
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      color: 'white !important',
                      fontWeight: '600 !important',
                      fontSize: '1.1rem !important'
                    }}
                  >
                    Toplam Puan
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaderboard.map((player, index) => (
                  <TableRow 
                    key={player.user_id} 
                    className="quiz-table-row"
                    sx={{
                      '&:hover': {
                        background: 'rgba(102, 126, 234, 0.05) !important'
                      }
                    }}
                  >
                    <TableCell className="quiz-table-cell">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          sx={{
                            width: 40,
                            height: 40,
                            background: getRankColor(index),
                            fontWeight: 'bold',
                            fontSize: '1.2rem'
                          }}
                        >
                          {getRankIcon(index)}
                        </Avatar>
                      </Box>
                    </TableCell>
                    <TableCell className="quiz-table-cell">
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: index < 3 ? 600 : 400,
                          fontSize: '1.1rem'
                        }}
                      >
                        {player.username}
                      </Typography>
                    </TableCell>
                    <TableCell className="quiz-table-cell">
                      <Chip
                        label={`${player.score} puan`}
                        className={index < 3 ? 'quiz-badge-success' : 'quiz-badge'}
                        sx={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          minWidth: '90px'
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </div>

        {/* Soru Bazlı Sonuçlar */}
        <div className="quiz-card quiz-fade-in">
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <QuizIcon sx={{ fontSize: '2rem', color: '#667eea' }} />
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
              Soru Bazlı Sonuçlar
            </Typography>
          </Box>
          
          <Paper className="quiz-table" elevation={0}>
            <Table>
              <TableHead className="quiz-table-header">
                <TableRow>
                  <TableCell 
                    sx={{ 
                      color: 'white !important',
                      fontWeight: '600 !important',
                      fontSize: '1.1rem !important'
                    }}
                  >
                    Soru
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      color: 'white !important',
                      fontWeight: '600 !important',
                      fontSize: '1.1rem !important'
                    }}
                  >
                    Oyuncu
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      color: 'white !important',
                      fontWeight: '600 !important',
                      fontSize: '1.1rem !important',
                      textAlign: 'center'
                    }}
                  >
                    Sonuç
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {answers.map((answer, index) => (
                  <TableRow 
                    key={index} 
                    className="quiz-table-row"
                    sx={{
                      '&:hover': {
                        background: 'rgba(102, 126, 234, 0.05) !important'
                      }
                    }}
                  >
                    <TableCell className="quiz-table-cell">
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 500,
                          lineHeight: 1.4,
                          maxWidth: '300px'
                        }}
                      >
                        {answer.question_text}
                      </Typography>
                    </TableCell>
                    <TableCell className="quiz-table-cell">
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 600,
                          color: '#2c3e50'
                        }}
                      >
                        {answer.username}
                      </Typography>
                    </TableCell>
                    <TableCell className="quiz-table-cell" sx={{ textAlign: 'center' }}>
                      <Chip
                        icon={answer.is_correct ? 
                          <CheckIcon sx={{ color: 'white !important' }} /> : 
                          <CancelIcon sx={{ color: 'white !important' }} />
                        }
                        label={answer.is_correct ? 'Doğru' : 'Yanlış'}
                        className={answer.is_correct ? 'quiz-badge-success' : 'quiz-badge-error'}
                        sx={{
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          minWidth: '100px'
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </div>

        {/* Özet Bilgiler */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={4}>
            <div className="quiz-stat-card">
              <Typography className="quiz-stat-number">
                {leaderboard.length}
              </Typography>
              <Typography className="quiz-stat-label">
                Toplam Oyuncu
              </Typography>
            </div>
          </Grid>
          <Grid item xs={12} md={4}>
            <div className="quiz-stat-card">
              <Typography className="quiz-stat-number">
                {answers.length}
              </Typography>
              <Typography className="quiz-stat-label">
                Toplam Cevap
              </Typography>
            </div>
          </Grid>
          <Grid item xs={12} md={4}>
            <div className="quiz-stat-card">
              <Typography className="quiz-stat-number">
                {answers.filter(a => a.is_correct).length}
              </Typography>
              <Typography className="quiz-stat-label">
                Doğru Cevap
              </Typography>
            </div>
          </Grid>        </Grid>
      </Container>
    </div>
  );
};

export default SessionHistoryDetail;