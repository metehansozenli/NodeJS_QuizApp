import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
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
  Alert
} from '@mui/material';
import api from '../../services/api';

const PlayerHistory = () => {
  const { user } = useSelector(state=>state.auth);
  const [history,setHistory] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const navigate = useNavigate();

  useEffect(()=>{
    const fetchHistory = async ()=>{
      try{
        const res = await api.get(`/quiz-history/player/${user.id}`);
        setHistory(res.data||[]);
      }catch(err){
        setError('Geçmiş listesi alınamadı');
      }finally{
        setLoading(false);
      }
    };
    if(user?.id) fetchHistory();
  },[user?.id]);
  if(loading){
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <div className="quiz-container">
          <div className="quiz-card" style={{ textAlign: 'center', padding: '60px' }}>
            <CircularProgress size={60} sx={{ color: '#667eea' }} />
            <Typography variant="h6" sx={{ mt: 3, color: '#667eea' }}>
              Geçmiş yükleniyor...
            </Typography>
          </div>
        </div>
      </Container>
    )
  }
  if(error){
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert 
          severity="error" 
          sx={{ 
            borderRadius: '16px',
            bgcolor: 'rgba(231, 76, 60, 0.1)',
            border: '1px solid rgba(231, 76, 60, 0.2)'
          }}
        >
          {error}
        </Alert>
      </Container>
    )
  }
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <div 
        className="quiz-card"
        style={{
          padding: '40px',
          marginBottom: '30px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(102, 126, 234, 0.3)'
        }}
      >
        <Typography 
          variant="h3" 
          gutterBottom
          sx={{ 
            fontWeight: 700,
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          Geçmiş Quizlerim
        </Typography>
        <Typography 
          variant="h6"
          sx={{ 
            color: 'rgba(255,255,255,0.9)',
            fontWeight: 400
          }}
        >
          Katıldığın quiz'lerin sonuçlarını incele
        </Typography>
      </div>

      {history.length === 0 ? (
        <div 
          className="quiz-card"
          style={{
            padding: '60px',
            textAlign: 'center',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
          }}
        >
          <Typography variant="h5" sx={{ color: '#667eea', mb: 2 }}>
            Henüz quiz geçmişin yok
          </Typography>
          <Typography variant="body1" sx={{ color: '#666' }}>
            Quiz'lere katılmaya başla ve burada sonuçlarını gör!
          </Typography>
        </div>
      ) : (        <Grid container spacing={3}>
          {history.map(h=>(
            <Grid item xs={12} md={6} lg={4} key={h.id}>
              <Card 
                className="quiz-card"
                sx={{
                  height: '100%',
                  borderRadius: '20px',
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
                  }
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600,
                      color: '#2c3e50',
                      mb: 2
                    }}
                  >
                    {h.title}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#7f8c8d',
                      mb: 1
                    }}
                  >
                    📅 {new Date(h.played_at).toLocaleDateString('tr-TR')}
                  </Typography>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mt: 2,
                      fontWeight: 700,
                      color: '#667eea'
                    }}
                  >
                    🏆 {h.score} Puan
                  </Typography>
                </CardContent>
                {h.session_id && (
                  <CardActions sx={{ p: 3, pt: 0 }}>
                    <Button 
                      className="quiz-btn quiz-btn-primary"
                      size="small" 
                      onClick={() => navigate(`/history/session/${h.session_id}`)}
                      sx={{
                        borderRadius: '12px',
                        px: 3,
                        py: 1,
                        fontWeight: 600
                      }}
                    >
                      Detayları Gör
                    </Button>
                  </CardActions>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default PlayerHistory; 