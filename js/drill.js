// 題庫頁：只列題目，小朋友用實體算盤算。家長可以打開答案或列印。
import { fiveDrillSet, MINUS } from "./logic.js";

const $ = (id) => document.getElementById(id);
const opts = { mode: "mix", terms: 3, count: 10 };
let showAnswers = false;

function setSeg(groupId, key) {
  for (const b of $(groupId).querySelectorAll("button")) {
    b.setAttribute("aria-pressed", String(String(opts[key]) === b.dataset.v));
  }
}

function renderList() {
  const set = fiveDrillSet({ mode: opts.mode, terms: opts.terms, max: 5 }, opts.count);
  $("drillList").innerHTML = set.map((q, i) => {
    const rows = q.nums.map((n, k) => {
      const sign = k === 0 ? "" : n > 0 ? "+" : MINUS;
      const cls = k === 0 ? "" : n > 0 ? "pl" : "mi";
      return `<div class="dr ${cls}"><span class="s">${sign}</span><span class="n">${Math.abs(n)}</span></div>`;
    }).join("");
    return `<li class="dq"><span class="dno">${i + 1}</span><div class="dcol">${rows}<div class="dans"><span class="s"></span><span class="n">${q.answer}</span></div></div></li>`;
  }).join("");
  $("drillList").classList.toggle("show-ans", showAnswers);
}

export function renderDrill() {
  setSeg("dMode", "mode"); setSeg("dTerms", "terms"); setSeg("dCount", "count");
  renderList();
}

function bindSeg(groupId, key, toNum) {
  $(groupId).addEventListener("click", (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    opts[key] = toNum ? +b.dataset.v : b.dataset.v;
    renderDrill();
  });
}
bindSeg("dMode", "mode", false);
bindSeg("dTerms", "terms", true);
bindSeg("dCount", "count", true);

$("dNew").onclick = renderList;
$("dAns").onclick = () => {
  showAnswers = !showAnswers;
  $("dAns").textContent = showAnswers ? "藏起答案" : "顯示答案";
  $("dAns").setAttribute("aria-pressed", String(showAnswers));
  $("drillList").classList.toggle("show-ans", showAnswers);
};
$("dPrint").onclick = () => window.print();
