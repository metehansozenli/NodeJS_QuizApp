import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Container,
  Typography,
  TextField,
  Button,
  Link,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  FormHelperText,
} from '@mui/material';
import { register } from '../../store/slices/authSlice';

const validationSchema = Yup.object({
  username: Yup.string()
    .min(3, 'Kullanıcı adı en az 3 karakter olmalıdır')
    .required('Kullanıcı adı gereklidir'),
  password: Yup.string()
    .min(6, 'Şifre en az 6 karakter olmalıdır')
    .required('Şifre gereklidir'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Şifreler eşleşmelidir')
    .required('Şifre tekrarı gereklidir'),
  role: Yup.string()
    .oneOf(['player', 'host'], 'Lütfen geçerli bir rol seçin')
    .required('Rol seçimi gereklidir'),
});

const RegisterForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const formik = useFormik({
    initialValues: {
      username: '',
      password: '',
      confirmPassword: '',
      role: '',
    },
    validationSchema,    onSubmit: async (values) => {
      const { confirmPassword, ...registerData } = values;
      const result = await dispatch(register(registerData));
      if (!result.error) {
        // Role-based redirect
        const user = result.payload.user;
        if (user.role === 'host') {
          navigate('/host-dashboard');
        } else if (user.role === 'player') {
          navigate('/user-dashboard');
        } else {
          navigate('/dashboard');
        }
      }
    },
  });
  return (
    <div className="kahoot-container">
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <div className="kahoot-card">          <div className="kahoot-title">
            🎉 Eğlenceye Katıl!
          </div>
          <div className="kahoot-subtitle">
            Hesabını oluştur ve quiz yapmaya başla
          </div>

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

          <Box
            component="form"
            onSubmit={formik.handleSubmit}
            sx={{ mt: 1, width: '100%' }}
          >
            <TextField
              margin="normal"
              fullWidth              id="username"
              label="Kullanıcı Adı Seç"
              name="username"
              autoComplete="username"
              autoFocus
              value={formik.values.username}
              onChange={formik.handleChange}
              error={formik.touched.username && Boolean(formik.errors.username)}
              helperText={formik.touched.username && formik.errors.username}
              sx={{
                '& .MuiInputLabel-root': {
                  fontSize: '18px',
                  fontWeight: 500,
                },
                '& .MuiOutlinedInput-input': {
                  fontSize: '16px',
                  padding: '15px',
                },
              }}
            />

            <TextField
              margin="normal"
              fullWidth              name="password"
              label="Şifre Oluştur"
              type="password"
              id="password"
              autoComplete="new-password"
              value={formik.values.password}
              onChange={formik.handleChange}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
              sx={{
                '& .MuiInputLabel-root': {
                  fontSize: '18px',
                  fontWeight: 500,
                },
                '& .MuiOutlinedInput-input': {
                  fontSize: '16px',
                  padding: '15px',
                },
              }}
            />

            <TextField
              margin="normal"
              fullWidth              name="confirmPassword"
              label="Şifreyi Onayla"
              type="password"
              id="confirmPassword"
              value={formik.values.confirmPassword}
              onChange={formik.handleChange}
              error={
                formik.touched.confirmPassword &&
                Boolean(formik.errors.confirmPassword)
              }
              helperText={
                formik.touched.confirmPassword && formik.errors.confirmPassword
              }
              sx={{
                '& .MuiInputLabel-root': {
                  fontSize: '18px',
                  fontWeight: 500,
                },
                '& .MuiOutlinedInput-input': {
                  fontSize: '16px',
                  padding: '15px',
                },
              }}
            />

            <FormControl
              component="fieldset"
              margin="normal"
              error={formik.touched.role && Boolean(formik.errors.role)}
              sx={{ mt: 3, mb: 2 }}
            >
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{
                  color: '#333',
                  fontWeight: 600,
                  fontSize: '18px',
                  textAlign: 'center',
                  mb: 2,
                }}
              >
                🎯 Choose Your Role
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Box 
                  onClick={() => formik.setFieldValue('role', 'player')}
                  sx={{
                    p: 3,
                    borderRadius: '15px',
                    background: formik.values.role === 'player' 
                      ? 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)'
                      : 'linear-gradient(45deg, #f5f5f5 30%, #e0e0e0 90%)',
                    color: formik.values.role === 'player' ? 'white' : '#333',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textAlign: 'center',
                    border: formik.values.role === 'player' ? '3px solid #fff' : '2px solid #ddd',
                    transform: formik.values.role === 'player' ? 'scale(1.05)' : 'scale(1)',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
                    }
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                    🎮 Player
                  </Typography>
                  <Typography variant="body2">
                    Join and play quizzes
                  </Typography>
                </Box>
                
                <Box 
                  onClick={() => formik.setFieldValue('role', 'host')}
                  sx={{
                    p: 3,
                    borderRadius: '15px',
                    background: formik.values.role === 'host' 
                      ? 'linear-gradient(45deg, #e91e63 30%, #9c27b0 90%)'
                      : 'linear-gradient(45deg, #f5f5f5 30%, #e0e0e0 90%)',
                    color: formik.values.role === 'host' ? 'white' : '#333',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textAlign: 'center',
                    border: formik.values.role === 'host' ? '3px solid #fff' : '2px solid #ddd',
                    transform: formik.values.role === 'host' ? 'scale(1.05)' : 'scale(1)',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
                    }
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                    🏆 Host
                  </Typography>
                  <Typography variant="body2">
                    Create and manage quizzes
                  </Typography>
                </Box>
              </Box>
              {formik.touched.role && formik.errors.role && (
                <FormHelperText error sx={{ textAlign: 'center', mt: 1, fontSize: '14px' }}>
                  {formik.errors.role}
                </FormHelperText>
              )}
            </FormControl>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ 
                mt: 4,
                mb: 2,
                height: '60px',
                fontSize: '18px',
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #e91e63 30%, #9c27b0 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #d81b60 30%, #8e24aa 90%)',
                  transform: 'translateY(-3px)',
                },
                '&:disabled': {
                  background: '#cccccc',
                  transform: 'none',
                }
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: 'white' }} />
              ) : (
                '🚀 Create Account!'
              )}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography 
                variant="body1" 
                sx={{ 
                  color: '#666',
                  fontSize: '16px'
                }}
              >
                Already have an account?{' '}
                <Link 
                  component={RouterLink} 
                  to="/login"
                  sx={{
                    color: '#e91e63',
                    fontWeight: 'bold',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    }
                  }}
                >
                  Sign in here 👋
                </Link>
              </Typography>
            </Box>
          </Box>
        </div>
      </Container>
    </div>
  );
};

export default RegisterForm; 