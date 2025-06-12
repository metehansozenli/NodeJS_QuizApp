import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Get initial state from localStorage with better error handling
const getInitialAuthState = () => {
  try {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    console.log('authSlice - Initial state check:', { 
      hasToken: !!token, 
      hasUserData: !!userData
    });
    
    // Always require both token and user data to be valid
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        console.log('authSlice - Valid initial state found:', user);
        return { user, token };
      } catch (parseError) {
        console.error('authSlice - Error parsing stored user data:', parseError);
      }
    }
    
    // If either is missing or invalid, clear everything and start fresh
    if (token || userData) {
      console.log('authSlice - Incomplete auth data found, clearing all');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    
    console.log('authSlice - No valid auth data found, starting fresh');
    return { user: null, token: null };
  } catch (error) {
    console.error('authSlice - Error in getInitialAuthState:', error);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return { user: null, token: null };
  }
};

const initialAuth = getInitialAuthState();

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', credentials);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register', userData);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const initialState = {
  user: initialAuth.user,
  token: initialAuth.token,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,  reducers: {    setCredentials: (state, action) => {
      console.log('authSlice - setCredentials called with:', action.payload);
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      
      // Save to localStorage when setting credentials
      if (user && token) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      }
      
      console.log('authSlice - New state:', { hasUser: !!state.user, hasToken: !!state.token });
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.error = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Clear all session data
      localStorage.removeItem('sessionId');
      localStorage.removeItem('quizId');
      localStorage.removeItem('hostId');
      localStorage.removeItem('playerSessionId');
      localStorage.removeItem('playerGameCode');
      localStorage.removeItem('playerUsername');
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        // Ensure localStorage is updated
        localStorage.setItem('token', action.payload.token);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Login failed';
      })
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        // Ensure localStorage is updated
        localStorage.setItem('token', action.payload.token);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Registration failed';
      });
  },
});

export const { setCredentials, logout, clearError } = authSlice.actions;
export default authSlice.reducer;