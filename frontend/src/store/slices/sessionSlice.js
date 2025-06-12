import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { sessionAPI } from '../../services/api';

// Async thunks
export const startSession = createAsyncThunk(
  'session/startSession',
  async (quizId, { rejectWithValue }) => {
    try {
      const response = await sessionAPI.createSession(quizId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const fetchSessionState = createAsyncThunk(
  'session/fetchSessionState',
  async (sessionId, { rejectWithValue }) => {
    try {
      const response = await sessionAPI.getSession(sessionId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const joinSession = createAsyncThunk(
  'session/joinSession',
  async ({ code, username }, { rejectWithValue }) => {
    try {
      const response = await sessionAPI.joinSession(code, username);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const endSession = createAsyncThunk(
  'session/endSession',
  async (sessionId, { rejectWithValue }) => {
    try {
      const response = await sessionAPI.endSession(sessionId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const initialState = {
  currentSession: null,
  participants: [],
  leaderboard: [],
  currentQuestion: null,
  timeRemaining: 0,
  phase: 'LOBBY',
  loading: false,
  error: null,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    updateTimeRemaining: (state, action) => {
      state.timeRemaining = action.payload;
    },
    setLeaderboard: (state, action) => {
      state.leaderboard = action.payload;
    },
    addParticipant: (state, action) => {
      if (!state.participants.find((p) => p.id === action.payload.id)) {
        state.participants.push(action.payload);
      }
    },
    removeParticipant: (state, action) => {
      state.participants = state.participants.filter(
        (p) => p.id !== action.payload
      );
    },
    clearError: (state) => {
      state.error = null;
    },
    resetSession: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // Start Session
      .addCase(startSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startSession.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSession = action.payload;
        state.phase = 'LOBBY';
      })
      .addCase(startSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to start session';
      })
      // Fetch Session State
      .addCase(fetchSessionState.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSessionState.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSession = action.payload.session;
        state.participants = action.payload.participants;
        state.leaderboard = action.payload.leaderboard;
        state.currentQuestion = action.payload.currentQuestion;
        state.timeRemaining = action.payload.timeRemaining;
        state.phase = action.payload.phase;
      })
      .addCase(fetchSessionState.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch session state';
      })
      // Join Session
      .addCase(joinSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(joinSession.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSession = action.payload;
        state.phase = 'LOBBY';
      })
      .addCase(joinSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to join session';
      })
      // End Session
      .addCase(endSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(endSession.fulfilled, (state) => {
        state.loading = false;
        state.phase = 'FINISHED';
      })
      .addCase(endSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to end session';
      });
  },
});

export const {
  updateTimeRemaining,
  setLeaderboard,
  addParticipant,
  removeParticipant,
  clearError,
  resetSession,
} = sessionSlice.actions;
export default sessionSlice.reducer; 