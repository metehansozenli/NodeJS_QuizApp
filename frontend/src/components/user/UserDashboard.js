import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Box,
} from '@mui/material';

const UserDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  return (
    <div className="kahoot-container">
      <Container maxWidth="md" sx={{ py: 4 }}>
        <div className="kahoot-card kahoot-card-large">          <div className="kahoot-title">
            Hoş Geldin, {user?.username}!
          </div>
          <div className="kahoot-subtitle">
            Bilgini test etmeye hazır mısın? Heyecan verici quiz'lere katıl!
          </div>

          <Grid container spacing={4} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <Card sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: '20px',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-10px)',
                  boxShadow: '0 20px 40px rgba(102, 126, 234, 0.4)',
                }
              }}>
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                  <div style={{ fontSize: '80px', marginBottom: '20px' }}>🎮</div>                  <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Quiz'e Katıl
                  </Typography>
                  <Typography sx={{ mb: 3, fontSize: '16px', opacity: 0.9 }}>
                    Canlı quiz'lere katılmak ve diğerleriyle yarışmak için oyun kodunu gir!
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate('/join')}
                    sx={{
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      borderRadius: '25px',
                      px: 4,
                      py: 2,
                      fontSize: '16px',
                      fontWeight: 'bold',
                      backdropFilter: 'blur(10px)',
                      border: '2px solid rgba(255,255,255,0.3)',
                      '&:hover': {
                        background: 'rgba(255,255,255,0.3)',
                        transform: 'translateY(-2px)',
                      },                    }}
                  >
                    Oyuna Katıl
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                background: 'linear-gradient(135deg, #e91e63 0%, #9c27b0 100%)',
                color: 'white',
                borderRadius: '20px',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-10px)',
                  boxShadow: '0 20px 40px rgba(233, 30, 99, 0.4)',
                }
              }}>
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                  <div style={{ fontSize: '80px', marginBottom: '20px' }}>📊</div>                  <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Quiz'leri Keşfet
                  </Typography>
                  <Typography sx={{ mb: 3, fontSize: '16px', opacity: 0.9 }}>
                    Mevcut herkese açık quiz'leri keşfet ve becerilerini geliştir!
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate('/browse-quizzes')}
                    sx={{
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      borderRadius: '25px',
                      px: 4,
                      py: 2,
                      fontSize: '16px',
                      fontWeight: 'bold',
                      backdropFilter: 'blur(10px)',
                      border: '2px solid rgba(255,255,255,0.3)',
                      '&:hover': {
                        background: 'rgba(255,255,255,0.3)',
                        transform: 'translateY(-2px)',
                      },                    }}
                  >
                    Keşfet
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                color: 'white',
                borderRadius: '20px',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-10px)',
                  boxShadow: '0 20px 40px rgba(76, 175, 80, 0.4)',
                }
              }}>
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                  <div style={{ fontSize: '80px', marginBottom: '20px' }}>🕑</div>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Geçmiş Quizlerim
                  </Typography>
                  <Typography sx={{ mb: 3, fontSize: '16px', opacity: 0.9 }}>
                    Geçmişte katıldığın quizlerin sonuçlarını incele.
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate('/history/player')}
                    sx={{
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      borderRadius: '25px',
                      px: 4,
                      py: 2,
                      fontSize: '16px',
                      fontWeight: 'bold',
                      backdropFilter: 'blur(10px)',
                      border: '2px solid rgba(255,255,255,0.3)',
                      '&:hover': {
                        background: 'rgba(255,255,255,0.3)',
                        transform: 'translateY(-2px)',
                      },                    }}
                  >
                    Geçmişim
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Box sx={{ 
            mt: 4, 
            p: 3,
            background: 'rgba(102, 126, 234, 0.1)',
            borderRadius: '20px',
            textAlign: 'center'
          }}>            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333', mb: 2 }}>
              Nasıl Oynanır
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#667eea', mb: 1 }}>
                  1. Kod Al
                </Typography>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Host'tan 6 haneli oyun kodunu iste
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#e91e63', mb: 1 }}>
                  2. Oyuna Katıl
                </Typography>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Kodu gir ve quiz lobisine katıl
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#4caf50', mb: 1 }}>
                  3. Oyna ve Kazan
                </Typography>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Soruları hızlı cevapla ve sıralamada yüksel!
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </div>
      </Container>
    </div>
  );
};

export default UserDashboard;
