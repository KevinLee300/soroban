// 題庫頁：小朋友用實體算盤算，把答案填在畫面上，全部寫完再一次交卷、看分數。也可以列印成紙本。
import { fiveDrillSet, MINUS, stars } from "./logic.js";

const $ = (id) => document.getElementById(id);
const opts = { kind: "direct", mode: "+", terms: 2, count: 10 };
const KIND = {
  direct: { name: "直接加減", tip: "珠子夠撥就直接撥，不用五的好朋友。例如 3 + 1、4 − 2。" },
  five: { name: "五的好朋友", tip: "每題至少用到一次五的好朋友。例如 3 + 4（加五減一）、6 − 2（減五加三）。" },
};
let set = [];
let checked = false;
let confirmBlank = false;

function setSeg(groupId, key) {
  for (const b of $(groupId).querySelectorAll("button")) {
    b.setAttribute("aria-pressed", String(String(opts[key]) === b.dataset.v));
  }
}

const inputs = () => [...$("drillList").querySelectorAll(".ain")];

function renderList() {
  checked = false;
  confirmBlank = false;
  $("drillList").innerHTML = set.map((q, i) => {
    const rows = q.nums.map((n, k) => {
      const sign = k === 0 ? "" : n > 0 ? "+" : MINUS;
      const cls = k === 0 ? "" : n > 0 ? "pl" : "mi";
      return `<div class="dr ${cls}"><span class="s">${sign}</span><span class="n">${Math.abs(n)}</span></div>`;
    }).join("");
    return `<li class="dq"><span class="dno">${i + 1}</span><span class="dmark" aria-hidden="true"></span>
      <div class="dcol">${rows}<div class="dans"><span class="s"></span>
        <input class="ain" id="ain${i}" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="off" aria-label="第 ${i + 1} 題的答案">
      </div><div class="dfix"></div></div></li>`;
  }).join("");
  $("dResult").hidden = true;
  $("dSubmit").hidden = false;
  $("dNote").hidden = true;
  $("dCheck").textContent = "寫完了，交卷！";
}

function newSet() {
  set = fiveDrillSet({ kind: opts.kind, mode: opts.mode, terms: opts.terms, max: 5 }, opts.count);
  renderList();
}

export function renderDrill() {
  setSeg("dKind", "kind"); setSeg("dMode", "mode"); setSeg("dTerms", "terms"); setSeg("dCount", "count");
  $("dKindTip").textContent = KIND[opts.kind].tip;
  $("dPrintTitle").textContent = `${KIND[opts.kind].name}練習`;
  newSet();
}

/* 輸入：只收 0–9，填好自動跳到下一題 */
$("drillList").addEventListener("input", (ev) => {
  const el = ev.target;
  if (!el.classList.contains("ain")) return;
  el.value = el.value.replace(/\D/g, "").slice(-1);
  if (confirmBlank) { confirmBlank = false; $("dNote").hidden = true; $("dCheck").textContent = "寫完了，交卷！"; }
  if (el.value) {
    const all = inputs(), next = all.slice(all.indexOf(el) + 1).find((x) => !x.value);
    if (next) next.focus({ preventScroll: false });
  }
});
$("drillList").addEventListener("keydown", (ev) => {
  if (ev.key !== "Enter" || !ev.target.classList.contains("ain")) return;
  ev.preventDefault();
  const all = inputs(), i = all.indexOf(ev.target);
  (all[i + 1] || $("dCheck")).focus();
});

/* 交卷 */
$("dCheck").onclick = () => {
  if (checked) return;
  const all = inputs(), blanks = all.filter((x) => x.value === "").length;
  if (blanks && !confirmBlank) {
    confirmBlank = true;
    $("dNote").textContent = `還有 ${blanks} 題沒寫喔！要先寫完嗎？`;
    $("dNote").hidden = false;
    $("dCheck").textContent = "不寫了，直接交卷";
    all.find((x) => x.value === "").focus();
    return;
  }
  checked = true;
  let correct = 0;
  all.forEach((el, i) => {
    const li = el.closest(".dq"), ok = el.value !== "" && +el.value === set[i].answer;
    if (ok) correct++;
    el.readOnly = true;
    li.classList.add(ok ? "right" : "wrong");
    li.querySelector(".dmark").textContent = ok ? "○" : "✕";
    if (!ok) li.querySelector(".dfix").textContent = el.value === "" ? `沒寫，答案是 ${set[i].answer}` : `答案是 ${set[i].answer}`;
  });
  const total = set.length, score = Math.round((correct / total) * 100), s = stars(correct, total);
  $("dStars").innerHTML = `<span class="stars" aria-label="${s} 顆星">${"★".repeat(s)}<span class="off">${"★".repeat(3 - s)}</span></span>`;
  $("dScore").textContent = score;
  $("dText").textContent = `${total} 題答對 ${correct} 題。` +
    (correct === total ? "全部答對，太厲害了！" : s >= 2 ? "很棒！看看打叉的題目，再撥一次算盤。" : "沒關係，把打叉的題目用算盤慢慢再撥一次。");
  $("dResult").hidden = false;
  $("dSubmit").hidden = true;
  $("dResult").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
};

$("dRetry").onclick = () => { renderList(); $("drillList").scrollIntoView({ block: "start" }); };
$("dNew").onclick = newSet;
$("dNew2").onclick = () => { newSet(); $("drillList").scrollIntoView({ block: "start" }); };
$("dPrint").onclick = () => window.print();

function bindSeg(groupId, key, toNum) {
  $(groupId).addEventListener("click", (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    opts[key] = toNum ? +b.dataset.v : b.dataset.v;
    renderDrill();
  });
}
bindSeg("dKind", "kind", false);
bindSeg("dMode", "mode", false);
bindSeg("dTerms", "terms", true);
bindSeg("dCount", "count", true);
