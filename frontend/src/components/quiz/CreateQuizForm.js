import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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
  FormControlLabel,
  Switch,
} from '@mui/material';
import { createQuiz } from '../../store/slices/quizSlice';

const validationSchema = Yup.object({
  title: Yup.string()
    .required('Title is required')
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must not exceed 100 characters'),
  description: Yup.string()
    .required('Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must not exceed 500 characters'),
  background_music_url: Yup.string().url('Must be a valid URL'),
});

const CreateQuizForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.quiz);
  const [isPublic, setIsPublic] = useState(false);

  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      background_music_url: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        const result = await dispatch(
          createQuiz({ ...values, is_public: isPublic })
        ).unwrap();
        navigate(`/quiz/${result.id}/questions`);
      } catch (err) {
        // Error is handled by the slice
      }
    },
  });

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center"          >
            Yeni Quiz Oluştur
          </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={formik.handleSubmit}>
          <TextField
            fullWidth            id="title"
            name="title"
            label="Quiz Başlığı"
            value={formik.values.title}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.title && Boolean(formik.errors.title)}
            helperText={formik.touched.title && formik.errors.title}
            margin="normal"
          />

          <TextField
            fullWidth            id="description"
            name="description"
            label="Açıklama"
            multiline
            rows={4}
            value={formik.values.description}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.description && Boolean(formik.errors.description)}
            helperText={formik.touched.description && formik.errors.description}
            margin="normal"
          />

          <TextField
            fullWidth            id="background_music_url"
            name="background_music_url"
            label="Arka Plan Müziği URL (isteğe bağlı)"
            value={formik.values.background_music_url}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={
              formik.touched.background_music_url &&
              Boolean(formik.errors.background_music_url)
            }
            helperText={
              formik.touched.background_music_url &&
              formik.errors.background_music_url
            }
            margin="normal"
          />

          <FormControlLabel
            control={
              <Switch
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                color="primary"
              />            }
            label="Bu quiz'i herkese açık yap"
            sx={{ mt: 3, mb: 2 }}
          />

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
              sx={{ minWidth: 200 }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />              ) : (
                'Quiz Oluştur'
              )}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default CreateQuizForm; 