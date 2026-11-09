// 進度存在這台裝置的瀏覽器裡（localStorage）。換手機或清除瀏覽資料就會不見。
const KEY = "soroban.progress.v1";

export function loadProgress() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

// 只保留最好的星星數，回傳目前最好成績
export function saveStars(levelId, stars) {
  const p = loadProgress();
  if (stars > (p[levelId] || 0)) p[levelId] = stars;
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* 無痕模式等情況存不了，略過 */ }
  return p[levelId] || 0;
}
