import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
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
import { addQuestion } from '../../store/slices/quizSlice';

const validationSchema = Yup.object({
  question_text: Yup.string()
    .required('Soru metni gereklidir')
    .min(5, 'Soru en az 5 karakter olmalıdır')
    .max(500, 'Soru en fazla 500 karakter olmalıdır'),
  media_url: Yup.string().url('Geçerli bir URL olmalıdır'),
  time_limit: Yup.number()
    .required('Süre sınırı gereklidir')
    .min(5, 'Süre sınırı en az 5 saniye olmalıdır')
    .max(300, 'Süre sınırı en fazla 300 saniye olmalıdır'),
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
    .max(6, 'En fazla 6 seçenek olabilir'),
  correct_option_index: Yup.number()
    .required('Doğru seçenek belirtilmelidir')
    .min(0, 'Geçersiz seçenek')
    .max(5, 'Geçersiz seçenek'),
});

const AddQuestionForm = () => {
  const dispatch = useDispatch();
  const { quizId } = useParams();
  const { loading, error } = useSelector((state) => state.quiz);
  const [options, setOptions] = useState([
    { text: '' },
    { text: '' },
    { text: '' },
    { text: '' },
  ]);

  const formik = useFormik({
    initialValues: {
      question_text: '',
      media_url: '',
      time_limit: 30,
      points: 10,
      correct_option_index: 0,
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        const questionData = {
          ...values,
          options: options.map((opt) => opt.text),
        };
        await dispatch(addQuestion({ quizId, questionData })).unwrap();
        formik.resetForm();
        setOptions([
          { text: '' },
          { text: '' },
          { text: '' },
          { text: '' },
        ]);
      } catch (err) {
        // Error is handled by the slice
      }
    },
  });

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index].text = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, { text: '' }]);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
      if (formik.values.correct_option_index >= newOptions.length) {
        formik.setFieldValue('correct_option_index', newOptions.length - 1);
      }
    }
  };

  return (
    <Container maxWidth="md">      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Yeni Soru Ekle
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={formik.handleSubmit}>
          <TextField
            fullWidth            id="question_text"
            name="question_text"
            label="Soru Metni"
            multiline
            rows={3}
            value={formik.values.question_text}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.question_text && Boolean(formik.errors.question_text)}
            helperText={formik.touched.question_text && formik.errors.question_text}
            margin="normal"
          />

          <TextField
            fullWidth            id="media_url"
            name="media_url"
            label="Medya URL (isteğe bağlı)"
            value={formik.values.media_url}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.media_url && Boolean(formik.errors.media_url)}
            helperText={formik.touched.media_url && formik.errors.media_url}
            margin="normal"
          />

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth                id="time_limit"
                name="time_limit"
                label="Süre Sınırı (saniye)"
                type="number"
                value={formik.values.time_limit}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.time_limit && Boolean(formik.errors.time_limit)}
                helperText={formik.touched.time_limit && formik.errors.time_limit}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth                id="points"
                name="points"
                label="Puan"
                type="number"
                value={formik.values.points}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.points && Boolean(formik.errors.points)}
                helperText={formik.touched.points && formik.errors.points}
              />
            </Grid>
          </Grid>          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
            Seçenekler
          </Typography>

          {options.map((option, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>              <TextField
                fullWidth
                label={`Seçenek ${index + 1}`}
                value={option.text}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                error={formik.touched.options && !option.text}
                helperText={
                  formik.touched.options && !option.text
                    ? 'Option text is required'
                    : ''
                }
              />
              <IconButton
                onClick={() => removeOption(index)}
                disabled={options.length <= 2}
                sx={{ ml: 1 }}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}

          {options.length < 6 && (
            <Button
              startIcon={<AddIcon />}              onClick={addOption}
              sx={{ mb: 3 }}
            >
              Seçenek Ekle
            </Button>
          )}          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="correct-option-label">Doğru Seçenek</InputLabel>
            <Select
              labelId="correct-option-label"
              id="correct_option_index"
              name="correct_option_index"
              value={formik.values.correct_option_index}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={
                formik.touched.correct_option_index &&
                Boolean(formik.errors.correct_option_index)
              }
              label="Doğru Seçenek"
            >
              {options.map((_, index) => (
                <MenuItem key={index} value={index}>
                  Seçenek {index + 1}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
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
                'Soru Ekle'
              )}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default AddQuestionForm; 