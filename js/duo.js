// 一起守城堡（兩人合作）：兩個孩子各自的題目。戰場在 battle.js。純邏輯，不碰 DOM，可以用 node --test 測試。
// 兩個孩子各做自己程度的題目，答對就幫自己的砲塔升級。
import { clockSvg, donut } from "./kids.js";

const rnd = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// 3 個選項：正確答案加上兩個接近的數字（不會是負的、不重複）
function three(ans, near, rng, min = 0) {
  const set = new Set([ans]);
  for (const v of shuffle(near, rng)) { if (set.size < 3 && v >= min && v !== ans) set.add(v); }
  for (let d = 1; set.size < 3; d++) { if (ans + d >= min) set.add(ans + d); if (set.size < 3 && ans - d >= min) set.add(ans - d); }
  const choices = shuffle([...set], rng);
  return { choices, answer: choices.indexOf(ans) };
}
const DONUT = ["#F48FB1", "#FFD54F", "#81D4FA", "#A5D6A7", "#B39DDB"];
const pileOf = (n, color, eaten = 0) => `<div class="dgrid small" style="--cols:${Math.max(1, Math.min(n, 5))}">${Array.from({ length: n }, (_, i) => donut(color, i >= n - eaten ? "eaten" : "")).join("")}</div>`;
// 10 以內的加減法都配甜甜圈，小朋友可以用數的：加法是兩堆，減法是劃掉拿走的
function addQ(a, b, rng) {
  const p = a + b, [c1, c2] = [DONUT[rnd(rng, 0, 1)], DONUT[rnd(rng, 2, 4)]];
  return { text: `${a} + ${b} = ?`, full: true, solved: `${a} + ${b} = ${p}`, scene: `<div class="krow">${pileOf(a, c1)}<span class="kop">+</span>${pileOf(b, c2)}</div>`, ans: p, ...three(p, [p - 1, p + 1, p - 2, p + 2], rng, 1) };
}
function subQ(a, b, rng, max = Infinity) {
  const p = a - b;
  const near = [p - 1, p + 1, p + 2, a + b].filter((n) => n <= max);
  return { text: `${a} − ${b} = ?`, full: true, solved: `${a} − ${b} = ${p}`, scene: pileOf(a, DONUT[rnd(rng, 0, 4)], b), ans: p, ...three(p, near, rng) };
}

// 題目格式：{ text 算式或題目, scene 圖（HTML，可以是空的）, choices [三個數字], answer 正確選項的位置, ans 答案 }
export const TYPES = [
  { id: "count", name: "數甜甜圈（10 以內）", make(rng) {
    const n = rnd(rng, 2, 10), c = DONUT[rnd(rng, 0, DONUT.length - 1)];
    return { text: "?", scene: `<div class="dgrid small" style="--cols:5">${Array.from({ length: n }, () => donut(c)).join("")}</div>`, ans: n, ...three(n, [n - 1, n + 1, n - 2, n + 2], rng, 1) };
  } },
  { id: "add5", name: "5 以內加法", make(rng) {
    const a = rnd(rng, 1, 4), b = rnd(rng, 1, 5 - a);
    return addQ(a, b, rng);
  } },
  { id: "sub5", name: "5 以內減法", make(rng) {
    const a = rnd(rng, 1, 5), b = rnd(rng, 1, a);
    return subQ(a, b, rng, 5);
  } },
  { id: "add10", name: "10 以內加法", make(rng) {
    const a = rnd(rng, 1, 9), b = rnd(rng, 1, 10 - a);
    return addQ(a, b, rng);
  } },
  { id: "addsub10", name: "10 以內加減", make(rng) {
    if (rng() < 0.5) return typeOf("add10").make(rng);
    const a = rnd(rng, 2, 10), b = rnd(rng, 1, a - 1);
    return subQ(a, b, rng);
  } },
  { id: "times", name: "九九乘法", make(rng) {
    const a = rnd(rng, 2, 9), b = rnd(rng, 2, 9), p = a * b;
    // 錯的選項是「隔壁」的乘法，要真的會才分得出來
    return { text: `${a} × ${b}`, scene: "", ans: p, ...three(p, [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b], rng, 1) };
  } },
];
export const typeOf = (id) => TYPES.find((t) => t.id === id) || TYPES.find((t) => t.id === "add10");

/* ---------- 綜合題：每一題換一種，只用數字和圖，不用識字 ---------- */
// 題目多一個 full：text 已經是完整的式子（裡面有 ?），畫面不用再接「= ?」；solved 是答錯時要顯示的完整式子
const coin = (v) => `<span class="kcoin c${v}">${v}</span>`;
const KINDER = {
  count: (rng) => typeOf("count").make(rng),
  add: (rng) => typeOf("add10").make(rng),
  sub(rng) {
    const a = rnd(rng, 2, 10), b = rnd(rng, 1, a - 1);
    return subQ(a, b, rng);
  },
  missing(rng) { // ? + 3 = 7
    const c = rnd(rng, 3, 10), b = rnd(rng, 1, c - 1), a = c - b;
    return { text: `? + ${b} = ${c}`, full: true, solved: `${a} + ${b} = ${c}`, scene: "", ans: a, ...three(a, [a - 1, a + 1, c, b], rng, 0) };
  },
  next(rng) { // 2 3 4 ?
    const s = rnd(rng, 1, 7), seq = [s, s + 1, s + 2], ans = s + 3;
    return { text: `${seq.join("  ")}  ?`, full: true, solved: `${seq.join("  ")}  ${ans}`, scene: "", ans, ...three(ans, [ans - 1, ans + 1, ans + 2], rng, 1) };
  },
  coins(rng) { // 數錢：1 元和 5 元
    const fives = rnd(rng, 0, 2), ones = rnd(rng, fives ? 0 : 2, 4), ans = fives * 5 + ones;
    return { text: "?", scene: `<div class="krow coins">${coin(5).repeat(fives)}${coin(1).repeat(ones)}</div>`, ans, ...three(ans, [ans - 1, ans + 1, fives + ones, ans + 5], rng, 1) };
  },
  clock(rng) { // 整點：短針指幾就是幾點
    const h = rnd(rng, 1, 12);
    return { text: "?", scene: `<div class="krow">${clockSvg(h, 0, "kclock")}</div>`, ans: h, ...three(h, [h % 12 + 1, (h + 10) % 12 + 1, 12], rng, 1) };
  },
};
const SCHOOL = {
  times: (rng) => typeOf("times").make(rng),
  blank(rng) { // 7 × ? = 56
    const a = rnd(rng, 2, 9), b = rnd(rng, 2, 9), p = a * b;
    return { text: `${a} × ? = ${p}`, full: true, solved: `${a} × ${b} = ${p}`, scene: "", ans: b, ...three(b, [b - 1, b + 1, a], rng, 1) };
  },
  add20(rng) {
    const a = rnd(rng, 5, 15), b = rnd(rng, 3, 20 - a), p = a + b;
    return { text: `${a} + ${b}`, scene: "", ans: p, ...three(p, [p - 1, p + 1, p + 10, p - 2], rng, 1) };
  },
  sub20(rng) {
    const a = rnd(rng, 11, 20), b = rnd(rng, 2, 9), p = a - b;
    return { text: `${a} − ${b}`, scene: "", ans: p, ...three(p, [p - 1, p + 1, p + 10, a + b], rng, 0) };
  },
};
// 輪流出：同一輪每種都出過才重複，連續兩題不會同一種
function mixer(table) {
  let queue = [], last = null;
  return (rng) => {
    if (!queue.length) {
      queue = Object.keys(table);
      for (let i = queue.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [queue[i], queue[j]] = [queue[j], queue[i]]; }
      if (queue[0] === last) queue.push(queue.shift());
    }
    last = queue.shift();
    return { ...table[last](rng), kind: last };
  };
}
TYPES.unshift(
  { id: "mixk", name: "綜合（幼稚園）", make: mixer(KINDER) },
  { id: "mixs", name: "綜合（小二）", make: mixer(SCHOOL) },
);
export const MIX_KINDS = { mixk: Object.keys(KINDER), mixs: Object.keys(SCHOOL) };

