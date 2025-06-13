// Ses efektleri için servis
class SoundService {
  constructor() {
    this.sounds = {
      background: new Audio('/assets/soundEffects/background-music-224633.mp3'),
      userJoin: new Audio('/assets/soundEffects/user-join.wav'),
      correctAnswer: new Audio('/assets/soundEffects/mixkit-true-answer-notification-951.wav'),
      wrongAnswer: new Audio('/assets/soundEffects/mixkit-wrong-answer-fail-notification-946.wav'),
      gameWin: new Audio('/assets/soundEffects/mixkit-game-champion.wav'),
      gameLose: new Audio('/assets/soundEffects/mixkit-game-loser.wav'),
      timer: new Audio('/assets/soundEffects/mixkit-fini-countdown-927.wav')
    };

    // Arkaplan müziği için ayarlar
    this.sounds.background.loop = true;
    this.sounds.background.volume = 0.3;

    // Diğer sesler için varsayılan ses seviyesi
    Object.values(this.sounds).forEach(sound => {
      if (sound !== this.sounds.background) {
        sound.volume = 0.5;
      }
    });
  }

  // Genel ses çalma fonksiyonu
  playSound(soundType) {
    switch (soundType) {
      case 'background':
        this.playBackgroundMusic();
        break;
      case 'userJoin':
      case 'user-join':
        this.playUserJoin();
        break;
      case 'correct':
      case 'correct-answer':
        this.playCorrectAnswer();
        break;
      case 'wrong':
      case 'wrong-answer':
        this.playWrongAnswer();
        break;
      case 'win':
      case 'game-win':
        this.playGameWin();
        break;
      case 'lose':
      case 'game-lose':
        this.playGameLose();
        break;
      case 'timer':
        this.playTimer();
        break;
      case 'answer':
        // This is sent from backend but doesn't specify correct/wrong
        console.log('Generic answer sound received - no action taken');
        break;
      case 'question':
        // This could be used for question start sound
        console.log('Question sound received - no specific sound defined');
        break;
      default:
        console.log('Bilinmeyen ses efekti:', soundType);
    }
  }

  // Arkaplan müziğini başlat
  playBackgroundMusic() {
    try {
      // Stop current background music if playing
      if (this.sounds.background && !this.sounds.background.paused) {
        this.sounds.background.pause();
        this.sounds.background.currentTime = 0;
      }
      
      this.sounds.background.play().catch(error => {
        console.log('Arkaplan müziği başlatılamadı:', error);
        // Try to create a new audio instance if the first one fails
        this.sounds.background = new Audio('/assets/soundEffects/background-music-224633.mp3');
        this.sounds.background.loop = true;
        this.sounds.background.volume = 0.3;
        this.sounds.background.play().catch(err => {
          console.log('Arkaplan müziği yeniden deneme başarısız:', err);
        });
      });
    } catch (error) {
      console.error('Error in playBackgroundMusic:', error);
    }
  }

  // Arkaplan müziğini durdur
  stopBackgroundMusic() {
    this.sounds.background.pause();
    this.sounds.background.currentTime = 0;
  }

  // Kullanıcı katılma sesi
  playUserJoin() {
    this.sounds.userJoin.currentTime = 0;
    this.sounds.userJoin.play().catch(error => {
      console.log('Kullanıcı katılma sesi çalınamadı:', error);
    });
  }

  // Doğru cevap sesi
  playCorrectAnswer() {
    this.sounds.correctAnswer.currentTime = 0;
    this.sounds.correctAnswer.play().catch(error => {
      console.log('Doğru cevap sesi çalınamadı:', error);
    });
  }

  // Yanlış cevap sesi
  playWrongAnswer() {
    this.sounds.wrongAnswer.currentTime = 0;
    this.sounds.wrongAnswer.play().catch(error => {
      console.log('Yanlış cevap sesi çalınamadı:', error);
    });
  }

  // Oyun kazanma sesi
  playGameWin() {
    this.sounds.gameWin.currentTime = 0;
    this.sounds.gameWin.play().catch(error => {
      console.log('Oyun kazanma sesi çalınamadı:', error);
    });
  }

  // Oyun kaybetme sesi
  playGameLose() {
    this.sounds.gameLose.currentTime = 0;
    this.sounds.gameLose.play().catch(error => {
      console.log('Oyun kaybetme sesi çalınamadı:', error);
    });
  }

  // Timer sesi
  playTimer() {
    this.sounds.timer.currentTime = 0;
    this.sounds.timer.play().catch(error => {
      console.log('Timer sesi çalınamadı:', error);
    });
  }

  // Tüm sesleri durdur
  stopAllSounds() {
    Object.values(this.sounds).forEach(sound => {
      sound.pause();
      sound.currentTime = 0;
    });
  }
}

const soundService = new SoundService();
export default soundService; 