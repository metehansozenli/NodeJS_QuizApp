const request = require('supertest');
const app = require('../server'); // Import your Express app
const db = require('../config/db_config');
const socket = require('../config/socket_config');
const io = require('socket.io-client');

// Mock the auth.middleware.js to simulate Passport.js behavior
jest.mock('../middleware/auth.middleware', () => (req, res, next) => {
  req.user = { id: 1, username: 'testuser', role: 'user', sessionId: 'test-session-123' };
  next();
});

// Generate a mock token for testing
let mockToken;
beforeAll(() => {
  // mockToken = tokenHelper.generateToken({ ... });
  // Passport.js ve auth.middleware ile testlerde req.user otomatik atanıyor, token üretimi gerekmiyor.
  // Eğer testlerde Authorization header gerekiyorsa, test için sabit bir JWT token kullanabilirsin.
  // Örneğin: mockToken = 'test.jwt.token';
  mockToken = 'test.jwt.token';
});

describe('API and Database Tests', () => {
    // beforeAll(() => {
    //     jest.spyOn(console, 'log').mockImplementation(() => {});
    //     jest.spyOn(console, 'error').mockImplementation(() => {});
    // });

    // afterAll(() => {
    //     console.log.mockRestore();
    //     console.error.mockRestore();
    // });

    describe('Database Connection', () => {
        it('Veri tabanına bağlanılabilmeli ve sorgu çalıştırılabilmeli', async () => {
            const result = await db.query('SELECT NOW()');
            expect(result).toHaveProperty('rows');
            expect(result.rows.length).toBeGreaterThan(0);
        });

        it('Yanlış bilgi girildiğinde hata vermeli', async () => {
            const incorrectDb = new (require('pg').Pool)({
                user: 'wrong_user',
                host: process.env.DB_HOST,
                database: process.env.DB_NAME,
                password: 'wrong_password',
                port: process.env.DB_PORT,
            });

            try {
                await incorrectDb.query('SELECT NOW()');
            } catch (error) {
                expect(error.message).toContain('password authentication failed');
            }
        });

        it('Database ismi yanlışsa hata vermeli', async () => {
            const incorrectDb = new (require('pg').Pool)({
                user: process.env.DB_USER,
                host: process.env.DB_HOST,
                database: 'wrong_db',
                password: process.env.DB_PASSWORD,
                port: process.env.DB_PORT,
            });

            try {
                await incorrectDb.query('SELECT NOW()');
            } catch (error) {
                expect(error.message).toContain('does not exist');
            }
        });
    });

    describe('API Endpoints - Register', () => {
        const testUser = {
            username: 'testuser',
            password: 'testpassword',
        };

        // Temizleme işlemi - her testten önce kullanıcıyı sil
        beforeEach(async () => {
            await db.query('DELETE FROM users WHERE username = $1', [testUser.username]);
        });

        it('Yanı kullanıcı kayıt olabilmeli', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send(testUser);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('message', 'User registered successfully');
        });

        it('Aynı kullanıcı iki kez kayıt olamamalı', async () => {
            // İlk kayıt
            await request(app)
                .post('/api/auth/register')
                .send(testUser);

            // Tekrar aynı bilgilerle kayıt
            const response = await request(app)
                .post('/api/auth/register')
                .send(testUser);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'User with this username already exists');
        });

        it('Gerekli alanlar eksikse 401 dönmeli', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({ username: 'incompleteUser' }); // eksik password

            expect(response.status).toBe(401); // eksik alan kontrolü varsa 400 olmalı
        });
    });


    describe('API Endpoints - Login', () => {
        const testUser = {
            username: 'testuser1',
            password: 'testpassword',
        };

        // 1. Kullanıcıyı kaydet
        it('Yeni kullanıcı kayıt olabilmeli', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(testUser);

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('message', 'User registered successfully');
        });

        // 2. Login ol
        it('Kayıtlı kullanıcı giriş yapabilmeli', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({ username: testUser.username, password: testUser.password });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
        });
        
        it('Geçersiz girişte 401 dönmeli', async () => {
            const response = await request(app)
            .post('/api/auth/login')
            .send({ username: 'wronguser', password: 'wrongpassword' });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error', 'Invalid credentials');
        });

        // 3. Testten sonra kullanıcıyı sil
        afterAll(async () => {
            await db.query('DELETE FROM users WHERE username = $1', [testUser.username]);
        });
    });

    describe('API Endpoints - Cevap Gönderme', () => {
        let testQuestion;
        let testOption;
        let testSessionId;

        // Test öncesi hazırlık
        beforeAll(async () => {
            // Test quiz'i oluştur
            const quizResult = await db.query(
                'INSERT INTO quizzes (title, description, created_by) VALUES ($1, $2, $3) RETURNING *',
                ['Test Quiz', 'Test Description', 1]
            );
            testQuiz = quizResult.rows[0];

            // Test sorusu oluştur
            const questionResult = await db.query(
                'INSERT INTO questions (quiz_id, question_text, duration_seconds) VALUES ($1, $2, $3) RETURNING *',
                [testQuiz.id, 'Test Question', 30]
            );
            testQuestion = questionResult.rows[0];

            // Test şıkkı oluştur
            const optionResult = await db.query(
                'INSERT INTO options (question_id, option_text, is_correct) VALUES ($1, $2, $3) RETURNING *',
                [testQuestion.id, 'Test Option', true]
            );
            testOption = optionResult.rows[0];
        });

        // Test sonrası temizlik
        afterAll(async () => {
            await db.query('DELETE FROM options WHERE question_id = $1', [testQuestion.id]);
            await db.query('DELETE FROM questions WHERE quiz_id = $1', [testQuiz.id]);
            await db.query('DELETE FROM quizzes WHERE id = $1', [testQuiz.id]);
            await db.query('DELETE FROM live_sessions WHERE id = $1', [testSessionId]);
        });

        
        it('Quiz oluşturmalı', async () => {
            const response = await request(app)
                .post('/api/quiz/createQuiz')
                .set('Authorization', `Bearer ${mockToken}`)
                .send({
                    title: 'Yeni Quiz',
                    description: 'Yeni Quiz Açıklaması'
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('message', 'Quiz created successfully');
            expect(response.body.quiz).toHaveProperty('title', 'Yeni Quiz');
        });

        it('Quiz listesini getirmeli', async () => {
            const response = await request(app)
                .get('/api/quiz/fetchQuizList')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
        });
    });
  

    describe('API Endpoints - Liderlik Tablosu', () => {
        it('Liderlik tablosunu çekilebilmeli', async () => {
            const response = await request(app)
                .get('/api/user/leaderboard') // Updated path with correct prefix
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
        });
    });
});

describe('Socket Testleri', () => {
    let testQuiz;
    let testOption;
    let testQuestion;
    let testSessionId;
    let socketClient;

    // Test öncesi hazırlık
    beforeAll(async () => {
        // Test quiz'i oluştur
        const quizResult = await db.query(
            'INSERT INTO quizzes (title, description, created_by) VALUES ($1, $2, $3) RETURNING *',
            ['Test Quiz', 'Test Description', 1]
        );
        testQuiz = quizResult.rows[0];

        // Test sorusu oluştur
        const questionResult = await db.query(
            'INSERT INTO questions (quiz_id, question_text, duration_seconds) VALUES ($1, $2, $3) RETURNING *',
            [testQuiz.id, 'Test Question', 30]
        );
        testQuestion = questionResult.rows[0];

        // Test şıkkı oluştur
        const optionResult = await db.query(
            'INSERT INTO options (question_id, option_text, is_correct) VALUES ($1, $2, $3) RETURNING *',
            [testQuestion.id, 'Test Option', true]
        );
        testOption = optionResult.rows[0];
    });

    // Test sonrası temizlik
    afterAll(async () => {
        await db.query('DELETE FROM options WHERE question_id = $1', [testQuestion.id]);
        await db.query('DELETE FROM questions WHERE quiz_id = $1', [testQuiz.id]);
        await db.query('DELETE FROM quizzes WHERE id = $1', [testQuiz.id]);
        await db.query('DELETE FROM live_sessions WHERE id = $1', [testSessionId]);
    });

    beforeEach((done) => {
        socketClient = io('https://nodejs-quizapp.onrender.com', { auth: { token: '' } });
        socketClient.on('connect', done);
    });
    afterEach(() => {
        if (socketClient && socketClient.connected) socketClient.disconnect();
    });

    it('Oturum başlatma eventi çalışmalı', (done) => {
        socketClient.emit('startSession', {
            status: true,
            started_At: new Date(Date.now()).toISOString().replace('T', ' ').replace('Z', ''),
            quiz_Id: testQuiz.id,
            host_Id: 1
        }, (response) => {
            expect(response).toHaveProperty('message', 'Session started successfully');
            expect(response).toHaveProperty('sessionId');
            done();
        });
    });

    it('Oyuna katılma eventi çalışmalı', (done) => {
        socketClient.emit('joinSession', {
            username: 'testuser2',
            quizId: testQuiz.id
        });
        socketClient.on('userJoined', (data) => {
            expect(data).toHaveProperty('username', 'testuser2');
            done();
        });
    });

    it('Cevap gönderme eventi çalışmalı', (done) => {
        socketClient.emit('joinSession', {
            username: 'testuser',
            quizId: testQuiz.id
        });
        socketClient.on('userJoined', () => {
            socketClient.emit('submitAnswer', {
                username: 'testuser',
                quizId: testQuiz.id,
                answer: 'Test Option'
            });
        });
        socketClient.on('newAnswer', (data) => {
            expect(data).toHaveProperty('answer', 'Test Option');
            done();
        });
    });

    it('Join olmadan cevap gönderilirse newAnswer eventini almamalı', (done) => {
        let received = false;
        socketClient.emit('submitAnswer', {
            username: 'testuser',
            quizId: testQuiz.id,
            answer: 'Test Option'
        });
        socketClient.on('newAnswer', () => {
            received = true;
        });
        setTimeout(() => {
            expect(received).toBe(false);
            done();
        }, 500);
    });

    it('Host disconnect olursa sessionEnded eventini almalı', (done) => {
        // Host socket
        const hostSocket = io('https://nodejs-quizapp.onrender.com', { auth: { token: '' } });
        // Oyuncu socket
        const playerSocket = io('https://nodejs-quizapp.onrender.com', { auth: { token: '' } });
        playerSocket.emit('joinSession', {
            username: 'player1',
            quizId: testQuiz.id
        });
        playerSocket.on('userJoined', () => {
            hostSocket.emit('startSession', {
                status: true,
                started_At: new Date(Date.now()).toISOString().replace('T', ' ').replace('Z', ''),
                quiz_Id: testQuiz.id,
                host_Id: 1
            }, () => {
                // Host disconnect
                hostSocket.disconnect();
            });
        });
        playerSocket.on('sessionEnded', (data) => {
            expect(data).toHaveProperty('reason', 'Host disconnected');
            playerSocket.disconnect();
            done();
        });
    });

    it('İki kullanıcı aynı oturuma katılabilmeli', (done) => {
        // İlk kullanıcı için socket
        const socket1 = io('https://nodejs-quizapp.onrender.com', { auth: { token: '' } });
        // İkinci kullanıcı için socket
        const socket2 = io('https://nodejs-quizapp.onrender.com', { auth: { token: '' } });
        
        let joinedUsers = [];

        // Her iki kullanıcı için de userJoined eventini dinle
        const handleUserJoined = (data) => {
            joinedUsers.push(data.username);
            // İki kullanıcı da katıldıysa testi tamamla
            if (joinedUsers.length === 2) {
                expect(joinedUsers).toContain('player1');
                expect(joinedUsers).toContain('player2');
                socket1.disconnect();
                socket2.disconnect();
                done();
            }
        };

        socket1.on('userJoined', handleUserJoined);
        socket2.on('userJoined', handleUserJoined);

        // İlk kullanıcıyı katılma
        socket1.emit('joinSession', {
            username: 'player1',
            quizId: testQuiz.id
        });

        // İkinci kullanıcıyı katılma
        socket2.emit('joinSession', {
            username: 'player2',
            quizId: testQuiz.id
        });
    });
});