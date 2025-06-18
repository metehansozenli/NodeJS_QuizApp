import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Container, Button, Form, ListGroup, Alert } from 'react-bootstrap';

const HostView = () => {
  const [socket, setSocket] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState('');
  const [participants, setParticipants] = useState([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    // Socket.io bağlantısını kur
    const newSocket = io('https://nodejs-quizapp.onrender.com', {
      auth: { token: localStorage.getItem('token') }
    });
    setSocket(newSocket);

    // Quiz listesini çek
    fetchQuizzes();

    return () => newSocket.disconnect();
  }, []);
  useEffect(() => {
    if (socket && sessionId) {
      const handleUserJoined = (data) => {
        console.log('New user joined:', data);
        setParticipants(prev => {
          if (prev.includes(data.username)) {
            return prev;
          }
          console.log('Adding user to participants:', [...prev, data.username]);
          return [...prev, data.username];
        });
      };

      const handleUserLeft = (data) => {
        console.log('User left:', data);
        setParticipants(prev => {
          const newList = prev.filter(username => username !== data.username);
          console.log('Updated participants after leave:', newList);
          return newList;
        });
      };

      socket.on('userJoined', handleUserJoined);
      socket.on('userLeft', handleUserLeft);

      return () => {
        socket.off('userJoined', handleUserJoined);
        socket.off('userLeft', handleUserLeft);
      };
    }
  }, [socket, sessionId]);
  useEffect(() => {
    console.log('Katılımcı listesi güncellendi:', participants);
  }, [participants]);

  const fetchQuizzes = async () => {
    try {
      const response = await fetch('https://nodejs-quizapp.onrender.com/api/quiz/fetchQuizList');
      const data = await response.json();
      setQuizzes(data);
      console.log('Fetched quizzes:', data); // Debug için log
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    }
  };

  const startSession = () => {
    if (!selectedQuiz) {
      alert('Lütfen bir quiz seçin');
      return;
    }

    setParticipants([]); // Oturum başlatılırken katılımcı listesini sıfırla
    socket.emit('startSession', {
      quiz_Id: selectedQuiz,
      status: true,
      started_At: new Date().toISOString(),
      host_Id: 1 // Bu değer gerçek host ID ile değiştirilmeli
    }, (response) => {
      if (response.sessionId) {
        setSessionId(response.sessionId);
        setSessionStarted(true);
      }
    });
  };

  const endSession = () => {
    socket.emit('endSession', {
      sessionId: sessionId,
      status: false,
      ended_At: new Date().toISOString()
    }, () => {
      setSessionStarted(false);
      setParticipants([]);
    });
  };

  useEffect(() => {
    if (socket) {
      const logAnyMessage = (event, ...args) => {
        console.log('[SOCKET]', event, ...args);
      };
      // Tüm eventler için log
      socket.onAny(logAnyMessage);
      return () => {
        socket.offAny(logAnyMessage);
      };
    }
  }, [socket]);

  return (
    <Container className="mt-5">
      <h2>Quiz Host Panel</h2>
      
      {!sessionStarted ? (
        <div>
          <Form.Group className="mb-3">
            <Form.Label>Quiz Seçin</Form.Label>
            <Form.Select 
              value={selectedQuiz} 
              onChange={(e) => setSelectedQuiz(e.target.value)}
            >
              <option value="">Quiz Seçin...</option>
              {quizzes.map(quiz => (
                <option key={quiz.id} value={quiz.id}>
                  {quiz.title}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Button variant="primary" onClick={startSession}>
            Oturumu Başlat
          </Button>
        </div>
      ) : (        <div>
          <h3>Aktif Oturum</h3>
          <Alert variant="info">
            <h4>Quiz ID: {sessionId}</h4>
            <p>Bu ID'yi katılımcılarla paylaşın.</p>
          </Alert>
          <h4>Katılımcılar ({participants.length}):</h4>
          {participants.length === 0 ? (
            <Alert variant="warning">Henüz katılımcı yok</Alert>
          ) : (
            <ListGroup className="mb-3">
              {participants.map((username, index) => (
                <ListGroup.Item key={index}>{username}</ListGroup.Item>
              ))}
            </ListGroup>
          )}
          <Button variant="danger" onClick={endSession}>
            Oturumu Sonlandır
          </Button>
        </div>
      )}
    </Container>
  );
};

export default HostView;
