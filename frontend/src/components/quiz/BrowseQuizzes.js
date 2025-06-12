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
  Alert
} from '@mui/material';
import api from '../../services/api';

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
    fetchSessions();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py:4, textAlign:'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py:4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py:4 }}>
      <Typography variant="h4" gutterBottom>📚 Public Quizzes</Typography>
      <Grid container spacing={3}>
        {quizzes.map((q)=>(
          <Grid item xs={12} md={6} lg={4} key={q.id}>
            <Card sx={{height:'100%',display:'flex',flexDirection:'column'}}>
              <CardContent sx={{flexGrow:1}}>
                <Typography variant="h6">{q.title}</Typography>
                <Typography variant="body2" color="textSecondary" paragraph>{q.description?.slice(0,120)}</Typography>
              </CardContent>
              <CardActions sx={{justifyContent:'space-between', px:2, pb:2}}>
                <Button size="small" onClick={()=>navigate('/join', { state: { quizId: q.id }})}>Join</Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      {sessions.length > 0 && (
        <>
        <Typography variant="h4" gutterBottom sx={{mt:4}}>🎮 Active Games</Typography>
        <Grid container spacing={3}>
          {sessions.map(s=>(
            <Grid item xs={12} md={6} lg={4} key={s.session_id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{s.title}</Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>{s.description?.slice(0,120)}</Typography>
                  <Typography variant="caption">Kod: {s.session_code}</Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={()=>navigate(`/join/${s.session_code}`)}>Join</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
        </>
      )}
    </Container>
  );
};

export default BrowseQuizzes; 