import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  CircularProgress,
  Alert,
} from '@mui/material';
import { fetchSessionState } from '../../store/slices/sessionSlice';
import socketService from '../../services/socket';

const QuizSession = () => {
  const { sessionId } = useParams();
  const dispatch = useDispatch();
  const { currentSession, currentQuestion, timeRemaining, phase, loading, error } = useSelector(
    (state) => state.session
  );
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [answerSubmitted, setAnswerSubmitted] = useState(false);

  useEffect(() => {
    dispatch(fetchSessionState(sessionId));
    socketService.joinSession(sessionId);

    return () => {
      socketService.leaveSession(sessionId);
    };
  }, [dispatch, sessionId]);

  const handleAnswerSubmit = () => {
    if (selectedAnswer) {
      socketService.submitAnswer(sessionId, selectedAnswer);
      setAnswerSubmitted(true);
    }
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
        <Alert severity="info">Waiting for the quiz to start...</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom align="center">
        {currentSession.quiz.title}
      </Typography>

      {phase === 'waiting' && (
        <Box textAlign="center">
          <Typography variant="h6" gutterBottom>
            Waiting for the host to start the quiz...
          </Typography>
        </Box>
      )}

      {phase === 'question' && currentQuestion && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Question {currentQuestion.index + 1}</Typography>
            <Typography variant="h6" color="primary">
              Time: {timeRemaining}s
            </Typography>
          </Box>

          <Typography variant="body1" paragraph>
            {currentQuestion.text}
          </Typography>

          <FormControl component="fieldset" fullWidth>
            <RadioGroup
              value={selectedAnswer}
              onChange={(e) => setSelectedAnswer(e.target.value)}
            >
              {currentQuestion.options.map((option, index) => (
                <FormControlLabel
                  key={index}
                  value={option}
                  control={<Radio />}
                  label={option}
                  disabled={answerSubmitted}
                />
              ))}
            </RadioGroup>
          </FormControl>

          <Box mt={3} display="flex" justifyContent="center">
            <Button
              variant="contained"
              onClick={handleAnswerSubmit}
              disabled={!selectedAnswer || answerSubmitted}
            >
              {answerSubmitted ? 'Answer Submitted' : 'Submit Answer'}
            </Button>
          </Box>
        </Paper>
      )}

      {phase === 'leaderboard' && (
        <Box textAlign="center">
          <Typography variant="h6" gutterBottom>
            Question ended! Waiting for the next question...
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default QuizSession; 