// Host Quiz Management Dashboard
const apiBase = "http://localhost:5000/api";
let socket = null;
let currentSession = null;
let currentQuiz = null;
let questionBank = [];

// Initialize socket connection
function initializeSocket() {
    socket = io('http://localhost:5000', {
        auth: {
            token: localStorage.getItem('token') || ''
        }
    });

    socket.on('connect', () => {
        console.log('Socket connected');
    });

    socket.on('userJoined', (data) => {
        if (currentSession) {
            updateParticipantsList();
        }
    });

    socket.on('userLeft', (data) => {
        if (currentSession) {
            updateParticipantsList();
        }
    });

    socket.on('error', (error) => {
        showMessage('Hata: ' + error.message, 'error');
    });

    // Listen for real-time quiz events
    socket.on('showQuestion', (data) => {
        // Host receives question with correct answer
        if (data.isHost) {
            // Show question in host UI, highlight correct answer
            if (!currentQuiz) currentQuiz = { questions: [], currentQuestionIndex: 0 };
            // Store the question for navigation
            currentQuiz.questions[currentQuiz.currentQuestionIndex] = data.question;
            showHostQuestion(data.question);
        }
    });
    socket.on('showCorrectAnswer', (data) => {
        // Show the correct answer in the host UI
        showHostCorrectAnswer(data.question, data.correctAnswer);
    });
    socket.on('autoNextQuestion', (data) => {
        // Move to next question automatically
        if (currentQuiz) {
            currentQuiz.currentQuestionIndex = data.nextIndex;
            showCurrentQuestion();
        }
    });
    socket.on('finishGame', (data) => {
        showFinalResults();
    });
}

// Show message
function showMessage(text, type = 'info') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Tab management
function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[onclick="showTab('${tabName}')"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Load user's quizzes
async function loadMyQuizzes() {
    try {
        const response = await fetch(`${apiBase}/quiz/fetchQuizList`, {
            headers: {
                'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
            }
        });

        if (!response.ok) {
            throw new Error('Quiz listesi alınamadı');
        }

        const quizzes = await response.json();
        displayQuizzes(quizzes);
        
        // Also populate session quiz select
        populateSessionQuizSelect(quizzes);
        
    } catch (error) {
        showMessage('Quiz listesi yüklenirken hata: ' + error.message, 'error');
        document.getElementById('quizList').innerHTML = '<div class="error">Quiz listesi yüklenemedi</div>';
    }
}

// Display quizzes in cards
function displayQuizzes(quizzes) {
    const quizListDiv = document.getElementById('quizList');
    
    if (quizzes.length === 0) {
        quizListDiv.innerHTML = '<div class="loading">Henüz quiz oluşturmadınız. "Yeni Quiz Oluştur" butonunu kullanın.</div>';
        return;
    }

    const quizHTML = quizzes.map(quiz => `
        <div class="quiz-card">
            <h3>${quiz.title}</h3>
            <p>${quiz.description || 'Açıklama yok'}</p>
            <div class="quiz-info">
                <small>Oluşturma: ${new Date(quiz.created_at).toLocaleDateString('tr-TR')}</small>
            </div>
            <div class="actions">
                <button class="btn btn-primary" onclick="viewQuizQuestions(${quiz.id})">
                    Soruları Görüntüle
                </button>
                <button class="btn btn-info" onclick="editQuiz(${quiz.id})">
                    Düzenle
                </button>
                <button class="btn btn-danger" onclick="deleteQuiz(${quiz.id})">
                    Sil
                </button>
            </div>
        </div>
    `).join('');

    quizListDiv.innerHTML = quizHTML;
}

// Populate session quiz select
function populateSessionQuizSelect(quizzes) {
    const select = document.getElementById('sessionQuizSelect');
    select.innerHTML = '<option value="">Quiz seçin...</option>';
    
    quizzes.forEach(quiz => {
        const option = document.createElement('option');
        option.value = quiz.id;
        option.textContent = quiz.title;
        select.appendChild(option);
    });
}

// Show create quiz modal
function showCreateQuizModal() {
    const modalHTML = `
        <div id="createQuizModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeModal('createQuizModal')">&times;</span>
                <h2>Yeni Quiz Oluştur</h2>
                
                <form id="createQuizForm">
                    <div class="form-group">
                        <label for="quizTitle">Quiz Başlığı:</label>
                        <input type="text" id="quizTitle" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="quizDescription">Açıklama:</label>
                        <textarea id="quizDescription" rows="3"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>Soru Kaynağı:</label>
                        <select id="questionSource" onchange="handleQuestionSourceChange()">
                            <option value="manual">Manuel Soru Girişi</option>
                            <option value="bank">Soru Havuzundan Seç</option>
                        </select>
                    </div>
                    
                    <div id="questionsContainer">
                        <h3>Sorular</h3>
                        <div id="manualQuestions">
                            <button type="button" class="btn btn-secondary" onclick="addManualQuestion()">
                                Soru Ekle
                            </button>
                            <div id="manualQuestionsList"></div>
                        </div>
                        
                        <div id="bankQuestions" style="display: none;">
                            <button type="button" class="btn btn-secondary" onclick="loadQuestionBank()">
                                Soru Havuzunu Yükle
                            </button>
                            <div id="questionBankList"></div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <button type="submit" class="btn btn-primary">Quiz Oluştur</button>
                        <button type="button" class="btn btn-secondary" onclick="closeModal('createQuizModal')">İptal</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('createQuizModal').style.display = 'block';
    
    // Add first manual question by default
    addManualQuestion();
    
    // Form submit handler
    document.getElementById('createQuizForm').addEventListener('submit', handleCreateQuiz);
}

// Handle question source change
function handleQuestionSourceChange() {
    const source = document.getElementById('questionSource').value;
    const manualDiv = document.getElementById('manualQuestions');
    const bankDiv = document.getElementById('bankQuestions');
    
    if (source === 'manual') {
        manualDiv.style.display = 'block';
        bankDiv.style.display = 'none';
    } else {
        manualDiv.style.display = 'none';
        bankDiv.style.display = 'block';
    }
}

// Add manual question
function addManualQuestion() {
    const container = document.getElementById('manualQuestionsList');
    const questionIndex = container.children.length;
    
    const questionHTML = `
        <div class="question-form" data-index="${questionIndex}">
            <h4>Soru ${questionIndex + 1} <button type="button" class="btn btn-danger" onclick="removeQuestion(${questionIndex})">Sil</button></h4>
            
            <div class="form-group">
                <label>Soru Metni:</label>
                <textarea name="question_text_${questionIndex}" required rows="2"></textarea>
            </div>
            
            <div class="form-group">
                <label>Seçenekler:</label>
                <div class="options-grid">
                    <input type="text" name="option_a_${questionIndex}" placeholder="A) " required>
                    <input type="text" name="option_b_${questionIndex}" placeholder="B) " required>
                    <input type="text" name="option_c_${questionIndex}" placeholder="C) " required>
                    <input type="text" name="option_d_${questionIndex}" placeholder="D) " required>
                </div>
            </div>
            
            <div class="form-group">
                <label>Doğru Cevap:</label>
                <select name="correct_answer_${questionIndex}" required>
                    <option value="">Seçin...</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Süre (saniye):</label>
                <input type="number" name="duration_${questionIndex}" value="30" min="10" max="120">
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', questionHTML);
}

// Remove question
function removeQuestion(index) {
    const questionDiv = document.querySelector(`[data-index="${index}"]`);
    if (questionDiv) {
        questionDiv.remove();
        updateQuestionIndices();
    }
}

// Update question indices after removal
function updateQuestionIndices() {
    const questions = document.querySelectorAll('.question-form');
    questions.forEach((question, index) => {
        question.setAttribute('data-index', index);
        question.querySelector('h4').innerHTML = `Soru ${index + 1} <button type="button" class="btn btn-danger" onclick="removeQuestion(${index})">Sil</button>`;
    });
}

// Load question bank
async function loadQuestionBank() {
    try {
        const response = await fetch(`${apiBase}/questionBank`, {
            headers: {
                'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
            }
        });

        if (!response.ok) {
            throw new Error('Soru havuzu yüklenemedi');
        }

        const questions = await response.json();
        displayQuestionBank(questions);
        
    } catch (error) {
        showMessage('Soru havuzu yüklenirken hata: ' + error.message, 'error');
    }
}

// Display question bank
function displayQuestionBank(questions) {
    const container = document.getElementById('questionBankList');
    
    if (questions.length === 0) {
        container.innerHTML = '<div class="loading">Soru havuzu boş</div>';
        return;
    }

    const questionsHTML = questions.map(question => `
        <div class="question-form">
            <input type="checkbox" name="selected_questions" value="${question.id}">
            <strong>${question.question_text}</strong>
            <div style="margin-left: 20px; margin-top: 10px;">
                <div>A) ${question.option_a}</div>
                <div>B) ${question.option_b}</div>
                <div>C) ${question.option_c}</div>
                <div>D) ${question.option_d}</div>
                <div><em>Doğru cevap: ${question.correct_answer}</em></div>
            </div>
        </div>
    `).join('');

    container.innerHTML = questionsHTML;
}

// Handle create quiz form submission
async function handleCreateQuiz(e) {
    e.preventDefault();
    
    try {
        const title = document.getElementById('quizTitle').value;
        const description = document.getElementById('quizDescription').value;
        const questionSource = document.getElementById('questionSource').value;
        
        const quizData = {
            title,
            description,
            questions: []
        };

        if (questionSource === 'manual') {
            // Collect manual questions
            const questionForms = document.querySelectorAll('.question-form');
            questionForms.forEach((form, index) => {
                const questionText = form.querySelector(`[name="question_text_${index}"]`)?.value;
                const optionA = form.querySelector(`[name="option_a_${index}"]`)?.value;
                const optionB = form.querySelector(`[name="option_b_${index}"]`)?.value;
                const optionC = form.querySelector(`[name="option_c_${index}"]`)?.value;
                const optionD = form.querySelector(`[name="option_d_${index}"]`)?.value;
                const correctAnswer = form.querySelector(`[name="correct_answer_${index}"]`)?.value;
                const duration = form.querySelector(`[name="duration_${index}"]`)?.value || 30;

                if (questionText && optionA && optionB && optionC && optionD && correctAnswer) {
                    quizData.questions.push({
                        question_text: questionText,
                        option_a: optionA,
                        option_b: optionB,
                        option_c: optionC,
                        option_d: optionD,
                        correct_answer: correctAnswer,
                        duration_seconds: parseInt(duration)
                    });
                }
            });
        } else {
            // Collect selected questions from bank
            const selectedQuestions = document.querySelectorAll('input[name="selected_questions"]:checked');
            quizData.selectedQuestionIds = Array.from(selectedQuestions).map(cb => parseInt(cb.value));
        }

        if (quizData.questions.length === 0 && (!quizData.selectedQuestionIds || quizData.selectedQuestionIds.length === 0)) {
            throw new Error('En az bir soru eklemelisiniz');
        }

        // Create quiz
        const response = await fetch(`${apiBase}/quiz/createQuiz`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
            },
            body: JSON.stringify(quizData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Quiz oluşturulamadı');
        }

        const result = await response.json();
        showMessage('Quiz başarıyla oluşturuldu!', 'success');
        closeModal('createQuizModal');
        loadMyQuizzes();
        
    } catch (error) {
        showMessage('Hata: ' + error.message, 'error');
    }
}

// View quiz questions
async function viewQuizQuestions(quizId) {
    try {
        const response = await fetch(`${apiBase}/question/${quizId}`, {
            headers: {
                'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
            }
        });

        if (!response.ok) {
            throw new Error('Sorular yüklenemedi');
        }

        const questions = await response.json();
        showQuestionsModal(questions, quizId);
        
    } catch (error) {
        showMessage('Sorular yüklenirken hata: ' + error.message, 'error');
    }
}

// Show questions modal
function showQuestionsModal(questions, quizId) {
    const questionsHTML = questions.map((question, index) => `
        <div class="question-form">
            <h4>Soru ${index + 1}</h4>
            <p><strong>${question.question_text}</strong></p>
            <div>
                <div>A) ${question.option_a || question.options?.[0]?.option_text || 'N/A'}</div>
                <div>B) ${question.option_b || question.options?.[1]?.option_text || 'N/A'}</div>
                <div>C) ${question.option_c || question.options?.[2]?.option_text || 'N/A'}</div>
                <div>D) ${question.option_d || question.options?.[3]?.option_text || 'N/A'}</div>
                <div style="color: green;"><strong>Doğru cevap: ${question.correct_answer}</strong></div>
                <div><em>Süre: ${question.duration_seconds || 30} saniye</em></div>
            </div>
        </div>
    `).join('');

    const modalHTML = `
        <div id="questionsModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeModal('questionsModal')">&times;</span>
                <h2>Quiz Soruları</h2>
                <div id="questionsList">
                    ${questionsHTML}
                </div>
                <div class="form-group">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('questionsModal')">Kapat</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('questionsModal').style.display = 'block';
}

// Edit quiz
async function editQuiz(quizId) {
    showMessage('Düzenleme özelliği yakında eklenecek', 'info');
}

// Delete quiz
async function deleteQuiz(quizId) {
    if (!confirm('Bu quiz\'i silmek istediğinizden emin misiniz?')) {
        return;
    }

    try {
        const response = await fetch(`${apiBase}/quiz/${quizId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
            }
        });

        if (!response.ok) {
            throw new Error('Quiz silinemedi');
        }

        showMessage('Quiz başarıyla silindi', 'success');
        loadMyQuizzes();
        
    } catch (error) {
        showMessage('Quiz silinirken hata: ' + error.message, 'error');
    }
}

// Start game session
async function startGameSession() {
    const quizId = document.getElementById('sessionQuizSelect').value;
    
    if (!quizId) {
        showMessage('Lütfen bir quiz seçin', 'error');
        return;
    }

    try {
        const response = await fetch(`${apiBase}/session/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
            },
            body: JSON.stringify({
                quiz_Id: quizId,
                status: true,
                started_At: new Date().toISOString(),
                host_Id: 1 // This should be dynamic based on logged user
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Oturum başlatılamadı');
        }

        const result = await response.json();
        currentSession = result;
        
        showActiveSession(result);
        
        // Join the session as host
        socket.emit('joinSession', {
            sessionId: result.sessionId,
            username: 'HOST'
        });
        
        showMessage('Oyun oturumu başarıyla başlatıldı!', 'success');
        
    } catch (error) {
        showMessage('Oturum başlatılırken hata: ' + error.message, 'error');
    }
}

// Show active session
function showActiveSession(session) {
    const activeSessionDiv = document.getElementById('activeSession');
    
    const sessionHTML = `
        <div class="game-control">
            <h2>Aktif Oyun Oturumu</h2>
            <div class="session-info">
                <p><strong>Oturum ID:</strong> ${session.sessionId}</p>
                <p><strong>Durum:</strong> <span id="sessionStatus">Aktif</span></p>
                <p><strong>Katılımcı Sayısı:</strong> <span id="participantCount">0</span></p>
            </div>
            
            <div class="session-actions">
                <button class="btn btn-primary" onclick="startQuizGame()">
                    Oyunu Başlat
                </button>
                <button class="btn btn-info" onclick="showSessionCode()">
                    Katılım Kodunu Göster
                </button>
                <button class="btn btn-danger" onclick="endGameSession()">
                    Oturumu Sonlandır
                </button>
            </div>
            
            <div class="participants-list">
                <h3>Katılımcılar</h3>
                <div id="participantsList">
                    <div class="loading">Katılımcı bekleniyor...</div>
                </div>
            </div>
            
            <div id="gameProgress" style="display: none;">
                <h3>Oyun Kontrolü</h3>
                <div id="currentQuestionDisplay"></div>
                <div class="game-actions">
                    <button class="btn btn-success" onclick="nextQuestion()">
                        Sonraki Soru
                    </button>
                    <button class="btn btn-warning" onclick="showResults()">
                        Sonuçları Göster
                    </button>
                </div>
            </div>
        </div>
    `;
    
    activeSessionDiv.innerHTML = sessionHTML;
    activeSessionDiv.style.display = 'block';
    
    // Start polling for participants
    startParticipantPolling();
}

// Start participant polling
function startParticipantPolling() {
    if (currentSession) {
        setInterval(updateParticipantsList, 3000);
        updateParticipantsList(); // Initial call
    }
}

// Update participants list
async function updateParticipantsList() {
    if (!currentSession) return;
    
    try {
        const response = await fetch(`${apiBase}/session/${currentSession.sessionId}/participants`, {
            headers: {
                'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
            }
        });

        if (response.ok) {
            const participants = await response.json();
            displayParticipants(participants);
        }
    } catch (error) {
        console.error('Katılımcı listesi güncellenemedi:', error);
    }
}

// Display participants
function displayParticipants(participants) {
    const participantsList = document.getElementById('participantsList');
    const participantCount = document.getElementById('participantCount');
    
    if (participantCount) {
        participantCount.textContent = participants.length;
    }
    
    if (participants.length === 0) {
        participantsList.innerHTML = '<div class="loading">Katılımcı bekleniyor...</div>';
        return;
    }
    
    const participantsHTML = participants.map(participant => `
        <div class="participant">
            ${participant.username || participant.user_id || 'Anonim'}
            ${participant.score ? ` - ${participant.score} puan` : ''}
        </div>
    `).join('');
    
    participantsList.innerHTML = participantsHTML;
}

// Show session code
function showSessionCode() {
    if (currentSession) {
        alert(`Katılım Kodu: ${currentSession.sessionId}\n\nKatılımcılar bu kodu kullanarak oyuna katılabilir.`);
    }
}

// Start quiz game
async function startQuizGame() {
    if (!currentSession) return;
    
    try {
        // Get quiz questions first
        const quizResponse = await fetch(`${apiBase}/question/${document.getElementById('sessionQuizSelect').value}`, {
            headers: {
                'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
            }
        });

        if (!quizResponse.ok) {
            throw new Error('Quiz soruları alınamadı');
        }

        const questions = await quizResponse.json();
        
        if (questions.length === 0) {
            throw new Error('Bu quiz\'de soru bulunmuyor');
        }

        currentQuiz = { questions, currentQuestionIndex: 0 };
        
        document.getElementById('gameProgress').style.display = 'block';
        showCurrentQuestion();
        
        showMessage('Oyun başlatıldı!', 'success');
        
    } catch (error) {
        showMessage('Oyun başlatılırken hata: ' + error.message, 'error');
    }
}

// Show current question
function showCurrentQuestion() {
    if (!currentQuiz || !currentQuiz.questions) return;
    
    const question = currentQuiz.questions[currentQuiz.currentQuestionIndex];
    const questionDisplay = document.getElementById('currentQuestionDisplay');
    
    const questionHTML = `
        <div class="question-display">
            <h3>Soru ${currentQuiz.currentQuestionIndex + 1}/${currentQuiz.questions.length}</h3>
            <p><strong>${question.question_text}</strong></p>
            <div class="options">
                <div class="option-btn">${question.option_a || question.options?.[0]?.option_text}</div>
                <div class="option-btn">${question.option_b || question.options?.[1]?.option_text}</div>
                <div class="option-btn">${question.option_c || question.options?.[2]?.option_text}</div>
                <div class="option-btn">${question.option_d || question.options?.[3]?.option_text}</div>
            </div>
            <div class="timer">
                <p>Süre: <span id="questionTimer">${question.duration_seconds || 30}</span> saniye</p>
                <div style="background: #f0f0f0; height: 10px; border-radius: 5px;">
                    <div id="timerBar" class="time-bar" style="width: 100%;"></div>
                </div>
            </div>
        </div>
    `;
    
    questionDisplay.innerHTML = questionHTML;
    
    // Broadcast question to all participants
    socket.emit('showQuestion', {
        sessionId: currentSession.sessionId,
        question: question,
        index: currentQuiz.currentQuestionIndex + 1,
        total: currentQuiz.questions.length
    });
    
    // Start timer
    startQuestionTimer(question.duration_seconds || 30);
}

// Start question timer
function startQuestionTimer(duration) {
    const timerSpan = document.getElementById('questionTimer');
    const timerBar = document.getElementById('timerBar');
    let timeLeft = duration;
    
    const timer = setInterval(() => {
        timeLeft--;
        if (timerSpan) timerSpan.textContent = timeLeft;
        
        const percentage = (timeLeft / duration) * 100;
        if (timerBar) timerBar.style.width = percentage + '%';
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            // Auto move to next question or show results
            setTimeout(() => {
                showQuestionResults();
            }, 2000);
        }
    }, 1000);
}

// Show question results
function showQuestionResults() {
    const question = currentQuiz.questions[currentQuiz.currentQuestionIndex];
    
    // Highlight correct answer
    const options = document.querySelectorAll('.option-btn');
    options.forEach((option, index) => {
        const letter = String.fromCharCode(65 + index); // A, B, C, D
        if (letter === question.correct_answer) {
            option.classList.add('correct');
        }
    });
    
    // Broadcast correct answer
    socket.emit('showCorrectAnswer', {
        sessionId: currentSession.sessionId,
        question: question
    });
}

// Next question
function nextQuestion() {
    if (!currentQuiz) return;
    
    currentQuiz.currentQuestionIndex++;
    
    if (currentQuiz.currentQuestionIndex >= currentQuiz.questions.length) {
        // Game finished
        showFinalResults();
    } else {
        showCurrentQuestion();
    }
}

// Show final results
function showFinalResults() {
    showMessage('Oyun tamamlandı! Sonuçlar hesaplanıyor...', 'success');
    
    // Broadcast game end
    socket.emit('showLeaderboard', {
        sessionId: currentSession.sessionId
    });
    
    document.getElementById('gameProgress').style.display = 'none';
}

// End game session
async function endGameSession() {
    if (!currentSession) return;
    
    if (!confirm('Oyun oturumunu sonlandırmak istediğinizden emin misiniz?')) {
        return;
    }

    try {
        const response = await fetch(`${apiBase}/session/end`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
            },
            body: JSON.stringify({
                sessionId: currentSession.sessionId,
                status: false,
                ended_At: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error('Oturum sonlandırılamadı');
        }

        // Reset UI
        document.getElementById('activeSession').style.display = 'none';
        currentSession = null;
        currentQuiz = null;
        
        showMessage('Oyun oturumu sonlandırıldı', 'success');
        
    } catch (error) {
        showMessage('Oturum sonlandırılırken hata: ' + error.message, 'error');
    }
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.remove();
    }
}

// Show question in host UI (with correct answer highlight)
function showHostQuestion(question) {
    const questionDisplay = document.getElementById('currentQuestionDisplay');
    if (!questionDisplay) return;
    let optionsHTML = '';
    question.options.forEach((opt, idx) => {
        optionsHTML += `<div class="option-btn${opt.is_correct ? ' correct' : ''}">${String.fromCharCode(65+idx)}) ${opt.option_text}</div>`;
    });
    questionDisplay.innerHTML = `
        <div class="question-display">
            <h3>Soru ${question.index || (currentQuiz?.currentQuestionIndex+1)}/${currentQuiz?.questions?.length || '?'} </h3>
            <p><strong>${question.question_text}</strong></p>
            <div class="options">${optionsHTML}</div>
            <div class="timer">
                <p>Süre: <span id="questionTimer">${question.duration_seconds || 30}</span> saniye</p>
                <div style="background: #f0f0f0; height: 10px; border-radius: 5px;">
                    <div id="timerBar" class="time-bar" style="width: 100%;"></div>
                </div>
            </div>
        </div>
    `;
    startQuestionTimer(question.duration_seconds || 30);
}

// Show correct answer highlight in host UI
function showHostCorrectAnswer(question, correctAnswer) {
    const options = document.querySelectorAll('.option-btn');
    options.forEach((option, idx) => {
        if (question.options[idx].is_correct) {
            option.classList.add('correct');
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeSocket();
    loadMyQuizzes();
});

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
        event.target.remove();
    }
}