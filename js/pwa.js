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

// 安裝需要使用者確認；不支援安裝提示的瀏覽器顯示操作步驟。
let installEvent = null, installed = false;
const displayMode = matchMedia("(display-mode: standalone)");
const isStandalone = () => installed || displayMode.matches || navigator.standalone === true;
const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const inApp = /line\/|fbav|fban|instagram/i.test(navigator.userAgent);
const installUrl = new URL(location.href);
installUrl.hash = "install";
$("installUrl").value = installUrl.href;

function updateInstall() {
  $("installCard").hidden = isStandalone();
  $("installBtn").textContent = installEvent ? "安裝到主畫面" : "加入主畫面";
}
function showInstallHelp() {
  $("installStatus").textContent = "";
  let tip, steps;
  if (isStandalone()) {
    tip = "你已經從主畫面打開小小珠算了，可以開始練習！";
    steps = [];
  } else if (inApp) {
    tip = "你現在使用 App 內的瀏覽器，請先用手機瀏覽器打開。";
    steps = ["按 App 的選單，選「用外部瀏覽器開啟」。", ios ? "用 Safari 開啟後，按「分享」。" : "用 Chrome 開啟後，按網站的「加入主畫面」。", ios ? "選「加入主畫面」，再按「加入」。" : "依照瀏覽器提示確認安裝。"];
  } else if (ios) {
    tip = "iPhone／iPad 請用 Safari 開啟，再依照下面的步驟加入。";
    steps = ["按 Safari 的「分享」；有些版本需先按選單。", "往下找「加入主畫面」。", "如果有「作為網頁 App 打開」選項，將它打開，再按「加入」。"];
  } else {
    tip = "如果沒有出現安裝視窗，可以從瀏覽器選單加入。";
    steps = ["用 Chrome 或 Edge 開啟這個網站。", "按瀏覽器選單，找「安裝應用程式」或「加入主畫面」。", "確認名稱後，按「安裝」或「新增」。"];
  }
  $("installTip").textContent = tip;
  $("installSteps").replaceChildren(...steps.map((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    return li;
  }));
  if (!$("installDialog").open) $("installDialog").showModal();
}
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installEvent = event;
  updateInstall();
});
$("installBtn").onclick = async () => {
  if (!installEvent) { showInstallHelp(); return; }
  const event = installEvent;
  installEvent = null;
  $("installBtn").disabled = true;
  try {
    await event.prompt();
    await event.userChoice;
  } catch {
    showInstallHelp();
  } finally {
    $("installBtn").disabled = false;
    updateInstall();
  }
};
window.addEventListener("appinstalled", () => {
  installed = true;
  installEvent = null;
  $("installDialog").close();
  updateInstall();
});
displayMode.addEventListener("change", updateInstall);
$("installClose").onclick = () => $("installDialog").close();
$("installCopy").onclick = async () => {
  try {
    await navigator.clipboard.writeText(installUrl.href);
    $("installStatus").textContent = "已複製，可以貼給家人。";
  } catch {
    $("installUrl").focus();
    $("installUrl").select();
    $("installStatus").textContent = "請長按或按 Ctrl+C 複製上面的連結。";
  }
};
$("installHelpLink").onclick = (event) => {
  event.preventDefault();
  showInstallHelp();
};
window.addEventListener("hashchange", () => { if (location.hash === "#install") showInstallHelp(); });
if (location.hash === "#install") showInstallHelp();
updateInstall();

// 沒網路時提醒一下（還是可以照常練習）
const showOffline = () => { $("offlineNote").hidden = navigator.onLine; };
window.addEventListener("online", showOffline);
window.addEventListener("offline", showOffline);
showOffline();
