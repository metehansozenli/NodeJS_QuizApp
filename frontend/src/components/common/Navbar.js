import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import AccountCircle from '@mui/icons-material/AccountCircle';
import { logout } from '../../store/slices/authSlice';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    handleClose();
    navigate('/login', { replace: true });
  };

  if (!user) return null;
  return (
    <AppBar position="static" className="kahoot-navbar">
      <Toolbar sx={{ py: 1 }}>
        <Typography 
          variant="h5" 
          component="div" 
          sx={{ 
            flexGrow: 1,
            fontWeight: 'bold',
            fontSize: '24px',
            background: 'linear-gradient(45deg, #fff, #f0f0f0)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          🎯 QuizMaster
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Role-based navigation buttons */}
          {user.role === 'host' && (
            <>
              <Button 
                color="inherit" 
                onClick={() => navigate('/host/dashboard')}
                sx={{
                  borderRadius: '20px',
                  px: 3,
                  py: 1,
                  fontWeight: 'bold',
                  background: 'rgba(255,255,255,0.1)',
                  '&:hover': {
                    background: 'rgba(255,255,255,0.2)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                🏠 Dashboard
              </Button>
              <Button 
                color="inherit" 
                onClick={() => navigate('/quiz/create')}
                sx={{
                  borderRadius: '20px',
                  px: 3,
                  py: 1,
                  fontWeight: 'bold',
                  background: 'rgba(255,255,255,0.1)',
                  '&:hover': {
                    background: 'rgba(255,255,255,0.2)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                ➕ Create Quiz
              </Button>
            </>
          )}
            {user.role === 'player' && (
            <>
              <Button 
                color="inherit" 
                onClick={() => navigate('/user-dashboard')}
                sx={{
                  borderRadius: '20px',
                  px: 3,
                  py: 1,
                  fontWeight: 'bold',
                  background: 'rgba(255,255,255,0.1)',
                  '&:hover': {
                    background: 'rgba(255,255,255,0.2)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                🏠 Dashboard
              </Button>              <Button 
                color="inherit" 
                onClick={() => navigate('/join')}
                sx={{
                  borderRadius: '20px',
                  px: 3,
                  py: 1,
                  fontWeight: 'bold',
                  background: 'rgba(255,255,255,0.1)',
                  '&:hover': {
                    background: 'rgba(255,255,255,0.2)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                🎮 Join Quiz
              </Button>
            </>
          )}

          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
            sx={{
              background: 'rgba(255,255,255,0.1)',
              '&:hover': {
                background: 'rgba(255,255,255,0.2)',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.3s ease',
              ml: 1,
            }}
          >
            <AccountCircle sx={{ fontSize: '28px' }} />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            sx={{
              '& .MuiPaper-root': {
                borderRadius: '15px',
                mt: 1,
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
              },
            }}
          >
            <MenuItem 
              onClick={handleClose}
              sx={{
                fontWeight: 'bold',
                color: '#667eea',
                '&:hover': {
                  background: 'rgba(102, 126, 234, 0.1)',
                },
              }}
            >
              👋 Hi, {user.username}!
            </MenuItem>
            <MenuItem 
              onClick={handleLogout}
              sx={{
                fontWeight: 'bold',
                color: '#e91e63',
                '&:hover': {
                  background: 'rgba(233, 30, 99, 0.1)',
                },
              }}
            >
              🚪 Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 