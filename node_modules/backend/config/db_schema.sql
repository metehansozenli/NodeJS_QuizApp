-- Drop existing tables in correct order
DROP TABLE IF EXISTS quiz_history CASCADE;
DROP TABLE IF EXISTS answers CASCADE;
DROP TABLE IF EXISTS options CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS live_sessions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (Kullanıcılar tablosu)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'host')),
    created_at DATE DEFAULT CURRENT_DATE
);

-- Create quizzes table (Quizler)
CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false,
    background_music_url TEXT,
    created_at DATE DEFAULT CURRENT_DATE
);

-- Create live_sessions table (Canlı Oturumlar)
CREATE TABLE live_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    host_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    started_at DATE DEFAULT CURRENT_DATE,
    ended_at DATE,
    status VARCHAR(10) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'PAUSED', 'ENDED')),
    session_code VARCHAR(6) UNIQUE NOT NULL
);

-- Create participants table (Katılımcılar)
CREATE TABLE participants (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    score INTEGER DEFAULT 0,
    joined_at DATE DEFAULT CURRENT_DATE,
    status BOOLEAN DEFAULT true,
    ended_at DATE
);

-- Create questions table (Sorular)
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    image_url TEXT,
    video_url TEXT,
    duration_seconds INTEGER DEFAULT 30
);

-- Create options table (Seçenekler)
CREATE TABLE options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false
);

-- Create answers table (Cevaplar)
CREATE TABLE answers (
    id SERIAL PRIMARY KEY,
    participant_id INTEGER REFERENCES participants(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    selected_option_id INTEGER REFERENCES options(id) ON DELETE CASCADE,
    is_correct BOOLEAN DEFAULT false,
    answered_at DATE DEFAULT CURRENT_DATE
);

-- Create quiz_history table (Kullanıcı Quiz Geçmişi)
CREATE TABLE quiz_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    played_at DATE DEFAULT CURRENT_DATE,
    UNIQUE(user_id, session_id) -- Aynı kullanıcı aynı sessionda sadece bir kez olabilir
);

-- Create indexes for better performance
CREATE INDEX idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX idx_options_question_id ON options(question_id);
CREATE INDEX idx_live_sessions_code ON live_sessions(session_code);
CREATE INDEX idx_live_sessions_status ON live_sessions(status);
CREATE INDEX idx_participants_session_id ON participants(session_id);
CREATE INDEX idx_participants_user_id ON participants(user_id);
CREATE INDEX idx_answers_participant_id ON answers(participant_id);
CREATE INDEX idx_answers_question_id ON answers(question_id);
CREATE INDEX idx_quiz_history_user_id ON quiz_history(user_id);
CREATE INDEX idx_quiz_history_quiz_id ON quiz_history(quiz_id);

-- Insert sample data
INSERT INTO users (username, password_hash, role) VALUES
('admin', '$2b$10$sample_hash_admin', 'admin'),
('host1', '$2b$10$sample_hash_host', 'host'),
('user1', '$2b$10$sample_hash_user1', 'user'),
('user2', '$2b$10$sample_hash_user2', 'user');

-- Sample quiz
INSERT INTO quizzes (title, description, created_by, is_public) VALUES
('Genel Kültür Quiz', 'Genel kültür sorularından oluşan test quiz', 1, true),
('Matematik Quiz', 'Temel matematik soruları', 2, true);

-- Sample questions for first quiz
INSERT INTO questions (quiz_id, question_text, duration_seconds) VALUES
(1, 'Türkiye''nin başkenti neresidir?', 30),
(1, 'En büyük gezegen hangisidir?', 30),
(1, 'Hangi yıl Cumhuriyet ilan edildi?', 25);

-- Sample questions for second quiz
INSERT INTO questions (quiz_id, question_text, duration_seconds) VALUES
(2, '2 + 2 kaç eder?', 15),
(2, '5 x 3 kaç eder?', 20);

-- Sample options for first quiz
INSERT INTO options (question_id, option_text, is_correct) VALUES
-- Question 1 options
(1, 'İstanbul', false),
(1, 'Ankara', true),
(1, 'İzmir', false),
(1, 'Bursa', false),
-- Question 2 options
(2, 'Mars', false),
(2, 'Jüpiter', true),
(2, 'Satürn', false),
(2, 'Venüs', false),
-- Question 3 options
(3, '1920', false),
(3, '1923', true),
(3, '1922', false),
(3, '1924', false);

-- Sample options for second quiz
INSERT INTO options (question_id, option_text, is_correct) VALUES
-- Question 4 options
(4, '3', false),
(4, '4', true),
(4, '5', false),
(4, '6', false),
-- Question 5 options
(5, '12', false),
(5, '15', true),
(5, '18', false),
(5, '20', false); 