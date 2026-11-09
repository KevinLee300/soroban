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
