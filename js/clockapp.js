// 時鐘小學堂的畫面：卡通時鐘「滴答」、一步一步的引導、換你試試。課程內容在 clocklesson.js。
import { CHAPTERS, applyTap, chapterSteps, forwardAngle, handAngles, sameTime, timeText } from "./clocklesson.js";
import { canSpeak, speak, stopSpeak } from "./speech.js";
import { loadProgress, logSession, saveStars } from "./storage.js";

const $ = (id) => document.getElementById(id);
const CX = 150, CY = 178; // 時鐘中心
const C = { ch: 0, steps: [], i: 0, time: [10, 0], ha: 300, ma: 0, done: false, hand: "short", tries: 0, miss: 0, firstTry: 0, asked: 0, t0: 0, timer: null };
let voiceOn = canSpeak, built = false;

/* ---------- 畫卡通時鐘（自己畫的簡單圖案） ---------- */
const turtle = `<g class="rider"><ellipse cx="0" cy="-11" rx="4.5" ry="5" fill="#8BC34A"/><circle cx="-1.6" cy="-12.5" r="1" fill="#33691E"/><circle cx="1.6" cy="-12.5" r="1" fill="#33691E"/><ellipse cx="-9" cy="-4" rx="3" ry="2.2" fill="#8BC34A"/><ellipse cx="9" cy="-4" rx="3" ry="2.2" fill="#8BC34A"/><ellipse cx="-8" cy="6" rx="3" ry="2.2" fill="#8BC34A"/><ellipse cx="8" cy="6" rx="3" ry="2.2" fill="#8BC34A"/><ellipse cx="0" cy="1" rx="10" ry="9" fill="#43A047" stroke="#1B5E20" stroke-width="1.5"/><path d="M-5 -3h10M-7 3h14M0 -7v16" stroke="#1B5E20" stroke-width="1.2" fill="none" opacity=".55"/></g>`;
const rabbit = `<g class="rider"><ellipse cx="-4.5" cy="-12" rx="3" ry="6.5" fill="#fff" stroke="#1565C0" stroke-width="1.5"/><ellipse cx="4.5" cy="-12" rx="3" ry="6.5" fill="#fff" stroke="#1565C0" stroke-width="1.5"/><ellipse cx="-4.5" cy="-12" rx="1.2" ry="4" fill="#F8BBD0"/><ellipse cx="4.5" cy="-12" rx="1.2" ry="4" fill="#F8BBD0"/><circle cx="0" cy="0" r="10" fill="#fff" stroke="#1565C0" stroke-width="1.5"/><circle cx="-3.5" cy="-2" r="1.4" fill="#263238"/><circle cx="3.5" cy="-2" r="1.4" fill="#263238"/><ellipse cx="0" cy="2" rx="1.6" ry="1.2" fill="#F06292"/><path d="M-3 5q3 3 6 0" stroke="#263238" stroke-width="1.1" fill="none" stroke-linecap="round"/></g>`;

function buildClock() {
  let nums = "";
  for (let n = 1; n <= 12; n++) {
    const a = (n * 30 * Math.PI) / 180, x = CX + 88 * Math.sin(a), y = CY - 88 * Math.cos(a);
    nums += `<g class="cnum" data-n="${n}" role="button" aria-label="數字 ${n}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="17"/><text x="${x.toFixed(1)}" y="${(y + 1).toFixed(1)}">${n}</text></g>`;
  }
  $("clockHost").innerHTML = `<svg class="tick" id="tick" viewBox="0 0 300 320" role="img" aria-label="時鐘">
    <g class="feet"><rect x="78" y="286" width="26" height="30" rx="10" transform="rotate(18 91 300)"/><rect x="196" y="286" width="26" height="30" rx="10" transform="rotate(-18 209 300)"/></g>
    <g class="bells"><line x1="150" y1="30" x2="150" y2="58" /><circle cx="150" cy="26" r="9"/><circle cx="82" cy="62" r="30"/><circle cx="218" cy="62" r="30"/></g>
    <circle class="rim" cx="${CX}" cy="${CY}" r="126"/>
    <circle class="plate" cx="${CX}" cy="${CY}" r="108"/>
    <g class="facebits" aria-hidden="true">
      <circle class="cheek" cx="108" cy="204" r="10"/><circle class="cheek" cx="192" cy="204" r="10"/>
      <g class="eyes"><ellipse cx="128" cy="150" rx="8" ry="10"/><ellipse cx="172" cy="150" rx="8" ry="10"/><circle class="pupil" cx="129" cy="152" r="4"/><circle class="pupil" cx="173" cy="152" r="4"/></g>
      <path class="mouth" d="M132 214q18 16 36 0"/>
    </g>
    <g class="nums">${nums}</g>
    <g class="hand long" data-hand="long" role="button" aria-label="長針"><line class="hit" x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY - 96}"/><line class="bar" x1="${CX}" y1="${CY + 12}" x2="${CX}" y2="${CY - 76}"/><g class="tip" transform="translate(${CX} ${CY - 54})">${rabbit}</g></g>
    <g class="hand short" data-hand="short" role="button" aria-label="短針"><line class="hit" x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY - 62}"/><line class="bar" x1="${CX}" y1="${CY + 10}" x2="${CX}" y2="${CY - 54}"/><g class="tip" transform="translate(${CX} ${CY - 34})">${turtle}</g></g>
    <circle class="cap" cx="${CX}" cy="${CY}" r="8"/>
  </svg>`;
  built = true;
}

const SCENES = {
  sun: ["起床囉", `<circle cx="30" cy="30" r="13" fill="#FFCA28"/><g stroke="#FFA000" stroke-width="3.5" stroke-linecap="round"><path d="M30 6v7M30 47v7M6 30h7M47 30h7M13 13l5 5M42 42l5 5M47 13l-5 5M18 42l-5 5"/></g><circle cx="26" cy="28" r="1.6" fill="#5D4037"/><circle cx="34" cy="28" r="1.6" fill="#5D4037"/><path d="M26 34q4 3 8 0" stroke="#5D4037" stroke-width="1.6" fill="none" stroke-linecap="round"/>`],
  bowl: ["吃午餐", `<path d="M10 30h40a20 18 0 0 1-40 0z" fill="#EF5350"/><path d="M12 30a18 9 0 0 1 36 0z" fill="#FFF8E1"/><path d="M22 14q-4 5 0 9M30 11q-4 6 0 11M38 14q-4 5 0 9" stroke="#B0BEC5" stroke-width="2.5" fill="none" stroke-linecap="round"/><rect x="24" y="48" width="12" height="4" rx="2" fill="#C62828"/>`],
  bag: ["上學去", `<rect x="14" y="18" width="32" height="34" rx="8" fill="#42A5F5"/><path d="M22 18v-4a8 8 0 0 1 16 0v4" stroke="#1565C0" stroke-width="3.5" fill="none"/><rect x="20" y="32" width="20" height="13" rx="4" fill="#BBDEFB"/><rect x="27" y="30" width="6" height="7" rx="2" fill="#FFCA28"/>`],
  cookie: ["吃點心", `<circle cx="30" cy="30" r="20" fill="#D7A86E"/><circle cx="30" cy="30" r="20" fill="none" stroke="#A9773F" stroke-width="2"/><g fill="#5D4037"><circle cx="22" cy="23" r="3"/><circle cx="36" cy="21" r="2.6"/><circle cx="39" cy="34" r="3"/><circle cx="26" cy="38" r="2.8"/><circle cx="31" cy="29" r="2.2"/></g>`],
  moon: ["睡覺囉", `<path d="M40 44a19 19 0 1 1-8-34a15 15 0 0 0 8 34z" fill="#FFD54F"/><g fill="#FFF59D"><path d="M46 12l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z"/><circle cx="50" cy="32" r="2"/><circle cx="12" cy="14" r="1.8"/></g><text x="42" y="50" font-size="10" font-weight="700" fill="#90A4AE" font-family="Fredoka,sans-serif">z</text>`],
};

/* ---------- 時鐘的狀態 ---------- */
const nearAngle = (current, target) => target + 360 * Math.round((current - target) / 360);
// how："jump" 直接跳（換課、回上一步）、"spin" 慢慢走（示範）、"near" 走最近的路（小朋友自己撥）、預設往前走
function setTime(time, how = "") {
  const { ha, ma } = handAngles(time[0], time[1]);
  const tick = $("tick"), mins = (t) => (t[0] % 12) * 60 + t[1], gone = (mins(time) - mins(C.time) + 720) % 720;
  tick.classList.toggle("spin", how === "spin");
  tick.classList.toggle("jump", how === "jump");
  if (how === "jump") { C.ha = ha; C.ma = ma; }
  else if (how === "near") { C.ha = nearAngle(C.ha, ha); C.ma = nearAngle(C.ma, ma); }
  else if (how === "spin" && gone > 0 && gone <= 90) { C.ma += gone * 6; C.ha += gone * 0.5; } // 跟真的時鐘一樣走：長針跑一圈，短針走一格
  else { C.ha = forwardAngle(C.ha, ha); C.ma = forwardAngle(C.ma, ma); }
  C.time = time;
  tick.style.setProperty("--ha", `${C.ha}deg`);
  tick.style.setProperty("--ma", `${C.ma}deg`);
  tick.setAttribute("aria-label", `時鐘，現在是 ${timeText(...time)}`);
}
function highlight(hl) {
  const tick = $("tick");
  tick.classList.toggle("hl-short", hl === "short" || hl === "both");
  tick.classList.toggle("hl-long", hl === "long" || hl === "both");
  tick.classList.toggle("hl-nums", hl === "nums");
  for (const g of tick.querySelectorAll(".cnum")) g.classList.toggle("on", typeof hl === "number" && +g.dataset.n === hl);
}
const say = (text) => { if (voiceOn) speak(text); };

/* ---------- 課程流程 ---------- */
function renderChapters() {
  const prog = loadProgress();
  $("cChapters").innerHTML = CHAPTERS.map((ch, i) =>
    `<button data-ch="${i}" aria-pressed="${i === C.ch}"><span class="cno">${prog[`clock.${ch.id}`] ? "✓" : i + 1}</span><b>${ch.title}</b><small>${ch.sub}</small></button>`).join("");
}

function openChapter(i) {
  clearTimeout(C.timer);
  C.ch = i; C.steps = chapterSteps(CHAPTERS[i].id); C.i = 0;
  C.miss = 0; C.firstTry = 0; C.asked = 0; C.t0 = Date.now();
  renderChapters();
  $("cDone").hidden = true;
  $("cStage").hidden = false;
  // 換課：依這一課第一步的時間直接對好
  const first = C.steps.find((s) => s.time);
  setTime(first ? first.time : [10, 0], "jump");
  showStep(false);
}

// 這一步開始前，時鐘應該是幾點（往回找最近一次指定的時間；撥時鐘的步驟做完會變成目標）
function timeBefore(index) {
  let t = [10, 0];
  for (let k = 0; k < index; k++) {
    if (C.steps[k].time) t = C.steps[k].time;
    if (C.steps[k].do === "set") t = C.steps[k].target;
  }
  return t;
}

function showStep(back) {
  clearTimeout(C.timer);
  const s = C.steps[C.i];
  C.done = !s.do; C.tries = 0; C.hand = (s.hands || ["short"])[0];
  const want = s.time || timeBefore(C.i);
  if (back) setTime(want, "jump"); else if (!sameTime(want, C.time)) setTime(want, s.spin ? "spin" : "");
  highlight(s.do ? null : s.hl);
  $("cSay").textContent = s.say;
  $("cStep").textContent = `第 ${C.ch + 1} 課　${C.i + 1} / ${C.steps.length}`;
  $("cBar").style.width = `${(C.i / (C.steps.length - 1)) * 100}%`;
  const scene = s.scene && SCENES[s.scene];
  $("cScene").hidden = !scene;
  if (scene) $("cScene").innerHTML = `<svg viewBox="0 0 60 60" aria-hidden="true">${scene[1]}</svg><span>${scene[0]}</span>`;
  $("cFb").textContent = ""; $("cFb").className = "fb";
  $("tick").classList.toggle("tappable-hands", s.do === "tapHand");
  $("tick").classList.toggle("tappable-nums", s.do === "tapNum" || s.do === "set");
  $("tick").classList.remove("happy");
  // 互動區
  $("cTry").hidden = !s.do;
  $("cHands").hidden = !(s.do === "set" && s.hands.length > 1);
  $("cChoices").hidden = s.do !== "ask";
  if (s.do === "ask") $("cChoices").innerHTML = s.choices.map((c, k) => `<button class="gchoice" data-k="${k}"><span class="ktext">${timeText(...c)}</span></button>`).join("");
  if (s.do === "set") { renderHands(); $("cNow").textContent = `現在是 ${timeText(...C.time)}`; }
  $("cNow").hidden = s.do !== "set";
  $("cTryTitle").textContent = s.do === "ask" ? "選選看" : s.do === "set" ? "撥撥看：點時鐘上的數字" : "點點看";
  $("cPrev").disabled = C.i === 0;
  updateNext();
  say(s.say);
}
function updateNext() {
  const last = C.i === C.steps.length - 1;
  $("cNext").textContent = last ? "完成這一課" : "下一步";
  $("cNext").disabled = !C.done;
}
function renderHands() {
  for (const b of $("cHands").querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.hand === C.hand));
}

function right(msg = "答對了！") {
  if (C.done) return;
  C.done = true; C.asked++;
  if (C.tries === 0) C.firstTry++;
  $("cFb").textContent = msg; $("cFb").className = "fb ok";
  $("tick").classList.add("happy");
  $("tick").classList.remove("tappable-hands", "tappable-nums");
  say(msg);
  updateNext();
  $("cNext").focus();
}
function wrong(msg) {
  C.tries++; C.miss++;
  $("cFb").textContent = msg; $("cFb").className = "fb no";
  say(msg);
}

function finishChapter() {
  const ch = CHAPTERS[C.ch];
  saveStars(`clock.${ch.id}`, 3);
  logSession({ id: `clock.${ch.id}`, label: `時鐘小學堂 第 ${C.ch + 1} 課 ${ch.title}`, correct: C.firstTry, total: C.asked, sec: (Date.now() - C.t0) / 1000 });
  renderChapters();
  const last = C.ch === CHAPTERS.length - 1;
  $("cStage").hidden = true;
  $("cDone").hidden = false;
  $("cDoneText").textContent = last ? "六堂課都上完了！你會看整點和半點了。" : `「${ch.title}」上完了！${C.miss === 0 ? "全部一次就答對，好厲害！" : "做得很好！"}`;
  $("cNextCh").hidden = last;
  $("cGames").hidden = !last;
  say($("cDoneText").textContent);
}

/* ---------- 操作 ---------- */
function bind() {
  $("cChapters").addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (b) openChapter(+b.dataset.ch); });
  $("cNext").onclick = () => { if (!C.done) return; if (C.i === C.steps.length - 1) finishChapter(); else { C.i++; showStep(false); } };
  $("cPrev").onclick = () => { if (C.i > 0) { C.i--; showStep(true); } };
  $("cHear").onclick = () => { if (canSpeak) speak(C.steps[C.i].say); };
  $("cVoice").hidden = !canSpeak;
  $("cVoice").onclick = () => {
    voiceOn = !voiceOn;
    $("cVoice").textContent = "朗讀：" + (voiceOn ? "開" : "關");
    $("cVoice").setAttribute("aria-pressed", String(voiceOn));
    if (!voiceOn) stopSpeak();
  };
  $("cAgain").onclick = () => openChapter(C.ch);
  $("cNextCh").onclick = () => openChapter(Math.min(CHAPTERS.length - 1, C.ch + 1));
  $("cHands").addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (b) { C.hand = b.dataset.hand; renderHands(); } });
  $("cChoices").addEventListener("click", (ev) => {
    const b = ev.target.closest(".gchoice"), s = C.steps[C.i];
    if (!b || C.done || b.disabled) return;
    if (sameTime(s.choices[+b.dataset.k], s.time)) { b.classList.add("right"); right(`答對了！是 ${timeText(...s.time)}。`); }
    else { b.classList.add("wrong"); b.disabled = true; wrong(s.time[1] === 30 ? "再想想看。長針指 6 是半點，短針剛走過哪個數字？" : "再想想看。長針指 12 是整點，短針指著哪個數字？"); }
  });
  // 點時鐘：針或數字
  $("clockHost").addEventListener("click", (ev) => {
    const s = C.steps[C.i];
    if (!s || !s.do || C.done) return;
    const hand = ev.target.closest(".hand"), num = ev.target.closest(".cnum");
    if (s.do === "tapHand" && hand) {
      if (hand.dataset.hand === s.target) { highlight(s.target); right(s.target === "short" ? "答對了！這是短針。" : "答對了！這是長針。"); }
      else wrong(s.target === "short" ? "這是長針喔。短針比較短，是紅色的。" : "這是短針喔。長針比較長，是藍色的。");
    } else if (s.do === "tapNum" && num) {
      if (+num.dataset.n === s.target) { highlight(s.target); right(); }
      else wrong("不是這個數字，再找找看。");
    } else if (s.do === "set" && num) {
      const t = applyTap(C.time, C.hand, +num.dataset.n);
      if (!t) { wrong("長針先指 12 或 6 就好。12 是整點，6 是半點。"); return; }
      setTime(t, "near");
      $("cNow").textContent = `現在是 ${timeText(...t)}`;
      if (sameTime(t, s.target)) right(`太棒了！現在是 ${timeText(...s.target)}。`);
      else if (s.hands.length > 1 && t[0] % 12 === s.target[0] % 12 && C.hand === "short") {
        // 短針撥好了，提醒換撥長針
        C.hand = "long"; renderHands();
        $("cFb").textContent = "短針撥好了！再撥長針。"; $("cFb").className = "fb ok";
        say("短針撥好了！再撥長針。");
      } else { C.tries++; C.miss++; $("cFb").textContent = "還不是喔，再撥撥看。"; $("cFb").className = "fb no"; }
    }
  });
}

export function renderClock() {
  if (!built) { buildClock(); bind(); }
  // 從還沒上過的第一課開始
  const prog = loadProgress(), firstNew = CHAPTERS.findIndex((ch) => !prog[`clock.${ch.id}`]);
  openChapter(firstNew < 0 ? 0 : firstNew);
}
export function leaveClock() { clearTimeout(C.timer); if (built) stopSpeak(); }
