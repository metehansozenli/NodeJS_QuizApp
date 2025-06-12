import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunks
export const createQuiz = createAsyncThunk(
  'quiz/createQuiz',
  async (quizData, { rejectWithValue }) => {
    try {
      const response = await api.post('/quiz/createQuiz', quizData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const getHostQuizzes = createAsyncThunk(
  'quiz/getHostQuizzes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/quiz/host');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const getQuiz = createAsyncThunk(
  'quiz/getQuiz',
  async (quizId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/quiz/${quizId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const addQuestion = createAsyncThunk(
  'quiz/addQuestion',
  async ({ quizId, questionData }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/quiz/${quizId}/questions`, questionData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const updateQuestion = createAsyncThunk(
  'quiz/updateQuestion',
  async ({ quizId, questionId, questionData }, { rejectWithValue }) => {
    try {
      const response = await api.put(
        `/quiz/${quizId}/questions/${questionId}`,
        questionData
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const deleteQuestion = createAsyncThunk(
  'quiz/deleteQuestion',
  async ({ quizId, questionId }, { rejectWithValue }) => {
    try {
      await api.delete(`/quiz/${quizId}/questions/${questionId}`);
      return { quizId, questionId };
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const deleteQuiz = createAsyncThunk(
  'quiz/deleteQuiz',
  async (quizId, { rejectWithValue }) => {
    try {
      await api.delete(`/quiz/${quizId}`);
      return quizId;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const initialState = {
  quizzes: [],
  currentQuiz: null,
  loading: false,
  error: null,
};

const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentQuiz: (state) => {
      state.currentQuiz = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Quiz
      .addCase(createQuiz.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createQuiz.fulfilled, (state, action) => {
        state.loading = false;
        state.quizzes.unshift(action.payload);
      })
      .addCase(createQuiz.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to create quiz';
      })
      // Get Host Quizzes
      .addCase(getHostQuizzes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getHostQuizzes.fulfilled, (state, action) => {
        state.loading = false;
        state.quizzes = action.payload;
      })
      .addCase(getHostQuizzes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to fetch quizzes';
      })
      // Get Quiz
      .addCase(getQuiz.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getQuiz.fulfilled, (state, action) => {
        state.loading = false;
        state.currentQuiz = action.payload;
      })
      .addCase(getQuiz.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to fetch quiz';
      })
      // Add Question
      .addCase(addQuestion.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addQuestion.fulfilled, (state, action) => {
        state.loading = false;
        if (state.currentQuiz) {
          state.currentQuiz.questions.push(action.payload);
        }
      })
      .addCase(addQuestion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to add question';
      })
      // Update Question
      .addCase(updateQuestion.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateQuestion.fulfilled, (state, action) => {
        state.loading = false;
        if (state.currentQuiz) {
          const index = state.currentQuiz.questions.findIndex(
            (q) => q.id === action.payload.id
          );
          if (index !== -1) {
            state.currentQuiz.questions[index] = action.payload;
          }
        }
      })
      .addCase(updateQuestion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to update question';
      })
      // Delete Question
      .addCase(deleteQuestion.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteQuestion.fulfilled, (state, action) => {
        state.loading = false;
        if (state.currentQuiz) {
          state.currentQuiz.questions = state.currentQuiz.questions.filter(
            (q) => q.id !== action.payload.questionId
          );
        }
      })
      .addCase(deleteQuestion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to delete question';
      })
      // Delete Quiz
      .addCase(deleteQuiz.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteQuiz.fulfilled, (state, action) => {
        state.loading = false;
        state.quizzes = state.quizzes.filter((q) => q.id !== action.payload);
        if (state.currentQuiz?.id === action.payload) {
          state.currentQuiz = null;
        }
      })
      .addCase(deleteQuiz.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to delete quiz';
      });
  },
});

export const { clearError, clearCurrentQuiz } = quizSlice.actions;
export default quizSlice.reducer; 