// 九九乘法的出題和熟練度計算。純邏輯，不碰 DOM、不碰 localStorage，可以用 node --test 測試。
// 範圍：2 到 9 的乘法，每個乘 1 到 9，共 72 題（「7x8」和「8x7」分開算，跟背的順序一樣）。

const CN = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
export const TABLES = [2, 3, 4, 5, 6, 7, 8, 9];
export const FACTS = TABLES.flatMap((a) => [1, 2, 3, 4, 5, 6, 7, 8, 9].map((b) => ({ a, b, p: a * b, key: `${a}x${b}` })));
export const factOf = (key) => FACTS.find((f) => f.key === key);

function cnNumber(n) { // 10–81 的中文數字：十二、二十、五十六
  const t = Math.floor(n / 10), u = n % 10;
  return (t === 1 ? "十" : CN[t] + "十") + (u ? CN[u] : "");
}
// 九九口訣：二三得六、二五一十、七八五十六
export function chant(a, b) {
  const p = a * b;
  return CN[a] + CN[b] + (p < 10 ? "得" + CN[p] : p === 10 ? "一十" : cnNumber(p));
}

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// 一題：type 是 "ans"（7 × 8 = □）或 "blank"（7 × □ = 56 或 □ × 8 = 56）
// 回傳 { key, a, b, p, parts: [左, 中, 右]（null 是要填的格子）, answer }
export function makeQuestion(fact, type = "ans", rng = Math.random) {
  const { a, b, p, key } = fact;
  const kind = type === "mix" ? (rng() < 0.5 ? "ans" : "blank") : type;
  if (kind === "ans") return { key, a, b, p, kind, parts: [a, b, null], answer: p };
  return rng() < 0.5
    ? { key, a, b, p, kind, parts: [a, null, p], answer: b }
    : { key, a, b, p, kind, parts: [null, b, p], answer: a };
}
export const questionText = (q) => `${q.parts[0] ?? "□"} × ${q.parts[1] ?? "□"} = ${q.parts[2] ?? "□"}`;

// 一次練習要考哪些題：
//   order "seq"：照順序背，選的每個乘法從 ×1 到 ×9（count 不管）
//   order "random"：打亂；先把選的乘法每題都出過一輪，不夠再出第二輪，相鄰兩題不重複
export function buildQueue({ tables = TABLES, order = "random", count = 20, type = "ans", rng = Math.random } = {}) {
  const pool = FACTS.filter((f) => tables.includes(f.a));
  if (!pool.length) return [];
  if (order === "seq") return pool.map((f) => makeQuestion(f, type, rng));
  const out = [];
  while (out.length < count) {
    let round = shuffle(pool, rng);
    if (out.length && round[0].key === out[out.length - 1].key && round.length > 1) round = [...round.slice(1), round[0]];
    for (const f of round) { if (out.length < count) out.push(makeQuestion(f, type, rng)); }
  }
  return out;
}

/* ---------- 熟練度 ---------- */
// 每一題的紀錄：{ c 答對次數, w 答錯次數, streak 連續答對, ms 最近答對的平均毫秒, d 最近一次的日期 }
export function record(stat, ok, ms, date = "") {
  const s = { c: 0, w: 0, streak: 0, ms: 0, d: "", ...(stat || {}) };
  if (ok) {
    s.c++; s.streak++;
    s.ms = s.ms ? Math.round(s.ms * 0.6 + ms * 0.4) : Math.round(ms); // 越近的作答影響越大
  } else { s.w++; s.streak = 0; }
  s.d = date;
  return s;
}
// 0 還沒練、1 不熟、2 還可以、3 熟練（連續答對 3 次，而且平均 4 秒內）
export function mastery(stat) {
  if (!stat || stat.c + stat.w === 0) return 0;
  if (stat.streak >= 3 && stat.ms > 0 && stat.ms <= 4000) return 3;
  if (stat.streak >= 1 && stat.c >= stat.w) return 2;
  return 1;
}
export const MASTERY_NAMES = ["還沒練", "不熟", "還可以", "熟練"];

// 弱點加強：不熟的排最前面，再來是還可以的、還沒練的，最後才是熟練的（越久沒練越前面）
export function weakest(stats = {}, n = 10, rng = Math.random) {
  const order = { 1: 0, 2: 1, 0: 2, 3: 3 };
  return shuffle(FACTS, rng)
    .map((f) => ({ f, m: mastery(stats[f.key]), s: stats[f.key] }))
    .sort((x, y) => order[x.m] - order[y.m] || ((y.s?.w || 0) - (x.s?.w || 0)) || ((y.s?.ms || 0) - (x.s?.ms || 0)) || (x.s?.d || "").localeCompare(y.s?.d || ""))
    .slice(0, n).map((x) => x.f);
}

// 整體進度：每種熟練度各有幾題
export function summary(stats = {}) {
  const out = [0, 0, 0, 0];
  for (const f of FACTS) out[mastery(stats[f.key])]++;
  return out;
}
