const socketIO = require('socket.io');

let io;

const socketUtils = {
    initialize: (server) => {
        io = socketIO(server, {
            cors: {
                origin: process.env.FRONTEND_URL,
                methods: ['GET', 'POST']
            }
        });

        io.on('connection', (socket) => {
            console.log('New client connected');

            socket.on('joinGame', (gameId) => {
                socket.join(gameId);
            });

            socket.on('leaveGame', (gameId) => {
                socket.leave(gameId);
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected');
            });
        });

        return io;
    },

    getIO: () => {
        if (!io) {
            throw new Error('Socket.io not initialized');
        }
        return io;
    }
};

module.exports = socketUtils; 