import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Container, Button, Form, Alert } from 'react-bootstrap';

const PlayerView = () => {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState('');
  const [quizId, setQuizId] = useState('');
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const newSocket = io('https://nodejs-quizapp.onrender.com', {
      auth: { token: localStorage.getItem('token') }
    });
    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('error', (data) => {
        setError(data.message);
      });

      socket.on('sessionEnded', () => {
        setJoined(false);
        setError('Quiz oturumu sonlandırıldı');
      });
    }
  }, [socket]);
  const joinSession = (e) => {
    e.preventDefault();
    if (!username || !quizId) {
      setError('Tüm alanları doldurun');
      return;
    }
    console.log('Player joinSession emit:', { username, sessionId: quizId }); // DEBUG LOG
    socket.emit('joinSession', {
      username,
      sessionId: quizId  // quizId input'unu sessionId olarak kullanıyoruz
    }, (response) => {
      if (response.success) {
        setJoined(true);
        setError('');
      } else {
        setError(response.error || 'Katılma işlemi başarısız oldu');
      }
    });
  };

  const leaveSession = () => {
    if (socket) {
      socket.emit('leaveSession', {
        username,
        quizId
      });
      setJoined(false);
      setError('');
    }
  };

  return (
    <Container className="mt-5">
      <h2>Quiz Katılımcı Panel</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}

      {!joined ? (
        <Form onSubmit={joinSession}>
          <Form.Group className="mb-3">
            <Form.Label>Kullanıcı Adı</Form.Label>
            <Form.Control
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Kullanıcı adınızı girin"
            />
          </Form.Group>

          <Form.Group className="mb-3">            <Form.Label>Session ID</Form.Label>
            <Form.Control
              type="text"
              value={quizId}  // İsmi aynı bırakıyoruz ama UI'da Session ID gösteriyoruz
              onChange={(e) => setQuizId(e.target.value)}
              placeholder="Host'tan aldığınız Session ID'yi girin"
            />
          </Form.Group>

          <Button variant="primary" type="submit">
            Quiz'e Katıl
          </Button>
        </Form>
      ) : (
        <div>
          <Alert variant="success">
            Quiz'e başarıyla katıldınız! Host'un quiz'i başlatmasını bekleyin.
          </Alert>
          <Button variant="danger" onClick={leaveSession}>
            Quiz'den Ayrıl
          </Button>
        </div>
      )}
    </Container>
  );
};

export default PlayerView;
