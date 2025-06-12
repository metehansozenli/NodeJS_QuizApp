import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  CardActions,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  QuestionAnswer as QuestionIcon,
} from '@mui/icons-material';
import { createQuiz } from '../../store/slices/quizSlice';
import api from '../../services/api';

const steps = ['Quiz Detayları', 'Sorular', 'Önizleme'];

const EnhancedCreateQuizForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.quiz);
  
  const [activeStep, setActiveStep] = useState(0);
  const [quizData, setQuizData] = useState({
    title: '',
    description: '',
    background_music_url: '',
    is_public: false,
    questions: []
  });
  
  const [questionFormOpen, setQuestionFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState({
    question_text: '',
    media_url: '',
    time_limit: 30,
    points: 10,
    options: [
      { text: '', is_correct: false },
      { text: '', is_correct: false }
    ]
  });
  
  const [questionPool, setQuestionPool] = useState([]);
  const [selectedPoolQuestions, setSelectedPoolQuestions] = useState([]);
  const [questionSource, setQuestionSource] = useState('manual');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    if (questionSource === 'pool') {
      fetchCategories();
    }
  }, [questionSource]);

  useEffect(() => {
    if (questionSource === 'pool' && selectedCategory) {
      fetchQuestionPool(selectedCategory);
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/question-bank/categories');
      setCategories(response.data || []);
    } catch (err) {
      console.error('Kategori listesi alınamadı:', err);
    }
  };

  const fetchQuestionPool = async (category = '') => {
    try {
      const response = await api.get('/question-bank', {
        params: category ? { category } : {}
      });
      setQuestionPool(response.data || []);
    } catch (error) {
      console.error('Soru havuzu yüklenemedi:', error);
    }
  };

  const handleAddRandomQuestionFromPool = async () => {
    if (!selectedCategory) {
      alert('Lütfen önce kategori seçin');
      return;
    }
    try {
      const response = await api.get('/question-bank/random', {
        params: { category: selectedCategory }
      });
      if (response.data && response.data.length > 0) {
        const bankQ = response.data[0];
        const newQuestion = {
          id: Date.now(),
          question_text: bankQ.soru || bankQ.question_text,
          media_url: '',
          time_limit: 30,
          points: 10,
          options: [
            { text: bankQ.secenek_a, is_correct: bankQ.dogru_sik === 'A' },
            { text: bankQ.secenek_b, is_correct: bankQ.dogru_sik === 'B' },
            { text: bankQ.secenek_c, is_correct: bankQ.dogru_sik === 'C' },
            { text: bankQ.secenek_d, is_correct: bankQ.dogru_sik === 'D' }
          ]
        };
        setQuizData(prev => ({ ...prev, questions: [...prev.questions, newQuestion] }));
        alert('Rastgele soru eklendi');
      }
    } catch (err) {
      console.error('Rastgele soru alınamadı', err);
    }
  };

  const handleNext = () => {
    if (activeStep === 0 && (!quizData.title || !quizData.description)) {
      alert('Lütfen quiz başlığı ve açıklaması girin');
      return;
    }
    if (activeStep === 1 && quizData.questions.length === 0) {
      alert('En az bir soru ekleyin');
      return;
    }
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleQuizDataChange = (field, value) => {
    setQuizData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddOption = () => {
    setCurrentQuestion(prev => ({
      ...prev,
      options: [...prev.options, { text: '', is_correct: false }]
    }));
  };

  const handleRemoveOption = (index) => {
    if (currentQuestion.options.length > 2) {
      setCurrentQuestion(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  const handleOptionChange = (index, field, value) => {
    setCurrentQuestion(prev => ({
      ...prev,
      options: prev.options.map((option, i) => 
        i === index ? { ...option, [field]: value } : option
      )
    }));
  };

  const handleCorrectAnswerChange = (index) => {
    setCurrentQuestion(prev => ({
      ...prev,
      options: prev.options.map((option, i) => ({
        ...option,
        is_correct: i === index
      }))
    }));
  };

  const handleSaveQuestion = () => {
    if (!currentQuestion.question_text.trim()) {
      alert('Soru metni gerekli');
      return;
    }

    if (currentQuestion.options.some(opt => !opt.text.trim())) {
      alert('Tüm seçeneklerin metni doldurulmalı');
      return;
    }

    if (!currentQuestion.options.some(opt => opt.is_correct)) {
      alert('En az bir doğru cevap seçin');
      return;
    }

    const newQuestion = {
      ...currentQuestion,
      id: editingQuestion?.id || Date.now()
    };

    if (editingQuestion) {
      setQuizData(prev => ({
        ...prev,
        questions: prev.questions.map(q => 
          q.id === editingQuestion.id ? newQuestion : q
        )
      }));
    } else {
      setQuizData(prev => ({
        ...prev,
        questions: [...prev.questions, newQuestion]
      }));
    }

    resetQuestionForm();
  };

  const resetQuestionForm = () => {
    setCurrentQuestion({
      question_text: '',
      media_url: '',
      time_limit: 30,
      points: 10,
      options: [
        { text: '', is_correct: false },
        { text: '', is_correct: false }
      ]
    });
    setEditingQuestion(null);
    setQuestionFormOpen(false);
  };

  const handleEditQuestion = (question) => {
    setCurrentQuestion(question);
    setEditingQuestion(question);
    setQuestionFormOpen(true);
  };

  const handleDeleteQuestion = (questionId) => {
    setQuizData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
  };

  const convertBankQuestion = (q) => {
    if (q.options) {
      return {
        ...q,
        id: Date.now() + Math.random()
      };
    }

    const correct = (q.dogru_sik || q.correct_option || '').toUpperCase();
    return {
      id: Date.now() + Math.random(),
      question_text: q.soru || q.question_text,
      media_url: '',
      time_limit: 30,
      points: 10,
      options: [
        { text: q.secenek_a || q.option_a, is_correct: correct === 'A' },
        { text: q.secenek_b || q.option_b, is_correct: correct === 'B' },
        { text: q.secenek_c || q.option_c, is_correct: correct === 'C' },
        { text: q.secenek_d || q.option_d, is_correct: correct === 'D' }
      ]
    };
  };

  const handleAddPoolQuestions = () => {
    if (selectedPoolQuestions.length === 0) return;

    const poolQuestions = selectedPoolQuestions.map(convertBankQuestion);

    setQuizData(prev => ({
      ...prev,
      questions: [...prev.questions, ...poolQuestions]
    }));

    setSelectedPoolQuestions([]);
  };

  const handleSubmit = async () => {
    try {
      const result = await dispatch(createQuiz(quizData)).unwrap();
      navigate(`/quiz/${result.id}/manage`);
    } catch (err) {
      console.error('Quiz oluşturma hatası:', err);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <TextField
              fullWidth
              label="Quiz Başlığı"
              value={quizData.title}
              onChange={(e) => handleQuizDataChange('title', e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Açıklama"
              value={quizData.description}
              onChange={(e) => handleQuizDataChange('description', e.target.value)}
              margin="normal"
              multiline
              rows={4}
              required
            />
            <TextField
              fullWidth
              label="Arka Plan Müzik URL (İsteğe Bağlı)"
              value={quizData.background_music_url}
              onChange={(e) => handleQuizDataChange('background_music_url', e.target.value)}
              margin="normal"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={quizData.is_public}
                  onChange={(e) => handleQuizDataChange('is_public', e.target.checked)}
                />
              }
              label="Herkese Açık Quiz"
              sx={{ mt: 2 }}
            />
          </Box>
        );

      case 1:
        return (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">Sorular ({quizData.questions.length})</Typography>
              <Box>
                <FormControl sx={{ minWidth: 200, mr: 2 }}>
                  <InputLabel>Soru Kaynağı</InputLabel>
                  <Select
                    value={questionSource}
                    onChange={(e) => setQuestionSource(e.target.value)}
                  >
                    <MenuItem value="manual">Manuel Soru Girişi</MenuItem>
                    <MenuItem value="pool">Soru Havuzundan Seç</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setQuestionFormOpen(true)}
                >
                  Yeni Soru
                </Button>
              </Box>
            </Box>

            {questionSource === 'pool' && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Soru Havuzundan Seç
                  </Typography>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Kategori</InputLabel>
                    <Select
                      value={selectedCategory}
                      label="Kategori"
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      {categories.map(cat => (
                        <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Autocomplete
                    multiple
                    options={questionPool}
                    value={selectedPoolQuestions}
                    onChange={(event, newValue) => setSelectedPoolQuestions(newValue)}
                    getOptionLabel={(option) => option.question_text || option.soru}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Sorular"
                        placeholder="Sorular seçin..."
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          variant="outlined"
                          label={(option.question_text || option.soru).substring(0, 30) + '...'}
                          {...getTagProps({ index })}
                        />
                      ))
                    }
                  />
                  <Box sx={{ display:'flex', gap:2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleAddPoolQuestions}
                    disabled={selectedPoolQuestions.length === 0}
                    sx={{ mt: 2 }}
                  >
                    Seçili Soruları Ekle ({selectedPoolQuestions.length})
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleAddRandomQuestionFromPool}
                    disabled={!selectedCategory}
                    sx={{ mt:2 }}
                  >
                    Rastgele Soru Ekle
                  </Button>
                  </Box>
                </CardContent>
              </Card>
            )}

            <Grid container spacing={2}>
              {quizData.questions.map((question, index) => (
                <Grid item xs={12} key={question.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {index + 1}. {question.question_text}
                      </Typography>
                      <Typography color="textSecondary" gutterBottom>
                        {question.points} puan • {question.time_limit} saniye
                      </Typography>
                      <Box>
                        {question.options.map((option, optIndex) => (
                          <Typography
                            key={optIndex}
                            sx={{
                              color: option.is_correct ? 'success.main' : 'text.secondary',
                              fontWeight: option.is_correct ? 'bold' : 'normal'
                            }}
                          >
                            {String.fromCharCode(65 + optIndex)}) {option.text}
                            {option.is_correct && ' ✓'}
                          </Typography>
                        ))}
                      </Box>
                    </CardContent>
                    <CardActions>
                      <IconButton onClick={() => handleEditQuestion(question)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteQuestion(question.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Quiz Önizlemesi
            </Typography>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5">{quizData.title}</Typography>
                <Typography color="textSecondary" paragraph>
                  {quizData.description}
                </Typography>
                <Typography variant="body2">
                  • {quizData.questions.length} soru
                </Typography>
                <Typography variant="body2">
                  • Toplam puan: {quizData.questions.reduce((sum, q) => sum + q.points, 0)}
                </Typography>
                <Typography variant="body2">
                  • {quizData.is_public ? 'Herkese açık' : 'Özel'} quiz
                </Typography>
              </CardContent>
            </Card>
          </Box>
        );

      default:
        return 'Bilinmeyen adım';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Yeni Quiz Oluştur
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {renderStepContent(activeStep)}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
          >
            Geri
          </Button>
          <Box>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Quiz Oluştur'}
              </Button>
            ) : (
              <Button variant="contained" onClick={handleNext}>
                İleri
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Soru Ekleme/Düzenleme Dialog */}
      <Dialog
        open={questionFormOpen}
        onClose={resetQuestionForm}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingQuestion ? 'Soruyu Düzenle' : 'Yeni Soru Ekle'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Soru Metni"
            value={currentQuestion.question_text}
            onChange={(e) => setCurrentQuestion(prev => ({
              ...prev,
              question_text: e.target.value
            }))}
            margin="normal"
            multiline
            rows={3}
          />
          
          <TextField
            fullWidth
            label="Medya URL (İsteğe Bağlı)"
            value={currentQuestion.media_url}
            onChange={(e) => setCurrentQuestion(prev => ({
              ...prev,
              media_url: e.target.value
            }))}
            margin="normal"
          />

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Süre Limiti (saniye)"
                type="number"
                value={currentQuestion.time_limit}
                onChange={(e) => setCurrentQuestion(prev => ({
                  ...prev,
                  time_limit: parseInt(e.target.value)
                }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Puan"
                type="number"
                value={currentQuestion.points}
                onChange={(e) => setCurrentQuestion(prev => ({
                  ...prev,
                  points: parseInt(e.target.value)
                }))}
              />
            </Grid>
          </Grid>

          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
            Seçenekler
          </Typography>

          {currentQuestion.options.map((option, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                label={`Seçenek ${String.fromCharCode(65 + index)}`}
                value={option.text}
                onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={option.is_correct}
                    onChange={() => handleCorrectAnswerChange(index)}
                  />
                }
                label="Doğru"
              />
              {currentQuestion.options.length > 2 && (
                <IconButton onClick={() => handleRemoveOption(index)}>
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
          ))}

          <Button
            startIcon={<AddIcon />}
            onClick={handleAddOption}
            disabled={currentQuestion.options.length >= 6}
          >
            Seçenek Ekle
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetQuestionForm}>İptal</Button>
          <Button onClick={handleSaveQuestion} variant="contained">
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EnhancedCreateQuizForm;
