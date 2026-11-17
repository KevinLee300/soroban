// 一起守城堡（兩人合作塔防）的畫面。平板放在兩個孩子中間：
//   橫放：左邊、右邊是兩個孩子的答題區（各自轉向坐在兩端的孩子），中間是戰場。
//   直放：上面、下面是答題區（上面倒過來），中間是戰場。
// 戰場規則在 battle.js，題目在 duo.js。
import { TYPES, typeOf } from "./duo.js";
import { CASTLE_HP, STAGES, WEAPONS, castlePos, choose, correct, createBattle, nextStage, step, takeEvents } from "./battle.js";
import { activeProfile, loadDuo, loadGrade, loadProfiles, logSessionAs, saveDuo } from "./storage.js";

const $ = (id) => document.getElementById(id);
const LOCK_MS = 1500;          // 答錯停多久
const AUTO_PICK_S = 12;        // 升級卡太久沒選就自動選
const COLORS = ["#F57C00", "#1E88E5"];
const setup = [{ name: "", type: "" }, { name: "", type: "" }];
let startStage = 0, bound = false, logged = false;
const G = { on: false, b: null, raf: 0, last: 0, timers: [], players: [], fx: [], land: true, L: 1, S: 1, t0: 0, phase: "" };

/* ---------- 怪物圖（自己畫的可愛造型） ---------- */
const EYES = (y = 44, dx = 14, cx = 60) => `<ellipse cx="${cx - dx}" cy="${y}" rx="6" ry="7.5" fill="#fff"/><ellipse cx="${cx + dx}" cy="${y}" rx="6" ry="7.5" fill="#fff"/><circle cx="${cx - dx + 1}" cy="${y + 1.5}" r="3.6" fill="#2B1B17"/><circle cx="${cx + dx + 1}" cy="${y + 1.5}" r="3.6" fill="#2B1B17"/><circle cx="${cx - dx + 2.4}" cy="${y}" r="1.2" fill="#fff"/><circle cx="${cx + dx + 2.4}" cy="${y}" r="1.2" fill="#fff"/>`;
const MOUTH = (y = 60, cx = 60) => `<path d="M${cx - 8} ${y}q8 7 16 0" fill="none" stroke="#2B1B17" stroke-width="3" stroke-linecap="round"/>`;
const ART = {
  slime: `<path d="M18 86c-6 0-8-6-5-11C20 58 30 22 60 22s40 36 47 53c3 5 1 11-5 11z" fill="#7BD389" stroke="#3E9B52" stroke-width="3"/><ellipse cx="40" cy="38" rx="9" ry="5" fill="#fff" opacity=".55" transform="rotate(-25 40 38)"/>${EYES(52)}${MOUTH(68)}`,
  bat: `<path d="M44 46C30 28 12 30 4 44c8-2 12 4 10 10 6-5 13-2 14 4 4-6 12-6 16-2z" fill="#7E57C2" stroke="#4527A0" stroke-width="2.5"/><path d="M76 46c14-18 32-16 40-2-8-2-12 4-10 10-6-5-13-2-14 4-4-6-12-6-16-2z" fill="#7E57C2" stroke="#4527A0" stroke-width="2.5"/><circle cx="60" cy="52" r="28" fill="#9575CD" stroke="#4527A0" stroke-width="3"/>${EYES(48, 11)}<path d="M52 64q8 6 16 0" fill="none" stroke="#2B1B17" stroke-width="3" stroke-linecap="round"/>`,
  ghost: `<path d="M26 90V50c0-22 15-34 34-34s34 12 34 34v40l-8-7-9 7-9-7-8 7-8-7-9 7-9-7z" fill="#F5F7FF" stroke="#9FA8DA" stroke-width="3" stroke-linejoin="round"/>${EYES(48, 12)}<ellipse cx="60" cy="66" rx="6" ry="7" fill="#2B1B17"/>`,
  rock: `<path d="M20 84l-6-26 12-26 22-14 28 2 22 18 6 26-8 20z" fill="#A1887F" stroke="#5D4037" stroke-width="3" stroke-linejoin="round"/><path d="M40 38l12 4M80 38l-12 4" stroke="#3E2723" stroke-width="4" stroke-linecap="round"/>${EYES(50, 14)}${MOUTH(68)}`,
  dragon: `<path d="M30 52C16 40 8 44 4 34c10 2 14-4 22 2" fill="#FFB74D" stroke="#E65100" stroke-width="2.5"/><path d="M90 52c14-12 22-8 26-18-10 2-14-4-22 2" fill="#FFB74D" stroke="#E65100" stroke-width="2.5"/><path d="M42 24l-6-14 14 8M78 24l6-14-14 8" fill="#FFF3E0" stroke="#E65100" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="60" cy="56" rx="34" ry="32" fill="#FF8A65" stroke="#D84315" stroke-width="3"/><ellipse cx="60" cy="68" rx="20" ry="16" fill="#FFE0B2"/>${EYES(46, 13)}<path d="M50 70q10 8 20 0" fill="none" stroke="#2B1B17" stroke-width="3" stroke-linecap="round"/>`,
};
const svgOf = (id) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100">${ART[id]}</svg>`;
const IMG = {};
for (const id of Object.keys(ART)) { if (typeof Image !== "undefined") { IMG[id] = new Image(); IMG[id].src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgOf(id))}`; } }

/* ---------- 設定頁 ---------- */
function gradeOf(name) {
  // 依那位家人的年級挑預設題目：國小 → 九九乘法，幼兒園 → 10 以內加法
  const keep = activeProfile();
  try { localStorage.setItem("soroban.activeProfile.v1", name); } catch { /* 用預設 */ }
  const g = loadGrade();
  try { localStorage.setItem("soroban.activeProfile.v1", keep); } catch { /* 用預設 */ }
  return g;
}
function renderSetup() {
  const names = loadProfiles(), { best } = loadDuo();
  setup.forEach((s, i) => {
    if (!names.includes(s.name)) s.name = names[Math.min(i, names.length - 1)];
    if (!s.type) s.type = gradeOf(s.name) === "school" ? "times" : "add10";
    $(`dName${i}`).innerHTML = names.map((n) => `<option>${n.replace(/</g, "&lt;")}</option>`).join("");
    $(`dName${i}`).value = s.name;
    $(`dType${i}`).innerHTML = TYPES.map((t) => `<button data-v="${t.id}" aria-pressed="${s.type === t.id}">${t.name}</button>`).join("");
  });
  const open = Math.min(STAGES.length - 1, best);
  if (startStage > open) startStage = 0;
  $("dStages").innerHTML = STAGES.map((st, i) => `<button data-v="${i}" aria-pressed="${startStage === i}" ${i > open ? "disabled" : ""}><span class="dmon">${svgOf(st.monster)}</span><b>第 ${i + 1} 關</b><small>${i > open ? "還沒打開" : st.name}</small></button>`).join("");
  $("dBest").textContent = best >= STAGES.length ? "五關都打過了！可以從任何一關開始。" : best ? `已經打到第 ${best + 1} 關，可以從那裡開始。` : "從第 1 關開始。";
}
export function renderDuo() { bind(); stopGame(false); renderSetup(); }
export function leaveDuo() { stopGame(); }

/* ---------- 版面 ---------- */
const pane = (i) => $(`dPane${i}`);
const q$ = (i, sel) => pane(i).querySelector(sel);
const later = (fn, ms) => { const t = setTimeout(fn, ms); G.timers.push(t); return t; };

function layout() {
  const land = innerWidth >= innerHeight;
  G.land = land;
  $("duoPlay").classList.toggle("land", land);
  G.players.forEach((p, i) => {
    if (p.autoRot) p.rot = land ? (i ? 270 : 90) : (i ? 0 : 180);
    pane(i).style.setProperty("--rot", `${p.rot}deg`);
    pane(i).dataset.side = p.rot % 180 ? "side" : "flat";
  });
  // 戰場：x 軸是兩個孩子之間的方向（長度 L），另一個方向長度 S
  const cv = $("dField"), r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  G.dpr = dpr;
  G.L = land ? r.width : r.height; G.S = land ? r.height : r.width;
  if (G.b) {
    const aspect = G.S / G.L;
    // 戰場比例改變時，怪物和砲塔跟著縮放，走到城堡的時間不變
    const k = aspect / G.b.aspect;
    for (const m of G.b.monsters) m.y *= k;
    for (const t of G.b.turrets) t.y = aspect / 2;
    G.b.aspect = aspect;
  }
}
// 戰場座標 → 畫布座標
function toScreen(x, y) {
  const s = G.L * G.dpr;
  return G.land ? [x * s, y * s] : [y * s, x * s];
}

/* ---------- 開始、關卡 ---------- */
function start() {
  logged = false;
  G.players = setup.map((s, i) => ({ name: s.name, type: typeOf(s.type), correct: 0, wrong: 0, locked: false, q: null, color: COLORS[i], rot: 0, autoRot: true, pickT: 0 }));
  G.fx = []; G.timers = []; G.t0 = Date.now(); G.on = true;
  $("duoPlay").hidden = false;
  $("dPause").textContent = "暫停";
  document.body.classList.add("duo-on");
  G.players.forEach((p, i) => { q$(i, ".pname").textContent = p.name; pane(i).style.setProperty("--pc", p.color); });
  layout();
  G.b = createBattle({ aspect: G.S / G.L, stage: startStage });
  speedFix();
  try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch { /* 不支援就算了 */ }
  try { navigator.wakeLock?.request("screen").then((l) => { G.lock = l; }).catch(() => {}); } catch { /* 不支援就算了 */ }
  stageIntro();
  G.last = performance.now();
  cancelAnimationFrame(G.raf);
  G.raf = requestAnimationFrame(loop);
}
// 模擬是用比例 0.75 的戰場調平衡的；戰場比較長的時候怪物走快一點，走到城堡的時間一樣
function speedFix() { G.b.speedK = Math.max(1, G.b.aspect / 0.75); }

function stageIntro() {
  const st = STAGES[G.b.stage];
  G.phase = "intro";
  for (const k of [0, 1]) { renderSide(k); showMsg(k, `<b>第 ${G.b.stage + 1} 關</b><span>${st.name}來了！一起守住城堡！</span>`); }
  later(() => { G.phase = "play"; for (const k of [0, 1]) { hideMsg(k); if (!G.players[k].q) nextQ(k); } }, 2200);
}

/* ---------- 每一格畫面 ---------- */
function loop(now) {
  if (!G.on) return;
  const dt = Math.min(0.05, (now - G.last) / 1000);
  G.last = now;
  if (G.phase === "play") {
    step(G.b, dt);
    handleEvents(takeEvents(G.b));
    for (const k of [0, 1]) tickPick(k, dt);
    afterStep();
  }
  draw(dt);
  G.raf = requestAnimationFrame(loop);
}

function afterStep() {
  const b = G.b;
  if (b.state === "clear") {
    G.phase = "between";
    const d = loadDuo(); if (b.stage + 1 > d.best) { d.best = b.stage + 1; saveDuo(d); }
    for (const k of [0, 1]) showMsg(k, `<b>守住了！</b><span>打倒${STAGES[b.stage].name}大王！城堡補 3 顆心，下一關是${STAGES[b.stage + 1].name}。</span>`);
    later(() => { nextStage(b); stageIntro(); }, 2600);
  } else if (b.state === "win" || b.state === "lose") {
    G.phase = "end";
    const win = b.state === "win";
    if (win) { const d = loadDuo(); d.best = STAGES.length; saveDuo(d); }
    finishLog();
    for (const k of [0, 1]) {
      const me = G.players[k], other = G.players[1 - k];
      showMsg(k, `<b>${win ? "五關全部守住了！" : "城堡被攻破了…"}</b><span>${win ? "你們是最強的搭檔！" : `打到第 ${b.stage + 1} 關。下次可以從第 ${b.stage + 1} 關開始，再試一次！`}</span>
        <p class="msum">你答對 <b>${me.correct}</b> 題，${other.name}答對 <b>${other.correct}</b> 題</p>
        <div class="mbtns"><button class="btn primary" data-act="again">${win ? "再玩一次" : "從這一關再來"}</button><button class="btn" data-act="exit">回去</button></div>`);
    }
  }
}

/* ---------- 答題區 ---------- */
function nextQ(k) {
  const p = G.players[k];
  let q;
  do { q = p.type.make(Math.random); } while (p.q && q.text === p.q.text && q.ans === p.q.ans);
  p.q = q; p.locked = false;
  renderSide(k);
}

function renderSide(k) {
  const p = G.players[k], t = G.b.turrets[k];
  q$(k, ".hearts").textContent = `城堡 ${"♥".repeat(G.b.castle)}${"♡".repeat(CASTLE_HP - G.b.castle)}`;
  q$(k, ".pstat").textContent = `答對 ${p.correct}　第 ${G.b.stage + 1} 關`;
  q$(k, ".gear").innerHTML = Object.entries(t.weapons).map(([w, lv]) => `<span class="chip w-${w}">${WEAPONS[w].name} ${lv}</span>`).join("")
    + (t.atk ? `<span class="chip">攻擊力 +${t.atk}</span>` : "") + (t.spd ? `<span class="chip">速度 +${t.spd}</span>` : "");
  const offer = t.offer;
  q$(k, ".cards").hidden = !offer;
  q$(k, ".quiz").hidden = !!offer;
  if (offer) {
    q$(k, ".cards").innerHTML = `<b class="ctitle">升級了！選一張</b><div>${offer.map((c) => `<button class="card k-${c.kind}${c.w ? ` w-${c.w}` : ""}" data-card="${c.id}"><b>${c.title}</b><small>${c.desc}</small></button>`).join("")}</div>`;
    return;
  }
  if (!p.q) return;
  q$(k, ".qscene").innerHTML = p.q.scene;
  q$(k, ".qscene").hidden = !p.q.scene;
  q$(k, ".qtext").textContent = p.q.scene ? p.q.text : `${p.q.text} = ?`;
  q$(k, ".choices").innerHTML = p.q.choices.map((c, i) => `<button data-i="${i}">${c}</button>`).join("");
}

function answer(k, i) {
  const p = G.players[k];
  if (!G.on || G.phase !== "play" || p.locked || !p.q || G.b.turrets[k].offer) return;
  const btns = q$(k, ".choices").querySelectorAll("button");
  if (i === p.q.answer) {
    p.correct++; p.locked = true;
    btns[i].classList.add("right");
    correct(G.b, k);
    handleEvents(takeEvents(G.b));
    later(() => nextQ(k), 300);
  } else {
    p.wrong++; p.locked = true;
    btns[i].classList.add("wrong");
    btns[p.q.answer].classList.add("right");
    q$(k, ".qtext").textContent = p.q.scene ? `有 ${p.q.ans} 個` : `${p.q.text} = ${p.q.ans}`;
    pane(k).classList.add("stun");
    later(() => { pane(k).classList.remove("stun"); if (G.on) nextQ(k); }, LOCK_MS);
  }
}

function pick(k, id) {
  if (!choose(G.b, k, id)) return;
  G.players[k].pickT = 0;
  handleEvents(takeEvents(G.b));
  renderSide(k);
}
// 升級卡太久沒選，就幫他選第一張，免得卡住
function tickPick(k, dt) {
  const t = G.b.turrets[k], p = G.players[k];
  if (!t.offer) { p.pickT = 0; return; }
  p.pickT += dt;
  if (p.pickT > AUTO_PICK_S) pick(k, t.offer[0].id);
}

/* ---------- 特效 ---------- */
function handleEvents(events) {
  for (const e of events) {
    if (["arrow", "laser", "wave", "bolt", "ice", "special"].includes(e.type)) G.fx.push({ ...e, life: e.type === "wave" ? 0.5 : e.type === "special" ? 0.45 : 0.25, age: 0 });
    else if (e.type === "kill") G.fx.push({ type: "puff", x: e.x, y: e.y, boss: e.boss, life: 0.5, age: 0 });
    else if (e.type === "castle") { G.fx.push({ type: "ouch", life: 0.6, age: 0 }); for (const k of [0, 1]) renderSide(k); }
    else if (e.type === "offer" || e.type === "upgrade") { renderSide(e.p); if (e.type === "upgrade") flash(e.p, `${e.card.title}！`); }
    else if (e.type === "special") flash(e.p, "大絕招！");
  }
}
function flash(k, text) {
  const f = q$(k, ".flash");
  f.textContent = text; f.classList.remove("go"); void f.offsetWidth; f.classList.add("go");
}

/* ---------- 畫戰場 ---------- */
const FX_COLOR = { arrow: "#6D4C41", laser: "#E53935", wave: "#7E57C2", bolt: "#FFD600", ice: "#4FC3F7", special: "#FF4081" };
function draw(dt) {
  const cv = $("dField"), ctx = cv.getContext("2d"), W = cv.width, H = cv.height, b = G.b, u = G.L * G.dpr;
  ctx.clearRect(0, 0, W, H);
  // 草地和兩邊的地盤
  ctx.fillStyle = "#CDEBC0"; ctx.fillRect(0, 0, W, H);
  for (const k of [0, 1]) {
    ctx.fillStyle = k ? "rgba(30,136,229,.08)" : "rgba(245,124,0,.08)";
    const [x0, y0] = toScreen(k ? 0.5 : 0, 0), [x1, y1] = toScreen(k ? 1 : 0.5, b.aspect);
    ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
  }
  ctx.fillStyle = "rgba(255,255,255,.35)";
  for (let i = 0; i < 18; i++) { const [x, y] = toScreen(((i * 0.37) % 1), ((i * 0.53) % 1) * b.aspect); ctx.beginPath(); ctx.arc(x, y, u * 0.012, 0, 7); ctx.fill(); }
  // 城堡
  const c = castlePos(b), [cx, cy] = toScreen(c.x, c.y), cs = u * 0.09;
  const ouch = G.fx.some((f) => f.type === "ouch");
  ctx.save(); ctx.translate(cx, cy);
  if (ouch) ctx.translate((Math.random() - 0.5) * cs * 0.2, (Math.random() - 0.5) * cs * 0.2);
  ctx.fillStyle = ouch ? "#FFCDD2" : "#FFF3E0"; ctx.strokeStyle = "#8D6E63"; ctx.lineWidth = cs * 0.08;
  ctx.beginPath(); ctx.rect(-cs, -cs * 0.7, cs * 2, cs * 1.5); ctx.fill(); ctx.stroke();
  for (const tx of [-cs * 1.05, cs * 0.55]) { ctx.beginPath(); ctx.rect(tx, -cs * 1.2, cs * 0.5, cs * 2); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = "#A1887F"; ctx.beginPath(); ctx.arc(0, cs * 0.8, cs * 0.35, Math.PI, 0); ctx.rect(-cs * 0.35, cs * 0.8, cs * 0.7, 0.01); ctx.fill();
  ctx.fillStyle = "#E91E63"; ctx.beginPath(); ctx.moveTo(0, -cs * 1.6); ctx.lineTo(cs * 0.5, -cs * 1.4); ctx.lineTo(0, -cs * 1.2); ctx.fill();
  ctx.strokeStyle = "#5D4037"; ctx.lineWidth = cs * 0.06; ctx.beginPath(); ctx.moveTo(0, -cs * 0.7); ctx.lineTo(0, -cs * 1.6); ctx.stroke();
  ctx.restore();
  // 砲塔
  for (const t of b.turrets) {
    const [x, y] = toScreen(t.x, t.y), r = u * 0.045 + Object.keys(t.weapons).length * u * 0.004;
    ctx.fillStyle = COLORS[t.p]; ctx.strokeStyle = "#fff"; ctx.lineWidth = r * 0.18;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = `700 ${r * 0.9}px Fredoka, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const lv = Object.values(t.weapons).reduce((s, v) => s + v, 0) + t.atk + t.spd;
    ctx.fillText(String(lv), x, y + r * 0.05);
  }
  // 怪物
  for (const m of b.monsters) {
    const [x, y] = toScreen(m.x, m.y), s = u * (m.boss ? 0.2 : 0.095), bob = Math.sin(m.wob) * s * 0.06;
    const img = IMG[m.kind];
    if (m.slow > 0) { ctx.fillStyle = "rgba(129,212,250,.55)"; ctx.beginPath(); ctx.arc(x, y, s * 0.6, 0, 7); ctx.fill(); }
    if (img && img.complete) ctx.drawImage(img, x - s / 2, y - s * 0.42 + bob, s, s * 0.83);
    if (m.hp < m.max) {
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(x - s * 0.4, y - s * 0.55, s * 0.8, s * 0.08);
      ctx.fillStyle = m.boss ? "#E53935" : "#43A047"; ctx.fillRect(x - s * 0.4, y - s * 0.55, s * 0.8 * Math.max(0, m.hp / m.max), s * 0.08);
    }
  }
  // 特效
  for (const f of G.fx) {
    f.age += dt;
    const a = Math.max(0, 1 - f.age / f.life);
    ctx.globalAlpha = a;
    if (f.type === "puff") {
      const [x, y] = toScreen(f.x, f.y), r = u * (f.boss ? 0.12 : 0.04) * (1 + f.age * 2);
      ctx.fillStyle = "#FFF59D"; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x + Math.cos(i) * r, y + Math.sin(i) * r, r * 0.3, 0, 7); ctx.fill(); }
    } else if (f.type === "wave") {
      const [x, y] = toScreen(f.x, f.y);
      ctx.strokeStyle = FX_COLOR.wave; ctx.lineWidth = u * 0.012;
      ctx.beginPath(); ctx.arc(x, y, f.r * u * Math.min(1, f.age / f.life * 1.4), 0, 7); ctx.stroke();
    } else if (f.type === "ouch") {
      ctx.fillStyle = "rgba(229,57,53,.18)"; ctx.fillRect(0, 0, W, H);
    } else if (f.x1 !== undefined) {
      const [x1, y1] = toScreen(f.x1, f.y1), [x2, y2] = toScreen(f.x2, f.y2);
      ctx.strokeStyle = f.type === "special" ? COLORS[f.p] : FX_COLOR[f.type];
      ctx.lineWidth = u * (f.type === "laser" ? f.width * 0.8 : f.type === "special" ? 0.016 : f.type === "bolt" ? 0.008 : 0.006);
      ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x1, y1);
      if (f.type === "bolt") { for (let i = 1; i < 5; i++) { const t = i / 5; ctx.lineTo(x1 + (x2 - x1) * t + (Math.random() - 0.5) * u * 0.03, y1 + (y2 - y1) * t + (Math.random() - 0.5) * u * 0.03); } }
      if (f.type === "arrow") { const t = Math.min(1, f.age / (f.life * 0.6)); ctx.moveTo(x1 + (x2 - x1) * t * 0.8, y1 + (y2 - y1) * t * 0.8); }
      ctx.lineTo(x2, y2); ctx.stroke();
      if (f.type === "special") { ctx.fillStyle = COLORS[f.p]; ctx.beginPath(); ctx.arc(x2, y2, u * 0.03 * (1 + f.age * 3), 0, 7); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }
  G.fx = G.fx.filter((f) => f.age < f.life);
}

/* ---------- 結束 ---------- */
function showMsg(k, html) { const m = q$(k, ".msg"); m.innerHTML = html; m.hidden = false; }
function hideMsg(k) { q$(k, ".msg").hidden = true; }

// 兩個人的成績各自記到自己的學習紀錄
function finishLog() {
  if (logged || !G.players.length) return;
  logged = true;
  const sec = (Date.now() - G.t0) / 1000;
  for (const p of G.players) {
    const total = p.correct + p.wrong;
    if (total > 0) logSessionAs(p.name, { id: `duo.${p.type.id}`, label: `一起守城堡・${p.type.name}`, correct: p.correct, total, sec });
  }
}

function stopGame(log = true) {
  if (G.on && log) finishLog();
  G.on = false;
  cancelAnimationFrame(G.raf);
  G.timers.forEach(clearTimeout); G.timers = [];
  if ($("duoPlay")) $("duoPlay").hidden = true;
  document.body.classList.remove("duo-on");
  try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch { /* 不支援就算了 */ }
  try { G.lock?.release(); } catch { /* 不支援就算了 */ }
  G.lock = null;
}

/* ---------- 操作 ---------- */
function bind() {
  if (bound) return;
  bound = true;
  for (const i of [0, 1]) {
    $(`dName${i}`).onchange = (ev) => { setup[i].name = ev.target.value; setup[i].type = ""; renderSetup(); };
    $(`dType${i}`).addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (b) { setup[i].type = b.dataset.v; renderSetup(); } });
    pane(i).addEventListener("click", (ev) => {
      const c = ev.target.closest(".choices button");
      if (c) return answer(i, +c.dataset.i);
      const card = ev.target.closest("[data-card]");
      if (card) return pick(i, card.dataset.card);
      if (ev.target.closest(".rotbtn")) { const p = G.players[i]; p.rot = (p.rot + 90) % 360; p.autoRot = false; layout(); return; }
      const act = ev.target.closest("[data-act]")?.dataset.act;
      if (act === "again") { const st = G.b.state === "win" ? 0 : G.b.stage; stopGame(false); startStage = st; start(); }
      if (act === "exit") { stopGame(false); renderSetup(); }
    });
  }
  $("dStages").addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (b && !b.disabled) { startStage = +b.dataset.v; renderSetup(); } });
  $("dStart").onclick = start;
  $("dExit").onclick = () => { stopGame(); renderSetup(); };
  $("dPause").onclick = () => {
    if (!G.on) return;
    if (G.phase === "pause") {
      G.phase = "play"; $("dPause").textContent = "暫停";
      for (const k of [0, 1]) hideMsg(k);
    } else if (G.phase === "play") {
      G.phase = "pause"; $("dPause").textContent = "繼續";
      for (const k of [0, 1]) showMsg(k, "<b>暫停中</b><span>按中間的「繼續」接著玩。</span>");
    }
  };
  addEventListener("resize", () => { if (G.on) layout(); });
  addEventListener("keydown", (ev) => { if (G.on && ev.key === "Escape") { stopGame(); renderSetup(); } });
}
