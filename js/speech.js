// 用瀏覽器內建的語音朗讀（國語）。不支援的裝置會安靜略過。
export const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
let current = null, timer = null;

export function toSpeech(s) {
  return s.replace(/\+\s?/g, "加").replace(/−\s?/g, "減").replace(/=/g, "等於").replace(/！/g, "。");
}

export function speak(text, done) {
  if (!canSpeak) { done && done(); return; }
  if (current) stopSpeak();
  const u = new SpeechSynthesisUtterance(toSpeech(text));
  u.lang = "zh-TW"; u.rate = 0.88; u.pitch = 1;
  u.voice = speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase() === "zh-tw") || null;
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
