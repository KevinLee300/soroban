// 用瀏覽器內建的語音朗讀（國語）。不支援的裝置會安靜略過。
export const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
let current = null, timer = null;

export function toSpeech(s) {
  return s.replace(/\+\s?/g, "加").replace(/−\s?/g, "減").replace(/=/g, "等於").replace(/！/g, "。");
}

/* ---------- 挑聲音 ----------
   聲音是手機／電腦內建的，每台裝置有的聲音不一樣。這裡把台灣國語的聲音找出來，
   依「自然程度」排順序，優先用自然的女聲；家長也可以在「紀錄」頁自己選。 */
const isTaiwan = (v) => /^(zh|cmn)([-_]hant)?[-_]tw$/i.test(v.lang || "");
// 分數越高越自然。名字是各家系統內建聲音的名稱。
export function voiceScore(v) {
  const n = v.name || "";
  let s = 100;
  if (/hsiaochen|曉臻/i.test(n)) s += 100;       // Edge 的自然女聲
  else if (/hsiaoyu|曉雨/i.test(n)) s += 90;     // Edge 的自然女聲
  if (/natural|neural/i.test(n)) s += 60;
  if (/premium|enhanced|高品質|優化|siri/i.test(n)) s += 40; // iPhone、Mac 下載的高品質聲音
  if (/google/i.test(n)) s += 35;                // Chrome、Android 的 Google 國語（臺灣）
  if (/mei-?jia|美佳/i.test(n)) s += 20;         // iPhone、Mac 的女聲
  if (/yating|雅婷|hanhan|涵涵/i.test(n)) s += 10; // Windows 舊的女聲
  if (isMaleVoice(v)) s -= 60;                   // 男聲排後面（小朋友的教材預設用女聲）
  return s;
}
export const isMaleVoice = (v) => /yunjhe|雲哲|zhiwei|志威/i.test(v.name || "");
// 聲音有多自然（跟男聲女聲無關）
export function voiceTier(v) {
  const q = voiceScore(v) + (isMaleVoice(v) ? 60 : 0);
  return q >= 160 ? "自然" : q >= 130 ? "不錯" : "基本";
}
// 這台裝置上的台灣國語聲音，最自然的排最前面
export function taiwanVoices(voices) {
  return voices.filter(isTaiwan).sort((a, b) => voiceScore(b) - voiceScore(a));
}

const VOICE_KEY = "soroban.voice.v1";
export const VOICE_DEFAULTS = { uri: "", rate: 0.88, pitch: 1 };
export function loadVoiceSettings() {
  try { return { ...VOICE_DEFAULTS, ...(JSON.parse(localStorage.getItem(VOICE_KEY)) || {}) }; } catch { return { ...VOICE_DEFAULTS }; }
}
export function saveVoiceSettings(settings) {
  try { localStorage.setItem(VOICE_KEY, JSON.stringify(settings)); } catch { /* 存不了就用預設 */ }
}
// 現在要用哪個聲音：家長選的（如果還在），否則用最自然的
export function pickVoice(voices, settings = loadVoiceSettings()) {
  const list = taiwanVoices(voices);
  return list.find((v) => settings.uri && v.voiceURI === settings.uri) || list[0] || null;
}

export function speak(text, done) {
  if (!canSpeak) { done && done(); return; }
  if (current) stopSpeak();
  const u = new SpeechSynthesisUtterance(toSpeech(text)), settings = loadVoiceSettings();
  u.lang = "zh-TW"; u.rate = settings.rate; u.pitch = settings.pitch;
  u.voice = pickVoice(speechSynthesis.getVoices(), settings);
  current = u;
  const fin = () => {
    if (current !== u) return;
    current = null;
    clearTimeout(timer);
    done && done();
  };
  u.onend = fin; u.onerror = fin;
  timer = setTimeout(fin, Math.max(9000, u.text.length * 600));
  speechSynthesis.speak(u);
}

export function stopSpeak() {
  if (!canSpeak) return;
  current = null;
  clearTimeout(timer);
  speechSynthesis.cancel();
}
