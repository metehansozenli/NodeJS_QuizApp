// Session management utilities

export const clearHostSession = () => {
  localStorage.removeItem('sessionId');
  localStorage.removeItem('quizId');
  localStorage.removeItem('hostId');
  console.log('Host session data cleared');
};

export const clearPlayerSession = () => {
  localStorage.removeItem('playerSessionId');
  localStorage.removeItem('playerGameCode');
  localStorage.removeItem('playerUsername');
  console.log('Player session data cleared');
};

export const clearAllSessions = () => {
  clearHostSession();
  clearPlayerSession();
  console.log('All session data cleared');
};

export const getHostSession = () => {
  return {
    sessionId: localStorage.getItem('sessionId'),
    quizId: localStorage.getItem('quizId'),
    hostId: localStorage.getItem('hostId')
  };
};

export const getPlayerSession = () => {
  return {
    sessionId: localStorage.getItem('playerSessionId'),
    gameCode: localStorage.getItem('playerGameCode'),
    username: localStorage.getItem('playerUsername')
  };
};

export const setHostSession = (sessionId, quizId, hostId) => {
  localStorage.setItem('sessionId', sessionId);
  if (quizId) localStorage.setItem('quizId', quizId);
  if (hostId) localStorage.setItem('hostId', hostId);
};

export const setPlayerSession = (sessionId, gameCode, username) => {
  localStorage.setItem('playerSessionId', sessionId);
  localStorage.setItem('playerGameCode', gameCode);
  localStorage.setItem('playerUsername', username);
}; 