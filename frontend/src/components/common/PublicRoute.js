import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setCredentials } from '../../store/slices/authSlice';

const PublicRoute = ({ children }) => {
  const { token, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // Check localStorage on mount if user is not in state
  useEffect(() => {
    if (!user && !token) {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          dispatch(setCredentials({ user: parsedUser, token: storedToken }));
        } catch (error) {
          console.error('Error parsing stored user data:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    }
  }, [user, token, dispatch]);

  if (token && user) {
    // Redirect authenticated users to their appropriate dashboard
    if (user.role === 'host') {
      return <Navigate to="/host/dashboard" replace />;
    } else if (user.role === 'player') {
      return <Navigate to="/user-dashboard" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }
  return children;
};

export default PublicRoute;
