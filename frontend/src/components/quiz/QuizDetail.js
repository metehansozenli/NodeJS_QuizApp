import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { getQuiz, deleteQuestion } from '../../store/slices/quizSlice';

const QuizDetail = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { quizId } = useParams();
  const { currentQuiz: quiz, loading, error } = useSelector((state) => state.quiz);

  useEffect(() => {
    dispatch(getQuiz(quizId));
  }, [dispatch, quizId]);

  const handleDeleteQuestion = async (questionId) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await dispatch(deleteQuestion({ quizId, questionId })).unwrap();
      } catch (err) {
        // Error is handled by the slice
      }
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!quiz) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">Quiz not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {quiz.title}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {quiz.description}
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate(`/quiz/${quizId}/questions/add`)}
          >
            Add Question
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {quiz.questions?.length === 0 ? (
          <Alert severity="info">
            No questions added yet. Click the button above to add your first
            question!
          </Alert>
        ) : (
          <List>
            {quiz.questions?.map((question, index) => (
              <React.Fragment key={question.id}>
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    flexDirection: 'column',
                    alignItems: 'stretch',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6" component="div">
                      Question {index + 1}
                    </Typography>
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        aria-label="edit"
                        onClick={() =>
                          navigate(`/quiz/${quizId}/questions/${question.id}/edit`)
                        }
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleDeleteQuestion(question.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </Box>

                  <ListItemText
                    primary={question.question_text}
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        {question.media_url && (
                          <Typography variant="body2" color="text.secondary">
                            Media: {question.media_url}
                          </Typography>
                        )}
                        <Typography variant="body2" color="text.secondary">
                          Time Limit: {question.time_limit} seconds
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Points: {question.points}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Options:
                        </Typography>
                        <List dense>
                          {question.options?.map((option, optIndex) => (
                            <ListItem key={optIndex}>
                              <ListItemText
                                primary={option.text}
                                secondary={
                                  optIndex === question.correct_option_index
                                    ? 'Correct Answer'
                                    : ''
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    }
                  />
                </ListItem>
                {index < quiz.questions.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/quiz')}
          >
            Back to Quizzes
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate(`/quiz/${quizId}/start`)}
          >
            Start Quiz
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default QuizDetail; 