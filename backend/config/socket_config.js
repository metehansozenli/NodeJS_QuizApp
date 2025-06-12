// Socket.io setup and configuration only
const { Server } = require('socket.io');
const tokenHelper = require('../utils/tokenHelper');
const config = require('./config');

function setupSocket(server) {
  const io = new Server(server, {
    cors: config.socket.cors,
    transports: ['websocket', 'polling'],
    allowEIO3: true
  });

  // Token authentication middleware
  io.use((socket, next) => {
    // Development ve test modunda authentication'ı bypass et
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      // Mock user for development/test
      socket.user = { 
        id: socket.handshake.query.userId || 1, 
        username: socket.handshake.query.username || 'testuser', 
        role: 'user' 
      };
      return next();
    }

    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    try {
      const decoded = tokenHelper.verifyToken(token);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Event uçlarını merkezi dosyadan yükle
  require('../sockets/socket_clean_new')(io);

  return io;
}

module.exports = setupSocket;
