// 練習單：混合題或單一題型連續練習；所有格子一次交卷。
import { SHEET_LEVELS, SHEET_TYPES, makeSheetSections, sheetBlanks } from "./sheet.js";
import { donut } from "./kids.js";
import { stars } from "./logic.js";
import { logSession, loadProgress, saveStars } from "./storage.js";

const $ = (id) => document.getElementById(id);
const DONUT = ["#F48FB1", "#FFD54F", "#81D4FA", "#A5D6A7", "#B39DDB"];
let level = 2, kind = "mix", sheet = null, blanks = [], checked = false, confirmBlank = false, t0 = 0;
const progressId = (lv = level) => kind === "mix" ? `sheet.${lv}` : `sheet.${kind}.${lv}`;
const kindName = () => kind === "mix" ? "混合題" : SHEET_TYPES.find((t) => t.id === kind).title;

// n 對應 sheetBlanks 的順序，畫面與答案一律依區塊順序產生。
let n = 0;
const box = () => `<input class="fbox" data-n="${n++}" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="off" aria-label="第 ${n} 格">`;
const cmpBox = () => {
  const i = n++;
  return `<span class="cmp" data-n="${i}"><span class="fbox sym" aria-label="第 ${i + 1} 格"></span><span class="cmpbtns no-print">${[">", "<", "="].map((s) => `<button type="button" data-s="${s}" aria-pressed="false" aria-label="第 ${i + 1} 格：${s === ">" ? "大於" : s === "<" ? "小於" : "等於"}">${s}</button>`).join("")}</span></span>`;
};
const pile = (k, color, eaten = 0) => `<span class="spile" role="img" aria-label="${k} 個甜甜圈${eaten ? `，劃掉 ${eaten} 個` : ""}" style="--cols:${Math.max(1, Math.min(k, 5))}">${Array.from({ length: k }, (_, i) => `<span class="sd${i >= k - eaten ? " xed" : ""}">${donut(color)}</span>`).join("")}</span>`;
const engine = '<svg class="sengine" viewBox="0 0 80 48" aria-hidden="true"><path d="M9 12h24v25H9zM33 23h29v14H33zM48 8h9v15h-9z" fill="var(--t1e)" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/><path d="M14 17h14v12H14z" fill="var(--panel)"/><path d="M4 37h64l7 5H4" fill="var(--t4e)" stroke="var(--ink)" stroke-width="2"/><circle cx="21" cy="40" r="6" fill="var(--panel)" stroke="var(--ink)" stroke-width="3"/><circle cx="51" cy="40" r="6" fill="var(--panel)" stroke="var(--ink)" stroke-width="3"/><path d="M54 3c5-7 13 3 18-3" fill="none" stroke="var(--muted)" stroke-width="3" stroke-linecap="round"/></svg>';

function panelBody(type, data) {
  switch (type) {
    case "seq":
      return `<div class="number-train">${engine}<div class="blocks">${data.cells.map((cell, i) => `<span class="blk b${i % 6}">${cell.blank ? box() : cell.v}</span>`).join("")}</div></div>`;
    case "compare":
      return data.map((r) => `<div class="srow cmprow"><span class="snum">${r.a}</span>${cmpBox()}<span class="snum">${r.b}</span></div>`).join("");
    case "bonds":
      return `<div class="bondwrap">${data.map((b) => {
        const shown = `<span class="bpart">${b.shown}</span>`, blank = `<span class="bpart blank">${box()}</span>`;
        return `<div class="bond"><svg viewBox="0 0 100 60" aria-hidden="true"><line x1="50" y1="14" x2="22" y2="50"/><line x1="50" y1="14" x2="78" y2="50"/></svg><span class="btop">${b.total}</span>${b.blankLeft ? blank + shown : shown + blank}</div>`;
      }).join("")}</div>`;
    case "adds":
      return data.map((a) => `<div class="squestion">${a.pic ? `<div class="srow pics">${pile(a.a, DONUT[0])}<span class="sop" aria-hidden="true">+</span>${pile(a.b, DONUT[3])}</div>` : ""}<div class="srow"><span class="seq2">${a.a} + ${a.b} =</span>${box()}</div></div>`).join("");
    case "subs":
      return data.map((x) => `<div class="squestion">${x.pic ? `<div class="srow pics">${pile(x.a, DONUT[1], x.b)}</div>` : ""}<div class="srow"><span class="seq2">${x.a} − ${x.b} =</span>${box()}</div></div>`).join("");
    case "finds":
      return data.map((f) => `<div class="srow"><span class="seq2">${f.text[0]}</span>${box()}<span class="seq2">${f.text[1]}</span></div>`).join("");
  }
}
function render() {
  n = 0;
  $("sheetGrid").innerHTML = sheet.map(({ kind: type, data }, i) => {
    const index = SHEET_TYPES.findIndex((t) => t.id === type), { title, tip } = SHEET_TYPES[index];
    return `<section class="spanel p${index + 1}"><div class="shead"><h2>${title}</h2><span class="sbadge" aria-label="第 ${i + 1} 區">${String(i + 1).padStart(2, "0")}</span><p>${tip}</p></div><div class="sbody">${panelBody(type, data)}</div></section>`;
  }).join("");
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
    const st = prog[progressId(i + 1)] || 0;
    return `<button data-lv="${i + 1}" aria-pressed="${level === i + 1}"><b>${name}</b><span class="stars" aria-label="${st} 顆星">${"★".repeat(st)}<span class="off">${"★".repeat(3 - st)}</span></span></button>`;
  }).join("");
}
function renderKinds() {
  $("sKinds").innerHTML = [{ id: "mix", title: "混合題" }, ...SHEET_TYPES].map((t) =>
    `<button type="button" data-kind="${t.id}" aria-pressed="${kind === t.id}">${t.title}</button>`).join("");
}
function newSheet() {
  sheet = makeSheetSections(level, kind);
  blanks = sheetBlanks(sheet);
  renderKinds();
  renderLevels();
  $("sModeNote").textContent = kind === "mix" ? "六種題目各練一區，試試看你學會了多少。" : `這張都是「${kindName()}」，連續練六區，慢慢熟悉同一種題目。`;
  $("sPrintTitle").textContent = `數學練習單・${kindName()}・${SHEET_LEVELS[level - 1]}`;
  render();
}
export function renderSheet() { newSheet(); }

$("sKinds").addEventListener("click", (ev) => {
  const b = ev.target.closest("button[data-kind]");
  if (!b || b.dataset.kind === kind) return;
  kind = b.dataset.kind;
  newSheet();
});

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
  saveStars(progressId(), st);
  logSession({ id: progressId(), label: `數學練習單・${kindName()}・${SHEET_LEVELS[level - 1]}`, correct, total, sec: (Date.now() - t0) / 1000, wrong: [...new Set(wrong)] });
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
