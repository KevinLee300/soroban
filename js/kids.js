// 幼兒數學（中班、大班）：12 個小遊戲的出題。純邏輯，不碰 DOM，可以用 node --test 測試。
// 每個遊戲有 3 個難度：1 簡單、2 普通、3 挑戰。
// 一題的格式：
//   { say: 題目（會顯示、也會朗讀）, scene: 題目圖（HTML 字串，可以是空的）,
//     choices: [{ html, value }], answer: 正確選項的位置, pic: 選項是不是圖片, meta: 測試用的數字 }

const rnd = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ---------- 圖 ---------- */
const ICING = [
  { name: "粉紅色", c: "#F48FB1" }, { name: "咖啡色", c: "#8D5A3B" }, { name: "黃色", c: "#FFD54F" },
  { name: "藍色", c: "#81D4FA" }, { name: "紫色", c: "#B39DDB" }, { name: "綠色", c: "#A5D6A7" },
];
export function donut(color, cls = "") {
  return `<svg class="donut ${cls}" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="12" fill="none" stroke="#D9A066" stroke-width="13"/><circle cx="20" cy="20" r="12" fill="none" stroke="${color}" stroke-width="8"/><path d="M12 12l2 1M27 11l-1 2M30 22h-2M24 30l1-2M11 26l2-1M19 8v2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>`;
}
// 一盤甜甜圈，5 個一排（方便一眼看出 5 和 10）。eaten：最後幾個被吃掉
function donuts(n, color, { eaten = 0, small = false } = {}) {
  let h = `<div class="dgrid${small ? " small" : ""}" style="--cols:${Math.max(1, Math.min(n, 5))}">`;
  for (let i = 0; i < n; i++) h += donut(color, i >= n - eaten ? "eaten" : "");
  return h + "</div>";
}
const numBtn = (v) => ({ html: `<span class="knum">${v}</span>`, value: v });
// 數字選項：正確答案加上附近的數字，由小到大排
function numChoices(ans, rng, k = 4, min = 0) {
  const set = new Set([ans]);
  let guard = 0;
  while (set.size < k && guard++ < 200) {
    const v = ans + rnd(rng, -3, 3);
    if (v >= min) set.add(v);
  }
  for (let v = min; set.size < k; v++) set.add(v);
  const vals = [...set].sort((a, b) => a - b);
  return { choices: vals.map(numBtn), answer: vals.indexOf(ans) };
}
const eq = (text) => `<div class="keq">${text}</div>`;

const SHAPES = [
  { name: "圓形", sides: 0, d: '<circle cx="50" cy="50" r="40"/>' },
  { name: "三角形", sides: 3, d: '<polygon points="50,10 92,86 8,86"/>' },
  { name: "正方形", sides: 4, d: '<rect x="14" y="14" width="72" height="72"/>' },
  { name: "長方形", sides: 4, d: '<rect x="6" y="26" width="88" height="48"/>' },
  { name: "橢圓形", sides: 0, d: '<ellipse cx="50" cy="50" rx="44" ry="27"/>' },
  { name: "菱形", sides: 4, d: '<polygon points="50,8 86,50 50,92 14,50"/>' },
  { name: "五邊形", sides: 5, d: '<polygon points="50,8 92,39 76,88 24,88 8,39"/>' },
  { name: "六邊形", sides: 6, d: '<polygon points="27,10 73,10 96,50 73,90 27,90 4,50"/>' },
  { name: "星形", sides: 10, d: '<polygon points="50,6 61,38 95,38 67,58 78,91 50,71 22,91 33,58 5,38 39,38"/>' },
];
const PAINT = ["#EF5350", "#42A5F5", "#FFCA28", "#66BB6A", "#AB47BC", "#FF7043"];
const shapeSvg = (s, color, cls = "kshape") => `<svg class="${cls}" viewBox="0 0 100 100" fill="${color}" aria-hidden="true">${s.d}</svg>`;
const kid = (color) => `<svg class="kkid" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="${color}"/><circle cx="14" cy="17" r="2.2" fill="#3E2723"/><circle cx="26" cy="17" r="2.2" fill="#3E2723"/><path d="M13 24q7 7 14 0" fill="none" stroke="#3E2723" stroke-width="2" stroke-linecap="round"/></svg>`;
const coin = (v) => `<span class="kcoin c${v}">${v}</span>`;

/* ---------- 12 個遊戲 ---------- */
function count(level, rng) {
  if (level === 3) {
    const [x, y] = shuffle(ICING, rng), a = rnd(rng, 3, 10), b = rnd(rng, 3, 10);
    const cells = shuffle([...Array(a).fill(x.c), ...Array(b).fill(y.c)], rng);
    return {
      say: `${x.name}的甜甜圈有幾個？`,
      scene: `<div class="dgrid">${cells.map((c) => donut(c)).join("")}</div>`,
      ...numChoices(a, rng, 4, 1), meta: { n: a, total: a + b },
    };
  }
  const n = level === 1 ? rnd(rng, 1, 10) : rnd(rng, 6, 20);
  return { say: "有幾個甜甜圈？", scene: donuts(n, pick(ICING, rng).c), ...numChoices(n, rng, level === 1 ? 3 : 4, 1), meta: { n } };
}

function more(level, rng) {
  let a, b;
  const [lo, hi, dmin, dmax] = level === 1 ? [1, 5, 2, 4] : level === 2 ? [1, 10, 1, 9] : [6, 15, 1, 2];
  do { a = rnd(rng, lo, hi); b = rnd(rng, lo, hi); } while (Math.abs(a - b) < dmin || Math.abs(a - b) > dmax);
  const fewer = level > 1 && rng() < 0.5, [x, y] = shuffle(ICING, rng);
  return {
    say: fewer ? "哪一盤比較少？" : "哪一盤比較多？", scene: "", pic: true,
    choices: [{ html: `<div class="plate">${donuts(a, x.c, { small: true })}</div>`, value: a }, { html: `<div class="plate">${donuts(b, y.c, { small: true })}</div>`, value: b }],
    answer: (fewer ? a < b : a > b) ? 0 : 1, meta: { a, b, fewer },
  };
}

function numcmp(level, rng) {
  const k = level === 3 ? 3 : 2, hi = level === 1 ? 10 : level === 2 ? 20 : 50;
  const set = new Set();
  while (set.size < k) set.add(rnd(rng, 1, hi));
  const vals = [...set], small = level > 1 && rng() < 0.5;
  const target = small ? Math.min(...vals) : Math.max(...vals);
  return {
    say: k === 2 ? (small ? "哪一個數字比較小？" : "哪一個數字比較大？") : (small ? "哪一個數字最小？" : "哪一個數字最大？"),
    scene: "", choices: vals.map(numBtn), answer: vals.indexOf(target), big: true, meta: { vals, small },
  };
}

function next(level, rng) {
  if (level === 1) {
    const x = rnd(rng, 1, 9);
    return { say: `${x} 的下一個數字是多少？`, scene: eq(`${x} → ?`), ...numChoices(x + 1, rng, 3, 1), meta: { ans: x + 1 } };
  }
  if (level === 2) {
    const x = rnd(rng, 2, 19), before = rng() < 0.4;
    return before
      ? { say: `${x} 的前一個數字是多少？`, scene: eq(`? → ${x}`), ...numChoices(x - 1, rng, 4, 0), meta: { ans: x - 1 } }
      : { say: "中間是哪一個數字？", scene: eq(`${x - 1}、?、${x + 1}`), ...numChoices(x, rng, 4, 0), meta: { ans: x } };
  }
  const step = pick([2, 5, 10], rng), start = step * rnd(rng, 1, 4);
  const seq = [0, 1, 2].map((i) => start + step * i), ans = start + step * 3;
  const vals = [...new Set([ans, ans - step / (step === 5 ? 5 : 2), ans + step, ans + 1])].sort((a, b) => a - b);
  return { say: `${step} 個一數，接下來是多少？`, scene: eq(`${seq.join("、")}、?`), choices: vals.map(numBtn), answer: vals.indexOf(ans), meta: { ans, step } };
}

function add(level, rng) {
  let a, b;
  if (level === 1) { a = rnd(rng, 1, 4); b = rnd(rng, 1, 5 - a); }
  else if (level === 2) { a = rnd(rng, 1, 9); b = rnd(rng, 1, 10 - a); }
  else { a = rnd(rng, 2, 9); b = rnd(rng, 2, 9); }
  const [x, y] = shuffle(ICING, rng);
  const pics = level === 3 ? "" : `<div class="krow">${donuts(a, x.c, { small: true })}<span class="kop">+</span>${donuts(b, y.c, { small: true })}</div>`;
  return { say: `${a} 加 ${b} 是多少？`, scene: pics + eq(`${a} + ${b} = ?`), ...numChoices(a + b, rng, 4, 0), meta: { a, b, ans: a + b } };
}

function sub(level, rng) {
  let a, b;
  if (level === 1) { a = rnd(rng, 2, 5); b = rnd(rng, 1, a); }
  else if (level === 2) { a = rnd(rng, 3, 10); b = rnd(rng, 1, a); }
  else { b = rnd(rng, 2, 9); a = b + rnd(rng, 1, 9); }
  const pics = level === 3 ? "" : donuts(a, pick(ICING, rng).c, { eaten: b });
  return {
    say: level === 3 ? `${a} 減 ${b} 是多少？` : `有 ${a} 個甜甜圈，吃掉 ${b} 個，剩下幾個？`,
    scene: pics + eq(`${a} − ${b} = ?`), ...numChoices(a - b, rng, 4, 0), meta: { a, b, ans: a - b },
  };
}

function make(level, rng) {
  const total = level === 1 ? 5 : level === 2 ? 10 : rnd(rng, 6, 9), a = rnd(rng, 1, total - 1);
  return {
    say: `一共要 ${total} 個甜甜圈，盤子上有 ${a} 個，還要幾個？`,
    scene: `<div class="krow">${donuts(a, pick(ICING, rng).c, { small: true })}<span class="kop">+</span><span class="kbox">?</span></div>` + eq(`${a} + ? = ${total}`),
    ...numChoices(total - a, rng, 4, 0), meta: { total, a, ans: total - a },
  };
}

function share(level, rng) {
  const kids = level === 1 ? 2 : level === 2 ? rnd(rng, 2, 3) : rnd(rng, 2, 5);
  const per = level === 1 ? rnd(rng, 1, 4) : level === 2 ? rnd(rng, 1, 4) : rnd(rng, 2, 4);
  const total = kids * per, faces = shuffle(PAINT, rng).slice(0, kids).map(kid).join("");
  return {
    say: `${total} 個甜甜圈，平分給 ${kids} 個小朋友，每個人幾個？`,
    scene: donuts(total, pick(ICING, rng).c) + `<div class="krow kids">${faces}</div>`,
    ...numChoices(per, rng, 4, 1), meta: { total, kids, ans: per },
  };
}

function shape(level, rng) {
  if (level === 3) {
    const s = pick(SHAPES.filter((x) => x.sides >= 3 && x.sides <= 6), rng), vals = [3, 4, 5, 6];
    return { say: "這個形狀有幾個邊？", scene: `<div class="krow">${shapeSvg(s, pick(PAINT, rng), "kshape big")}</div>`, choices: vals.map(numBtn), answer: vals.indexOf(s.sides), meta: { name: s.name, ans: s.sides } };
  }
  const pool = level === 1 ? SHAPES.slice(0, 4) : SHAPES, opts = shuffle(pool, rng).slice(0, level === 1 ? 3 : 4);
  const target = pick(opts, rng), colors = shuffle(PAINT, rng);
  return {
    say: `哪一個是${target.name}？`, scene: "", pic: true,
    choices: opts.map((s, i) => ({ html: shapeSvg(s, colors[i]), value: s.name })), answer: opts.indexOf(target), meta: { name: target.name },
  };
}

function length(level, rng) {
  const k = level === 1 ? 3 : 4, gap = level === 1 ? 18 : 9, short = level > 1 && rng() < 0.5;
  let lens;
  do {
    lens = Array.from({ length: k }, () => rnd(rng, 25, level === 3 ? 62 : 95));
  } while (lens.some((x, i) => lens.some((y, j) => i !== j && Math.abs(x - y) < gap)));
  // 挑戰：起點不對齊，要看「真正的長度」，不能只看誰比較靠右
  const offs = lens.map((w) => (level === 3 ? rnd(rng, 0, 100 - w - 2) : 0)), colors = shuffle(PAINT, rng);
  const target = short ? Math.min(...lens) : Math.max(...lens);
  return {
    say: short ? "哪一枝鉛筆最短？" : "哪一枝鉛筆最長？", scene: "", pic: true, rows: true,
    choices: lens.map((w, i) => ({ html: `<span class="kbar" style="width:${w}%;margin-left:${offs[i]}%;background:${colors[i]}"></span>`, value: w })),
    answer: lens.indexOf(target), meta: { lens, short },
  };
}

function pattern(level, rng) {
  if (level === 3) {
    const step = pick([2, 3, 5, 10, -1, -2], rng), start = step > 0 ? rnd(rng, 1, 6) * (step >= 5 ? step : 1) : rnd(rng, 10, 20);
    const seq = [0, 1, 2, 3].map((i) => start + step * i), ans = start + step * 4;
    return { say: "找找看規律，接下來是多少？", scene: eq(`${seq.join("、")}、?`), ...numChoices(ans, rng, 4, 0), meta: { ans, step } };
  }
  const colors = shuffle(PAINT, rng), forms = shuffle(SHAPES.slice(0, 3), rng);
  const toks = [0, 1, 2].map((i) => shapeSvg(forms[i], colors[i], "ktok"));
  const unit = level === 1 ? [0, 1] : pick([[0, 0, 1], [0, 1, 1], [0, 1, 2]], rng);
  const cut = level === 1 ? 0 : rnd(rng, 0, unit.length - 1), reps = level === 1 ? 3 : 2;
  const seq = [...Array(reps).fill(unit).flat(), ...unit.slice(0, cut)], ans = unit[cut];
  return {
    say: "找找看規律，接下來是哪一個？",
    scene: `<div class="krow pat">${seq.map((t) => toks[t]).join("")}<span class="kbox sm">?</span></div>`, pic: true,
    choices: toks.map((html, i) => ({ html, value: i })), answer: ans, meta: { unit, cut },
  };
}

function coins(level, rng) {
  let tens = 0, fives = 0, ones;
  if (level === 1) ones = rnd(rng, 1, 9);
  else if (level === 2) { fives = 1; ones = rnd(rng, 0, 4); }
  else { do { tens = rnd(rng, 0, 2); fives = rnd(rng, 0, 1); ones = rnd(rng, 0, 4); } while (tens * 10 + fives * 5 + ones < 6 || tens + fives === 0); }
  const total = tens * 10 + fives * 5 + ones;
  return {
    say: "這些錢一共是幾元？",
    scene: `<div class="krow coins">${coin(10).repeat(tens)}${coin(5).repeat(fives)}${coin(1).repeat(ones)}</div>`,
    ...numChoices(total, rng, 4, 1), meta: { tens, fives, ones, ans: total },
  };
}

/* ---------- 遊戲清單 ---------- */
export const LEVEL_NAMES = ["簡單", "普通", "挑戰"];
export const GROUPS = [
  { title: "數一數、比一比", games: [
    { id: "count", title: "數甜甜圈", sub: "數數看有幾個", gen: count },
    { id: "more", title: "哪一盤多", sub: "比比看誰多誰少", gen: more },
    { id: "numcmp", title: "數字比大小", sub: "哪個數字比較大", gen: numcmp },
    { id: "next", title: "數字接龍", sub: "下一個數字是多少", gen: next },
  ] },
  { title: "加一加、分一分", games: [
    { id: "add", title: "甜甜圈加法", sub: "合起來有幾個", gen: add },
    { id: "sub", title: "吃掉幾個", sub: "吃掉以後剩幾個", gen: sub },
    { id: "make", title: "湊一湊", sub: "5 和 10 的好朋友", gen: make },
    { id: "share", title: "平分甜甜圈", sub: "每個人分到幾個", gen: share },
  ] },
  { title: "形狀、長短、規律、錢幣", games: [
    { id: "shape", title: "認識形狀", sub: "圓形、三角形、正方形", gen: shape },
    { id: "length", title: "比長短", sub: "哪一枝鉛筆最長", gen: length },
    { id: "pattern", title: "找規律", sub: "接下來是哪一個", gen: pattern },
    { id: "coins", title: "數錢幣", sub: "一共是幾元", gen: coins },
  ] },
];
export const GAMES = GROUPS.flatMap((g) => g.games);
export const findGame = (id) => GAMES.find((g) => g.id === id);
export function makeQuestion(game, level, rng = Math.random) { return game.gen(level, rng); }
