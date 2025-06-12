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
} from '@mui/material';
import { login } from '../../store/slices/authSlice';

const validationSchema = Yup.object({
  username: Yup.string().required('Username is required'),
  password: Yup.string().required('Password is required'),
});

const LoginForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const formik = useFormik({
    initialValues: {
      username: '',
      password: '',
    },
    validationSchema,    onSubmit: async (values) => {
      const result = await dispatch(login(values));
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
        <div className="kahoot-card">
          <div className="kahoot-title">
            🎯 Welcome Back!
          </div>
          <div className="kahoot-subtitle">
            Ready to create amazing quizzes?
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

          <form onSubmit={formik.handleSubmit}>
            <TextField
              fullWidth
              id="username"
              name="username"
              label="👤 Username"
              value={formik.values.username}
              onChange={formik.handleChange}
              error={formik.touched.username && Boolean(formik.errors.username)}
              helperText={formik.touched.username && formik.errors.username}
              margin="normal"
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
              fullWidth
              id="password"
              name="password"
              label="🔒 Password"
              type="password"
              value={formik.values.password}
              onChange={formik.handleChange}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
              margin="normal"
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

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ 
                mt: 4,
                mb: 2,
                height: '60px',
                fontSize: '18px',
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)',
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
                '🚀 Let\'s Go!'
              )}
            </Button>
          </form>

          <Box mt={3} textAlign="center">
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#666',
                fontSize: '16px'
              }}
            >
              New to our platform?{' '}
              <Link 
                component={RouterLink} 
                to="/register"
                sx={{
                  color: '#667eea',
                  fontWeight: 'bold',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  }
                }}
              >
                Create Account 🎉
              </Link>
            </Typography>
          </Box>
        </div>
      </Container>
    </div>
  );
};

export default LoginForm; 