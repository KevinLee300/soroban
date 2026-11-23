import { renderCatalog } from "./catalogapp.js";
import { createAbacus } from "./abacus.js";
import * as L from "./logic.js";
import { LEVELS } from "./levels.js";
import { canSpeak, speak, stopSpeak } from "./speech.js";
import { loadProgress, saveStars, loadProfiles, activeProfile, selectProfile, addProfile, logSession, loadGrade, saveGrade } from "./storage.js";
import { renderDrill } from "./drill.js";
import { renderGrade2 } from "./grade2app.js";
import { createCoinTray } from "./coins.js";
import { renderMathHome, openGame, leaveGame } from "./kidsapp.js";
import { renderDaily, renderParent } from "./records.js";
import { renderSheet } from "./sheetapp.js";
import { renderClock, leaveClock } from "./clockapp.js";
import { renderTimes, leaveTimes } from "./timesapp.js";
import { renderBridge } from "./timesbridge.js";
import { leaveIsland, renderIsland } from "./timesisland.js";
import { renderSnack } from "./timessnack.js";
import { renderDuo, leaveDuo } from "./duoapp.js";

const $ = (id) => document.getElementById(id);
const PRACTICE_TOTAL = 10;

let level = null, rule = null, demos = [], demoIdx = 0, pset = null;
let mainAb = null, quizAb = null, tray = null;
// 錢幣對照（零錢盒）預設打開，記在這台裝置
let coinsOn = true;
try { coinsOn = localStorage.getItem("soroban.coins") !== "off"; } catch { /* 用預設 */ }
let voiceOn = canSpeak;
const player = { data: null, step: 0, playing: false, timer: null };
const P = { i: 0, correct: 0, q: null, firstTry: true, done: false };

if (!canSpeak) $("voice").hidden = true;
else { $("voice").textContent = "朗讀：開"; $("voice").setAttribute("aria-pressed", "true"); }

/* ---------- 路由 ---------- */
function route() {
  stopDemo();
  const catalog = /^#catalog(?:\?|$)/.test(location.hash);
  $("view-catalog").hidden = !catalog;
  const grade2 = location.hash.match(/^#grade2(?:-(\d+)-(\d+))?$/);
  $("view-grade2").hidden = !grade2;
  // #level-2 是關卡；#level-2-add 是直接進這一關的「加法」練習（每日任務用）
  const m = location.hash.match(/^#level-(\d+)(?:-([a-z0-9]+))?$/);
  const lv = m && LEVELS.find((l) => l.id === +m[1] && l.ready);
  const drill = !lv && location.hash === "#drill";
  // 幼兒數學：#math 是遊戲地圖，#math-count 這種是一個遊戲
  const gm = !lv && location.hash.match(/^#math-([a-z]+)$/);
  leaveGame();
  const game = !!gm && openGame(gm[1]);
  const math = !lv && !game && (location.hash === "#math" || !!gm);
  const parent = !lv && location.hash === "#parent";
  const sheet = !lv && location.hash === "#sheet";
  $("view-sheet").hidden = !sheet;
  const clock = !lv && location.hash === "#clock";
  $("view-clock").hidden = !clock;
  leaveClock();
  // #times 是九九乘法首頁；#times-weak、#times-story-2 這種是直接開始那個練習（每日任務用）
  const tm = !lv && location.hash.match(/^#times(?:-([a-z]+)(?:-(\d))?)?$/);
  const times = !!tm, activity = tm?.[1];
  const bridge = activity === "bridge", island = activity === "island", snack = activity === "snack";
  const regularTimes = times && !bridge && !island && !snack;
  $("view-times").hidden = !regularTimes;
  $("view-times-bridge").hidden = !bridge;
  $("view-times-island").hidden = !island;
  $("view-times-snack").hidden = !snack;
  if (!regularTimes) leaveTimes();
  if (!island) leaveIsland();
  const duo = !lv && location.hash === "#duo";
  $("view-duo").hidden = !duo;
  if (!duo) leaveDuo();
  $("view-parent").hidden = !parent;
  const abacus = !lv && location.hash === "#abacus";
  $("view-abacus").hidden = !abacus;
  $("view-home").hidden = catalog || !!grade2 || !!lv || drill || math || game || parent || sheet || clock || times || duo || abacus;
  $("view-level").hidden = !lv;
  $("view-drill").hidden = !drill;
  $("view-math").hidden = !math;
  $("view-game").hidden = !game;
  const activeNav = parent ? "navParent" : $("view-home").hidden ? "navCatalog" : "navHome";
  for (const link of document.querySelectorAll(".topnav a")) {
    link.classList.toggle("on", link.id === activeNav);
    if (link.id === activeNav) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
  if (catalog) renderCatalog();
  else if (grade2) renderGrade2(grade2[1], grade2[2]);
  else if (lv) {
    openLevel(lv);
    if (m[2]) { pset = practiceSets(lv).find((s) => s.id === m[2]) || null; setTab("practice"); }
  } else if (drill) renderDrill(); else if (math) renderMathHome(); else if (parent) renderParent(); else if (sheet) renderSheet(); else if (clock) renderClock(); else if (bridge) renderBridge(); else if (island) renderIsland(); else if (snack) renderSnack(); else if (times) renderTimes(tm[1], tm[2]); else if (duo) renderDuo(); else if (abacus) renderAbacus(); else if (!game) renderHome();
  window.scrollTo(0, 0);
}

const starHTML = (s) => `<span class="stars" aria-label="${s} 顆星">${"★".repeat(s)}<span class="off">${"★".repeat(3 - s)}</span></span>`;

// 練習分組：沒有分組的關卡就只有一組
const practiceSets = (lv) => lv.practice || [{ id: "", label: "", question: lv.question }];
const starKey = (lv, set) => (set.id ? `${lv.id}.${set.id}` : String(lv.id));
// 首頁顯示這一關所有分組裡最好的星星數
const levelStars = (prog, lv) => Math.max(0, ...practiceSets(lv).map((s) => prog[starKey(lv, s)] || 0), prog[lv.id] || 0);

function renderPracticeSets() {
  const sets = practiceSets(level), prog = loadProgress();
  $("pSets").hidden = sets.length < 2;
  $("pSets").innerHTML = sets.map((s, i) => `<button data-i="${i}" aria-pressed="${s === pset}">
      <b>${s.label}</b>${s.sub ? `<small>${s.sub}</small>` : ""}${starHTML(prog[starKey(level, s)] || 0)}</button>`).join("");
}
$("pSets").addEventListener("click", (ev) => {
  const b = ev.target.closest("button");
  if (!b) return;
  pset = practiceSets(level)[+b.dataset.i];
  renderPracticeSets();
  startPractice();
});

// 首頁：誰在練習、年級、今天的任務、全部的練習
function renderHome() {
  $("grade").value = loadGrade();
  renderDaily();
  const picker = $("profile");
  picker.replaceChildren(...loadProfiles().map((name) => new Option(name, name)));
  picker.value = activeProfile();
  // 珠算卡片顯示拿到幾顆星（所有關卡加起來）
  const prog = loadProgress(), ready = LEVELS.filter((l) => l.ready);
  const got = ready.reduce((n, l) => n + levelStars(prog, l), 0);
  $("abacusStars").innerHTML = `<span class="stars" aria-label="珠算拿到 ${got} 顆星，共 ${ready.length * 3} 顆">★ ${got} / ${ready.length * 3}</span>`;
}

// 珠算：關卡地圖
function renderAbacus() {
  const prog = loadProgress();
  $("levels").innerHTML = LEVELS.map((l) => l.ready
    ? `<a class="lvcard" href="#level-${l.id}"><span class="lvnum">${l.id}</span><span class="lvtext"><b>${l.title}</b><small>${l.sub}</small></span>${starHTML(levelStars(prog, l))}</a>`
    : `<div class="lvcard locked"><span class="lvnum">${l.id}</span><span class="lvtext"><b>${l.title}</b><small>${l.sub}</small></span><span class="soon">製作中</span></div>`
  ).join("");
}

$("grade").onchange = (event) => { saveGrade(event.target.value); renderHome(); };
$("profile").onchange = (event) => { selectProfile(event.target.value); renderHome(); };
$("addProfile").onsubmit = (event) => {
  event.preventDefault();
  const input = $("profileName");
  if (addProfile(input.value)) {
    input.value = "";
    $("profileError").hidden = true;
    renderHome();
  } else $("profileError").hidden = false;
};

/* ---------- 關卡 ---------- */
function openLevel(lv) {
  level = lv;
  pset = null;
  $("lvTitle").textContent = `第 ${lv.id} 關　${lv.title}`;
  $("lvSub").textContent = lv.sub;
  $("view-level").style.setProperty("--rods", lv.rods || 1);
  $("abacusMain").innerHTML = "";
  mainAb = createAbacus($("abacusMain"), { rods: lv.rods || 1 });
  $("coinTray").innerHTML = "";
  tray = createCoinTray($("coinTray"), { rods: lv.rods || 1 });
  // 算盤和零錢盒等高：依兩張圖的寬度比例分配空間
  const wa = mainAb.el.viewBox.baseVal.width, wt = tray.el.viewBox.baseVal.width;
  $("abacusMain").parentElement.style.flex = `${wa} 1 0`;
  $("coinFig").style.flex = `${wt} 1 0`;
  $("view-level").style.setProperty("--pair-w", `${Math.round((wa + wt) * 0.85)}px`);
  applyCoins();
  $("abacusQuiz").innerHTML = "";
  quizAb = createAbacus($("abacusQuiz"), { rods: lv.rods || 1, interactive: true, onChange: onQuizChange });
  $("picker").hidden = !lv.rules;
  $("picker").classList.toggle("compact", !!lv.rules && lv.rules.length > 8);
  if (lv.rules) { rule = lv.rules[0]; renderPicker(); }
  setTab("learn");
  loadDemos();
}

function renderPicker() {
  for (const [rowId, op] of [["rowPlus", "+"], ["rowMinus", "-"]]) {
    const row = $(rowId);
    row.innerHTML = "";
    level.rules.filter((r) => r.op === op).forEach((r) => {
      const [l, rr] = level.label(r);
      const b = document.createElement("button");
      b.className = "rule " + (op === "+" ? "p" : "m");
      b.innerHTML = `<span class="ch"><b>${l}</b> ${level.chantShort(r)}</span><span class="fx">${l} = ${rr}</span>`;
      b.setAttribute("aria-pressed", String(r === rule));
      b.onclick = () => { rule = r; renderPicker(); loadDemos(); };
      row.appendChild(b);
    });
  }
}

function loadDemos() {
  demos = level.rules ? level.demosFor(rule) : level.demos();
  const ch = $("chant");
  ch.hidden = !level.rules;
  if (level.rules) {
    ch.className = "chant " + (rule.op === "+" ? "p" : "m");
    ch.innerHTML = `<small>口訣</small>${level.label(rule)[0]} ${level.chantShort(rule)}`;
  }
  $("exRow").hidden = demos.length < 2;
  loadDemo(0);
}

function renderChips() {
  const ex = $("ex");
  ex.innerHTML = "";
  demos.forEach((d, i) => {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = d.label;
    b.setAttribute("aria-pressed", String(i === demoIdx));
    b.onclick = () => loadDemo(i);
    ex.appendChild(b);
  });
}

/* ---------- 動畫播放 ---------- */
function loadDemo(i, continuing = false) {
  if (!continuing) stopDemo();
  demoIdx = i;
  player.data = demos[i].build();
  $("eq").innerHTML = "";
  $("eq").hidden = player.data.toks.length === 0;
  player.data.toks.forEach((t) => {
    const s = document.createElement("span");
    s.className = "tok " + (t.c || "");
    s.textContent = t.t;
    $("eq").appendChild(s);
  });
  $("dots").innerHTML = "";
  player.data.steps.forEach((_, k) => {
    const b = document.createElement("button");
    b.setAttribute("aria-label", `第 ${k + 1} 步`);
    b.onclick = () => { stopDemo(); go(k); };
    $("dots").appendChild(b);
  });
  renderChips();
  go(0, true);
}

function go(i, silent) {
  const steps = player.data.steps;
  player.step = Math.max(0, Math.min(steps.length - 1, i));
  const s = steps[player.step];
  mainAb.setValue(s.v);
  mainAb.highlight(s.hl);
  $("val").textContent = s.v;
  [...$("eq").children].forEach((el, k) => { el.classList.toggle("hide", k >= s.show); el.classList.toggle("on", s.on.includes(k)); });
  $("cap").textContent = s.cap;
  tray.setValue(s.v);
  tray.highlight(s.hl);
  $("coinCap").textContent = L.coinLine(steps, player.step, level.rods || 1);
  [...$("dots").children].forEach((d, k) => { d.classList.toggle("done", k < player.step); d.classList.toggle("cur", k === player.step); });
  $("prev").disabled = player.step === 0;
  $("next").disabled = player.step === steps.length - 1;
  if (!silent && voiceOn) speak(narration());
}

// 朗讀內容：錢幣打開時，順便念出錢幣的說法
function narration() {
  const s = player.data.steps[player.step];
  return coinsOn ? `${s.cap}${$("coinCap").textContent}` : s.cap;
}

function applyCoins() {
  $("coinFig").hidden = !coinsOn;
  $("coinCap").hidden = !coinsOn;
  $("coinBtn").textContent = "錢幣：" + (coinsOn ? "開" : "關");
  $("coinBtn").setAttribute("aria-pressed", String(coinsOn));
  $("view-level").classList.toggle("with-coins", coinsOn);
}
$("coinBtn").onclick = () => {
  coinsOn = !coinsOn;
  try { localStorage.setItem("soroban.coins", coinsOn ? "on" : "off"); } catch { /* 存不了就算了 */ }
  applyCoins();
};

const atEnd = () => player.data && player.step >= player.data.steps.length - 1;

function playDemo() {
  if (atEnd()) loadDemo(0);
  player.playing = true;
  $("play").textContent = "暫停";
  const advance = () => {
    player.timer = setTimeout(() => {
      if (!player.playing) return;
      if (atEnd()) {
        if (demoIdx + 1 >= demos.length) { stopDemo(); return; }
        loadDemo(demoIdx + 1, true);
      } else go(player.step + 1, true);
      narrate();
    }, atEnd() ? 1800 : voiceOn ? 100 : 2300);
  };
  const narrate = () => (voiceOn ? speak(narration(), () => player.playing && advance()) : advance());
  narrate();
}

function stopDemo() {
  player.playing = false;
  clearTimeout(player.timer);
  $("play").textContent = atEnd() ? "再看一次" : "播放";
  stopSpeak();
}

$("play").onclick = () => (player.playing ? stopDemo() : playDemo());
$("prev").onclick = () => { stopDemo(); go(player.step - 1); };
$("next").onclick = () => { stopDemo(); go(player.step + 1); $("play").textContent = atEnd() ? "再看一次" : "播放"; };
$("voice").onclick = () => {
  if (player.playing) stopDemo();
  voiceOn = !voiceOn;
  $("voice").textContent = "朗讀：" + (voiceOn ? "開" : "關");
  $("voice").setAttribute("aria-pressed", String(voiceOn));
  if (!voiceOn) stopSpeak();
};

/* ---------- 分頁 ---------- */
function setTab(name) {
  const learn = name === "learn";
  $("tabLearn").setAttribute("aria-selected", String(learn));
  $("tabPractice").setAttribute("aria-selected", String(!learn));
  $("panelLearn").hidden = !learn;
  $("panelPractice").hidden = learn;
  if (!learn) { stopDemo(); startPractice(); }
}
$("tabLearn").onclick = () => setTab("learn");
$("tabPractice").onclick = () => setTab("practice");

/* ---------- 練習 ---------- */
function startPractice() {
  if (!pset || !practiceSets(level).includes(pset)) pset = practiceSets(level)[0];
  renderPracticeSets();
  P.i = 0; P.correct = 0; P.q = null; P.wrong = []; P.t0 = Date.now();
  $("result").hidden = true;
  $("quizArea").hidden = false;
  nextQ();
}

function nextQ() {
  if (P.i >= PRACTICE_TOTAL) return finish();
  let q;
  do { q = pset.question(); } while (P.q && q.text === P.q.text);
  P.q = q; P.firstTry = true; P.done = false;
  $("qq").textContent = q.text;
  $("qprog").textContent = `第 ${P.i + 1} / ${PRACTICE_TOTAL} 題　答對 ${P.correct} 題`;
  $("qbar").style.width = `${(P.i / PRACTICE_TOTAL) * 100}%`;
  quizAb.setValue(q.start);
  $("qval").textContent = q.start;
  setFb("", "");
  $("check").hidden = false;
  $("qreset").hidden = false;
  $("qnext").hidden = true;
}

function setFb(text, cls) { $("fb").textContent = text; $("fb").className = "fb " + cls; }

function onQuizChange(v) {
  $("qval").textContent = v;
  if (!P.done) setFb("", "");
}

$("check").onclick = () => {
  const v = quizAb.value();
  if (v === P.q.target) {
    if (P.firstTry) P.correct++;
    P.done = true;
    setFb(`答對了！答案是 ${P.q.target}`, "ok");
    if (voiceOn) speak("答對了！");
    $("check").hidden = true;
    $("qreset").hidden = true;
    $("qnext").hidden = false;
    $("qnext").textContent = P.i + 1 >= PRACTICE_TOTAL ? "看成績" : "下一題";
    $("qnext").focus();
  } else {
    if (P.firstTry) P.wrong.push(P.q.text.replace(" = ?", ""));
    P.firstTry = false;
    setFb(`現在是 ${v}，再試一次。提示：${P.q.hint}`, "no");
  }
};
$("qreset").onclick = () => { quizAb.setValue(P.q.start); onQuizChange(P.q.start); };
$("qnext").onclick = () => { P.i++; nextQ(); };

function finish() {
  const s = L.stars(P.correct, PRACTICE_TOTAL);
  const best = saveStars(starKey(level, pset), s);
  logSession({
    id: starKey(level, pset), label: `珠算 第 ${level.id} 關 ${level.title}${pset.label ? `・${pset.label}` : ""}`,
    correct: P.correct, total: PRACTICE_TOTAL, sec: (Date.now() - P.t0) / 1000, wrong: P.wrong,
  });
  renderPracticeSets();
  $("quizArea").hidden = true;
  $("result").hidden = false;
  $("rStars").innerHTML = starHTML(s);
  $("rText").textContent = `${PRACTICE_TOTAL} 題裡第一次就答對 ${P.correct} 題。` + (s === 3 ? "太厲害了！" : s >= 1 ? "很棒，再練一次拿滿三顆星！" : "沒關係，回去看動畫再試一次。");
  $("rBest").textContent = `${pset.label ? `「${pset.label}」` : "這一關"}最好成績：${best} 顆星`;
  if (voiceOn) speak(`得到 ${s} 顆星`);
}
$("again").onclick = startPractice;

window.addEventListener("hashchange", route);
route();
