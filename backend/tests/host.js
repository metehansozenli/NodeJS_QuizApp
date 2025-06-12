// host.js - Simple logic for host.html
const apiBase = "http://localhost:5000"; // Adjust port if needed
let currentSessionId = null;

// Socket.io bağlantısı en başta tanımlanmalı
const socket = io(apiBase);

async function register() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  document.getElementById('hostError').textContent = '';
  try {
    const res = await fetch(`${apiBase}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Register failed');
    document.getElementById('hostError').textContent = 'Kayıt başarılı, şimdi giriş yapabilirsiniz.';
  } catch (err) {
    document.getElementById('hostError').textContent = err.message;
  }
}

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  document.getElementById('hostError').textContent = '';
  try {
    const res = await fetch(`${apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('token', data.token);
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('host-form').style.display = 'block';
  } catch (err) {
    document.getElementById('hostError').textContent = err.message;
  }
}

// Quizleri çek ve select'e doldur
async function fetchQuizzes() {
  try {
    const res = await fetch(`${apiBase}/api/quiz/fetchQuizList`);
    const data = await res.json();
    const select = document.getElementById('quizSelect');
    data.forEach(q => {
      const option = document.createElement('option');
      option.value = q.id;
      option.textContent = q.title;
      select.appendChild(option);
    });
  } catch {}
}

document.addEventListener('DOMContentLoaded', fetchQuizzes);

async function startSession() {
  const quizId = document.getElementById('quizSelect').value;
  const hostId = document.getElementById('hostId').value;
  document.getElementById('hostError').textContent = '';
  if (!quizId) {
    document.getElementById('hostError').textContent = 'Lütfen bir quiz seçin.';
    return;
  }
  try {
    const res = await fetch(`${apiBase}/api/session/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      },
      body: JSON.stringify({
        status: true,
        started_At: new Date().toISOString(),
        quiz_Id: quizId,
        host_Id: hostId
      })
    });
    let data;
    try {
      data = await res.json();
    } catch {
      data = await res.text();
    }
    if (!res.ok) throw new Error(data.error || data || 'Failed to start session');
    currentSessionId = data.sessionId;
    localStorage.setItem('sessionId', currentSessionId);
    localStorage.setItem('hostId', hostId);
    document.getElementById('sessionId').textContent = currentSessionId;
    document.getElementById('host-form').style.display = 'none';
    document.getElementById('session-info').style.display = 'block';
    document.getElementById('sessionStatus').textContent = 'Session is ACTIVE';
    fetchParticipants();
    // Session başlatıldıktan sonra host da odaya katılsın
    socket.emit('joinSession', { sessionId: currentSessionId, username: hostId }, (response) => {
      console.log('Host joinSession callback', response);
    });
    // startQuizFlow(quizId, currentSessionId); // ARTIK OTOMATİK BAŞLATILMIYOR
  } catch (err) {
    document.getElementById('hostError').textContent = err.message;
  }
}

async function endSession() {
  if (!currentSessionId) return;
  try {
    const res = await fetch(`${apiBase}/api/session/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      },
      body: JSON.stringify({
        status: false,
        ended_At: new Date().toISOString(),
        sessionId: currentSessionId
      })
    });
    let data;
    try {
      data = await res.json();
    } catch {
      data = await res.text();
    }
    if (!res.ok) throw new Error(data.error || data || 'Failed to end session');
    document.getElementById('sessionStatus').textContent = 'Session ENDED';
  } catch (err) {
    document.getElementById('hostError').textContent = err.message;
  }
}

async function fetchParticipants() {
  if (!currentSessionId) return;
  try {
    const res = await fetch(`${apiBase}/api/session/${currentSessionId}/participants`, {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    });
    const data = await res.json();
    const list = document.getElementById('participantsList');
    list.innerHTML = '';
    data.forEach(p => {
      const li = document.createElement('li');
      li.textContent = p.username || `User #${p.user_id}`;
      list.appendChild(li);
    });
    setTimeout(fetchParticipants, 3000); // Poll every 3s
  } catch {}
}

// Socket.io ile host ekranında anlık katılımcı güncelleme
socket.on('userJoined', (data) => {
  // Sadece aktif session için güncelle
  if (currentSessionId && data.sessionId === currentSessionId) {
    fetchParticipants();
  }
});

// Quiz akışı: soruları sırayla göster
async function startQuizFlow(quizId, sessionId) {
  try {
    const res = await fetch(`${apiBase}/api/question/${quizId}`);
    const questions = await res.json();
    let current = 0;
    async function askNext() {
      if (current >= questions.length) {
        showLeaderboard(sessionId);
        return;
      }
      const question = questions[current];
      showQuestionToUsers(sessionId, question, current + 1, questions.length);
      await waitForQuestionDuration(5 || 5);
      showCorrectAnswerToUsers(sessionId, question);
      current++;
      setTimeout(askNext, 2000); // 2sn sonra yeni soruya geç
    }
    askNext();
  } catch (err) {
    document.getElementById('hostError').textContent = 'Quiz akışı başlatılamadı: ' + err.message;
  }
}

function waitForQuestionDuration(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// Bu fonksiyonlar socket ile userlara soru ve cevap bilgisini gönderecek
function showQuestionToUsers(sessionId, question, index, total) {
  console.log('Host emit showQuestion', sessionId, question, index, total); // DEBUG
  socket.emit('showQuestion', { sessionId, question, index, total });
}
function showCorrectAnswerToUsers(sessionId, question) {
  socket.emit('showCorrectAnswer', { sessionId, question });
}
async function showLeaderboard(sessionId) {
  // Liderlik tablosunu backend'den çek ve ekrana tablo olarak bas
  const res = await fetch(`${apiBase}/api/session/${sessionId}/leaderboard`);
  const data = await res.json();
  // Tüm kullanıcılara da göster
  socket.emit('showLeaderboard', data);
  showLeaderboardOnScreen(data);
}

function showLeaderboardOnScreen(leaderboard) {
  // Sıralama tablosunu questionArea varsa oraya, yoksa yeni bir div'e bas
  let qDiv = document.getElementById('questionArea');
  if (!qDiv) {
    qDiv = document.createElement('div');
    qDiv.id = 'questionArea';
    document.body.appendChild(qDiv);
  }
  let html = `<h2>Liderlik Tablosu</h2><table class='leaderboard'><tr><th>Sıra</th><th>Kullanıcı</th><th>Puan</th></tr>`;
  leaderboard.forEach((u, i) => {
    html += `<tr><td>${i+1}</td><td>${u.username}</td><td>${u.score}</td></tr>`;
  });
  html += '</table>';
  qDiv.innerHTML = html;
}

// Quiz akışını başlatan fonksiyon (UI'dan tetiklenir)
function startQuizFlowUI() {
  if (!currentSessionId) {
    document.getElementById('hostError').textContent = 'Önce bir session başlatmalısınız!';
    return;
  }
  const quizId = document.getElementById('quizSelect').value;
  document.getElementById('startQuizBtn').disabled = true;
  startQuizFlow(quizId, currentSessionId);
}

// Kullanıcılar için showLeaderboard eventini dinle
socket.on('showLeaderboard', (data) => {
  showLeaderboardOnScreen(data);
});

function showQuestionOnScreen(question, index, total) {
  // Host ekranında soru ve şıkları göster
  const qDiv = document.getElementById('questionArea');
  qDiv.innerHTML = `<h2>${index}/${total}: ${question.question_text}</h2><div id='timerArea'></div>`;
  question.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt.option_text;
    btn.className = 'option-btn';
    btn.disabled = true; // Host şıkları sadece görüntüler, tıklanamaz
    qDiv.appendChild(btn);
  });
  qDiv.style.display = 'block';
  // Süreyi başlat
  startTimer(question.duration_seconds || 30);
}

// showQuestion eventini dinle
socket.on('showQuestion', (data) => {
  showQuestionOnScreen(data.question, data.index, data.total);
});

// Sayfa yüklenince session state ile ekranı güncelle
window.addEventListener('DOMContentLoaded', async () => {
  const sessionId = localStorage.getItem('sessionId');
  const hostId = localStorage.getItem('hostId');
  if (sessionId && hostId) {
    try {
      const res = await fetch(`${apiBase}/api/session/${sessionId}/state`);
      const state = await res.json();
      if (state.activeQuestion) {
        showQuestionOnScreen(state.activeQuestion, 1, 1);
        startTimer(state.remainingTime || 30);
      }
      socket.emit('joinSession', { sessionId, username: hostId }, () => {});
    } catch {}
  }
});
