import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Box, Button, TextField, Typography, Paper, List, ListItem, ListItemText, Alert, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Avatar, Fade } from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const socket = io('http://localhost:5000');

const UserPanel = () => {
  const [sessionId, setSessionId] = useState('');
  const [userId, setUserId] = useState('');
  const [joined, setJoined] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [question, setQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionTotal, setQuestionTotal] = useState(0);
  const [timer, setTimer] = useState(null);
  const [timerActive, setTimerActive] = useState(false);
  const [error, setError] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [answerSent, setAnswerSent] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);

  useEffect(() => {
    let interval;
    if (timerActive && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timer]);

  useEffect(() => {
    socket.on('showQuestion', (data) => {
      setQuestion(data.question);
      setQuestionIndex(data.index);
      setQuestionTotal(data.total);
      setAnswerSent(false);
      setShowCorrect(false);
      setTimer(data.question.duration || 30);
      setTimerActive(true);
    });
    socket.on('showCorrectAnswer', (data) => {
      setShowCorrect(true);
      setTimerActive(false);
    });
    socket.on('showLeaderboard', (data) => {
      setLeaderboard(data);
    });
    socket.on('userJoined', fetchParticipants);
    socket.on('userLeft', fetchParticipants);
    return () => {
      socket.off('showQuestion');
      socket.off('showCorrectAnswer');
      socket.off('showLeaderboard');
      socket.off('userJoined');
      socket.off('userLeft');
    };
    // eslint-disable-next-line
  }, []);

  const joinSession = async (e) => {
    e.preventDefault();
    setError('');
    if (!sessionId || !userId) {
      setError('Session ID ve User ID zorunlu');
      return;
    }
    try {
      const res = await fetch(`/api/session/addParticipant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Katılım başarısız');
      setJoined(true);
      socket.emit('joinSession', { sessionId, username: userId });
      fetchParticipants();
    } catch (err) {
      setError(err.message);
    }
  };

  const leaveSession = async () => {
    if (!sessionId || !userId) return;
    await fetch(`/api/session/${sessionId}/remove-participant/${userId}`, { method: 'PUT' });
    setJoined(false);
    setParticipants([]);
    setQuestion(null);
    setLeaderboard([]);
    socket.emit('leaveSession', { sessionId, username: userId });
  };

  const fetchParticipants = async () => {
    if (!sessionId) return;
    const res = await fetch(`/api/session/${sessionId}/participants`);
    const data = await res.json();
    setParticipants(data);
  };

  const submitAnswer = async (optionId) => {
    if (!question || answerSent) return;
    socket.emit('submitAnswer', { sessionId, userId, answer: optionId });
    setAnswerSent(true);
  };

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', mt: 6, p: 2 }}>
      <Paper elevation={4} sx={{ p: 3, borderRadius: 4 }}>
        <Typography variant="h4" align="center" gutterBottom color="primary">Quiz User Panel</Typography>
        {!joined ? (
          <form onSubmit={joinSession} id="join-form">
            <TextField label="Session ID" value={sessionId} onChange={e => setSessionId(e.target.value)} fullWidth margin="normal" />
            <TextField label="User ID" value={userId} onChange={e => setUserId(e.target.value)} fullWidth margin="normal" />
            <Button type="submit" variant="contained" color="primary" fullWidth size="large" sx={{ mt: 2 }}>Join Session</Button>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </form>
        ) : (
          <Box id="user-info" sx={{ mb: 2 }}>
            <Alert icon={<GroupIcon />} severity="success" sx={{ mb: 2 }}>Katıldınız! User: <b>{userId}</b></Alert>
            <Typography variant="subtitle1">Session ID: <b>{sessionId}</b></Typography>
            <Button onClick={leaveSession} color="secondary" variant="outlined" sx={{ mt: 1, mb: 2 }}>Leave Session</Button>
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}><GroupIcon fontSize="small" /> Participants</Typography>
              <List dense>
                {participants.map(p => (
                  <ListItem key={p.user_id || p.userId}>
                    <Avatar sx={{ mr: 1 }}>{(p.username || p.user_id || '?')[0]}</Avatar>
                    <ListItemText primary={p.username || p.user_id} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Box>
        )}
        {question && (
          <Fade in={!!question}>
            <Box id="questionArea" sx={{ mb: 3 }}>
              <Typography variant="h5" color="secondary" gutterBottom>
                Soru {questionIndex} / {questionTotal}
              </Typography>
              <Typography variant="h6" sx={{ mb: 2 }}>{question.question_text}</Typography>
              {question.multimedia_url && (
                <Box sx={{ mb: 2, textAlign: 'center' }}>
                  <img src={question.multimedia_url} alt="media" style={{ maxWidth: 320, borderRadius: 8 }} />
                </Box>
              )}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                {question.options && question.options.map(opt => (
                  <Button key={opt.id} onClick={() => submitAnswer(opt.id)} disabled={answerSent || showCorrect}
                    variant={showCorrect && opt.id === question.correct_option_id ? 'contained' : 'outlined'}
                    color={showCorrect && opt.id === question.correct_option_id ? 'success' : 'primary'}
                    sx={{ fontWeight: 600, fontSize: 18 }}>
                    {opt.option_text}
                  </Button>
                ))}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress variant="determinate" value={timer ? (timer / (question.duration || 30)) * 100 : 0} size={32} color={timer < 6 ? 'error' : 'primary'} />
                <Typography color={timer < 6 ? 'error' : 'primary'} fontWeight={700}>
                  {timer > 0 ? `Kalan süre: ${timer} sn` : 'Süre doldu'}
                </Typography>
              </Box>
              {answerSent && !showCorrect && <Alert severity="info" sx={{ mt: 2 }}>Cevabınız alındı, diğer katılımcılar bekleniyor...</Alert>}
              {showCorrect && <Alert severity="success" sx={{ mt: 2 }}>Doğru cevap: <b>{question.options.find(o => o.id === question.correct_option_id)?.option_text}</b></Alert>}
            </Box>
          </Fade>
        )}
        {leaderboard.length > 0 && (
          <Paper className="leaderboard" sx={{ mt: 3, p: 2, borderRadius: 3 }}>
            <Typography variant="h6" color="primary" sx={{ mb: 1 }}><EmojiEventsIcon fontSize="small" /> Liderlik Tablosu</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Sıra</TableCell>
                    <TableCell>Kullanıcı</TableCell>
                    <TableCell>Puan</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaderboard.map((u, i) => (
                    <TableRow key={u.user_id || u.userId}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{u.username}</TableCell>
                      <TableCell>{u.score}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Paper>
    </Box>
  );
};

export default UserPanel;
