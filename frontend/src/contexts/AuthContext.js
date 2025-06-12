import React, { createContext, useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login, logout } from '../store/slices/authSlice';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      dispatch(login({ token: storedToken }));
    }
  }, [dispatch]);
  const handleLogin = async (credentials) => {
    const result = await dispatch(login(credentials));
    if (!result.error) {
      localStorage.setItem('token', result.payload.token);
      
      // Role-based navigation
      if (result.payload.user?.role === 'host') {
        navigate('/host-dashboard');
      } else if (result.payload.user?.role === 'player') {
        navigate('/user-dashboard');
      } else {
        navigate('/dashboard');
      }
    }
    return result;
  };

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem('token');
    navigate('/login');
  };

  const value = {
    user,
    token,
    loading,
    login: handleLogin,
    logout: handleLogout,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 