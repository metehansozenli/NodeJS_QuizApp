// user.js - Simple logic for user.html
const apiBase = "http://localhost:5000"; // Adjust port if needed
let joinedSessionId = null;
let joinedUserId = null;

// Socket.io ile anlık bildirim
const socket = io(apiBase);

async function joinSession() {
  const sessionId = document.getElementById('sessionId').value;
  const userId = document.getElementById('userId').value;
  document.getElementById('userError').textContent = '';
  try {
    // Katılımcı ekle (REST API)
    const res = await fetch(`${apiBase}/api/session/addParticipant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userId })
    });
    let data;
    try {
      data = await res.json();
    } catch {
      data = await res.text();
    }
    if (!res.ok) throw new Error(data.error || data || 'Failed to join session');
    joinedSessionId = sessionId;
    joinedUserId = userId;
    localStorage.setItem('sessionId', sessionId);
    localStorage.setItem('userId', userId);
    document.getElementById('joinedSessionId').textContent = joinedSessionId;
    document.getElementById('join-form').style.display = 'none';
    document.getElementById('user-info').style.display = 'block';
    document.getElementById('userStatus').textContent = 'Joined session!';
    // Socket ile hosta anlık haber ver
    socket.emit('joinSession', { sessionId, username: userId }, (response) => {
      console.log('joinSession callback', response); // DEBUG
      if (!response.success) {
        document.getElementById('userError').textContent = response.error || 'Oturuma katılımda hata!';
      }
    });
    fetchUserParticipants();
  } catch (err) {
    document.getElementById('userError').textContent = err.message;
  }
}

async function leaveSession() {
  if (!joinedSessionId || !joinedUserId) return;
  try {
    const res = await fetch(`${apiBase}/api/session/${joinedSessionId}/remove-participant/${joinedUserId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to leave session');
    document.getElementById('userStatus').textContent = 'Left session.';
  } catch (err) {
    document.getElementById('userError').textContent = err.message;
  }
}

async function fetchUserParticipants() {
  if (!joinedSessionId) return;
  try {
    const res = await fetch(`${apiBase}/api/session/${joinedSessionId}/participants`);
    const data = await res.json();
    const list = document.getElementById('userParticipantsList');
    list.innerHTML = '';
    data.forEach(p => {
      const li = document.createElement('li');
      li.textContent = p.username || `User #${p.user_id}`;
      list.appendChild(li);
    });
    setTimeout(fetchUserParticipants, 3000); // Poll every 3s
  } catch {}
}

// Socket ile gelen soruyu ekranda göster ve cevap gönder
socket.on('showQuestion', (data) => {
  showQuestionOnScreen(data.question, data.index, data.total);
});
socket.on('showCorrectAnswer', (data) => {
  showCorrectAnswerOnScreen(data.question);
});

// Oyun bitince sıralamayı ekrana tablo olarak bas
socket.on('showLeaderboard', (data) => {
  showLeaderboardOnScreen(data);
});

function showQuestionOnScreen(question, index, total) {
  // Sadece şıkları ve kalan süreyi göster, soruyu host dışında gösterme
  const qDiv = document.getElementById('questionArea');
  qDiv.innerHTML = `<div id='timerArea'></div>`;
  // Şıklar için butonlar
  question.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt.option_text;
    btn.className = 'option-btn';
    btn.onclick = () => selectOption(btn, question.id, opt.id);
    qDiv.appendChild(btn);
  });
  qDiv.style.display = 'block';
  // Süreyi başlat
  startTimer(question.duration_seconds || 30);
  // Seçim kontrolü için flag
  window.selectedOption = false;
}

function selectOption(btn, questionId, optionId) {
  if (window.selectedOption) return; // Sadece bir kez seçilebilsin
  window.selectedOption = true;
  btn.classList.add('selected');
  submitAnswer(questionId, optionId).then(() => {
    // Cevap gönderildi, şıklar disable edilecek
    document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
  });
}

async function submitAnswer(questionId, optionId) {
  // Cevabı backend'e gönder
  try {
    await fetch(`${apiBase}/api/answer/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: joinedSessionId, userId: joinedUserId, questionId, optionId })
    });
  } catch (err) {
    console.error('Cevap gönderilemedi:', err);
  }
}

function startTimer(seconds) {
  const timerDiv = document.getElementById('timerArea');
  let time = seconds;
  timerDiv.textContent = `Kalan süre: ${time} sn`;
  if (window.timerInterval) clearInterval(window.timerInterval);
  window.timerInterval = setInterval(() => {
    time--;
    timerDiv.textContent = `Kalan süre: ${time} sn`;
    if (time <= 0) clearInterval(window.timerInterval);
  }, 1000);
}

function showCorrectAnswerOnScreen(question) {
  if (window.timerInterval) clearInterval(window.timerInterval);
  const qDiv = document.getElementById('questionArea');
  const correct = question.options.find(o => o.is_correct);
  // Tüm butonları kontrol et
  document.querySelectorAll('.option-btn').forEach(btn => {
    const text = btn.textContent;
    if (correct && text === correct.option_text) {
      btn.classList.add('correct');
    }
    if (btn.classList.contains('selected') && text !== (correct && correct.option_text)) {
      btn.classList.add('wrong');
    }
    btn.disabled = true;
  });
  qDiv.innerHTML += `<div class='status'>Doğru cevap: <b>${correct ? correct.option_text : 'Bilinmiyor'}</b></div>`;
}

function showLeaderboardOnScreen(leaderboard) {
  const qDiv = document.getElementById('questionArea');
  let html = `<h2>Liderlik Tablosu</h2><table class='leaderboard'><tr><th>Sıra</th><th>Kullanıcı</th><th>Puan</th></tr>`;
  leaderboard.forEach((u, i) => {
    html += `<tr><td>${i+1}</td><td>${u.username}</td><td>${u.score}</td></tr>`;
  });
  html += '</table>';
  qDiv.innerHTML = html;
}

// Sayfa yüklenince session state ile ekranı güncelle
window.addEventListener('DOMContentLoaded', async () => {
  const sessionId = localStorage.getItem('sessionId');
  const userId = localStorage.getItem('userId');
  if (sessionId && userId) {
    // Önce session aktif mi kontrol et
    try {
      const statusRes = await fetch(`${apiBase}/api/session/status/${sessionId}`);
      const status = await statusRes.json();
      if (!status.success) throw new Error('Session expired or not found');
      // Session aktifse state çek
      const res = await fetch(`${apiBase}/api/session/${sessionId}/state`);
      const state = await res.json();
      if (state.activeQuestion) {
        showQuestionOnScreen(state.activeQuestion, 1, 1);
        startTimer(state.remainingTime || 30);
      }
      socket.emit('joinSession', { sessionId, username: userId }, () => {});
    } catch {
      // Session geçersizse localStorage temizle ve giriş ekranına dön
      localStorage.removeItem('sessionId');
      localStorage.removeItem('userId');
      document.getElementById('join-form').style.display = 'block';
      document.getElementById('user-info').style.display = 'none';
      document.getElementById('questionArea').innerHTML = '';
    }
  }
});
