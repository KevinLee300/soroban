// 首頁的「今天的任務」和給家長看的「學習紀錄」頁。計算在 daily.js，存檔在 storage.js。
import { pickTasks, taskDone, allDone, streak, summarizeDays, summarizeItems, recentWrong } from "./daily.js";
import { activeProfile, clearLog, loadDaily, loadLog, loadProgress, saveDaily, today } from "./storage.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
const md = (d) => `${+d.slice(5, 7)}/${+d.slice(8, 10)}`;
const weekday = (d) => WEEK[new Date(`${d}T00:00:00`).getDay()];

/* ---------- 今天的任務（首頁） ---------- */
export function renderDaily() {
  const day = today(), daily = loadDaily(), log = loadLog();
  // 今天第一次打開時決定任務，之後整天不變
  if (!daily[day]) { daily[day] = pickTasks(day, loadProgress()); saveDaily(daily); }
  const tasks = daily[day], done = tasks.filter((t) => taskDone(t, log, day)).length;
  const run = streak(daily, log, day), finished = allDone(tasks, log, day);
  $("daily").innerHTML = `
    <div class="dhead"><h2>今天的任務</h2><span class="dchip">${run > 0 ? `連續完成 ${run} 天` : `完成 ${done} / ${tasks.length}`}</span></div>
    <ol class="tasks">${tasks.map((t) => {
      const ok = taskDone(t, log, day);
      return `<li class="${ok ? "done" : ""}"><span class="tmark" aria-hidden="true">${ok ? "✓" : ""}</span><span class="ttitle">${esc(t.title)}</span>${
        ok ? `<span class="tstate">完成了</span>` : `<a class="btn primary" href="${esc(t.href)}">開始</a>`}</li>`;
    }).join("")}</ol>
    <p class="${finished ? "dfinish" : "tip"}">${finished ? "今天的任務全部完成了，好棒！明天再來。" : "每個任務做完 10 題就算完成，大約 10–15 分鐘。"}</p>`;
}

/* ---------- 學習紀錄（家長） ---------- */
export function renderParent() {
  const log = loadLog(), day = today();
  $("pWho").textContent = activeProfile();
  clearArmed = false;
  $("pClear").textContent = "清除這位家人的紀錄";
  $("pClearNote").textContent = "";

  const days = summarizeDays(log, day, 7), max = Math.max(10, ...days.map((d) => d.n));
  $("pDays").innerHTML = days.map((d) => {
    const acc = d.n ? Math.round((d.c / d.n) * 100) : 0;
    return `<div class="pday${d.d === day ? " today" : ""}">
      <span class="pnum">${d.n ? `${d.n} 題` : ""}</span>
      <div class="pcol"><i class="wrongpart" style="height:${((d.n - d.c) / max) * 100}%"></i><i class="rightpart" style="height:${(d.c / max) * 100}%"></i></div>
      <span class="plabel">${md(d.d)}<small>${d.d === day ? "今天" : `週${weekday(d.d)}`}</small></span>
      <span class="pacc">${d.n ? `${acc}%` : "—"}</span>
      <span class="pmin">${d.sec ? `${Math.max(1, Math.round(d.sec / 60))} 分` : ""}</span>
    </div>`;
  }).join("");
  const tot = days.reduce((s, d) => ({ n: s.n + d.n, c: s.c + d.c, sec: s.sec + d.sec, act: s.act + (d.n ? 1 : 0) }), { n: 0, c: 0, sec: 0, act: 0 });
  $("pSum").textContent = tot.n
    ? `這 7 天有 ${tot.act} 天練習，一共 ${tot.n} 題，答對率 ${Math.round((tot.c / tot.n) * 100)}%，大約 ${Math.max(1, Math.round(tot.sec / 60))} 分鐘。綠色是第一次就答對，橘色是答錯。`
    : "這 7 天還沒有練習紀錄。完成一次 10 題的練習就會出現在這裡。";

  const items = summarizeItems(log);
  $("pItems").innerHTML = items.length
    ? `<thead><tr><th>項目</th><th>次數</th><th>答對率</th><th>最近一次</th></tr></thead><tbody>${items.map((it) => `<tr>
        <td>${esc(it.label)}${it.flag === "weak" ? ` <span class="pill weak">要加強</span>` : it.flag === "strong" ? ` <span class="pill strong">很熟了</span>` : ""}</td>
        <td class="num">${it.times}</td><td class="num">${Math.round(it.acc * 100)}%</td><td class="num">${md(it.last)}</td></tr>`).join("")}</tbody>`
    : `<tbody><tr><td class="tip">還沒有紀錄。</td></tr></tbody>`;

  const wrong = recentWrong(log, 12);
  $("pWrong").innerHTML = wrong.length
    ? wrong.map((w) => `<li><b>${esc(w.q)}</b><small>${esc(w.label)}・${md(w.d)}</small></li>`).join("")
    : `<li class="tip">最近沒有答錯的題目。</li>`;
}

// 清除要按兩次，避免不小心按到
let clearArmed = false;
$("pClear").onclick = () => {
  if (!clearArmed) {
    clearArmed = true;
    $("pClear").textContent = "確定要清除嗎？再按一次";
    $("pClearNote").textContent = "只會清除練習紀錄和每日任務，星星會留著。";
    return;
  }
  clearLog();
  renderParent();
  $("pClearNote").textContent = "已經清除。";
};
