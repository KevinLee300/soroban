// 幼兒數學（中班、大班）：18 個小遊戲的出題。純邏輯，不碰 DOM，可以用 node --test 測試。
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
// cls 有 "eaten"：被拿走的甜甜圈，畫一條紅色斜線（像紙本題目的刪除線）
export function donut(color, cls = "") {
  const x = /\beaten\b/.test(cls) ? `<path d="M5 35L35 5" stroke="#fff" stroke-width="7.5" stroke-linecap="round"/><path d="M5 35L35 5" stroke="#E53935" stroke-width="4.5" stroke-linecap="round"/>` : "";
  return `<svg class="donut ${cls}" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="12" fill="none" stroke="#D9A066" stroke-width="13"/><circle cx="20" cy="20" r="12" fill="none" stroke="${color}" stroke-width="8"/><path d="M12 12l2 1M27 11l-1 2M30 22h-2M24 30l1-2M11 26l2-1M19 8v2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>${x}</svg>`;
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

/* ---------- 遊戲 ---------- */
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
  const pics = `<div class="krow add-piles">${donuts(a, x.c, { small: true })}<span class="kop">+</span>${donuts(b, y.c, { small: true })}</div>`;
  return { say: `${a} 加 ${b} 是多少？`, scene: pics + eq(`${a} + ${b} = ?`), ...numChoices(a + b, rng, 4, 0), meta: { a, b, ans: a + b } };
}

function sub(level, rng) {
  let a, b;
  if (level === 1) { a = rnd(rng, 2, 5); b = rnd(rng, 1, a); }
  else if (level === 2) { a = rnd(rng, 3, 10); b = rnd(rng, 1, a); }
  else { b = rnd(rng, 2, 9); a = b + rnd(rng, 1, 9); }
  const pics = donuts(a, pick(ICING, rng).c, { eaten: b, small: level === 3 });
  return {
    say: `有 ${a} 個甜甜圈，吃掉 ${b} 個，剩下幾個？`,
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

/* ---------- 時鐘 ---------- */
// 短針（紅色）指幾點，長針（藍色）指幾分
export function clockSvg(h, m, cls = "kclock") {
  const ha = ((h % 12) + m / 60) * 30, ma = m * 6;
  let nums = "";
  for (let i = 1; i <= 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    nums += `<text x="${(50 + 37 * Math.sin(a)).toFixed(1)}" y="${(50 - 37 * Math.cos(a)).toFixed(1)}">${i}</text>`;
  }
  return `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="47" fill="#FFFDF7" stroke="#9A6438" stroke-width="5"/><g font-size="9.5" font-weight="700" fill="#3E2723" text-anchor="middle" dominant-baseline="central" font-family="Fredoka, sans-serif">${nums}</g><line x1="50" y1="50" x2="50" y2="17" stroke="#1E88E5" stroke-width="3.2" stroke-linecap="round" transform="rotate(${ma} 50 50)"/><line x1="50" y1="50" x2="50" y2="29" stroke="#E53935" stroke-width="5" stroke-linecap="round" transform="rotate(${ha} 50 50)"/><circle cx="50" cy="50" r="3.5" fill="#3E2723"/></svg>`;
}
export const timeText = (h, m) => (m === 0 ? `${h} 點` : m === 30 ? `${h} 點半` : `${h} 點 ${m} 分`);
const textBtn = (t) => ({ html: `<span class="ktext">${t}</span>`, value: t });
const nextHour = (h) => (h % 12) + 1;
// 一題時鐘：正確時間，加上容易看錯的時間（下一個小時、另一種分鐘）
function clockSet(level, rng) {
  const h = rnd(rng, 1, 12);
  if (level === 1) {
    const hs = new Set([h]);
    while (hs.size < 3) hs.add(rnd(rng, 1, 12));
    return { time: [h, 0], all: shuffle([...hs], rng).map((x) => [x, 0]) };
  }
  const mins = level === 2 ? [0, 30] : [15, 45], m = pick(mins, rng), other = mins.find((x) => x !== m);
  return { time: [h, m], all: shuffle([[h, m], [h, other], [nextHour(h), m], [nextHour(h), other]], rng) };
}
function clock(level, rng) {
  const { time, all } = clockSet(level, rng), t = timeText(...time);
  return {
    say: "現在是幾點？", scene: `<div class="krow">${clockSvg(time[0], time[1], "kclock big")}</div>`, text: true,
    choices: all.map((x) => textBtn(timeText(...x))), answer: all.findIndex((x) => timeText(...x) === t), meta: { time: t, h: time[0], m: time[1] },
  };
}
function clockpick(level, rng) {
  const { time, all } = clockSet(level, rng), t = timeText(...time);
  return {
    say: `哪一個時鐘是 ${t}？`, scene: "", pic: true,
    choices: all.map((x) => ({ html: clockSvg(x[0], x[1]), value: timeText(...x) })), answer: all.findIndex((x) => timeText(...x) === t), meta: { time: t, h: time[0], m: time[1] },
  };
}

/* ---------- 動動腦 ---------- */
const NAMES = ["小明", "小華", "小美", "小安", "小樂"];
const THINGS = [
  { n: "糖果", u: "顆", lose: "吃掉" }, { n: "蘋果", u: "個", lose: "吃掉" }, { n: "餅乾", u: "片", lose: "吃掉" },
  { n: "氣球", u: "個", lose: "飛走" }, { n: "貼紙", u: "張", lose: "送給朋友" }, { n: "積木", u: "塊", lose: "借給朋友" },
];
function story(level, rng) {
  const [n1, n2] = shuffle(NAMES, rng), it = pick(THINGS, rng), u = it.u;
  let say, ans;
  if (level === 1) {
    if (rng() < 0.5) { const a = rnd(rng, 1, 8), b = rnd(rng, 1, 10 - a - 1 + 1); ans = a + b; say = `${n1}有 ${a} ${u}${it.n}，媽媽再給 ${b} ${u}，現在有幾${u}？`; }
    else { const a = rnd(rng, 2, 10), b = rnd(rng, 1, a - 1); ans = a - b; say = `${n1}有 ${a} ${u}${it.n}，${it.lose} ${b} ${u}，還剩幾${u}？`; }
  } else if (level === 2) {
    if (rng() < 0.5) { const a = rnd(rng, 1, 6), b = rnd(rng, 1, 9 - a), c = rnd(rng, 1, a + b - 1); ans = a + b - c; say = `${n1}有 ${a} ${u}${it.n}，媽媽再給 ${b} ${u}，後來${it.lose} ${c} ${u}，現在有幾${u}？`; }
    else { const a = rnd(rng, 3, 9), b = rnd(rng, 1, a - 1), c = rnd(rng, 1, 10 - (a - b)); ans = a - b + c; say = `${n1}有 ${a} ${u}${it.n}，${it.lose} ${b} ${u}，後來媽媽再給 ${c} ${u}，現在有幾${u}？`; }
  } else {
    const kind = rnd(rng, 0, 3), a = rnd(rng, 3, 9), b = rnd(rng, 1, 8);
    if (kind === 0) { ans = a + b; say = `${n1}有 ${a} ${u}${it.n}，${n2}比${n1}多 ${b} ${u}，${n2}有幾${u}？`; }
    else if (kind === 1) { const big = a + b; ans = a; say = `${n1}有 ${big} ${u}${it.n}，${n2}比${n1}少 ${b} ${u}，${n2}有幾${u}？`; }
    else if (kind === 2) { ans = a + b; say = `${n1}有 ${a} ${u}${it.n}，${n2}有 ${b} ${u}，兩個人一共有幾${u}？`; }
    else { const big = a + b; ans = b; say = `${n1}有 ${big} ${u}${it.n}，${n2}有 ${a} ${u}，${n1}比${n2}多幾${u}？`; }
  }
  return { say, scene: "", ...numChoices(ans, rng, 4, 0), meta: { ans } };
}

const ANIMALS = ["小貓", "小狗", "小兔", "小熊", "小豬", "小猴"];
const TRAITS = [{ hi: "高", lo: "矮" }, { hi: "重", lo: "輕" }, { hi: "快", lo: "慢" }];
function order(level, rng) {
  const k = level === 3 ? 4 : 3, rank = shuffle(ANIMALS, rng).slice(0, k), tr = pick(TRAITS, rng); // rank[0] 最高
  let facts = [];
  for (let i = 0; i < k - 1; i++) {
    const flip = level > 1 && rng() < 0.5; // 「乙比甲矮」和「甲比乙高」是同一件事
    facts.push(flip ? `${rank[i + 1]}比${rank[i]}${tr.lo}` : `${rank[i]}比${rank[i + 1]}${tr.hi}`);
  }
  if (level > 1) facts = shuffle(facts, rng);
  const low = level > 1 && rng() < 0.5, target = low ? rank[k - 1] : rank[0], opts = shuffle(rank, rng);
  return {
    say: `${facts.join("，")}。誰最${low ? tr.lo : tr.hi}？`, scene: "", text: true,
    choices: opts.map(textBtn), answer: opts.indexOf(target), meta: { rank, low, trait: low ? tr.lo : tr.hi },
  };
}

function odd(level, rng) {
  const n = level === 3 ? 5 : 4, at = rnd(rng, 0, n - 1), colors = shuffle(PAINT, rng);
  let base, other, how;
  if (level === 1) {
    const [a, b] = shuffle(SHAPES.slice(0, 4), rng);
    base = shapeSvg(a, colors[0]); other = shapeSvg(b, colors[0]); how = "形狀";
  } else if (level === 2) {
    const a = pick(SHAPES, rng);
    base = shapeSvg(a, colors[0]);
    if (rng() < 0.5) { other = shapeSvg(a, colors[1]); how = "顏色"; } else { other = shapeSvg(a, colors[0], "kshape tiny"); how = "大小"; }
  } else {
    // 一樣的形狀、一樣的顏色，只有一個轉了方向
    const a = pick([SHAPES[1], SHAPES[3], SHAPES[6]], rng), turn = a.name === "長方形" ? 90 : 180;
    base = shapeSvg(a, colors[0]); other = shapeSvg(a, colors[0], `kshape turn${turn}`); how = "方向";
  }
  return {
    say: "哪一個跟其他的不一樣？", scene: "", pic: true,
    choices: Array.from({ length: n }, (_, i) => ({ html: i === at ? other : base, value: i })), answer: at, meta: { at, how },
  };
}

function machine(level, rng) {
  const rules = level === 1 ? [["加 1", (x) => x + 1], ["加 2", (x) => x + 2]]
    : level === 2 ? [["加 3", (x) => x + 3], ["加 4", (x) => x + 4], ["減 1", (x) => x - 1], ["減 2", (x) => x - 2]]
    : [["變成 2 倍", (x) => x * 2], ["加 5", (x) => x + 5], ["減 3", (x) => x - 3], ["加 10", (x) => x + 10]];
  const [name, f] = pick(rules, rng), lo = name.startsWith("減") ? 4 : 1;
  const xs = shuffle([0, 1, 2, 3, 4, 5].map((i) => lo + i), rng).slice(0, 3), ans = f(xs[2]);
  return {
    say: `數字機器會把數字變一變。找找看規律，${xs[2]} 會變成多少？`,
    scene: `<div class="kmach">${xs.map((x, i) => `<div><span>${x}</span><b>機器</b><span>${i < 2 ? f(x) : "?"}</span></div>`).join("")}</div>`,
    ...numChoices(ans, rng, 4, 0), meta: { ans, rule: name, xs },
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
  { title: "看時鐘", games: [
    { id: "clock", title: "現在幾點", sub: "看時鐘說出時間", gen: clock },
    { id: "clockpick", title: "找時鐘", sub: "哪一個時鐘才對", gen: clockpick },
  ] },
  { title: "動動腦", games: [
    { id: "story", title: "小故事算一算", sub: "聽故事，想想看是加還是減", gen: story },
    { id: "order", title: "誰最高", sub: "聽線索，排出順序", gen: order },
    { id: "odd", title: "哪個不一樣", sub: "找出不同的那一個", gen: odd },
    { id: "machine", title: "數字機器", sub: "猜猜機器的規律", gen: machine },
  ] },
];
// 綜合挑戰：每一題從不同的遊戲抽，同一輪（18 題）內不重複，避免一直做同一種題目太無聊
let mixQueue = [], mixLast = null;
function mix(level, rng) {
  if (!mixQueue.length) {
    mixQueue = GROUPS.flatMap((g) => g.games);
    for (let i = mixQueue.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [mixQueue[i], mixQueue[j]] = [mixQueue[j], mixQueue[i]]; }
    if (mixQueue[0] === mixLast) mixQueue.push(mixQueue.shift()); // 新的一輪不要跟上一題同一種
  }
  const g = mixQueue.shift();
  mixLast = g;
  return { ...g.gen(level, rng), from: g.id, tag: g.title };
}
export const MIX = { id: "mix", title: "綜合挑戰", sub: "各種題目混在一起，每一題都不一樣", gen: mix };
export const GAMES = [MIX, ...GROUPS.flatMap((g) => g.games)];
export const findGame = (id) => GAMES.find((g) => g.id === id);
export function makeQuestion(game, level, rng = Math.random) { return game.gen(level, rng); }

// 學習紀錄用：把一題說成家長看得懂的一句話（題目本身太籠統時，補上實際的數字）
export function describe(game, q) {
  if (game.id === "mix" && q.from) return describe(findGame(q.from), q);
  const m = q.meta || {};
  switch (game.id) {
    case "count": return `數甜甜圈：${m.n} 個`;
    case "more": return `比多少：${m.a} 個和 ${m.b} 個`;
    case "numcmp": return `比大小：${m.vals.join("、")}`;
    case "length": return `比長短：找最${m.short ? "短" : "長"}的`;
    case "pattern": return m.step ? `數字規律：每次${m.step > 0 ? "加" : "減"} ${Math.abs(m.step)}` : "圖形規律";
    case "coins": return `數錢幣：${m.ans} 元`;
    case "shape": return m.ans ? `${m.name}有幾個邊` : q.say.replace("？", "");
    case "next": return m.step ? `${m.step} 個一數，答案 ${m.ans}` : q.say.startsWith("中間") ? `中間的數字：${m.ans}` : q.say.replace("？", "");
    case "clock": return `看時鐘：${m.time}`;
    case "clockpick": return `找時鐘：${m.time}`;
    case "order": return `排順序：${m.rank.length} 個動物，誰最${m.trait}`;
    case "odd": return `找不一樣：${m.how}不同`;
    case "machine": return `數字機器：${m.rule}`;
    default: return q.say.replace("？", "");
  }
}
