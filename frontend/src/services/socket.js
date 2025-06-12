import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnecting = false;
  }

  connect() {
    // If a socket already exists (connected or not) return it
    if (this.socket) {
      return this.socket;
    }

    console.log('Creating new socket connection...');
    this.socket = io('http://localhost:5000', {
      autoConnect: true,
      forceNew: true,
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: 10,
      timeout: 20000,
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.socket = null; // Force new connection next time
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return this.socket;
  }

  // Wait for socket to connect with timeout
  async waitForConnection(timeout = 5000) {
    // If socket already exists and connected, resolve immediately
    if (this.socket && this.socket.connected) {
      return Promise.resolve();
    }

    // If a connection attempt is already in progress, wait until socket object is created
    if (!this.socket && this.isConnecting) {
      // Poll every 50 ms until this.socket is assigned or timeout
      await new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
          if (this.socket) {
            resolve();
            return;
          }
          if (Date.now() - start > timeout) {
            reject(new Error('Socket creation timeout'));
            return;
          }
          setTimeout(check, 50);
        };
        check();
      });
    }

    // At this point we should have a socket instance; if not, throw
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    // If it's connected now, done
    if (this.socket.connected) {
      return Promise.resolve();
    }

    // Otherwise wait for connect event or error
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Socket connection timeout'));
      }, timeout);

      const onConnect = () => {
        clearTimeout(timer);
        this.socket.off('connect_error', onError);
        resolve();
      };

      const onError = (error) => {
        clearTimeout(timer);
        this.socket.off('connect', onConnect);
        reject(error);
      };

      this.socket.on('connect', onConnect);
      this.socket.on('connect_error', onError);
    });
  }
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Generic emit function
  emit(event, data, callback) {
    console.log('SocketService.emit called:', event, 'data:', data);
    const socketInstance = this.connect();

    // If socket is not connected yet, wait until it connects, then emit
    if (!socketInstance || !socketInstance.connected) {
      console.log('Socket not connected yet, waiting to emit', event);
      // Attach one-time listener
      this.waitForConnection()
        .then(() => {
          console.log('Socket connected, emitting queued event:', event);
          if (callback) {
            this.socket.emit(event, data, callback);
          } else {
            this.socket.emit(event, data);
          }
        })
        .catch((err) => {
          console.error('Failed to connect socket for emit', event, err);
        });
    } else {
      if (callback) {
        socketInstance.emit(event, data, callback);
      } else {
        socketInstance.emit(event, data);
      }
    }
  }
  // Session events
  joinSession(sessionData, callback) {
    this.connect();
    this.socket?.emit('joinSession', sessionData, callback);
  }

  hostJoinSession(sessionData) {
    console.log('SocketService.hostJoinSession called with:', sessionData);
    this.connect();
    console.log('Socket connected for hostJoinSession:', this.socket?.connected);
    this.socket?.emit('hostJoinSession', sessionData);
    console.log('hostJoinSession event emitted');
  }

  leaveSession(sessionId) {
    this.socket?.emit('leave_session', { sessionId });
  }

  startSession(sessionId) {
    this.socket?.emit('start_session', { sessionId });
  }

  endSession(sessionId) {
    this.socket?.emit('end_session', { sessionId });
  }

  // Game events
  joinGame(gameCode, username) {
    this.connect();
    this.socket?.emit('join_game', { gameCode, username });
  }

  submitAnswer(answerData) {
    this.socket?.emit('submit_answer', answerData);
  }

  startQuestion(sessionId, questionData) {
    this.socket?.emit('start_question', { sessionId, question: questionData });
  }

  endQuestion(sessionId) {
    this.socket?.emit('end_question', { sessionId });
  }
  showLeaderboard(sessionId) {
    this.socket?.emit('show_leaderboard', { sessionId });
  }

  // Event listeners
  on(event, callback) {
    this.addListener(event, callback);
  }

  off(event, callback) {
    this.removeListener(event, callback);
  }

  onSessionState(callback) {
    this.addListener('session_state', callback);
  }

  onTimeUpdate(callback) {
    this.addListener('time_update', callback);
  }

  onLeaderboardUpdate(callback) {
    this.addListener('leaderboard_update', callback);
  }

  onParticipantJoined(callback) {
    this.addListener('participant_joined', callback);
  }

  onParticipantLeft(callback) {
    this.addListener('participant_left', callback);
  }

  onQuestionStart(callback) {
    this.addListener('question_start', callback);
  }

  onQuestionEnd(callback) {
    this.addListener('question_end', callback);
  }

  onAnswerSubmitted(callback) {
    this.addListener('answer_submitted', callback);
  }

  // Helper methods
  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    this.socket?.on(event, callback);
  }

  removeListener(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
      this.socket?.off(event, callback);
    }
  }

  removeAllListeners(event) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      callbacks.forEach((callback) => {
        this.socket?.off(event, callback);
      });
      this.listeners.delete(event);
    }
  }
}

const socketService = new SocketService();
export default socketService; 