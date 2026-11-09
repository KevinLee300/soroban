// 用瀏覽器內建的語音朗讀（國語）。不支援的裝置會安靜略過。
export const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

export function toSpeech(s) {
  return s.replace(/\+\s?/g, "加").replace(/−\s?/g, "減").replace(/=/g, "等於").replace(/！/g, "。");
}

export function speak(text, done) {
  if (!canSpeak) { done && done(); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(toSpeech(text));
  u.lang = "zh-TW"; u.rate = 0.9; u.pitch = 1.1;
  let fired = false;
  const fin = () => { if (!fired) { fired = true; done && done(); } };
  u.onend = fin; u.onerror = fin;
  setTimeout(fin, 9000);
  speechSynthesis.speak(u);
}

export function stopSpeak() { if (canSpeak) speechSynthesis.cancel(); }
