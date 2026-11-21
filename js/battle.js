// 一起守城堡（塔防＋倖存者）的戰場模擬。純邏輯，不碰 DOM，可以用 node --test 測試平衡。
// 座標：x 從 0 到 1（左到右），y 從 0 到 aspect（上到下）。城堡在正中間。
// 玩家 0 的砲塔在城堡左邊，玩家 1 的在右邊。怪物從上、下兩邊一直湧進來，往城堡走。
// 答對 1 題：馬上放一發大絕招。答對 2 題：得到一次升級，選 3 張卡片的其中一張
// （攻擊力、攻擊速度、學會新武器、武器升級）。

export const STAGES = [
  { monster: "slime", name: "果凍怪", count: 22, hp: 3, speed: 0.05, every: 1.1, boss: 30 },
  { monster: "bat", name: "蝙蝠怪", count: 28, hp: 5, speed: 0.07, every: 0.95, boss: 50 },
  { monster: "ghost", name: "小幽靈", count: 34, hp: 8, speed: 0.06, every: 0.85, boss: 80 },
  { monster: "rock", name: "石頭怪", count: 42, hp: 20, speed: 0.045, every: 0.75, boss: 180 },
  { monster: "dragon", name: "大魔王小火龍", count: 52, hp: 26, speed: 0.055, every: 0.6, boss: 320 },
  { monster: "mushroom", name: "蘑菇森林", guests: ["slime", "bat"], ground: "#C4DFAD", count: 46, hp: 31, speed: 0.062, every: 0.65, boss: 450, gear: 4 },
  { monster: "crystal", name: "水晶洞窟", guests: ["rock", "ghost"], ground: "#C7CBE5", count: 50, hp: 38, speed: 0.065, every: 0.58, boss: 560, gear: 5 },
  { monster: "bee", name: "蜂蜜山谷", guests: ["mushroom", "crystal"], ground: "#F1DCA1", count: 56, hp: 44, speed: 0.073, every: 0.54, boss: 700, gear: 6 },
];
const TRAITS = {
  bat: { speed: 1.25, hp: 0.75 },
  ghost: { speed: 1.1, hp: 0.9 },
  rock: { speed: 0.75, hp: 1.45 },
  mushroom: { speed: 0.85, hp: 1.25 },
  crystal: { speed: 0.78, hp: 1.5 },
  bee: { speed: 1.25, hp: 0.7 },
};
export const CASTLE_HP = 10;
export const BATTLE_PACE = 0.9; // 讓孩子有時間重試和看砲塔出招
export const PER_UPGRADE = 2;   // 答對幾題換一次升級
const REACH = 0.07;             // 怪物離城堡這麼近就算打到城堡
const SPECIAL_DMG = 4;          // 答對時的大絕招
export const MAX_WLV = 5;

// 五種武器（攻擊模式）。lv 是武器等級 1–5
export const WEAPONS = {
  arrow: { name: "弓箭", desc: "射最近的怪物，升級會一次射好幾支", rate: 1.1, dmg: 1 },
  laser: { name: "雷射光", desc: "一條光穿過整排怪物", rate: 0.45, dmg: 1.2 },
  wave: { name: "衝擊波", desc: "城堡周圍一圈全部打到", rate: 0.3, dmg: 1.5 },
  bolt: { name: "閃電", desc: "電一隻，再跳到旁邊的怪物", rate: 0.6, dmg: 1.4 },
  ice: { name: "冰凍", desc: "怪物被打到會變慢", rate: 0.8, dmg: 0.5 },
};
export const WEAPON_IDS = Object.keys(WEAPONS);

// 這座砲塔現在的能力（給畫面顯示，也給模擬用）
export const dmgMult = (t) => 1 + 0.4 * t.atk;
export const rateMult = (t) => 1 + 0.25 * t.spd;

export function createBattle({ aspect = 1, stage = 0, rng = Math.random } = {}) {
  // 直接開後面的新關時，補上途中本來可以拿到的升級。
  const gear = STAGES[stage].gear;
  const turrets = [0, 1].map((p) => ({
    p, x: p ? 0.62 : 0.38, y: aspect / 2,
    weapons: gear ? { arrow: 3, wave: 2, [p ? "laser" : "ice"]: 2 } : { arrow: 1 },
    cd: { arrow: 0.3 }, atk: gear ?? 0, spd: gear ?? 0, correct: 0, picks: 0, offer: null,
  }));
  return {
    aspect, rng, stage, t: 0, castle: CASTLE_HP, monsters: [], nextId: 1, spawned: 0, spawnT: 1, bossOut: false,
    state: "play", // play 進行中、clear 這關打完、win 全部打完、lose 城堡被打倒
    turrets,
    events: [],
  };
}

export const castlePos = (b) => ({ x: 0.5, y: b.aspect / 2 });
const dist = (a, c) => Math.hypot(a.x - c.x, a.y - c.y);
const alive = (b) => b.monsters.filter((m) => m.hp > 0);

function spawn(b, boss = false) {
  const s = STAGES[b.stage], top = b.rng() < 0.5, x = 0.06 + b.rng() * 0.88;
  const slot = b.spawned % 4;
  const kind = !boss && s.guests && slot >= 2 ? s.guests[slot - 2] : s.monster;
  const traits = !boss && s.guests ? TRAITS[kind] : null;
  const hp = boss ? s.boss : Math.round(s.hp * (traits?.hp ?? 1));
  b.monsters.push({
    id: b.nextId++, kind, boss, x, y: top ? -0.03 : b.aspect + 0.03,
    hp, max: hp, speed: s.speed * (boss ? 0.55 : 0.85 + b.rng() * 0.3) * (traits?.speed ?? 1), wob: b.rng() * 6, slow: 0,
  });
  b.events.push({ type: "spawn", boss });
}

// 由近到遠：最靠近城堡的怪物最危險。有指定砲塔時，先打自己那一半（左邊或右邊）的怪物，自己那邊沒有才去幫忙
export const mySide = (m, p) => (p === 0 ? m.x < 0.5 : m.x >= 0.5);
function byDanger(b, p) {
  const c = castlePos(b);
  return alive(b).sort((m, n) => (p === undefined ? 0 : (mySide(n, p) ? 1 : 0) - (mySide(m, p) ? 1 : 0)) || dist(m, c) - dist(n, c));
}

function damage(b, m, dmg, by, weapon) {
  if (m.hp <= 0) return;
  m.hp -= dmg;
  b.events.push({ type: "hit", id: m.id, x: m.x, y: m.y, by, weapon });
  if (m.hp <= 0) b.events.push({ type: "kill", id: m.id, x: m.x, y: m.y, boss: m.boss, kind: m.kind, by });
}

// 一座砲塔的一種武器射一次
function fire(b, t, w) {
  const lv = t.weapons[w], d = WEAPONS[w].dmg * dmgMult(t), list = byDanger(b, t.p);
  if (!list.length) return false;
  const c = castlePos(b);
  if (w === "arrow") {
    for (const m of list.slice(0, lv)) { b.events.push({ type: "arrow", p: t.p, x1: t.x, y1: t.y, x2: m.x, y2: m.y }); damage(b, m, d, t.p, w); }
  } else if (w === "laser") {
    // 從砲塔射向最危險的怪物，一直延伸到畫面外，線附近的都打到
    const m = list[0], dx = m.x - t.x, dy = m.y - t.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, width = 0.035 + 0.008 * lv;
    for (const n of list) {
      const px = n.x - t.x, py = n.y - t.y, along = px * ux + py * uy, off = Math.abs(px * uy - py * ux);
      if (along > 0 && off < width) damage(b, n, d * (1 + 0.5 * (lv - 1)), t.p, w);
    }
    b.events.push({ type: "laser", p: t.p, x1: t.x, y1: t.y, x2: t.x + ux * 2, y2: t.y + uy * 2, width });
  } else if (w === "wave") {
    const r = 0.2 + 0.05 * lv;
    for (const n of list) if (dist(n, c) < r) damage(b, n, d * (1 + 0.4 * (lv - 1)), t.p, w);
    b.events.push({ type: "wave", p: t.p, x: c.x, y: c.y, r });
  } else if (w === "bolt") {
    let cur = list[0], from = { x: t.x, y: t.y };
    const hitIds = new Set();
    for (let k = 0; k < 2 + lv && cur; k++) {
      b.events.push({ type: "bolt", p: t.p, x1: from.x, y1: from.y, x2: cur.x, y2: cur.y });
      damage(b, cur, d * (1 + 0.3 * (lv - 1)), t.p, w);
      hitIds.add(cur.id); from = cur;
      cur = list.filter((n) => !hitIds.has(n.id) && n.hp > 0 && dist(n, from) < 0.25).sort((m, n) => dist(m, from) - dist(n, from))[0];
    }
  } else if (w === "ice") {
    for (const m of list.slice(0, lv + 1)) { m.slow = 2.5; b.events.push({ type: "ice", p: t.p, x1: t.x, y1: t.y, x2: m.x, y2: m.y }); damage(b, m, d, t.p, w); }
  }
  return true;
}

// 前進 dt 秒
export function step(b, dt) {
  if (b.state !== "play") return b;
  b.t += dt;
  const s = STAGES[b.stage], c = castlePos(b);
  // 出怪：一陣一陣出（有時候一次 2–3 隻），全部出完再出魔王
  b.spawnT -= dt;
  if (b.spawned < s.count && b.spawnT <= 0) {
    const group = Math.min(s.count - b.spawned, b.rng() < 0.25 ? 3 : b.rng() < 0.4 ? 2 : 1);
    for (let k = 0; k < group; k++) { spawn(b); b.spawned++; }
    b.spawnT = s.every * group * (0.7 + b.rng() * 0.6);
  } else if (b.spawned >= s.count && !b.bossOut && b.spawnT <= 0) { spawn(b, true); b.bossOut = true; }
  // 怪物往城堡走（被冰凍的走一半速度）
  for (const m of b.monsters) {
    if (m.hp <= 0) continue;
    const d = dist(m, c);
    if (d <= REACH) {
      m.hp = 0;
      b.castle = Math.max(0, b.castle - (m.boss ? 3 : 1));
      b.events.push({ type: "castle", x: m.x, y: m.y, boss: m.boss });
      continue;
    }
    if (m.slow > 0) m.slow -= dt;
    const v = m.speed * (b.speedK || 1) * (m.slow > 0 ? 0.45 : 1); // speedK：戰場比較長時，畫面會讓怪物走快一點
    m.wob += dt * 5;
    m.x += ((c.x - m.x) / d) * v * dt;
    m.y += ((c.y - m.y) / d) * v * dt;
  }
  // 砲塔的每一種武器各自射擊
  for (const t of b.turrets) {
    for (const w of Object.keys(t.weapons)) {
      t.cd[w] = (t.cd[w] ?? 0) - dt;
      if (t.cd[w] > 0) continue;
      if (fire(b, t, w)) t.cd[w] = 1 / (WEAPONS[w].rate * rateMult(t));
      else t.cd[w] = 0;
    }
  }
  b.monsters = alive(b);
  if (b.castle <= 0) b.state = "lose";
  else if (b.bossOut && !b.monsters.length) b.state = b.stage === STAGES.length - 1 ? "win" : "clear";
  return b;
}

/* ---------- 答對、升級 ---------- */
// 升級卡片：{ id, kind: "atk"|"spd"|"new"|"up", w 武器, title, desc }
function cards(t) {
  const all = [
    { id: "atk", kind: "atk", title: "攻擊力 +", desc: `每一發更痛（第 ${t.atk + 1} 級）` },
    { id: "spd", kind: "spd", title: "攻擊速度 +", desc: `射得更快（第 ${t.spd + 1} 級）` },
  ];
  for (const w of WEAPON_IDS) {
    const lv = t.weapons[w];
    if (!lv) all.push({ id: `new-${w}`, kind: "new", w, title: `學會 ${WEAPONS[w].name}`, desc: WEAPONS[w].desc });
    else if (lv < MAX_WLV) all.push({ id: `up-${w}`, kind: "up", w, title: `${WEAPONS[w].name} 升到 ${lv + 1} 級`, desc: WEAPONS[w].desc });
  }
  return all;
}
// 給 3 張不一樣的卡：一定有一張跟武器有關（學會新武器或武器升級）
export function makeOffer(t, rng = Math.random) {
  const all = cards(t), weaponCards = all.filter((c) => c.kind === "new" || c.kind === "up"), out = [];
  if (weaponCards.length) out.push(weaponCards[Math.floor(rng() * weaponCards.length)]);
  const rest = all.filter((c) => !out.includes(c));
  while (out.length < 3 && rest.length) out.push(rest.splice(Math.floor(rng() * rest.length), 1)[0]);
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

// 玩家答對：放大絕招；每答對 PER_UPGRADE 題得到一次升級
export function correct(b, p) {
  const t = b.turrets[p];
  t.correct++;
  const m = byDanger(b, p)[0];
  if (m) { b.events.push({ type: "special", p, x1: t.x, y1: t.y, x2: m.x, y2: m.y }); damage(b, m, SPECIAL_DMG * dmgMult(t), p, "special"); }
  b.monsters = alive(b);
  if (t.correct % PER_UPGRADE === 0) {
    t.picks++;
    if (!t.offer) t.offer = makeOffer(t, b.rng);
    b.events.push({ type: "offer", p });
  }
  return b;
}

// 選了一張升級卡
export function choose(b, p, cardId) {
  const t = b.turrets[p], card = t.offer && t.offer.find((c) => c.id === cardId);
  if (!card) return false;
  if (card.kind === "atk") t.atk++;
  else if (card.kind === "spd") t.spd++;
  else if (card.kind === "new") { t.weapons[card.w] = 1; t.cd[card.w] = 0; }
  else if (card.kind === "up") t.weapons[card.w] = Math.min(MAX_WLV, t.weapons[card.w] + 1);
  t.picks--;
  t.offer = t.picks > 0 ? makeOffer(t, b.rng) : null;
  b.events.push({ type: "upgrade", p, card });
  return true;
}

// 進下一關：怪物清空、城堡補 3 顆心，砲塔保留
export function nextStage(b) {
  b.stage++; b.spawned = 0; b.spawnT = 1.5; b.bossOut = false; b.monsters = []; b.state = "play";
  b.castle = Math.min(CASTLE_HP, b.castle + 3);
  return b;
}

export function takeEvents(b) { const e = b.events; b.events = []; return e; }
