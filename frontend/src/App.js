import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Navbar from './components/common/Navbar';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import QuizDetail from './components/quiz/QuizDetail';
import EnhancedCreateQuizForm from './components/quiz/EnhancedCreateQuizForm';
import QuizManagement from './components/quiz/QuizManagement';
import JoinQuiz from './components/quiz/JoinQuiz';
import AddQuestionForm from './components/quiz/AddQuestionForm';
import EditQuestionForm from './components/quiz/EditQuestionForm';
import HostSession from './components/quiz/HostSession';
import HostDashboard from './components/host/HostDashboard';
import UserDashboard from './components/user/UserDashboard';
import PlayerHistory from './components/history/PlayerHistory';
import HostHistory from './components/history/HostHistory';
import SessionHistoryDetail from './components/history/SessionHistoryDetail';
import ProtectedRoute from './components/common/ProtectedRoute';
import PublicRoute from './components/common/PublicRoute';
import BrowseQuizzes from './components/quiz/BrowseQuizzes';

// Dashboard redirect component
const DashboardRedirect = () => {
  const { user } = useSelector((state) => state.auth);
  const isHost = user?.role === 'host';
  
  return <Navigate to={isHost ? '/host/dashboard' : '/user-dashboard'} replace />;
};

const theme = createTheme({
  palette: {
    primary: {
      main: '#667eea',
      light: '#9bb5ff',
      dark: '#3f51b7',
    },
    secondary: {
      main: '#e91e63',
      light: '#ff6090',
      dark: '#ad1457',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    background: {
      default: 'transparent',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 800,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 500,
      fontSize: '1rem',
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '25px',
          padding: '12px 24px',
          fontWeight: 600,
          fontSize: '16px',
          textTransform: 'none',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
          },
        },
        contained: {
          background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
          '&:hover': {
            background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '20px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 15px 40px rgba(0, 0, 0, 0.15)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '15px',
            '& fieldset': {
              borderColor: '#e0e0e0',
              borderWidth: '2px',
            },
            '&:hover fieldset': {
              borderColor: '#667eea',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#667eea',
              boxShadow: '0 0 10px rgba(102, 126, 234, 0.3)',
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
});

function App() {
  const { user, token } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Auth loading state
  const [authLoading, setAuthLoading] = React.useState(true);  // Check for stored auth data on app load
  useEffect(() => {
    console.log('App.js - Auth check useEffect running');
    
    // Add a small delay to let Redux initialize properly
    const timer = setTimeout(() => {
      setAuthLoading(false);
      console.log('App.js - Auth loading complete');
    }, 100);

    return () => clearTimeout(timer);
  }, []); // Only run once on mount

  // Redirect logic after auth is loaded
  useEffect(() => {
    if (authLoading) return; // Wait for auth to load
    
    console.log('App.js - Redirect logic running:', { 
      hasUser: !!user, 
      hasToken: !!token, 
      currentPath: location.pathname 
    });

    // If not authenticated and trying to access protected route, redirect to login
    if (!user || !token) {
      const isPublicRoute = ['/login', '/register'].includes(location.pathname);
      if (!isPublicRoute && location.pathname !== '/') {
        console.log('App.js - No auth, redirecting to login');
        navigate('/login');
      }
      return;
    }

    // If authenticated and on root path, redirect to appropriate dashboard
    if (location.pathname === '/') {
      if (user.role === 'host') {
        console.log('App.js - Redirecting host to dashboard');
        navigate('/host/dashboard');
      } else if (user.role === 'player') {
        console.log('App.js - Redirecting player to dashboard');
        navigate('/user-dashboard');
      }
    }
  }, [authLoading, user, token, navigate, location.pathname]);

  // Handle session management for host - REMOVED AUTO REDIRECT
  // Let users navigate freely, don't force them to old sessions

  // Handle player game state
  useEffect(() => {
    if (user && user.role === 'player') {
      const playerSessionId = localStorage.getItem('playerSessionId');
      const playerGameCode = localStorage.getItem('playerGameCode');
      const currentPath = location.pathname;
      
      // If player has active game session but not on join page, redirect
      if (playerSessionId && playerGameCode && !currentPath.includes('/join/')) {
        navigate(`/join/${playerGameCode}`);
      }
    }
  }, [user, navigate, location]);
  // Show loading while checking auth
  if (authLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="kahoot-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <div className="kahoot-card" style={{ textAlign: 'center' }}>
            <div className="loading-spinner">
              <h2>🎯 QuizMaster</h2>
              <p>Yükleniyor...</p>
            </div>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {user && <Navbar />}<Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginForm />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterForm />
            </PublicRoute>
          }
        />        {/* Protected Routes - Host */}
        <Route
          path="/host/dashboard"
          element={
            <ProtectedRoute requiredRole="host">
              <HostDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host-dashboard"
          element={<Navigate to="/host/dashboard" replace />}
        />

        {/* Protected Routes - Player/User */}
        <Route
          path="/user-dashboard"
          element={
            <ProtectedRoute requiredRole="player">
              <UserDashboard />
            </ProtectedRoute>
          }
        />        {/* General Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz/create"
          element={
            <ProtectedRoute requiredRole="host">
              <EnhancedCreateQuizForm />
            </ProtectedRoute>
          }
        />        <Route
          path="/quiz/manage/:sessionId"
          element={
            <ProtectedRoute requiredRole="host">
              <QuizManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/session/:sessionId"
          element={
            <ProtectedRoute requiredRole="host">
              <HostSession />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz/:quizId/manage"
          element={<Navigate to="/host/dashboard" replace />}
        />
        <Route
          path="/quiz/:quizId/detail"
          element={
            <ProtectedRoute>
              <QuizDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz/:quizId"
          element={
            <ProtectedRoute>
              <QuizDetail />
            </ProtectedRoute>
          }
        />        <Route
          path="/quiz/:quizId/questions/add"
          element={
            <ProtectedRoute requiredRole="host">
              <AddQuestionForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz/:quizId/questions/:questionId/edit"
          element={
            <ProtectedRoute requiredRole="host">
              <EditQuestionForm />
            </ProtectedRoute>
          }
        />{/* Public Join Routes */}
        <Route path="/join/:gameCode?" element={<JoinQuiz />} />
        <Route path="/browse-quizzes" element={<BrowseQuizzes />} />

        {/* Add routes after dashboards */}
        <Route path="/history/player" element={<ProtectedRoute requiredRole="player"><PlayerHistory/></ProtectedRoute>} />
        <Route path="/history/host" element={<ProtectedRoute requiredRole="host"><HostHistory/></ProtectedRoute>} />
        <Route path="/history/session/:sessionId" element={<ProtectedRoute><SessionHistoryDetail/></ProtectedRoute>} />

        {/* Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}

// Export theme for use in index.js
App.theme = theme;

export default App;