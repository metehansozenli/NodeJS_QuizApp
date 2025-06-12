import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Grid, Card, CardContent, CardActions, Button, CircularProgress, Alert } from '@mui/material';
import api from '../../services/api';

const HostHistory = () => {
  const { user } = useSelector(state=>state.auth);
  const [sessions,setSessions] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const navigate = useNavigate();

  useEffect(()=>{
    const fetchSessions = async ()=>{
      try{
        const res = await api.get(`/quiz-history/host/${user.id}`);
        setSessions(res.data||[]);
      }catch(err){
        setError('Oturum geçmişi alınamadı');
      }finally{
        setLoading(false);
      }
    };
    if(user?.id) fetchSessions();
  },[user?.id]);

  if(loading) return <Container maxWidth="md" sx={{textAlign:'center',py:4}}><CircularProgress/></Container>;
  if(error) return <Container maxWidth="md" sx={{py:4}}><Alert severity="error">{error}</Alert></Container>;

  return (
    <Container maxWidth="lg" sx={{py:4}}>
      <Typography variant="h4" gutterBottom>📜 Geçmiş Oturumlarım</Typography>
      {sessions.length===0 && <Typography>No sessions yet.</Typography>}
      <Grid container spacing={3}>
        {sessions.map(s=>(
          <Grid item xs={12} md={6} lg={4} key={s.session_id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{s.title}</Typography>
                <Typography variant="body2" color="textSecondary">Tarih: {new Date(s.ended_at || s.started_at).toLocaleDateString()}</Typography>
                <Typography variant="body2">Katılımcı: {s.participant_count}</Typography>
                <Typography variant="body1" sx={{mt:1}}>En Yüksek Skor: {s.top_score}</Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={()=>navigate(`/history/session/${s.session_id}`)}>Detay</Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default HostHistory; 