// 數學練習單的出題：一頁 6 個區塊，小朋友把答案填在格子裡，最後一次交卷。
// 純邏輯，不碰 DOM，可以用 node --test 測試。難度 1 簡單、2 普通、3 挑戰。
// 每一個要填的格子都有 ans（數字，或比大小的 ">"、"<"、"="）。

const rnd = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
// 同一個區塊出兩題，兩題不要一樣
function two(make, key) {
  const first = make(0);
  let second, tries = 0;
  do { second = make(1); } while (key(second) === key(first) && tries++ < 50);
  return [first, second];
}
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// 接著填：6 格，照規律空 2 格（前兩格一定會給，才看得出規律）
function seq(level, rng) {
  const step = level === 1 ? 1 : level === 2 ? pick([1, 2], rng) : pick([2, 5, 10], rng);
  const start = step >= 5 ? step * rnd(rng, 1, 3) : rnd(rng, 1, level === 1 ? 4 : 9);
  const blanks = shuffle([2, 3, 4, 5], rng).slice(0, 2);
  return { step, cells: Array.from({ length: 6 }, (_, i) => ({ v: start + step * i, blank: blanks.includes(i) })) };
}

// 比大小：3 題，填 >、< 或 =；普通和挑戰一定有一題一樣大
function compare(level, rng) {
  const hi = level === 1 ? 10 : level === 2 ? 20 : 50, lo = level === 3 ? 10 : 1, rows = [];
  const diff = () => { let a, b; do { a = rnd(rng, lo, hi); b = rnd(rng, lo, hi); } while (a === b); return [a, b]; };
  rows.push(diff(), diff());
  if (level > 1) { const x = rnd(rng, lo, hi); rows.push([x, x]); } else rows.push(diff());
  return shuffle(rows, rng).map(([a, b]) => ({ a, b, ans: a > b ? ">" : a < b ? "<" : "=" }));
}

// 分一分：上面是全部，下面分成兩堆，空其中一堆
function bonds(level, rng) {
  return two(() => {
    const total = level === 1 ? rnd(rng, 3, 5) : level === 2 ? rnd(rng, 6, 10) : rnd(rng, 11, 18);
    const a = level === 3 ? rnd(rng, Math.max(2, total - 9), Math.min(9, total - 2)) : rnd(rng, 1, total - 1);
    const left = rng() < 0.5; // 空左邊還是右邊
    return { total, shown: a, blankLeft: left, ans: total - a };
  }, (b) => `${b.total},${b.shown}`);
}

function adds(level, rng) {
  return two((i) => {
    let a, b;
    if (level === 1) { a = rnd(rng, 1, 4); b = rnd(rng, 1, 5 - a); }
    else if (level === 2) { a = rnd(rng, 1, 9); b = rnd(rng, 1, 10 - a); }
    else { a = rnd(rng, 2, 9); b = rnd(rng, 2, 9); }
    return { a, b, ans: a + b, pic: i === 0 && a + b <= 10 }; // 第一題有圖可以數
  }, (x) => `${x.a},${x.b}`);
}

function subs(level, rng) {
  return two((i) => {
    let a, b;
    if (level === 1) { a = rnd(rng, 2, 5); b = rnd(rng, 1, a - 1); }
    else if (level === 2) { a = rnd(rng, 4, 10); b = rnd(rng, 1, a - 1); }
    else { b = rnd(rng, 2, 9); a = b + rnd(rng, 2, 9); }
    return { a, b, ans: a - b, pic: i === 0 && a <= 10 };
  }, (x) => `${x.a},${x.b}`);
}

// 找數字：□ + b = c、a − □ = c
function finds(level, rng) {
  const hi = level === 1 ? 5 : level === 2 ? 10 : 18;
  const c1 = rnd(rng, level === 3 ? 11 : 3, hi), b1 = rnd(rng, Math.max(1, c1 - 9), Math.min(9, c1 - 1));
  const a2 = rnd(rng, level === 3 ? 11 : 3, hi), x2 = rnd(rng, Math.max(1, a2 - 9), Math.min(9, a2 - 1));
  return [
    { text: ["", `+ ${b1} = ${c1}`], ans: c1 - b1, check: (x) => x + b1 === c1 },
    { text: [`${a2} −`, `= ${a2 - x2}`], ans: x2, check: (x) => a2 - x === a2 - x2 },
  ];
}

export const SHEET_LEVELS = ["簡單", "普通", "挑戰"];
export const SHEET_TYPES = [
  { id: "seq", title: "接著填", tip: "照規律，把空格填上數字" },
  { id: "compare", title: "比大小", tip: "填 >、< 或 =，開口對著大的數字" },
  { id: "bonds", title: "分一分", tip: "上面的數字分成兩堆" },
  { id: "adds", title: "加一加", tip: "合起來是多少" },
  { id: "subs", title: "減一減", tip: "劃掉的是拿走的" },
  { id: "finds", title: "找數字", tip: "格子裡是多少，算式才會對" },
];
const generators = { seq, compare, bonds, adds, subs, finds };

// 混合題每種各一區；單一題型連續練六區，沿用相同難度與出題規則。
export function makeSheetSections(level = 2, kind = "mix", rng = Math.random) {
  if (kind !== "mix" && !SHEET_TYPES.some((t) => t.id === kind)) throw new RangeError("未知的練習單題型");
  return SHEET_TYPES.map((type) => {
    const id = kind === "mix" ? type.id : kind;
    return { kind: id, data: generators[id](level, rng) };
  });
}
export function makeSheet(level = 2, rng = Math.random) {
  return { level, ...Object.fromEntries(makeSheetSections(level, "mix", rng).map((s) => [s.kind, s.data])) };
}

// 把整張練習單要填的格子照順序列出來：[{ ans, label }]，label 是學習紀錄裡顯示的題目
export function sheetBlanks(s) {
  if (Array.isArray(s)) return s.flatMap(({ kind, data }) => sheetBlanks({ [kind]: data }));
  const out = [];
  const shown = (s.seq?.cells || []).map((c) => (c.blank ? "□" : c.v)).join("、");
  for (const c of s.seq?.cells || []) if (c.blank) out.push({ ans: c.v, label: `接著填：${shown}` });
  for (const r of s.compare || []) out.push({ ans: r.ans, label: `比大小：${r.a} 和 ${r.b}` });
  for (const b of s.bonds || []) out.push({ ans: b.ans, label: `分一分：${b.total} 分成 ${b.shown} 和 □` });
  for (const a of s.adds || []) out.push({ ans: a.ans, label: `${a.a} + ${a.b}` });
  for (const x of s.subs || []) out.push({ ans: x.ans, label: `${x.a} − ${x.b}` });
  for (const f of s.finds || []) out.push({ ans: f.ans, label: `找數字：${f.text[0]} □ ${f.text[1]}`.replace(/\s+/g, " ") });
  return out;
}
