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
    return <Container maxWidth="md" sx={{textAlign:'center',py:4}}><CircularProgress/></Container>
  }
  if(error){
    return <Container maxWidth="md" sx={{py:4}}><Alert severity="error">{error}</Alert></Container>
  }

  return (
    <Container maxWidth="lg" sx={{py:4}}>
      <Typography variant="h4" gutterBottom>🕑 Geçmiş Quizlerim</Typography>
      {history.length===0 && <Typography>No history yet.</Typography>}
      <Grid container spacing={3}>
        {history.map(h=>(
          <Grid item xs={12} md={6} lg={4} key={h.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{h.title}</Typography>
                <Typography variant="body2" color="textSecondary">Tarih: {new Date(h.played_at).toLocaleDateString()}</Typography>
                <Typography variant="body1" sx={{mt:1}}>Skor: {h.score}</Typography>
              </CardContent>
              {h.session_id && (
              <CardActions>
                <Button size="small" onClick={()=>navigate(`/history/session/${h.session_id}`)}>Detay</Button>
              </CardActions>) }
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default PlayerHistory; 