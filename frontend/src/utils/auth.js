// Auth utility functions
export const decodeToken = (token) => {
  try {
    console.log('auth.js - decodeToken called with token:', !!token);
    if (!token) {
      console.log('auth.js - No token provided');
      return null;
    }
    
    // JWT token has 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('auth.js - Invalid token format, parts:', parts.length);
      return null;
    }
    
    // Decode the payload (second part)
    const payload = JSON.parse(atob(parts[1]));
    console.log('auth.js - Decoded payload:', payload);
    
    // Check if token is expired
    const currentTime = Date.now() / 1000;
    if (payload.exp && payload.exp < currentTime) {
      console.log('auth.js - Token expired');
      return null;
    }
    
    console.log('auth.js - Token is valid and not expired');
    return payload;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

export const isTokenValid = (token) => {
  console.log('auth.js - isTokenValid called with token:', !!token);
  const decoded = decodeToken(token);
  const isValid = decoded !== null;
  console.log('auth.js - Token is valid:', isValid);
  return isValid;
};

export const getUserFromToken = (token) => {
  console.log('auth.js - getUserFromToken called with token:', !!token);
  const decoded = decodeToken(token);
  if (!decoded) {
    console.log('auth.js - Could not decode token, returning null');
    return null;
  }
  
  const user = {
    id: decoded.id,
    username: decoded.username,
    role: decoded.role
  };
  console.log('auth.js - Extracted user from token:', user);
  return user;
};
