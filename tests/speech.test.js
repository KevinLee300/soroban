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

test("挑聲音：只用台灣國語，自然的女聲排最前面，家長選的優先", async () => {
  const { taiwanVoices, pickVoice, voiceTier, voiceScore } = await import("../js/speech.js");
  const v = (name, lang, voiceURI = name) => ({ name, lang, voiceURI });
  const voices = [
    v("Microsoft Hanhan - Chinese (Traditional, Taiwan)", "zh-TW"),
    v("Microsoft YunJhe Online (Natural) - Chinese (Taiwan)", "zh-TW"),
    v("Google 國語（臺灣）", "zh-TW"),
    v("Microsoft HsiaoChen Online (Natural) - Chinese (Taiwanese Mandarin, Traditional)", "zh-TW"),
    v("Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)", "zh-CN"),
    v("Sin-ji", "zh-HK"),
    v("Samantha", "en-US"),
    v("美佳", "zh_TW"),
  ];
  const list = taiwanVoices(voices);
  assert.equal(list.length, 5, "中國、香港、英文的聲音不能用");
  assert.match(list[0].name, /HsiaoChen/);
  assert.match(list[1].name, /Google/);
  assert.equal(voiceTier(list[0]), "自然");
  assert.equal(voiceTier(voices[0]), "基本");
  assert.ok(voiceScore(v("美佳（高品質）", "zh-TW")) > voiceScore(v("美佳", "zh-TW")));
  assert.equal(voiceTier(v("美佳（高品質）", "zh-TW")), "自然");
  assert.match(pickVoice(voices, { uri: "" }).name, /HsiaoChen/);
  assert.equal(pickVoice(voices, { uri: "美佳" }).name, "美佳");
  assert.match(pickVoice(voices, { uri: "已經不存在的聲音" }).name, /HsiaoChen/);
  assert.equal(pickVoice([v("Samantha", "en-US")], { uri: "" }), null);
});

test("挑聲音：男聲也可以是自然的聲音，只是排在女聲後面", async () => {
  const { voiceTier, isMaleVoice, taiwanVoices } = await import("../js/speech.js");
  const male = { name: "Microsoft YunJhe Online (Natural) - Chinese (Taiwan)", lang: "zh-TW", voiceURI: "m" };
  const basicFemale = { name: "Microsoft Hanhan - Chinese (Traditional, Taiwan)", lang: "zh-TW", voiceURI: "f" };
  const naturalFemale = { name: "Microsoft HsiaoYu Online (Natural)", lang: "zh-TW", voiceURI: "n" };
  assert.equal(isMaleVoice(male), true);
  assert.equal(voiceTier(male), "自然");
  assert.equal(taiwanVoices([male, basicFemale, naturalFemale])[0], naturalFemale);
});
