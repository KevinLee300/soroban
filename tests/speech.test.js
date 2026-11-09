import test from "node:test";
import assert from "node:assert/strict";

test("narration prefers a Taiwan voice and stopped speech cannot advance playback", async () => {
  const voice = { lang: "zh-TW" };
  let utterance;
  globalThis.window = { speechSynthesis: true };
  globalThis.speechSynthesis = {
    getVoices: () => [{ lang: "en-US" }, voice],
    speak: (value) => { utterance = value; },
    cancel: () => {},
  };
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  let timeout;
  globalThis.setTimeout = (_, delay) => { timeout = delay; return 1; };
  globalThis.clearTimeout = () => {};
  const { speak, stopSpeak } = await import("../js/speech.js");
  let advanced = false;
  speak("+1 = 5！", () => { advanced = true; });
  assert.equal(utterance.text, "加1 等於 5。");
  assert.equal(utterance.voice, voice);
  assert.equal(utterance.rate, 0.88);
  assert.equal(timeout, 9000);
  stopSpeak();
  utterance.onend();
  assert.equal(advanced, false);
  speak("這是一句比較長的口訣，請先看算盤，再想一想怎麼把珠子撥好。", () => {});
  assert.ok(timeout > 9000);
  stopSpeak();
  globalThis.setTimeout = originalSetTimeout;
  globalThis.clearTimeout = originalClearTimeout;
  delete globalThis.window;
  delete globalThis.speechSynthesis;
  delete globalThis.SpeechSynthesisUtterance;
});
