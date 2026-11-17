// 「紀錄」頁的朗讀聲音設定：選聲音、速度、音調、試聽。設定存在這台裝置。
import { canSpeak, isMaleVoice, loadVoiceSettings, pickVoice, saveVoiceSettings, speak, taiwanVoices, voiceTier } from "./speech.js";

const $ = (id) => document.getElementById(id);
const SAMPLE = "小朋友好！3 加 4 是多少？我們一起來數甜甜圈。";
// 把系統的英文名字換成好認的中文名字
const ZH = [[/hsiaochen/i, "曉臻"], [/hsiaoyu/i, "曉雨"], [/yunjhe/i, "雲哲"], [/hanhan/i, "涵涵"], [/yating/i, "雅婷"], [/zhiwei/i, "志威"], [/mei-?jia/i, "美佳"]];
function shortName(v) {
  const hit = ZH.find(([re]) => re.test(v.name));
  if (hit) return hit[1] + (/premium|enhanced/i.test(v.name) ? "（高品質）" : "");
  return v.name.replace(/^Microsoft\s+/i, "").replace(/\s+-\s+.*$/, "").replace(/\s*Online\s*/i, " ").trim();
}
const tag = (v, first) => [voiceTier(v), isMaleVoice(v) ? "男聲" : "", first ? "推薦" : ""].filter(Boolean).join("，");

function render() {
  if (!canSpeak) { $("voiceCard").hidden = true; return; }
  const settings = loadVoiceSettings(), list = taiwanVoices(speechSynthesis.getVoices()), using = pickVoice(list, settings);
  $("vVoice").innerHTML = `<option value="">自動挑最自然的</option>` +
    list.map((v, i) => `<option value="${v.voiceURI.replace(/"/g, "&quot;")}">${shortName(v)}（${tag(v, i === 0)}）</option>`).join("");
  $("vVoice").value = list.some((v) => v.voiceURI === settings.uri) ? settings.uri : "";
  $("vRate").value = String(settings.rate);
  $("vPitch").value = String(settings.pitch);
  $("vNow").textContent = !list.length
    ? "這台裝置沒有找到台灣國語的聲音，會用系統預設的聲音念。請照下面的方法安裝。"
    : `現在用的是「${shortName(using)}」，品質：${voiceTier(using)}。` +
      (voiceTier(list[0]) === "基本" ? "這台裝置目前只有基本的聲音，聽起來會比較像機器人。照下面的方法可以換成比較自然的聲音。" : "");
}

function save() {
  saveVoiceSettings({ uri: $("vVoice").value, rate: +$("vRate").value, pitch: +$("vPitch").value });
  render();
}

if (canSpeak) {
  for (const id of ["vVoice", "vRate", "vPitch"]) $(id).onchange = save;
  $("vTest").onclick = () => speak(SAMPLE);
  // 聲音清單是瀏覽器之後才載入的，載入好再更新一次
  speechSynthesis.addEventListener?.("voiceschanged", render);
  window.addEventListener("hashchange", () => { if (location.hash === "#parent") render(); });
}
render();
