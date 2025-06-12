import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

const QuizSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [sessionState, setSessionState] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  useEffect(() => {
    // Socket bağlantısını başlat
    const newSocket = io(process.env.REACT_APP_API_URL, {
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    // Bağlantı event'leri
    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      setReconnectAttempts(0);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setReconnectAttempts(prev => prev + 1);
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        toast.error('Bağlantı kurulamadı. Lütfen sayfayı yenileyin.');
      }
    });

    // Session event'leri
    newSocket.on('sessionStateChanged', (state) => {
      console.log('Session state changed:', state);
      setSessionState(state);
    });

    newSocket.on('sessionEnded', (data) => {
      console.log('Session ended:', data);
      toast.info('Quiz oturumu sonlandırıldı.');
      navigate('/');
    });

    newSocket.on('userJoined', (data) => {
      console.log('User joined:', data);
      toast.info(`${data.username} katıldı`);
    });

    newSocket.on('userLeft', (data) => {
      console.log('User left:', data);
      toast.info(`${data.username} ayrıldı`);
    });

    // Session'a katıl
    newSocket.emit('joinSession', {
      sessionId,
      username: localStorage.getItem('username'),
      userId: localStorage.getItem('userId')
    }, (response) => {
      if (!response.success) {
        toast.error(response.error || 'Session\'a katılırken bir hata oluştu');
        navigate('/');
      }
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [sessionId, navigate]);

  // Session state değişikliklerini izle
  useEffect(() => {
    if (sessionState) {
      switch (sessionState.phase) {
        case 'lobby':
          // Lobby UI'ı göster
          break;
        case 'question':
          // Soru UI'ı göster
          break;
        case 'showingAnswer':
          // Cevap gösterim UI'ı
          break;
        case 'finished':
          // Sonuç UI'ı
          break;
        default:
          break;
      }
    }
  }, [sessionState]);

  // Bağlantı durumunu göster
  if (!isConnected) {
    return (
      <div className="connection-status">
        <h2>Bağlantı kuruluyor...</h2>
        {reconnectAttempts > 0 && (
          <p>Yeniden bağlanma denemesi: {reconnectAttempts}/{MAX_RECONNECT_ATTEMPTS}</p>
        )}
      </div>
    );
  }

  return (
    <div className="quiz-session">
      {sessionState ? (
        <div className={`session-phase ${sessionState.phase}`}>
          {/* Phase'a göre UI göster */}
        </div>
      ) : (
        <div className="loading">Yükleniyor...</div>
      )}
    </div>
  );
};

export default QuizSession; 