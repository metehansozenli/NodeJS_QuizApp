import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
} from '@mui/material';
import {
  Timer as TimerIcon,
  EmojiEvents as TrophyIcon,
  Person as PersonIcon,
  CheckCircle as CorrectIcon,
  Cancel as WrongIcon,
  Quiz as QuizIcon,
} from '@mui/icons-material';

const GameScreen = ({ 
  currentQuestion, 
  timeLeft, 
  selectedAnswer, 
  onAnswerSelect, 
  participants,
  gameState,
  results,
  score,
  questionIndex,
  totalQuestions,
  gameInfo,
  joinForm
}) => {
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (selectedAnswer !== null) {
      setAnswerSubmitted(true);
    }
  }, [selectedAnswer]);

  useEffect(() => {
    if (gameState === 'showingAnswer') {
      setShowResults(true);
      setTimeout(() => {
        setShowResults(false);
        setAnswerSubmitted(false);
      }, 3000); // 3 saniye sonra sonuçları gizle
    }
  }, [gameState]);

  const handleAnswerClick = (optionIndex) => {
    if (answerSubmitted || gameState !== 'question') return;
    onAnswerSelect(optionIndex);
  };

  const getOptionColor = (optionIndex) => {
    if (gameState === 'showingAnswer' && results) {
      if (results.correctAnswer === optionIndex) {
        return 'success.main';
      }
      if (selectedAnswer === optionIndex && selectedAnswer !== results.correctAnswer) {
        return 'error.main';
      }
    }
    if (selectedAnswer === optionIndex) {
      return 'primary.main';
    }
    return 'grey.100';
  };

  const getOptionIcon = (optionIndex) => {
    if (gameState === 'showingAnswer' && results) {
      if (results.correctAnswer === optionIndex) {
        return <CorrectIcon color="success" />;
      }
      if (selectedAnswer === optionIndex && selectedAnswer !== results.correctAnswer) {
        return <WrongIcon color="error" />;
      }
    }
    return null;
  };

  if (gameState === 'waiting') {
    return (      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            {gameInfo?.game?.title || 'Quiz Bekleme Odası'}
          </Typography>
          
          <Typography variant="body1" align="center" color="textSecondary" paragraph>
            {gameInfo?.game?.description || 'Oyunun başlamasını bekliyoruz...'}
          </Typography>

          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Chip
              icon={<PersonIcon />}
              label={`Oyuncu: ${joinForm?.username || 'Oyuncu'}`}
              color="primary"
              sx={{ mr: 1 }}
            />
            <Chip
              icon={<QuizIcon />}
              label={`Kod: ${joinForm?.gameCode || 'N/A'}`}
              variant="outlined"
            />
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            Oyunun başlamasını bekliyorsunuz. Host oyunu başlattığında sorular gelmeye başlayacak.
          </Alert>
          
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Katılımcılar ({participants.length})
            </Typography>
            <Grid container spacing={2}>
              {participants.map((participant, index) => (
                <Grid item xs={6} sm={4} md={3} key={index}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Avatar sx={{ mx: 'auto', mb: 1, bgcolor: 'primary.main' }}>
                        {participant.username?.charAt(0)?.toUpperCase()}
                      </Avatar>
                      <Typography variant="body2">
                        {participant.username}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Paper>
      </Container>
    );
  }

  if (gameState === 'finished') {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <TrophyIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Oyun Tamamlandı!
          </Typography>
          <Typography variant="h6" color="primary.main" gutterBottom>
            Skorunuz: {score} puan
          </Typography>
          
          {results?.leaderboard && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Sıralama
              </Typography>
              <List>
                {results.leaderboard.slice(0, 10).map((player, index) => (
                  <ListItem key={index}>
                    <ListItemAvatar>
                      <Avatar sx={{ 
                        bgcolor: index < 3 ? 'primary.main' : 'grey.500' 
                      }}>
                        {index + 1}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={player.username}
                      secondary={`${player.score} puan`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* Question Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            Soru {questionIndex}/{totalQuestions}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimerIcon color={timeLeft <= 5 ? 'error' : 'primary'} />
            <Typography 
              variant="h6" 
              color={timeLeft <= 5 ? 'error.main' : 'primary.main'}
            >
              {timeLeft}s
            </Typography>
          </Box>
        </Box>

        {/* Progress Bar */}
        <LinearProgress 
          variant="determinate" 
          value={(timeLeft / (currentQuestion?.duration_seconds || 30)) * 100}
          sx={{ mb: 3, height: 8, borderRadius: 4 }}
          color={timeLeft <= 5 ? 'error' : 'primary'}
        />

        {/* Question Text */}
        <Typography variant="h5" gutterBottom sx={{ mb: 4 }}>
          {currentQuestion?.question_text}
        </Typography>        {/* Answer Options */}
        <Grid container spacing={2}>
          {currentQuestion?.options?.map((option, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <Button
                fullWidth
                variant={selectedAnswer === index ? 'contained' : 'outlined'}
                onClick={() => handleAnswerClick(index)}
                disabled={answerSubmitted}
                sx={{
                  p: 2,
                  height: 'auto',
                  minHeight: 60,
                  backgroundColor: getOptionColor(index),
                  border: '2px solid',
                  borderColor: getOptionColor(index),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  '&:hover': {
                    backgroundColor: selectedAnswer === index ? getOptionColor(index) : 'action.hover',
                  }
                }}
              >
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {String.fromCharCode(65 + index)}) {option.option_text || option.text}
                </Typography>
                {getOptionIcon(index)}
              </Button>
            </Grid>
          ))}
        </Grid>

        {/* Status Messages */}
        {answerSubmitted && gameState === 'question' && (
          <Alert severity="success" sx={{ mt: 3 }}>
            Cevabınız gönderildi! Diğer oyuncuları bekliyoruz...
          </Alert>
        )}

        {gameState === 'showingAnswer' && results && (
          <Alert 
            severity={selectedAnswer === results.correctAnswer ? 'success' : 'error'} 
            sx={{ mt: 3 }}
          >
            {selectedAnswer === results.correctAnswer 
              ? 'Doğru cevap! Tebrikler!' 
              : `Yanlış cevap. Doğru cevap: ${currentQuestion?.options[results.correctAnswer]?.option_text}`
            }
          </Alert>
        )}

        {/* Score Display */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Chip
            icon={<TrophyIcon />}
            label={`Skor: ${score} puan`}
            color="primary"
            variant="outlined"
          />
        </Box>
      </Paper>

      {/* Results Dialog */}
      <Dialog open={showResults && gameState === 'showingAnswer'}>
        <DialogTitle>Soru Sonucu</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            {selectedAnswer === results?.correctAnswer 
              ? 'Tebrikler! Doğru cevap verdiniz.' 
              : 'Maalesef yanlış cevap verdiniz.'
            }
          </Typography>
          {results?.correctAnswer !== undefined && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Doğru cevap: {currentQuestion?.options[results.correctAnswer]?.option_text}
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default GameScreen;
