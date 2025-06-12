import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Box,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  PlayArrow as JoinIcon,
  GamepadOutlined as GameIcon,
  TrendingUp as StatsIcon,
} from '@mui/icons-material';
import io from 'socket.io-client';

const UserDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [sessionCode, setSessionCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [joinedSession, setJoinedSession] = useState(null);
  const [socket, setSocket] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [gameStatus, setGameStatus] = useState('');

  // Socket bağlantısını kur
  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Socket event listeners
    newSocket.on('userJoined', (data) => {
      setParticipants(prev => [...prev, data.username]);
      setSuccess(`${data.username} katıldı!`);
      setTimeout(() => setSuccess(''), 3000);
    });

    newSocket.on('userLeft', (data) => {
      setParticipants(prev => prev.filter(p => p !== data.username));
    });

    newSocket.on('gameStarted', () => {
      setGameStatus('Oyun başladı!');
    });

    newSocket.on('gameEnded', () => {
      setGameStatus('Oyun bitti!');
      setJoinedSession(null);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleJoinSession = async () => {
    if (!sessionCode.trim()) {
      setError('Lütfen bir session kodu girin');
      return;
    }
    
    if (!user?.username) {
      setError('Kullanıcı bilgisi bulunamadı');
      return;
    }

    setError('');
    setSuccess('');    try {
      // REST API ile session'a katıl
      const response = await fetch('http://localhost:5000/api/session/addParticipant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: sessionCode,  // 6-digit session code
          username: user.username
        }),
      });      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Session\'a katılım başarısız');
      }

      const data = await response.json();

      // Socket ile host'a anlık haber ver - Use the UUID sessionId from response
      socket.emit('joinSession', { 
        sessionId: data.game.id,  // Use the UUID from API response
        username: user.username 
      }, (response) => {
        if (response.success) {
          setJoinedSession(sessionCode);  // Display the 6-digit code to user
          setSuccess(`Session ${sessionCode}'ye başarıyla katıldınız!`);
          setSessionCode('');
        } else {
          setError(response.error || 'Socket bağlantısında hata');
        }
      });

    } catch (err) {
      setError(err.message);
    }
  };

  const handleLeaveSession = async () => {
    if (!joinedSession || !user?.username) return;

    try {
      const response = await fetch(`http://localhost:5000/api/session/${joinedSession}/remove-participant/${user.username}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        socket.emit('leaveSession', { 
          sessionId: joinedSession, 
          username: user.username 
        });
        setJoinedSession(null);
        setParticipants([]);
        setGameStatus('');
        setSuccess('Session\'dan başarıyla ayrıldınız');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Session\'dan ayrılırken hata oluştu');
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Hoş Geldiniz, {user?.username}!
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Bir quiz session'ına katılarak bilginizi test edin
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {!joinedSession ? (
        // Session'a katılım formu
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Card sx={{ p: 4, textAlign: 'center' }}>
              <CardContent>
                <JoinIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Live Session'a Katıl
                </Typography>
                <Typography color="textSecondary" paragraph>
                  Host tarafından verilen session kodunu girin
                </Typography>
                <TextField
                  fullWidth
                  label="Session Kodu"
                  variant="outlined"
                  value={sessionCode}
                  onChange={(e) => {
                    setSessionCode(e.target.value.toUpperCase());
                    setError('');
                  }}
                  placeholder="Session kodunu girin"
                  sx={{ mb: 3, maxWidth: 300 }}
                  inputProps={{ style: { textAlign: 'center' } }}
                />
              </CardContent>
              <CardActions sx={{ justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleJoinSession}
                  disabled={!sessionCode.trim()}
                  startIcon={<JoinIcon />}
                >
                  Session'a Katıl
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      ) : (
        // Katılınan session bilgileri
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <GameIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Session: {joinedSession}
                </Typography>
                <Typography color="textSecondary" paragraph>
                  Session'a başarıyla katıldınız. Host oyunu başlatmayı bekliyorsunuz.
                </Typography>
                {gameStatus && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {gameStatus}
                  </Alert>
                )}
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleLeaveSession}
                >
                  Session'dan Ayrıl
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Katılımcılar ({participants.length})
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <List dense>
                  {participants.map((participant, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={participant} />
                    </ListItem>
                  ))}
                  {participants.length === 0 && (
                    <Typography color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
                      Henüz katılımcı yok
                    </Typography>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Kullanıcı İstatistikleri */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <StatsIcon sx={{ mr: 1 }} />
          İstatistikleriniz
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                0
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Oynadığınız Oyun
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="secondary">
                0%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Ortalama Skor
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                0
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Doğru Cevap
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default UserDashboard;
