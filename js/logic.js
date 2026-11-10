// 純邏輯（不碰 DOM），可以用 node --test 測試。
// 算盤一檔的值 0–9：上珠 1 顆代表 5，下珠 4 顆各代表 1。
// 動畫步驟格式：{ v: 算盤上的數字, hl: 要發亮的珠子, show: 顯示幾個算式片段, on: 標亮哪幾個片段, cap: 說明文字 }
// 珠子代號：r{檔位}-h 是上珠，r{檔位}-e{i} 是下珠（i=0 最靠近橫樑）。檔位 0 = 個位。

export const MINUS = "−";
export const CN = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
export const opSym = (op) => (op === "+" ? "+" : MINUS);
export const apply = (a, op, n) => (op === "+" ? a + n : a - n);

/* ---------- 五的好朋友 ---------- */
export const FIVE_RULES = [];
for (const op of ["+", "-"]) for (const n of [1, 2, 3, 4]) FIVE_RULES.push({ op, n, m: 5 - n });

export function ruleLabel(r) {
  return r.op === "+" ? [`+${r.n}`, `+5 ${MINUS}${r.m}`] : [`${MINUS}${r.n}`, `${MINUS}5 +${r.m}`];
}
// 口訣統一用「+1 加五減四」的說法，不用傳統的「一下五去四」。
export function chantShort(r) {
  return r.op === "+" ? `加五減${CN[r.m]}` : `減五加${CN[r.m]}`;
}
export function chant(r) {
  return `${r.op === "+" ? "加" : "減"}${CN[r.n]}，${chantShort(r)}`;
}
// 需要用到這條口訣的起始數字
export function fiveStarts(r) {
  const out = [];
  if (r.op === "+") for (let a = 5 - r.n; a <= 4; a++) out.push(a);
  else for (let a = 5; a <= r.n + 4; a++) out.push(a);
  return out;
}
export function needsFive(a, op, n) {
  if (n < 1 || n > 4) return false;
  return op === "+" ? a < 5 && a + n >= 5 : a >= 5 && a - n < 5;
}

/* ---------- 直接加減（一檔內，不需要好朋友） ---------- */
export function isDirect(a, op, n) {
  if (n < 1 || n > 9 || a < 0 || a > 9) return false;
  const nh = n >= 5, ne = n % 5;
  if (op === "+") return (!nh || a < 5) && (a % 5) + ne <= 4;
  return (!nh || a >= 5) && a % 5 >= ne;
}

const range = (s, e) => { const o = []; for (let i = s; i < e; i++) o.push("r0-e" + i); return o; };

export function buildIntroSteps() {
  return {
    toks: [],
    steps: [
      { v: 0, hl: [], show: 0, on: [], cap: "這是算盤的一檔。中間的橫樑把珠子分成上下兩邊。" },
      { v: 0, hl: ["r0-h"], show: 0, on: [], cap: "上面這顆是「上珠」，一顆代表 5。" },
      { v: 0, hl: range(0, 4), show: 0, on: [], cap: "下面四顆是「下珠」，一顆代表 1。" },
      { v: 5, hl: ["r0-h"], show: 0, on: [], cap: "上珠撥下來、靠近橫樑，就是 5。" },
      { v: 3, hl: range(0, 3), show: 0, on: [], cap: "撥上 3 顆下珠，就是 3。" },
      { v: 8, hl: ["r0-h", ...range(0, 3)], show: 0, on: [], cap: "上珠加上 3 顆下珠：5 + 3 = 8。" },
      { v: 0, hl: [], show: 0, on: [], cap: "珠子全部離開橫樑，就是 0。" },
    ],
  };
}

export function buildDirectSteps(a, op, n) {
  const plus = op === "+", ans = apply(a, op, n);
  const nh = n >= 5, ne = n % 5, lo = a % 5;
  const toks = [{ t: a }, { t: opSym(op) + n, c: plus ? "pl" : "mi" }, { t: "=", c: "sym" }, { t: ans }];
  const moved = [...(nh ? ["r0-h"] : []), ...(plus ? range(lo, lo + ne) : range(lo - ne, lo))];
  const acts = [];
  if (nh) acts.push(plus ? "把上珠撥下來" : "把上珠撥上去");
  if (ne) acts.push(plus ? `撥上 ${ne} 顆下珠` : `撥掉 ${ne} 顆下珠`);
  const enough = plus
    ? (nh && !ne ? "上珠空著，可以直接加 5！" : nh ? "上珠和下珠都夠，直接撥！" : `下珠還有 ${4 - lo} 顆，夠撥！`)
    : (nh && !ne ? "上珠在橫樑旁，可以直接減 5！" : nh ? "上珠和下珠都夠，直接撥！" : `下珠有 ${lo} 顆，夠撥！`);
  return {
    toks,
    steps: [
      { v: a, hl: [], show: 2, on: [], cap: `算盤上是 ${a}，要${plus ? "加" : "減"} ${n}。` },
      { v: a, hl: moved, show: 2, on: [1], cap: enough },
      { v: ans, hl: moved, show: 2, on: [1], cap: acts.join("，再") + "。" },
      { v: ans, hl: [], show: 4, on: [3], cap: `${a} ${opSym(op)} ${n} = ${ans}，完成！` },
    ],
  };
}

export function buildFiveSteps(r, a) {
  const { n, m } = r, plus = r.op === "+", ans = apply(a, r.op, n);
  const toks = [
    { t: a }, { t: opSym(r.op) + n, c: plus ? "pl" : "mi" }, { t: "=", c: "sym" }, { t: a },
    { t: opSym(r.op) + "5", c: plus ? "pl" : "mi" }, { t: (plus ? MINUS : "+") + m, c: plus ? "mi" : "pl" },
    { t: "=", c: "sym" }, { t: ans },
  ];
  const c = chant(r), steps = [];
  if (plus) {
    const left = 4 - a;
    steps.push({ v: a, hl: [], show: 2, on: [], cap: `算盤上是 ${a}，要加 ${n}。` });
    steps.push({ v: a, hl: range(a, 4), show: 2, on: [1], cap: left ? `下珠只剩 ${left} 顆，不夠加 ${n} 顆！` : `下珠一顆都不剩，不夠加 ${n}！` });
    steps.push({ v: a, hl: [], show: 6, on: [4, 5], cap: `口訣「${c}」：${n} 的好朋友是 ${m}，所以 +${n} 變成 +5 ${MINUS}${m}。` });
    steps.push({ v: 5 + a, hl: ["r0-h"], show: 6, on: [4], cap: "先 +5：把上珠撥下來。" });
    steps.push({ v: ans, hl: range(a - m, a), show: 6, on: [5], cap: `再 ${MINUS}${m}：撥掉 ${m} 顆下珠。` });
  } else {
    const k = a - 5;
    steps.push({ v: a, hl: [], show: 2, on: [], cap: `算盤上是 ${a}，要減 ${n}。` });
    steps.push({ v: a, hl: range(0, k), show: 2, on: [1], cap: k ? `下珠只有 ${k} 顆，不夠減 ${n} 顆！` : `下珠一顆都沒有，不夠減 ${n}！` });
    steps.push({ v: a, hl: [], show: 6, on: [4, 5], cap: `口訣「${c}」：${n} 的好朋友是 ${m}，所以 ${MINUS}${n} 變成 ${MINUS}5 +${m}。` });
    steps.push({ v: k, hl: ["r0-h"], show: 6, on: [4], cap: `先 ${MINUS}5：把上珠撥上去。` });
    steps.push({ v: ans, hl: range(k, k + m), show: 6, on: [5], cap: `再 +${m}：撥上 ${m} 顆下珠。` });
  }
  steps.push({ v: ans, hl: [], show: 8, on: [7], cap: `${a} ${opSym(r.op)} ${n} = ${ans}！記住口訣「${c}」。` });
  return { toks, steps };
}

/* ---------- 十的好朋友（兩檔：十位 r1、個位 r0） ---------- */
export const TEN_RULES = [];
for (const op of ["+", "-"]) for (let n = 1; n <= 9; n++) TEN_RULES.push({ op, n, m: 10 - n });

export function tenLabel(r) {
  return r.op === "+" ? [`+${r.n}`, `+10 ${MINUS}${r.m}`] : [`${MINUS}${r.n}`, `${MINUS}10 +${r.m}`];
}
export function tenChantShort(r) {
  return r.op === "+" ? `加十減${CN[r.m]}` : `減十加${CN[r.m]}`;
}
export function tenChant(r) {
  return `${r.op === "+" ? "加" : "減"}${CN[r.n]}，${tenChantShort(r)}`;
}
// 個位要用「十的好朋友」，而且減（加）好朋友那一步可以直接撥（不用再請五幫忙，那是第 5 關）
export function tenUnits(r) {
  const out = [];
  for (let u = 0; u <= 9; u++) {
    if (r.op === "+" ? u + r.n >= 10 && isDirect(u, "-", r.m) : u < r.n && isDirect(u, "+", r.m)) out.push(u);
  }
  return out;
}
// 十位可以直接 +1 / −1 的數字
export const tenTens = (op) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((t) => isDirect(t, op, 1));
export function isTenCase(a, op, n) {
  const r = { op, n, m: 10 - n }, t = Math.floor(a / 10), u = a % 10;
  return a >= 0 && a <= 99 && n >= 1 && n <= 9 && tenUnits(r).includes(u) && tenTens(op).includes(t);
}

// 一檔從 from 撥到 to，哪些珠子會動
export function movedBeads(rod, from, to) {
  const out = [];
  if ((from >= 5) !== (to >= 5)) out.push(`r${rod}-h`);
  for (let i = 0; i < 4; i++) if ((i < from % 5) !== (i < to % 5)) out.push(`r${rod}-e${i}`);
  return out;
}
function describeMove(from, to) {
  const acts = [], dh = (to >= 5) - (from >= 5), de = (to % 5) - (from % 5);
  if (dh > 0) acts.push("上珠撥下來");
  if (dh < 0) acts.push("上珠撥上去");
  if (de > 0) acts.push(`撥上 ${de} 顆下珠`);
  if (de < 0) acts.push(`撥掉 ${-de} 顆下珠`);
  return acts.join("，再");
}

export function buildTenSteps(r, a) {
  const { n, m } = r, plus = r.op === "+", ans = apply(a, r.op, n);
  const t = Math.floor(a / 10), u = a % 10, t2 = plus ? t + 1 : t - 1, u2 = ans % 10;
  const toks = [
    { t: a }, { t: opSym(r.op) + n, c: plus ? "pl" : "mi" }, { t: "=", c: "sym" }, { t: a },
    { t: opSym(r.op) + "10", c: plus ? "pl" : "mi" }, { t: (plus ? MINUS : "+") + m, c: plus ? "mi" : "pl" },
    { t: "=", c: "sym" }, { t: ans },
  ];
  const c = tenChant(r), mid = plus ? a + 10 : a - 10;
  const unitsBeads = movedBeads(0, u, plus ? 9 : 0); // 個位還能撥的珠子
  return {
    toks,
    steps: [
      { v: a, hl: [], show: 2, on: [], cap: `算盤上是 ${a}，要${plus ? "加" : "減"} ${n}。` },
      {
        v: a, hl: unitsBeads, show: 2, on: [1],
        cap: plus
          ? (u === 9 ? `個位已經是 9，滿了，不夠加 ${n}！` : `個位最多只能再加 ${9 - u}，不夠加 ${n}！`)
          : (u === 0 ? `個位是 0，不夠減 ${n}！` : `個位只有 ${u}，不夠減 ${n}！`),
      },
      { v: a, hl: [], show: 6, on: [4, 5], cap: `口訣「${c}」：${n} 的好朋友是 ${m}，所以 ${opSym(r.op)}${n} 變成 ${opSym(r.op)}10 ${plus ? MINUS : "+"}${m}。` },
      { v: mid, hl: movedBeads(1, t, t2), show: 6, on: [4], cap: plus ? "先 +10：左邊的十位撥上 1。" : `先 ${MINUS}10：左邊的十位撥掉 1。` },
      { v: ans, hl: movedBeads(0, u, u2), show: 6, on: [5], cap: `再 ${plus ? MINUS : "+"}${m}：個位${describeMove(u, u2)}。` },
      { v: ans, hl: [], show: 8, on: [7], cap: `${a} ${opSym(r.op)} ${n} = ${ans}！記住口訣「${c}」。` },
    ],
  };
}

/* ---------- 練習題 ---------- */
// 每題：{ start: 起始數字, target: 正確答案, text: 題目, hint: 答錯時的提示 }
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

export function q1(rng = Math.random) {
  const n = 1 + Math.floor(rng() * 9);
  return {
    start: 0, target: n, text: `撥出 ${n}`,
    hint: n >= 5 ? `${n} = 5 + ${n - 5}：上珠撥下來${n > 5 ? `，再撥上 ${n - 5} 顆下珠` : ""}。` : `撥上 ${n} 顆下珠。`,
  };
}
export function q2(rng = Math.random) {
  let a, op, n;
  do { a = Math.floor(rng() * 10); op = rng() < 0.5 ? "+" : "-"; n = 1 + Math.floor(rng() * 9); } while (!isDirect(a, op, n));
  return { start: a, target: apply(a, op, n), text: `${a} ${opSym(op)} ${n} = ?`, hint: "珠子夠撥，直接撥上或撥掉就好。" };
}
// 直接加減，只出加法或只出減法（不用五的好朋友、也不用十）
function directQ(op, rng) {
  let a, n;
  do { a = 1 + Math.floor(rng() * 9); n = 1 + Math.floor(rng() * 9); } while (!isDirect(a, op, n));
  return {
    start: a, target: apply(a, op, n), text: `${a} ${opSym(op)} ${n} = ?`,
    hint: op === "+" ? "珠子夠撥，直接撥上去就好。" : "珠子夠撥，直接撥掉就好。",
  };
}
export const q2add = (rng = Math.random) => directQ("+", rng);
export const q2sub = (rng = Math.random) => directQ("-", rng);

function fiveQ(r, a) {
  const [l, rr] = ruleLabel(r);
  return { start: a, target: apply(a, r.op, r.n), text: `${a} ${opSym(r.op)} ${r.n} = ?`, hint: `口訣「${chant(r)}」，${l} = ${rr}` };
}
const fiveRule = (op, n) => FIVE_RULES.find((r) => r.op === op && r.n === n);

export function q3(rng = Math.random) {
  const r = pick(FIVE_RULES, rng);
  return fiveQ(r, pick(fiveStarts(r), rng));
}
// 五的好朋友，由淺到深：湊成 5（1+4、2+3…）→ 加法 → 從 5 減（5−1、5−2…）→ 減法
export function q3make5(rng = Math.random) {
  const a = 1 + Math.floor(rng() * 4);
  return fiveQ(fiveRule("+", 5 - a), a);
}
export function q3plus(rng = Math.random) {
  const r = pick(FIVE_RULES.filter((x) => x.op === "+"), rng);
  return fiveQ(r, pick(fiveStarts(r), rng));
}
export function q3from5(rng = Math.random) {
  return fiveQ(fiveRule("-", 1 + Math.floor(rng() * 4)), 5);
}
export function q3minus(rng = Math.random) {
  const r = pick(FIVE_RULES.filter((x) => x.op === "-"), rng);
  return fiveQ(r, pick(fiveStarts(r), rng));
}

export function q4(rng = Math.random) {
  const r = pick(TEN_RULES, rng), u = pick(tenUnits(r), rng), t = pick(tenTens(r.op), rng);
  const a = t * 10 + u;
  const [l, rr] = tenLabel(r);
  return { start: a, target: apply(a, r.op, r.n), text: `${a} ${opSym(r.op)} ${r.n} = ?`, hint: `口訣「${tenChant(r)}」，${l} = ${rr}` };
}

/* ---------- 題庫：五的好朋友（給實體算盤用，只出題目） ---------- */
// mode："+" 只有加法、"-" 一定有「減五加X」（可以先加上去再減）、"mix" 加減都可以
// terms：題目有幾個數字（2 = 一步，3 = 三個數字連加減）
// max：題目上每個數字的上限（預設 5 以內）。算的過程都在一檔 0–9 之內，不會用到十。
// 每題至少有一步要用到五的好朋友。回傳 { nums: [3, 4, -2], answer: 5 }
export function fiveDrill({ mode = "mix", terms = 3, max = 5, rng = Math.random } = {}) {
  for (let tries = 0; tries < 5000; tries++) {
    const nums = [1 + Math.floor(rng() * max)];
    let v = nums[0], plusFive = 0, minusFive = 0, stuck = false;
    for (let k = 1; k < terms; k++) {
      const cands = [];
      for (const op of mode === "+" ? ["+"] : ["+", "-"]) for (let n = 1; n <= max; n++) {
        const r = apply(v, op, n);
        if (r >= 0 && r <= 9) cands.push({ op, n, five: needsFive(v, op, n) });
      }
      if (!cands.length) { stuck = true; break; }
      const fives = cands.filter((c) => c.five && (mode !== "-" || c.op === "-" || k < terms - 1));
      const c = fives.length && rng() < 0.65 ? pick(fives, rng) : pick(cands, rng);
      if (c.five) c.op === "+" ? plusFive++ : minusFive++;
      v = apply(v, c.op, c.n);
      nums.push(c.op === "+" ? c.n : -c.n);
    }
    if (stuck) continue;
    const ok = mode === "+" ? plusFive > 0 : mode === "-" ? minusFive > 0 : plusFive + minusFive > 0;
    if (ok) return { nums, answer: v };
  }
  throw new Error("fiveDrill: 找不到符合條件的題目");
}

// 一次出 count 題，盡量不重複
export function fiveDrillSet(opts, count) {
  const out = [], seen = new Set();
  while (out.length < count) {
    let q, tries = 0;
    do { q = fiveDrill(opts); tries++; } while (seen.has(q.nums.join()) && tries < 30);
    seen.add(q.nums.join());
    out.push(q);
  }
  return out;
}

export function stars(correct, total) {
  const p = total ? correct / total : 0;
  return p >= 0.9 ? 3 : p >= 0.7 ? 2 : p >= 0.5 ? 1 : 0;
}
