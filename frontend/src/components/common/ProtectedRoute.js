import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { token, user } = useSelector((state) => state.auth);

  console.log('ProtectedRoute - Current state:', { 
    hasToken: !!token, 
    hasUser: !!user, 
    userRole: user?.role,
    requiredRole 
  });

  // If we have user but no token, it means token was lost after refresh
  // In this case, redirect to login to get a fresh token
  if (user && !token) {
    console.log('ProtectedRoute - User exists but no token, redirecting to login for fresh auth');
    return <Navigate to="/login" replace />;
  }

  // If no authentication data found, redirect to login
  if (!user || !token) {
    console.log('ProtectedRoute - No user/token found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Treat DB 'user' role same as 'player' on frontend
  const effectiveRole = user?.role === 'user' ? 'player' : user?.role;

  // Role-based access control
  if (requiredRole && effectiveRole !== requiredRole) {
    console.log('ProtectedRoute - Role mismatch, redirecting based on user role');
    // Redirect to appropriate dashboard based on role
    if (effectiveRole === 'host') {
      return <Navigate to="/host/dashboard" replace />;
    } else if (effectiveRole === 'player') {
      return <Navigate to="/user-dashboard" replace />;
    } else {
      return <Navigate to="/login" replace />;
    }
  }
  
  return children;
};

export default ProtectedRoute;