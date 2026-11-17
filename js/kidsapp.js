// 幼兒數學的畫面：遊戲地圖、選難度、10 題選擇題、星星。出題在 kids.js。
import { GROUPS, LEVEL_NAMES, findGame, makeQuestion } from "./kids.js";
import { stars } from "./logic.js";
import { canSpeak, speak, stopSpeak } from "./speech.js";
import { loadProgress, saveStars } from "./storage.js";

const $ = (id) => document.getElementById(id);
const TOTAL = 10;
const G = { game: null, level: 1, i: 0, correct: 0, q: null, firstTry: true, locked: false, timer: null };
let voiceOn = canSpeak;

const key = (game, level) => `m.${game.id}.${level}`;
const starHTML = (s) => `<span class="stars" aria-label="${s} 顆星">${"★".repeat(s)}<span class="off">${"★".repeat(3 - s)}</span></span>`;
const say = (text) => { if (voiceOn) speak(text); };

/* ---------- 遊戲地圖 ---------- */
export function renderMathHome() {
  leaveGame();
  const prog = loadProgress();
  $("mathGroups").innerHTML = GROUPS.map((grp) => `<div class="stack tight"><h2>${grp.title}</h2><div class="levels">${
    grp.games.map((g) => {
      const best = Math.max(0, ...[1, 2, 3].map((lv) => prog[key(g, lv)] || 0));
      const done = [1, 2, 3].filter((lv) => (prog[key(g, lv)] || 0) > 0).length;
      return `<a class="lvcard" href="#math-${g.id}"><span class="lvtext"><b>${g.title}</b><small>${g.sub}${done ? `　已玩 ${done}/3 個難度` : ""}</small></span>${starHTML(best)}</a>`;
    }).join("")}</div></div>`).join("");
}

/* ---------- 一個遊戲 ---------- */
export function openGame(id) {
  const game = findGame(id);
  if (!game) return false;
  G.game = game;
  $("gTitle").textContent = game.title;
  $("gSub").textContent = game.sub;
  $("gVoice").hidden = !canSpeak;
  // 預設從還沒拿到三顆星的最低難度開始
  const prog = loadProgress();
  G.level = [1, 2, 3].find((lv) => (prog[key(game, lv)] || 0) < 3) || 3;
  start();
  return true;
}

export function leaveGame() {
  clearTimeout(G.timer);
  if (G.game) stopSpeak();
  G.game = null;
}

function renderLevels() {
  const prog = loadProgress();
  $("gLevels").innerHTML = LEVEL_NAMES.map((name, i) =>
    `<button data-lv="${i + 1}" aria-pressed="${G.level === i + 1}"><b>${name}</b>${starHTML(prog[key(G.game, i + 1)] || 0)}</button>`).join("");
}
$("gLevels").addEventListener("click", (ev) => {
  const b = ev.target.closest("button");
  if (!b) return;
  G.level = +b.dataset.lv;
  start();
});

function start() {
  clearTimeout(G.timer);
  G.i = 0; G.correct = 0; G.q = null;
  renderLevels();
  $("gResult").hidden = true;
  $("gPlay").hidden = false;
  nextQ();
}

function nextQ() {
  if (G.i >= TOTAL) return finish();
  let q, tries = 0;
  do { q = makeQuestion(G.game, G.level); tries++; } while (G.q && q.say + q.scene === G.q.say + G.q.scene && tries < 20);
  G.q = q; G.firstTry = true; G.locked = false;
  $("gProg").textContent = `第 ${G.i + 1} / ${TOTAL} 題　答對 ${G.correct} 題`;
  $("gBar").style.width = `${(G.i / TOTAL) * 100}%`;
  $("gSay").textContent = q.say;
  $("gScene").innerHTML = q.scene;
  $("gScene").hidden = !q.scene;
  $("gChoices").className = "gchoices" + (q.pic ? " pic" : "") + (q.rows ? " rows" : "") + (q.big ? " bignum" : "");
  $("gChoices").innerHTML = q.choices.map((c, i) => `<button class="gchoice" data-i="${i}" aria-label="選項 ${i + 1}">${c.html}</button>`).join("");
  $("gFb").textContent = ""; $("gFb").className = "fb";
  say(q.say);
}

$("gChoices").addEventListener("click", (ev) => {
  const b = ev.target.closest(".gchoice");
  if (!b || G.locked || b.disabled) return;
  if (+b.dataset.i === G.q.answer) {
    G.locked = true;
    if (G.firstTry) G.correct++;
    b.classList.add("right");
    $("gFb").textContent = "答對了！"; $("gFb").className = "fb ok";
    say("答對了！");
    G.timer = setTimeout(() => { G.i++; nextQ(); }, 1300);
  } else {
    G.firstTry = false;
    b.classList.add("wrong"); b.disabled = true;
    $("gFb").textContent = "再想想看，再選一次。"; $("gFb").className = "fb no";
    say("再想想看");
  }
});

function finish() {
  const s = stars(G.correct, TOTAL), best = saveStars(key(G.game, G.level), s);
  renderLevels();
  $("gPlay").hidden = true;
  $("gResult").hidden = false;
  $("gStars").innerHTML = starHTML(s);
  $("gText").textContent = `${TOTAL} 題裡第一次就答對 ${G.correct} 題。` + (s === 3 ? "太厲害了！" : s >= 1 ? "很棒，再玩一次拿滿三顆星！" : "沒關係，慢慢來，再試一次。");
  $("gBest").textContent = `「${LEVEL_NAMES[G.level - 1]}」最好成績：${best} 顆星`;
  $("gHarder").hidden = !(s === 3 && G.level < 3);
  say(`得到 ${s} 顆星`);
}

$("gAgain").onclick = start;
$("gHarder").onclick = () => { G.level = Math.min(3, G.level + 1); start(); };
$("gHear").onclick = () => { if (G.q && canSpeak) speak(G.q.say); };
$("gVoice").onclick = () => {
  voiceOn = !voiceOn;
  $("gVoice").textContent = "朗讀：" + (voiceOn ? "開" : "關");
  $("gVoice").setAttribute("aria-pressed", String(voiceOn));
  if (!voiceOn) stopSpeak();
};
