import React,{useEffect,useState} from 'react';
import { useParams } from 'react-router-dom';
import { Container, Typography, CircularProgress, Alert, Table, TableHead, TableRow, TableCell, TableBody, Paper } from '@mui/material';
import api from '../../services/api';

const SessionHistoryDetail = ()=>{
  const { sessionId } = useParams();
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [data,setData]=useState(null);

  useEffect(()=>{
    const fetchDetail=async()=>{
      try{
        const res=await api.get(`/quiz-history/session/${sessionId}/detail`);
        setData(res.data);
      }catch(err){
        setError('Detay getirilemedi');
      }finally{
        setLoading(false);
      }
    };
    if(sessionId) fetchDetail();
  },[sessionId]);

  if(loading) return <Container sx={{py:4,textAlign:'center'}}><CircularProgress/></Container>;
  if(error) return <Container sx={{py:4}}><Alert severity="error">{error}</Alert></Container>;
  if(!data) return null;

  const { leaderboard=[], answers=[] } = data;

  return (
    <Container maxWidth="lg" sx={{py:4}}>
      <Typography variant="h4" gutterBottom>🏆 Liderlik Tablosu</Typography>
      <Paper sx={{mb:4}}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Kullanıcı</TableCell>
              <TableCell>Skor</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leaderboard.map((l,i)=>(
              <TableRow key={l.user_id}>
                <TableCell>{i+1}</TableCell>
                <TableCell>{l.username}</TableCell>
                <TableCell>{l.score}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Typography variant="h4" gutterBottom>Soru Bazlı Sonuçlar</Typography>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Soru</TableCell>
              <TableCell>Kullanıcı</TableCell>
              <TableCell>Doğru?</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {answers.map((a,idx)=>(
              <TableRow key={idx}>
                <TableCell>{a.question_text}</TableCell>
                <TableCell>{a.username}</TableCell>
                <TableCell>{a.is_correct ? '✅' : '❌'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
};

export default SessionHistoryDetail; 