// 九九乘法的畫面：乘法表（依熟練度變色）、練習、限時 60 秒、弱點加強。出題和熟練度計算在 times.js。
import { FACTS, MASTERY_NAMES, TABLES, buildQueue, chant, factOf, makeQuestion, makeStories, mastery, questionText, record, summary, weakest } from "./times.js";
import { stars } from "./logic.js";
import { canSpeak, speak, stopSpeak } from "./speech.js";
import { activeProfile, loadTimes, logSession, saveStars, saveTimes, today } from "./storage.js";

const $ = (id) => document.getElementById(id);
const opts = { tables: new Set(TABLES), order: "random", type: "ans", count: 20, story: 1 };
const STORY_LEVELS = ["", "簡單", "普通", "挑戰"];
const R = { mode: "", queue: [], i: 0, q: null, input: "", correct: 0, answered: 0, wrong: [], retry: [], locked: false, t0: 0, qt0: 0, timer: null, tick: null, left: 0 };
let voiceOn = false, bound = false;
const starHTML = (s) => `<span class="stars" aria-label="${s} 顆星">${"★".repeat(s)}<span class="off">${"★".repeat(3 - s)}</span></span>`;

/* ---------- 首頁：乘法表和設定 ---------- */
function renderTable() {
  const { stats, best60 } = loadTimes();
  let html = `<thead><tr><th></th>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((b) => `<th>×${b}</th>`).join("")}</tr></thead><tbody>`;
  for (const a of TABLES) {
    html += `<tr><th>${a}</th>${FACTS.filter((f) => f.a === a).map((f) =>
      `<td><button class="tcell m${mastery(stats[f.key])}" data-key="${f.key}" aria-label="${f.a} 乘 ${f.b} 等於 ${f.p}，${MASTERY_NAMES[mastery(stats[f.key])]}">${f.p}</button></td>`).join("")}</tr>`;
  }
  $("tTable").innerHTML = html + "</tbody>";
  const [none, weak, ok, good] = summary(stats);
  $("tSummary").innerHTML = `<span class="tl m3">熟練 ${good}</span><span class="tl m2">還可以 ${ok}</span><span class="tl m1">不熟 ${weak}</span><span class="tl m0">還沒練 ${none}</span>`;
  $("tWho").textContent = activeProfile();
  $("tBest").textContent = best60 ? `最高紀錄：${best60} 題` : "還沒有紀錄";
  $("tWeakBtn").disabled = none === FACTS.length;
  $("tWeakTip").textContent = none === FACTS.length ? "先練習幾次，才知道哪些題目要加強。" : weak ? `目前有 ${weak} 題不熟。` : "目前沒有不熟的題目，會挑比較久沒練的。";
}
function renderOpts() {
  $("tTables").innerHTML = TABLES.map((a) => `<button data-a="${a}" aria-pressed="${opts.tables.has(a)}">${a}</button>`).join("");
  for (const [id, key] of [["tOrder", "order"], ["tType", "type"], ["tCount", "count"]]) {
    for (const b of $(id).querySelectorAll("button")) b.setAttribute("aria-pressed", String(String(opts[key]) === b.dataset.v));
  }
  $("tCount").parentElement.hidden = opts.order === "seq";
  for (const b of $("tStoryLevel").querySelectorAll("button")) b.setAttribute("aria-pressed", String(String(opts.story) === b.dataset.v));
  $("tStoryTip").textContent = ["", "一步乘法：一盒 6 顆，4 盒有幾顆？先選算式，再算答案。", "有乘法，也混了加法和減法，要先想清楚用哪一種算。", "兩個步驟：先乘，再加或減。例如買東西找錢。"][opts.story];
  const n = opts.tables.size;
  $("tStart").disabled = n === 0;
  $("tStart").textContent = n === 0 ? "先選要練幾的乘法" : opts.order === "seq" ? `開始背（${n * 9} 題）` : `開始練習（${opts.count} 題）`;
}
function showFact(key) {
  const f = factOf(key), { stats } = loadTimes();
  $("tFact").innerHTML = `<b>${f.a} × ${f.b} = ${f.p}</b><span>${chant(f.a, f.b)}</span><small>${MASTERY_NAMES[mastery(stats[f.key])]}</small>`;
  if (canSpeak) speak(`${chant(f.a, f.b)}`);
}

export function renderTimes() {
  bind();
  stopRun();
  $("tHome").hidden = false; $("tPlay").hidden = true; $("tResult").hidden = true;
  renderTable(); renderOpts();
  $("tFact").innerHTML = `<span>點乘法表的格子，可以看口訣。</span>`;
}
export function leaveTimes() { stopRun(); }

/* ---------- 作答 ---------- */
function stopRun() { clearTimeout(R.timer); clearInterval(R.tick); R.mode = ""; }

function start(mode) {
  stopRun();
  R.mode = mode; R.i = 0; R.correct = 0; R.answered = 0; R.wrong = []; R.retry = []; R.t0 = Date.now();
  const tables = [...opts.tables];
  if (mode === "weak") R.queue = weakest(loadTimes().stats, 10).map((f) => makeQuestion(f, "ans"));
  else if (mode === "timed") R.queue = buildQueue({ tables: tables.length ? tables : TABLES, order: "random", count: 200, type: opts.type });
  else if (mode === "story") R.queue = makeStories(opts.story, tables, 10).map((s) => ({ ...s, story: true }));
  else R.queue = buildQueue({ tables, order: opts.order, count: opts.count, type: opts.type });
  R.total = R.queue.length;
  $("tHome").hidden = true; $("tResult").hidden = true; $("tPlay").hidden = false;
  $("tModeName").textContent = mode === "story" ? `應用題・${STORY_LEVELS[opts.story]}` : mode === "timed" ? "限時 60 秒" : mode === "weak" ? "弱點加強" : opts.order === "seq" ? "照順序背" : "練習";
  if (mode === "timed") {
    R.left = 60;
    R.tick = setInterval(() => { R.left--; updateHead(); if (R.left <= 0) finish(); }, 1000);
  }
  nextQ();
}

function updateHead() {
  if (R.mode === "timed") {
    $("tProg").textContent = `剩下 ${Math.max(0, R.left)} 秒　答對 ${R.correct} 題`;
    $("tBar").style.width = `${(Math.max(0, R.left) / 60) * 100}%`;
  } else {
    const extra = R.retry.length ? `　再考一次 ${R.retry.length} 題` : "";
    $("tProg").textContent = `第 ${Math.min(R.i + 1, R.total)} / ${R.total} 題　答對 ${R.correct} 題${extra}`;
    $("tBar").style.width = `${(R.i / R.total) * 100}%`;
  }
}

function nextQ() {
  clearTimeout(R.timer);
  if (!R.mode) return;
  if (R.i >= R.queue.length) {
    // 答錯的題目最後再考一次（限時挑戰不用）
    if (R.mode !== "timed" && R.retry.length) { R.queue = R.queue.concat(R.retry); R.retry = []; R.total = R.queue.length; }
    else return finish();
  }
  R.q = R.queue[R.i]; R.input = ""; R.locked = false; R.qt0 = Date.now();
  // 應用題：一步的題目要先選算式（eqDone），兩步驟的直接算
  R.eqDone = !(R.q.story && R.q.choices); R.miss = false;
  renderQ();
  updateHead();
  $("tFb").textContent = ""; $("tFb").className = "fb";
  $("tGo").textContent = "確定";
  if (voiceOn) speak(R.q.story ? R.q.text : questionText(R.q).replace("□", "多少").replace("×", "乘"));
}
function renderQ() {
  const q = R.q, box = `<span class="tbox${R.locked ? (R.lastOk ? " right" : " wrong") : ""}">${R.input || ""}</span>`;
  $("tStory").hidden = !q.story;
  $("tEq").hidden = !(q.story && !R.eqDone);
  $("tPad").classList.toggle("off", !R.eqDone);
  if (q.story) {
    $("tStory").textContent = q.text;
    if (!R.eqDone) {
      $("tEq").innerHTML = `<b>先選算式：要怎麼算？</b><div>${q.choices.map((c, i) => `<button class="gchoice" data-i="${i}"><span class="knum">${c}</span></button>`).join("")}</div>`;
      $("tQ").innerHTML = "";
      return;
    }
    // 一步的題目顯示選好的算式；兩步驟的只顯示答案格和單位
    $("tQ").innerHTML = `${q.choices ? `<span class="teq">${q.eq} =</span>` : `<span class="teq">答</span>`}${box}<span class="tunit">${q.unit}</span>`;
    return;
  }
  const cell = (x) => (x === null ? `<span class="tbox${R.locked ? (R.lastOk ? " right" : " wrong") : ""}">${R.input || ""}</span>` : `<span>${x}</span>`);
  $("tQ").innerHTML = `${cell(R.q.parts[0])}<span class="tsym">×</span>${cell(R.q.parts[1])}<span class="tsym">=</span>${cell(R.q.parts[2])}`;
}

function press(k) {
  if (!R.mode || !/^(\d|del|ok)$/.test(String(k))) return; // 只收數字、刪除、確定
  if (!R.eqDone) return; // 應用題還沒選算式
  if (R.locked) { if (k === "ok") nextQ(); return; }
  if (R.q.story && k !== "del" && k !== "ok" && R.input.length >= 3) return;
  if (k === "del") R.input = R.input.slice(0, -1);
  else if (k === "ok") { if (R.input !== "") submit(); return; }
  else if (R.input.length < (R.q.story ? 3 : 2)) R.input += k;
  renderQ();
}

function submit() {
  const q = R.q, ok = +R.input === q.answer, ms = Date.now() - R.qt0;
  R.locked = true; R.lastOk = ok; R.answered++;
  // 記到這位家人的熟練度（再考一次的題目也算）。應用題要多花時間讀題，所以只記答錯，不拿它的秒數來算熟練。
  if (q.key && factOf(q.key) && !(q.story && ok)) {
    const times = loadTimes();
    times.stats[q.key] = record(times.stats[q.key], ok, ms, today());
    saveTimes(times);
  }
  renderQ();
  if (q.story) return submitStory(q, ok);
  if (ok) {
    R.correct++;
    $("tFb").textContent = `答對了！${chant(q.a, q.b)}`; $("tFb").className = "fb ok";
    R.i++;
    R.timer = setTimeout(nextQ, R.mode === "timed" ? 350 : 700);
  } else {
    if (!q.again) { R.wrong.push(`${q.a} × ${q.b} = ${q.p}　${chant(q.a, q.b)}`); if (R.mode !== "timed") R.retry.push({ ...q, again: true }); }
    $("tFb").innerHTML = `答案是 <b>${q.answer}</b>。${q.a} × ${q.b} = ${q.p}，<b>${chant(q.a, q.b)}</b>`; $("tFb").className = "fb no";
    if (voiceOn) speak(chant(q.a, q.b));
    R.i++;
    if (R.mode === "timed") R.timer = setTimeout(nextQ, 1200);
    else $("tGo").textContent = "下一題"; // 讓他看清楚口訣，自己按下一題
  }
}

// 應用題的批改：選算式和算答案都第一次就對，才算答對
function submitStory(q, ok) {
  if (!ok) R.miss = true;
  if (!R.miss) R.correct++;
  if (R.miss && !q.again) { R.wrong.push(`${q.text} → ${q.solution}`); if (!ok) R.retry.push({ ...q, again: true }); }
  R.i++;
  if (ok) {
    $("tFb").innerHTML = `答對了！<b>${q.solution}</b>，答案是 ${q.answer} ${q.unit}。`; $("tFb").className = "fb ok";
    $("tGo").textContent = "下一題";
  } else {
    $("tFb").innerHTML = `答案是 <b>${q.answer} ${q.unit}</b>。${q.solution}。${q.why}`; $("tFb").className = "fb no";
    $("tGo").textContent = "下一題";
    if (voiceOn) speak(`答案是 ${q.answer} ${q.unit}`);
  }
}

function finish() {
  const mode = R.mode, sec = (Date.now() - R.t0) / 1000;
  stopRun();
  $("tPlay").hidden = true; $("tResult").hidden = false;
  // 題數不含「再考一次」的題目；第一次就答對才算分
  const total = mode === "timed" ? R.answered : R.queue.filter((q) => !q.again).length;
  const firstRight = total - R.wrong.length;
  let text;
  if (mode === "timed") {
    const times = loadTimes(), record60 = R.correct > times.best60;
    if (record60) { times.best60 = R.correct; saveTimes(times); }
    $("tScore").textContent = R.correct; $("tUnit").textContent = "題";
    text = `60 秒答對 ${R.correct} 題${R.wrong.length ? `，答錯 ${R.wrong.length} 題` : ""}。` + (record60 ? "新紀錄！" : `最高紀錄是 ${times.best60} 題。`);
    $("tStars").innerHTML = "";
  } else {
    const st = stars(firstRight, total);
    $("tScore").textContent = total ? Math.round((firstRight / total) * 100) : 0; $("tUnit").textContent = "分";
    $("tStars").innerHTML = starHTML(st);
    text = `${total} 題裡第一次就答對 ${firstRight} 題，花了 ${Math.round(sec)} 秒。` + (firstRight === total ? "全部答對，太厲害了！" : mode === "story" ? "下面是答錯的題目和正確的算式，再看一次。" : "答錯的題目記下來了，可以用「弱點加強」再練。");
    saveStars(mode === "story" ? `times.story.${opts.story}` : `times.${mode}`, st);
  }
  $("tText").textContent = text;
  $("tWrong").innerHTML = R.wrong.length ? `<b>這次答錯的：</b>` + [...new Set(R.wrong)].map((w) => `<span>${w}</span>`).join("") : "";
  const label = mode === "story" ? `九九乘法・應用題（${STORY_LEVELS[opts.story]}）` : mode === "timed" ? "九九乘法・限時 60 秒" : mode === "weak" ? "九九乘法・弱點加強" : `九九乘法・${opts.order === "seq" ? "照順序背" : "練習"}（${[...opts.tables].sort().join("、")} 的乘法）`;
  if (total > 0) logSession({ id: mode === "story" ? `times.story.${opts.story}` : `times.${mode}`, label, correct: firstRight, total, sec, wrong: [...new Set(R.wrong)] });
  $("tAgain").dataset.mode = mode;
}

/* ---------- 操作 ---------- */
function bind() {
  if (bound) return;
  bound = true;
  $("tTable").addEventListener("click", (ev) => { const b = ev.target.closest(".tcell"); if (b) showFact(b.dataset.key); });
  $("tTables").addEventListener("click", (ev) => {
    const b = ev.target.closest("button"); if (!b) return;
    const a = +b.dataset.a; if (opts.tables.has(a)) opts.tables.delete(a); else opts.tables.add(a);
    renderOpts();
  });
  $("tAll").onclick = () => { opts.tables = new Set(TABLES); renderOpts(); };
  $("tNone").onclick = () => { opts.tables = new Set(); renderOpts(); };
  for (const [id, key, num] of [["tOrder", "order", false], ["tType", "type", false], ["tCount", "count", true]]) {
    $(id).addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (!b) return; opts[key] = num ? +b.dataset.v : b.dataset.v; renderOpts(); });
  }
  $("tStart").onclick = () => start("practice");
  $("tTimedBtn").onclick = () => start("timed");
  $("tWeakBtn").onclick = () => start("weak");
  $("tStoryBtn").onclick = () => start("story");
  $("tStoryLevel").addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (!b) return; opts.story = +b.dataset.v; renderOpts(); });
  // 應用題：選算式
  $("tEq").addEventListener("click", (ev) => {
    const b = ev.target.closest(".gchoice"), q = R.q;
    if (!b || R.eqDone || b.disabled) return;
    if (q.choices[+b.dataset.i] === q.eq) {
      R.eqDone = true; R.qt0 = Date.now();
      $("tFb").textContent = `對了！${q.why}`; $("tFb").className = "fb ok";
      renderQ();
    } else {
      R.miss = true; b.classList.add("wrong"); b.disabled = true;
      $("tFb").textContent = `再想想看。${q.why}`; $("tFb").className = "fb no";
    }
  });
  $("tQuit").onclick = renderTimes;
  $("tHomeBtn").onclick = renderTimes;
  $("tAgain").onclick = () => start($("tAgain").dataset.mode || "practice");
  $("tPad").addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (b) press(b.dataset.k); });
  $("tVoice").hidden = !canSpeak;
  $("tVoice").onclick = () => {
    voiceOn = !voiceOn;
    $("tVoice").textContent = "朗讀：" + (voiceOn ? "開" : "關");
    $("tVoice").setAttribute("aria-pressed", String(voiceOn));
    if (!voiceOn) stopSpeak();
  };
  // 電腦可以直接用鍵盤打
  window.addEventListener("keydown", (ev) => {
    if (!R.mode || $("view-times").hidden || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (/^[0-9]$/.test(ev.key)) press(ev.key);
    else if (ev.key === "Backspace") { ev.preventDefault(); press("del"); }
    else if (ev.key === "Enter") { ev.preventDefault(); press("ok"); }
  });
}
