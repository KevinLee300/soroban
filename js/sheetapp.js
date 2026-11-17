// 數學練習單的畫面：一頁 6 個區塊，把答案填在格子裡，最後一次交卷、給分數。出題在 sheet.js。
import { SHEET_LEVELS, makeSheet, sheetBlanks } from "./sheet.js";
import { donut } from "./kids.js";
import { stars } from "./logic.js";
import { logSession, loadProgress, saveStars } from "./storage.js";

const $ = (id) => document.getElementById(id);
const DONUT = ["#F48FB1", "#FFD54F", "#81D4FA", "#A5D6A7", "#B39DDB"];
let level = 2, sheet = null, blanks = [], checked = false, confirmBlank = false, t0 = 0;

// 一個要填的格子。n 是它在整張練習單裡的第幾格（對應 sheetBlanks 的順序）
let n = 0;
const box = (wide = false) => `<input class="fbox${wide ? " wide" : ""}" data-n="${n++}" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="off" aria-label="第 ${n} 格">`;
const cmpBox = () => {
  const i = n++;
  return `<span class="cmp" data-n="${i}"><span class="fbox sym" aria-label="第 ${i + 1} 格"></span><span class="cmpbtns no-print">${[">", "<", "="].map((s) => `<button type="button" data-s="${s}" aria-label="${s === ">" ? "大於" : s === "<" ? "小於" : "等於"}">${s}</button>`).join("")}</span></span>`;
};
const pile = (k, color, eaten = 0) => `<span class="spile" style="--cols:${Math.max(1, Math.min(k, 5))}">${Array.from({ length: k }, (_, i) => `<span class="sd${i >= k - eaten ? " xed" : ""}">${donut(color)}</span>`).join("")}</span>`;

function render() {
  n = 0;
  const s = sheet, c = DONUT;
  const panels = [
    ["接著填", "照規律，把空格填上數字", "p1",
      `<div class="blocks">${s.seq.cells.map((cell, i) => `<span class="blk b${i % 6}">${cell.blank ? box() : cell.v}</span>`).join("")}</div>`],
    ["比大小", "填 >、< 或 =（開口對著大的數字）", "p2",
      s.compare.map((r) => `<div class="srow cmprow"><span class="snum">${r.a}</span>${cmpBox()}<span class="snum">${r.b}</span></div>`).join("")],
    ["分一分", "上面的數字分成兩堆", "p3",
      `<div class="bondwrap">${s.bonds.map((b) => {
        const shown = `<span class="bpart">${b.shown}</span>`, blank = `<span class="bpart blank">${box()}</span>`;
        return `<div class="bond"><svg viewBox="0 0 100 60" aria-hidden="true"><line x1="50" y1="14" x2="22" y2="50"/><line x1="50" y1="14" x2="78" y2="50"/></svg><span class="btop">${b.total}</span>${b.blankLeft ? blank + shown : shown + blank}</div>`;
      }).join("")}</div>`],
    ["加一加", "合起來是多少", "p4",
      s.adds.map((a) => `${a.pic ? `<div class="srow pics">${pile(a.a, c[0])}<span class="sop">+</span>${pile(a.b, c[3])}</div>` : ""}<div class="srow"><span class="seq2">${a.a} + ${a.b} =</span>${box()}</div>`).join("")],
    ["減一減", "劃掉的是拿走的", "p5",
      s.subs.map((x) => `${x.pic ? `<div class="srow pics">${pile(x.a, c[1], x.b)}</div>` : ""}<div class="srow"><span class="seq2">${x.a} − ${x.b} =</span>${box()}</div>`).join("")],
    ["找數字", "格子裡是多少，算式才會對", "p6",
      s.finds.map((f) => `<div class="srow"><span class="seq2">${f.text[0]}</span>${box()}<span class="seq2">${f.text[1]}</span></div>`).join("")],
  ];
  $("sheetGrid").innerHTML = panels.map(([title, tip, cls, body]) =>
    `<section class="spanel ${cls}"><div class="shead"><h2>${title}</h2><span>${tip}</span></div><div class="sbody">${body}</div></section>`).join("");
  checked = false; confirmBlank = false; t0 = Date.now();
  $("sheetGrid").classList.remove("checked");
  $("sResult").hidden = true;
  $("sSubmit").hidden = false;
  $("sNote").hidden = true;
  $("sCheck").textContent = "寫完了，交卷！";
}

function renderLevels() {
  const prog = loadProgress();
  $("sLevels").innerHTML = SHEET_LEVELS.map((name, i) => {
    const st = prog[`sheet.${i + 1}`] || 0;
    return `<button data-lv="${i + 1}" aria-pressed="${level === i + 1}"><b>${name}</b><span class="stars" aria-label="${st} 顆星">${"★".repeat(st)}<span class="off">${"★".repeat(3 - st)}</span></span></button>`;
  }).join("");
}

function newSheet() {
  sheet = makeSheet(level);
  blanks = sheetBlanks(sheet);
  renderLevels();
  render();
}
export function renderSheet() { newSheet(); }

const fields = () => [...$("sheetGrid").querySelectorAll("[data-n]")].sort((a, b) => a.dataset.n - b.dataset.n);
const valueOf = (el) => (el.classList.contains("cmp") ? el.dataset.v || "" : el.value.trim());

$("sLevels").addEventListener("click", (ev) => {
  const b = ev.target.closest("button");
  if (!b) return;
  level = +b.dataset.lv;
  newSheet();
});

$("sheetGrid").addEventListener("input", (ev) => {
  if (!ev.target.classList.contains("fbox")) return;
  ev.target.value = ev.target.value.replace(/\D/g, "").slice(0, 2);
  resetConfirm();
});
$("sheetGrid").addEventListener("keydown", (ev) => {
  if (ev.key !== "Enter" || !ev.target.classList.contains("fbox")) return;
  ev.preventDefault();
  const inputs = [...$("sheetGrid").querySelectorAll("input.fbox")], i = inputs.indexOf(ev.target);
  (inputs[i + 1] || $("sCheck")).focus();
});
// 比大小：按 >、<、= 其中一個，填進格子
$("sheetGrid").addEventListener("click", (ev) => {
  const b = ev.target.closest(".cmpbtns button");
  if (!b || checked) return;
  const wrap = b.closest(".cmp");
  wrap.dataset.v = b.dataset.s;
  wrap.querySelector(".sym").textContent = b.dataset.s;
  for (const x of wrap.querySelectorAll("button")) x.setAttribute("aria-pressed", String(x === b));
  resetConfirm();
});
function resetConfirm() {
  if (!confirmBlank) return;
  confirmBlank = false;
  $("sNote").hidden = true;
  $("sCheck").textContent = "寫完了，交卷！";
}

$("sCheck").onclick = () => {
  if (checked) return;
  const all = fields(), empty = all.filter((el) => valueOf(el) === "");
  if (empty.length && !confirmBlank) {
    confirmBlank = true;
    $("sNote").textContent = `還有 ${empty.length} 格沒寫喔！要先寫完嗎？`;
    $("sNote").hidden = false;
    $("sCheck").textContent = "不寫了，直接交卷";
    empty[0].scrollIntoView({ block: "center" });
    if (empty[0].focus) empty[0].focus({ preventScroll: true });
    return;
  }
  checked = true;
  let correct = 0;
  const wrong = [];
  all.forEach((el, i) => {
    const v = valueOf(el), ans = blanks[i].ans, ok = v !== "" && String(ans) === (typeof ans === "number" ? String(+v) : v);
    const target = el.classList.contains("cmp") ? el.querySelector(".sym") : el;
    if (el.tagName === "INPUT") el.readOnly = true;
    target.classList.add(ok ? "right" : "wrong");
    if (ok) correct++;
    else {
      wrong.push(blanks[i].label);
      target.insertAdjacentHTML("afterend", `<span class="sfix">${ans}</span>`);
    }
  });
  $("sheetGrid").classList.add("checked");
  const total = all.length, score = Math.round((correct / total) * 100), st = stars(correct, total);
  saveStars(`sheet.${level}`, st);
  logSession({ id: `sheet.${level}`, label: `數學練習單・${SHEET_LEVELS[level - 1]}`, correct, total, sec: (Date.now() - t0) / 1000, wrong: [...new Set(wrong)] });
  renderLevels();
  $("sStars").innerHTML = `<span class="stars" aria-label="${st} 顆星">${"★".repeat(st)}<span class="off">${"★".repeat(3 - st)}</span></span>`;
  $("sScore").textContent = score;
  $("sText").textContent = `${total} 格答對 ${correct} 格。` + (correct === total ? "全部答對，太厲害了！" : st >= 2 ? "很棒！紅色的格子旁邊是正確答案，再想一次。" : "沒關係，看看紅色格子旁邊的正確答案，慢慢再想一次。");
  $("sResult").hidden = false;
  $("sSubmit").hidden = true;
  $("sResult").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
};

$("sRetry").onclick = () => { render(); $("sheetGrid").scrollIntoView({ block: "start" }); };
$("sNew").onclick = newSheet;
$("sNew2").onclick = () => { newSheet(); $("sheetGrid").scrollIntoView({ block: "start" }); };
$("sPrint").onclick = () => window.print();
