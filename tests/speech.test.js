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
  const { speak, stopSpeak } = await import("../js/speech.js");
  let advanced = false;
  speak("+1 = 5！", () => { advanced = true; });
  assert.equal(utterance.text, "加1 等於 5。");
  assert.equal(utterance.voice, voice);
  stopSpeak();
  utterance.onend();
  assert.equal(advanced, false);
  delete globalThis.window;
  delete globalThis.speechSynthesis;
  delete globalThis.SpeechSynthesisUtterance;
});
