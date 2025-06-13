import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  IconButton,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { updateQuestion, getQuiz } from '../../store/slices/quizSlice';

const validationSchema = Yup.object({
  question_text: Yup.string()
    .required('Soru metni gereklidir')
    .min(5, 'Soru en az 5 karakter olmalıdır')
    .max(500, 'Soru en fazla 500 karakter olmalıdır'),
  media_url: Yup.string().url('Geçerli bir URL olmalıdır'),
  time_limit: Yup.number()
    .required('Süre limiti gereklidir')
    .min(5, 'Süre limiti en az 5 saniye olmalıdır')
    .max(300, 'Süre limiti en fazla 300 saniye olmalıdır'),
  points: Yup.number()
    .required('Puan gereklidir')
    .min(1, 'Puan en az 1 olmalıdır')
    .max(100, 'Puan en fazla 100 olmalıdır'),
  options: Yup.array()
    .of(
      Yup.object({
        text: Yup.string()
          .required('Seçenek metni gereklidir')
          .max(200, 'Seçenek metni en fazla 200 karakter olmalıdır'),
      })
    )
    .min(2, 'En az 2 seçenek gereklidir')
    .max(6, 'En fazla 6 seçenek eklenebilir'),
  correct_option_index: Yup.number()
    .required('Doğru seçenek belirtilmelidir')
    .min(0, 'Geçerli bir seçenek seçiniz'),
});

const EditQuestionForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { quizId, questionId } = useParams();
  const { currentQuiz, loading, error } = useSelector((state) => state.quiz);
  const [submitting, setSubmitting] = useState(false);
  // Find the current question from the quiz data
  const currentQuestion = currentQuiz?.questions?.find(q => q.id === parseInt(questionId));

  useEffect(() => {
    if (!currentQuiz || currentQuiz.id !== parseInt(quizId)) {
      dispatch(getQuiz(quizId));
    }
  }, [dispatch, quizId, currentQuiz]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      question_text: currentQuestion?.question_text || '',
      media_url: currentQuestion?.image_url || currentQuestion?.video_url || '',
      time_limit: currentQuestion?.duration_seconds || 30,
      points: currentQuestion?.points || 10,
      options: currentQuestion?.options?.map(opt => ({ text: opt.option_text })) || [
        { text: '' },
        { text: '' },
      ],
      correct_option_index: currentQuestion?.options?.findIndex(opt => opt.is_correct) || 0,
    },
    validationSchema,
    onSubmit: async (values) => {
      setSubmitting(true);
      try {
        await dispatch(
          updateQuestion({
            quizId,
            questionId,
            questionData: {
              question_text: values.question_text,
              media_url: values.media_url,
              time_limit: values.time_limit,
              points: values.points,
              options: values.options.map(opt => opt.text),
              correct_option_index: values.correct_option_index,
            },
          })
        ).unwrap();
        
        navigate(`/quiz/${quizId}`);
      } catch (err) {
        console.error('Soru güncellenirken hata:', err);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const addOption = () => {
    if (formik.values.options.length < 6) {
      formik.setFieldValue('options', [...formik.values.options, { text: '' }]);
    }
  };

  const removeOption = (index) => {
    if (formik.values.options.length > 2) {
      const newOptions = formik.values.options.filter((_, i) => i !== index);
      formik.setFieldValue('options', newOptions);
      
      // Adjust correct option index if necessary
      if (formik.values.correct_option_index === index) {
        formik.setFieldValue('correct_option_index', 0);
      } else if (formik.values.correct_option_index > index) {
        formik.setFieldValue('correct_option_index', formik.values.correct_option_index - 1);
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

  if (!currentQuestion) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">Soru bulunamadı</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/quiz/${quizId}`)}
          sx={{ mt: 2 }}
        >
          Geri Dön
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <IconButton onClick={() => navigate(`/quiz/${quizId}`)} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Soruyu Düzenle
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={formik.handleSubmit}>
          <TextField
            fullWidth
            name="question_text"
            label="Soru Metni *"
            value={formik.values.question_text}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.question_text && Boolean(formik.errors.question_text)}
            helperText={formik.touched.question_text && formik.errors.question_text}
            margin="normal"
            multiline
            rows={3}
          />

          <TextField
            fullWidth
            name="media_url"
            label="Medya URL (İsteğe Bağlı)"
            value={formik.values.media_url}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.media_url && Boolean(formik.errors.media_url)}
            helperText={formik.touched.media_url && formik.errors.media_url}
            margin="normal"
            placeholder="https://example.com/image.jpg"
          />

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="time_limit"
                label="Süre Limiti (saniye) *"
                type="number"
                value={formik.values.time_limit}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.time_limit && Boolean(formik.errors.time_limit)}
                helperText={formik.touched.time_limit && formik.errors.time_limit}
                inputProps={{ min: 5, max: 300 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="points"
                label="Puan *"
                type="number"
                value={formik.values.points}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.points && Boolean(formik.errors.points)}
                helperText={formik.touched.points && formik.errors.points}
                inputProps={{ min: 1, max: 100 }}
              />
            </Grid>
          </Grid>

          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
            Seçenekler
          </Typography>

          {formik.values.options.map((option, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TextField
                fullWidth
                name={`options.${index}.text`}
                label={`Seçenek ${index + 1} *`}
                value={option.text}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.options?.[index]?.text &&
                  Boolean(formik.errors.options?.[index]?.text)
                }
                helperText={
                  formik.touched.options?.[index]?.text &&
                  formik.errors.options?.[index]?.text
                }
                sx={{ mr: 1 }}
              />
              {formik.values.options.length > 2 && (
                <IconButton
                  onClick={() => removeOption(index)}
                  color="error"
                  aria-label="remove option"
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
          ))}

          {formik.values.options.length < 6 && (
            <Button
              startIcon={<AddIcon />}
              onClick={addOption}
              variant="outlined"
              sx={{ mb: 3 }}
            >
              Seçenek Ekle
            </Button>
          )}

          <FormControl fullWidth margin="normal">
            <InputLabel id="correct-option-label">Doğru Seçenek *</InputLabel>
            <Select
              labelId="correct-option-label"
              name="correct_option_index"
              value={formik.values.correct_option_index}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={
                formik.touched.correct_option_index &&
                Boolean(formik.errors.correct_option_index)
              }
              label="Doğru Seçenek *"
            >
              {formik.values.options.map((option, index) => (
                <MenuItem key={index} value={index}>
                  Seçenek {index + 1}: {option.text || '(Boş)'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting}
              sx={{ minWidth: 120 }}
            >
              {submitting ? <CircularProgress size={24} /> : 'Güncelle'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate(`/quiz/${quizId}`)}
              disabled={submitting}
            >
              İptal
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default EditQuestionForm;
