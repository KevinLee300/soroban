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

/* ---------- 乘法應用題 ---------- */
// 難度 1：一步乘法。難度 2：一步，但混入加法、減法的題目，要先判斷用哪一種算。難度 3：兩步驟（先乘，再加或減）。
// 回傳：{ text 題目, kind "mul"|"add"|"sub"|"two", unit 單位, answer, solution 完整算式,
//         eq 正確的算式（沒有等號，例如 "6 × 4"）, choices 三個算式選項（兩步驟的題目沒有）, key 對應的乘法（例如 "6x4"）, why 為什麼用這種算法 }
// 乘法照「每一份的數量 × 有幾份」的順序寫。
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
const rnd = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
const NAMES = ["小明", "小華", "小美", "小安", "小樂"];
const PACKS = [
  { c: "盒", item: "雞蛋", u: "顆", use: "用掉" }, { c: "包", item: "餅乾", u: "片", use: "吃掉" }, { c: "袋", item: "橘子", u: "個", use: "吃掉" },
  { c: "盤", item: "水餃", u: "個", use: "吃掉" }, { c: "束", item: "花", u: "朵", use: "送給老師" }, { c: "盒", item: "蠟筆", u: "枝", use: "借給同學" },
];
const GOODS = [{ item: "鉛筆", m: "枝" }, { item: "橡皮擦", m: "個" }, { item: "貼紙", m: "張" }, { item: "糖果", m: "顆" }, { item: "氣球", m: "個" }];
const ROWS = [{ row: "排", thing: "座位", u: "個" }, { row: "排", thing: "小樹", u: "棵" }, { row: "隊", thing: "小朋友", u: "個" }, { row: "層", thing: "書", u: "本" }];
const OWNED = [{ item: "貼紙", u: "張" }, { item: "彈珠", u: "顆" }, { item: "卡片", u: "張" }];
// 每一個都有固定數量的東西（a 固定）
const FIXED = [
  { a: 2, text: (b) => `一輛腳踏車有 2 個輪子，${b} 輛腳踏車一共有幾個輪子？`, u: "個" },
  { a: 3, text: (b) => `一輛三輪車有 3 個輪子，${b} 輛三輪車一共有幾個輪子？`, u: "個" },
  { a: 4, text: (b) => `一隻小狗有 4 隻腳，${b} 隻小狗一共有幾隻腳？`, u: "隻" },
  { a: 5, text: (b) => `一隻手有 5 根手指，${b} 隻手一共有幾根手指？`, u: "根" },
  { a: 6, text: (b) => `一隻螞蟻有 6 隻腳，${b} 隻螞蟻一共有幾隻腳？`, u: "隻" },
  { a: 7, text: (b) => `一個星期有 7 天，${b} 個星期一共有幾天？`, u: "天" },
  { a: 8, text: (b) => `一隻蜘蛛有 8 隻腳，${b} 隻蜘蛛一共有幾隻腳？`, u: "隻" },
];
const WHY = {
  mul: "每一份都一樣多，有好幾份，用乘法。",
  add: "是把兩個數量合起來，用加法。",
  sub: "是拿走一些，問剩下多少，用減法。",
};

function mulStory(a, b, rng) {
  const fixed = FIXED.filter((f) => f.a === a), kinds = ["pack", "price", "rows", "times", ...(fixed.length ? ["fixed"] : [])];
  const kind = pick(kinds, rng);
  let text, unit;
  if (kind === "pack") { const p = pick(PACKS, rng); text = `一${p.c}有 ${a} ${p.u}${p.item}，${b} ${p.c}一共有幾${p.u}？`; unit = p.u; }
  else if (kind === "price") { const g = pick(GOODS, rng); text = `一${g.m}${g.item}賣 ${a} 元，買 ${b} ${g.m}要付幾元？`; unit = "元"; }
  else if (kind === "rows") { const r = pick(ROWS, rng); text = `每${r.row}有 ${a} ${r.u}${r.thing}，${b} ${r.row}一共有幾${r.u}？`; unit = r.u; }
  else if (kind === "times") {
    const o = pick(OWNED, rng), [n1, n2] = shuffle(NAMES, rng);
    text = `${n1}有 ${a} ${o.u}${o.item}，${n2}的${o.item}是${n1}的 ${b} 倍，${n2}有幾${o.u}？`; unit = o.u;
  } else { const f = fixed[0]; text = f.text(b); unit = f.u; }
  return { text, unit };
}
const eqChoices = (right, others, rng) => shuffle([right, ...others.filter((x) => x !== right)].slice(0, 3), rng);

export function makeStory(level = 1, tables = TABLES, rng = Math.random) {
  // 應用題的兩個數字不要一樣：一樣的話「6 − 6」這種選項一看就知道不對，失去判斷的意義（6 × 6 在一般練習裡會練到）
  const ts = tables.length ? tables : TABLES, a = pick(ts, rng);
  let b;
  do { b = rnd(rng, 2, 9); } while (b === a);
  const p = a * b, key = `${a}x${b}`;
  const big = Math.max(a, b), small = Math.min(a, b);
  // 難度 2：大約三分之一的題目其實是加法或減法
  if (level === 2 && rng() < 0.35) {
    const o = pick(OWNED, rng), [n1, n2] = shuffle(NAMES, rng), form = rnd(rng, 0, 2);
    if (form === 0) return {
      text: `${n1}有 ${a} ${o.u}${o.item}，${n2}有 ${b} ${o.u}，兩個人一共有幾${o.u}？`, kind: "add", unit: o.u, answer: a + b,
      eq: `${a} + ${b}`, solution: `${a} + ${b} = ${a + b}`, choices: eqChoices(`${a} + ${b}`, [`${a} × ${b}`, `${big} − ${small}`], rng), why: WHY.add,
    };
    if (form === 1) return {
      text: `${n1}有 ${a} ${o.u}${o.item}，${n2}比${n1}多 ${b} ${o.u}，${n2}有幾${o.u}？`, kind: "add", unit: o.u, answer: a + b,
      eq: `${a} + ${b}`, solution: `${a} + ${b} = ${a + b}`, choices: eqChoices(`${a} + ${b}`, [`${a} × ${b}`, `${big} − ${small}`], rng), why: "「多幾個」是加上去，不是幾倍，用加法。",
    };
    const pk = pick(PACKS, rng), total = p, k = rnd(rng, 2, Math.min(9, total - 1));
    return {
      text: `${pk.c}子裡有 ${total} ${pk.u}${pk.item}，${pk.use} ${k} ${pk.u}，還剩幾${pk.u}？`.replace("盤子裡", "盤子上").replace("束子裡", "花瓶裡").replace("袋子裡", "袋子裡").replace("包子裡", "袋子裡"),
      kind: "sub", unit: pk.u, answer: total - k,
      eq: `${total} − ${k}`, solution: `${total} − ${k} = ${total - k}`, choices: eqChoices(`${total} − ${k}`, [`${total} + ${k}`, `${total} × ${k}`], rng), why: WHY.sub,
    };
  }
  if (level === 3) {
    const form = rnd(rng, 0, 2);
    if (form === 2) {
      const g = pick(GOODS, rng), pay = p <= 45 ? 50 : 100;
      return {
        text: `一${g.m}${g.item}賣 ${a} 元，買 ${b} ${g.m}，付了 ${pay} 元，可以找回幾元？`, kind: "two", unit: "元", answer: pay - p, key,
        solution: `${a} × ${b} = ${p}，${pay} − ${p} = ${pay - p}`, why: "先算一共要付多少（乘法），再算找回多少（減法）。",
      };
    }
    const pk = pick(PACKS, rng), k = rnd(rng, 1, Math.min(9, p - 1));
    return form === 0
      ? { text: `一${pk.c}有 ${a} ${pk.u}${pk.item}，買了 ${b} ${pk.c}，${pk.use} ${k} ${pk.u}，還剩幾${pk.u}？`, kind: "two", unit: pk.u, answer: p - k, key,
          solution: `${a} × ${b} = ${p}，${p} − ${k} = ${p - k}`, why: "先算一共有多少（乘法），再減掉拿走的。" }
      : { text: `一${pk.c}有 ${a} ${pk.u}${pk.item}，買了 ${b} ${pk.c}，另外又拿了 ${k} ${pk.u}，一共有幾${pk.u}？`, kind: "two", unit: pk.u, answer: p + k, key,
          solution: `${a} × ${b} = ${p}，${p} + ${k} = ${p + k}`, why: "先算幾盒一共有多少（乘法），再加上另外拿的。" };
  }
  const s = mulStory(a, b, rng);
  return {
    ...s, kind: "mul", answer: p, key, a, b, eq: `${a} × ${b}`, solution: `${a} × ${b} = ${p}`,
    choices: eqChoices(`${a} × ${b}`, [`${a} + ${b}`, `${big} − ${small}`], rng), why: WHY.mul,
  };
}

// 一次出 count 題，題目文字不重複
export function makeStories(level, tables, count = 10, rng = Math.random) {
  const out = [], seen = new Set();
  let guard = 0;
  while (out.length < count && guard++ < 500) {
    const s = makeStory(level, tables, rng);
    if (seen.has(s.text)) continue;
    seen.add(s.text); out.push(s);
  }
  return out;
}
