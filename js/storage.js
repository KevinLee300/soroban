const KEY = "soroban.progress.v1";
const PROFILES = "soroban.profiles.v1";
const ACTIVE = "soroban.activeProfile.v1";

export function loadProfiles() {
  try {
    const names = JSON.parse(localStorage.getItem(PROFILES));
    return Array.isArray(names) && names.length ? names : ["我"];
  } catch { return ["我"]; }
}

export function activeProfile() {
  const names = loadProfiles();
  try {
    const name = localStorage.getItem(ACTIVE);
    return names.includes(name) ? name : names[0];
  } catch { return names[0]; }
}

export function selectProfile(name) {
  if (!loadProfiles().includes(name)) return;
  try { localStorage.setItem(ACTIVE, name); } catch { /* Storage may be unavailable. */ }
}

export function addProfile(name) {
  name = name.trim();
  if (!name || name.length > 20) return false;
  const names = loadProfiles();
  if (names.includes(name)) return false;
  names.push(name);
  try {
    localStorage.setItem(PROFILES, JSON.stringify(names));
    localStorage.setItem(ACTIVE, name);
    return true;
  } catch { return false; }
}

// Keep existing progress for the original default profile.
const progressKey = () => activeProfile() === "我" ? KEY : `${KEY}.${encodeURIComponent(activeProfile())}`;

export function loadProgress() {
  try { return JSON.parse(localStorage.getItem(progressKey())) || {}; } catch { return {}; }
}

export function saveStars(levelId, stars) {
  const p = loadProgress();
  if (stars > (p[levelId] || 0)) p[levelId] = stars;
  try { localStorage.setItem(progressKey(), JSON.stringify(p)); } catch { /* Storage may be unavailable. */ }
  return p[levelId] || 0;
}

/* ---------- 學習紀錄與每日任務（每位家人分開存） ---------- */
const LOG = "soroban.log.v1";
const DAILY = "soroban.daily.v1";
const scoped = (base) => (activeProfile() === "我" ? base : `${base}.${encodeURIComponent(activeProfile())}`);

// 今天的日期（用這台裝置的時區），格式 2026-11-17
export function today(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function loadLog() {
  try { const a = JSON.parse(localStorage.getItem(scoped(LOG))); return Array.isArray(a) ? a : []; } catch { return []; }
}

// 完成一次練習就記一筆：{ d 日期, t 時間, id 項目代號, label 項目名稱, c 答對, n 題數, sec 花幾秒, w 答錯的題目 }
export function logSession({ id, label, correct, total, sec = 0, wrong = [] }) {
  const log = loadLog();
  log.push({ d: today(), t: Date.now(), id: String(id), label, c: correct, n: total, sec: Math.max(0, Math.round(sec)), w: wrong.slice(0, 10) });
  while (log.length > 500) log.shift();
  try { localStorage.setItem(scoped(LOG), JSON.stringify(log)); } catch { /* Storage may be unavailable. */ }
}

export function clearLog() {
  try { localStorage.removeItem(scoped(LOG)); localStorage.removeItem(scoped(DAILY)); } catch { /* Storage may be unavailable. */ }
}

// 每日任務：{ "2026-11-17": [任務, 任務, 任務] }，只留最近 60 天
export function loadDaily() {
  try { return JSON.parse(localStorage.getItem(scoped(DAILY))) || {}; } catch { return {}; }
}
export function saveDaily(daily) {
  const keep = Object.fromEntries(Object.entries(daily).sort().slice(-60));
  try { localStorage.setItem(scoped(DAILY), JSON.stringify(keep)); } catch { /* Storage may be unavailable. */ }
}

/* ---------- 九九乘法的熟練度（每位家人分開存） ---------- */
// { stats: { "7x8": { c, w, streak, ms, d } }, best60: 60 秒挑戰的最高紀錄 }
const TIMES = "soroban.times.v1";
export function loadTimes() {
  try {
    const t = JSON.parse(localStorage.getItem(scoped(TIMES))) || {};
    return { stats: t.stats || {}, best60: t.best60 || 0 };
  } catch { return { stats: {}, best60: 0 }; }
}
export function saveTimes(times) {
  try { localStorage.setItem(scoped(TIMES), JSON.stringify(times)); } catch { /* Storage may be unavailable. */ }
}
