import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
} from '@mui/material';
import { fetchSessionState } from '../../store/slices/sessionSlice';
import socketService from '../../services/socket';

const QuizControl = () => {
  const { sessionId } = useParams();
  const dispatch = useDispatch();
  const { currentSession, currentQuestion, participants, phase, loading, error } = useSelector(
    (state) => state.session
  );

  useEffect(() => {
    dispatch(fetchSessionState(sessionId));
    socketService.joinSession(sessionId);

    return () => {
      socketService.leaveSession(sessionId);
    };
  }, [dispatch, sessionId]);

  const handleStartQuestion = () => {
    socketService.startQuestion(sessionId);
  };

  const handleEndQuestion = () => {
    socketService.endQuestion(sessionId);
  };

  const handleShowLeaderboard = () => {
    socketService.showLeaderboard(sessionId);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!currentSession) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info">Loading session...</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom align="center">
        Quiz Control Panel
      </Typography>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h6">{currentSession.quiz.title}</Typography>
        <Typography variant="subtitle1">
          Participants: {participants.length}
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Current Phase: {phase}
        </Typography>

        <Box display="flex" gap={2} mt={2}>
          {phase === 'waiting' && (
            <Button variant="contained" onClick={handleStartQuestion}>
              Start First Question
            </Button>
          )}

          {phase === 'question' && (
            <Button variant="contained" color="secondary" onClick={handleEndQuestion}>
              End Question
            </Button>
          )}

          {phase === 'leaderboard' && (
            <>
              <Button variant="contained" onClick={handleStartQuestion}>
                Next Question
              </Button>
              <Button variant="outlined" onClick={handleShowLeaderboard}>
                Show Leaderboard
              </Button>
            </>
          )}
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Participants
        </Typography>
        <List>
          {participants.map((participant) => (
            <ListItem key={participant.id}>
              <ListItemText
                primary={participant.username}
                secondary={`Score: ${participant.score}`}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Container>
  );
};

export default QuizControl; 