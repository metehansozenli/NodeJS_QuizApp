// Live quiz game handlers
module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('A user connected to the quiz');

    socket.on('joinQuiz', (data) => {
      console.log(`${data.username} joined quiz ${data.quizId}`);
      socket.join(data.quizId);

      // Notify others in the room
      socket.to(data.quizId).emit('userJoined', { username: data.username });
    });

    socket.on('startQuiz', (data) => {
      console.log(`Quiz ${data.quizId} started`);

      // Broadcast the first question to all participants
      io.to(data.quizId).emit('quizStarted', { message: 'Quiz has started!' });
    });

    socket.on('submitAnswer', (data) => {
      console.log(`Answer submitted by ${data.username}: ${data.answer}`);

      // Broadcast the answer to the room
      io.to(data.quizId).emit('newAnswer', data);
    });

    socket.on('endQuiz', (data) => {
      console.log(`Quiz ${data.quizId} ended`);

      // Notify all participants that the quiz has ended
      io.to(data.quizId).emit('quizEnded', { message: 'Quiz has ended!' });
    });

    socket.on('disconnect', () => {
      console.log('A user disconnected from the quiz');
    });
  });
};
