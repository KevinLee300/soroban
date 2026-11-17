// 註冊 service worker（自動更新＋離線可用），以及「安裝到主畫面」的按鈕。
// 跟其他程式分開載入，就算這裡出錯也不會影響練習。
const $ = (id) => document.getElementById(id);

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("sw.js", { updateViaCache: "none" });
      const reg = await navigator.serviceWorker.ready;
      // 把這次已經載入的檔案交給 service worker 存起來，第一次開完就能離線用
      const urls = [reg.scope, ...performance.getEntriesByType("resource").map((e) => e.name)]
        .filter((u) => u.startsWith(location.origin) || u.includes("fonts.g"));
      reg.active && reg.active.postMessage({ type: "cache", urls: [...new Set(urls)] });
    } catch { /* 不支援或被擋住：網站照常使用，只是沒有離線功能 */ }
  });
}

// Android／電腦的 Chrome、Edge：瀏覽器准許安裝時才顯示按鈕
let installEvent = null;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installEvent = event;
  $("installBtn").hidden = false;
});
$("installBtn").onclick = async () => {
  if (!installEvent) return;
  installEvent.prompt();
  await installEvent.userChoice;
  installEvent = null;
  $("installBtn").hidden = true;
};
window.addEventListener("appinstalled", () => { $("installBtn").hidden = true; $("installTip").hidden = true; });

// iPhone／iPad 沒有安裝按鈕，改顯示怎麼加到主畫面；已經從主畫面開啟就不用顯示
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
$("installTip").hidden = standalone || !ios;
if (standalone) $("installBtn").hidden = true;

// 沒網路時提醒一下（還是可以照常練習）
const showOffline = () => { $("offlineNote").hidden = navigator.onLine; };
window.addEventListener("online", showOffline);
window.addEventListener("offline", showOffline);
showOffline();
