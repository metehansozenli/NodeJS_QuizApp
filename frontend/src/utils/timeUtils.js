// Katılımcı katılım zamanını düzenleyen yardımcı fonksiyon
export const normalizeJoinedAt = (joinedAt, fallbackTime = null) => {
  if (!joinedAt) {
    return fallbackTime || new Date().toISOString();
  }

  const date = new Date(joinedAt);
  const now = new Date();

  // Geçersiz tarih kontrolü
  if (isNaN(date.getTime())) {
    console.warn('Geçersiz joined_at tarihi:', joinedAt);
    return fallbackTime || now.toISOString();
  }

  // Gelecek tarih kontrolü - eğer gelecekte ise şimdiki zamanı kullan
  if (date.getTime() > now.getTime()) {
    console.warn('Gelecek joined_at tarihi düzeltiliyor:', joinedAt);
    return fallbackTime || now.toISOString();
  }

  // Eğer tarih çok eski ise (1970'e yakın), muhtemelen timestamp hatası
  if (date.getFullYear() < 2020) {
    console.warn('Çok eski joined_at tarihi:', joinedAt);
    return fallbackTime || now.toISOString();
  }

  return joinedAt;
};

// Katılım zamanını kullanıcı dostu formatta göstermek için yardımcı fonksiyon
export const formatJoinTime = (joinedAt) => {
  if (!joinedAt) {
    return 'Az önce katıldı';
  }

  const normalizedJoinedAt = normalizeJoinedAt(joinedAt);
  const joinDate = new Date(normalizedJoinedAt);
  const now = new Date();

  // Eğer saat 00:00:00 ise ve bugün ise, "bugün" olarak göster
  if (joinDate.getHours() === 0 && joinDate.getMinutes() === 0 && joinDate.getSeconds() === 0) {
    const isToday = joinDate.toDateString() === now.toDateString();
    if (isToday) {
      return 'Bugün katıldı';
    } else {
      return joinDate.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit'
      });
    }
  }

  // Fark hesapla (milisaniye cinsinden)
  const diffMs = now.getTime() - joinDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) {
    return 'Az önce';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} dk önce`;
  } else if (diffMinutes < 1440) { // 24 saat = 1440 dakika
    const hours = Math.floor(diffMinutes / 60);
    return `${hours} saat önce`;
  } else {
    // Farklı gün ise tarih göster
    const isToday = joinDate.toDateString() === now.toDateString();
    if (isToday) {
      return joinDate.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return joinDate.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit'
      });
    }
  }
};
