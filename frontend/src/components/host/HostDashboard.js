import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  MoreVert as MoreIcon,
  Quiz as QuizIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { getHostQuizzes, deleteQuiz } from '../../store/slices/quizSlice';
import { startSession } from '../../store/slices/sessionSlice';
import AddBankQuestionDialog from './AddBankQuestionDialog';

const HostDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { quizzes, loading, error } = useSelector((state) => state.quiz);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuQuizId, setMenuQuizId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      navigate('/login');
      return;
    }
    
    // Clear any old session data
    localStorage.removeItem('sessionId');
    localStorage.removeItem('quizId');
    localStorage.removeItem('hostId');
    
    dispatch(getHostQuizzes());
  }, [dispatch, navigate]);

  const handleDeleteQuiz = async () => {
    if (selectedQuiz) {
      try {
        await dispatch(deleteQuiz(selectedQuiz.id)).unwrap();
        setDeleteDialogOpen(false);
        setSelectedQuiz(null);
        dispatch(getHostQuizzes()); // Refresh list
      } catch (error) {
        console.error('Quiz silme hatası:', error);
      }
    }
  };
  const handleStartSession = async (quizId) => {
    try {
      console.log('Starting session for quiz:', quizId);
      const result = await dispatch(startSession(quizId)).unwrap();
      console.log('Start session result:', result);
      
      if (result && (result.sessionId || result.id)) {
        const sessionId = result.sessionId || result.id;
        console.log('Navigating to session:', sessionId);
        navigate(`/host/session/${sessionId}`);
      } else {
        console.error('No session ID in result:', result);
        alert('Session başlatılamadı - Session ID bulunamadı');
      }
    } catch (error) {
      console.error('Session başlatma hatası:', error);
      alert('Session başlatılırken hata oluştu: ' + (error.message || error));
    }
  };

  const handleMenuOpen = (event, quizId) => {
    setAnchorEl(event.currentTarget);
    setMenuQuizId(quizId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuQuizId(null);
  };

  const openDeleteDialog = (quiz) => {
    setSelectedQuiz(quiz);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDialogClose = () => setDialogOpen(false);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }
  return (
    <div className="kahoot-container">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 4,
          background: 'rgba(255,255,255,0.9)',
          borderRadius: '20px',
          p: 3,
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
        }}>
          <div>
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                mb: 1
              }}
            >
              Quiz Menüsü
            </Typography>
            <Typography variant="h6" sx={{ color: '#666', fontWeight: 500 }}>
              Muhteşem quizler yaratın ve kullanıcıların ilgisini çekin!
            </Typography>
          </div>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/quiz/create')}
            size="large"
            sx={{
              borderRadius: '25px',
              px: 4,
              py: 2,
              fontSize: '16px',
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #e91e63 30%, #9c27b0 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #d81b60 30%, #8e24aa 90%)',
                transform: 'translateY(-3px)',
              },
              boxShadow: '0 8px 25px rgba(233, 30, 99, 0.4)',
            }}
          >
            ✨ Yeni Quiz Oluştur
          </Button>
          <Button
            variant="outlined"
            onClick={() => setDialogOpen(true)}
            size="large"
            sx={{
              ml:2,
              borderRadius:'25px',
              px:4,
              py:2,
              fontSize:'16px',
              fontWeight:'bold'
            }}
          >➕ Soru Havuzuna Ekle</Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/history/host')}
            size="large"
            sx={{
              ml:2,
              borderRadius:'25px',
              px:4,
              py:2,
              fontSize:'16px',
              fontWeight:'bold'
            }}
          >📜 Geçmiş Oturumlarım</Button>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              borderRadius: '15px',
              background: 'linear-gradient(45deg, #ffebee, #ffcdd2)',
              border: '2px solid #f44336'
            }}
          >
            {error}
          </Alert>
        )}

        {quizzes.length === 0 ? (
          <div className="kahoot-card kahoot-card-large" style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ fontSize: '80px', marginBottom: '20px' }}>🎮</div>            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#333', mb: 2 }}>
              İlk Quiz'inizi Oluşturmaya Hazır mısınız?
            </Typography>
            <Typography variant="h6" sx={{ color: '#666', mb: 4 }}>
              Etkileşimli quizlerle izleyicilerinizin ilgisini çekin!
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/quiz/create')}
              size="large"
              sx={{
                borderRadius: '25px',
                px: 4,
                py: 2,
                fontSize: '18px',
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)',
                  transform: 'translateY(-3px)',
                },
                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
              }}
            >
              🚀 İlk Quiz'inizi Oluşturun
            </Button>
          </div>
        ) : (
          <Grid container spacing={3}>
            {quizzes.map((quiz) => (
              <Grid item xs={12} sm={6} md={4} key={quiz.id}>                <Card className="quiz-card" sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
                  }
                }}>
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333' }}>
                        {quiz.title}
                      </Typography>
                      <IconButton 
                        size="small"
                        onClick={(e) => handleMenuOpen(e, quiz.id)}
                        sx={{
                          background: 'rgba(102, 126, 234, 0.1)',
                          '&:hover': {
                            background: 'rgba(102, 126, 234, 0.2)',
                          }
                        }}
                      >
                        <MoreIcon />
                      </IconButton>
                    </Box>
                    
                    <Typography color="textSecondary" gutterBottom sx={{ mb: 3, fontSize: '16px' }}>
                      {quiz.description}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                      <Chip
                        icon={<QuizIcon />}
                        label={`${quiz.questions_count || 0} soru`}
                        size="medium"
                        sx={{
                          background: 'linear-gradient(45deg, #667eea, #764ba2)',
                          color: 'white',
                          fontWeight: 'bold',
                          '& .MuiChip-icon': {
                            color: 'white'
                          }
                        }}
                      />
                      {quiz.is_public && (
                        <Chip
                          label="🌍 Herkese Açık"
                          size="medium"
                          sx={{
                            background: 'linear-gradient(45deg, #4caf50, #8bc34a)',
                            color: 'white',
                            fontWeight: 'bold',
                          }}
                        />
                      )}
                    </Box>
                      <Typography variant="body2" sx={{ color: '#999', fontWeight: 500 }}>
                      📅 Oluşturulma: {new Date(quiz.created_at).toLocaleDateString('tr-TR')}
                    </Typography>
                  </CardContent>
                  
                  <CardActions sx={{ justifyContent: 'space-between', px: 3, pb: 3 }}>
                    <Button
                      size="medium"
                      startIcon={<ViewIcon />}
                      onClick={() => navigate(`/quiz/${quiz.id}/detail`)}
                      sx={{
                        borderRadius: '20px',
                        px: 3,
                        fontWeight: 'bold',
                        background: 'linear-gradient(45deg, #ff9800, #ffc107)',
                        color: 'white',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #f57c00, #ff8f00)',
                          transform: 'translateY(-2px)',
                        },
                        boxShadow: '0 4px 15px rgba(255, 152, 0, 0.3)',
                      }}
                    >
                      View
                    </Button>
                    <Button
                      variant="contained"
                      size="medium"
                      startIcon={<StartIcon />}
                      onClick={() => handleStartSession(quiz.id)}
                      disabled={!quiz.questions_count || quiz.questions_count === 0}
                      sx={{
                        borderRadius: '20px',
                        px: 3,
                        fontWeight: 'bold',
                        background: quiz.questions_count > 0 
                          ? 'linear-gradient(45deg, #4caf50, #8bc34a)'
                          : '#cccccc',
                        '&:hover': {
                          background: quiz.questions_count > 0 
                            ? 'linear-gradient(45deg, #388e3c, #689f38)'
                            : '#cccccc',
                          transform: quiz.questions_count > 0 ? 'translateY(-2px)' : 'none',
                        },
                        boxShadow: quiz.questions_count > 0 
                          ? '0 4px 15px rgba(76, 175, 80, 0.3)'
                          : 'none',
                      }}
                    >
                      Başlat
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Context Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          sx={{
            '& .MuiPaper-root': {
              borderRadius: '15px',
              boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
            },
          }}
        >
          <MenuItem 
            onClick={() => {
              navigate(`/quiz/${menuQuizId}/edit`);
              handleMenuClose();
            }}
            sx={{
              fontWeight: 'bold',
              '&:hover': { background: 'rgba(102, 126, 234, 0.1)' }
            }}
          >
            <EditIcon sx={{ mr: 2, color: '#667eea' }} />
            Quiz'i Düzenle
          </MenuItem>
          <MenuItem 
            onClick={() => {
              navigate(`/quiz/${menuQuizId}/detail`);
              handleMenuClose();
            }}
            sx={{
              fontWeight: 'bold',
              '&:hover': { background: 'rgba(255, 152, 0, 0.1)' }
            }}          >
            <ViewIcon sx={{ mr: 2, color: '#ff9800' }} />
            Detayları Görüntüle
          </MenuItem><MenuItem 
            onClick={() => {
              const quiz = quizzes.find(q => q.id === menuQuizId);
              openDeleteDialog(quiz);
            }}
            sx={{
              fontWeight: 'bold',
              '&:hover': { background: 'rgba(244, 67, 54, 0.1)' }
            }}
          >
            <DeleteIcon sx={{ mr: 2, color: '#f44336' }} />
            Quiz'i Sil
          </MenuItem>
        </Menu>

        {/* Delete Confirmation Dialog */}
        <Dialog 
          open={deleteDialogOpen} 
          onClose={() => setDeleteDialogOpen(false)}
          sx={{
            '& .MuiDialog-paper': {
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #fff 0%, #f8f9fa 100%)',
            }
          }}
        >          <DialogTitle sx={{ fontWeight: 'bold', fontSize: '24px', color: '#333' }}>
            Quiz'i Sil
          </DialogTitle>
          <DialogContent sx={{ pb: 2 }}>
            <Typography sx={{ fontSize: '16px', color: '#666' }}>
              "{selectedQuiz?.title}" quiz'ini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 2 }}>
            <Button 
              onClick={() => setDeleteDialogOpen(false)}
              sx={{
                borderRadius: '25px',
                px: 3,
                py: 1,
                fontWeight: 'bold',
                background: '#e0e0e0',
                color: '#333',
                '&:hover': {
                  background: '#d0d0d0',
                }
              }}
            >
              İptal
            </Button>
            <Button 
              onClick={handleDeleteQuiz} 
              sx={{
                borderRadius: '25px',
                px: 3,
                py: 1,
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #f44336, #e91e63)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(45deg, #d32f2f, #c2185b)',
                  transform: 'translateY(-2px)',
                },
                boxShadow: '0 4px 15px rgba(244, 67, 54, 0.4)',
              }}
            >
              🗑️ Sil
            </Button>
          </DialogActions>
        </Dialog>

        <AddBankQuestionDialog open={dialogOpen} onClose={handleDialogClose} />
      </Container>
    </div>
  );
};

export default HostDashboard;