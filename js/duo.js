// 一起守城堡（兩人合作）：兩個孩子各自的題目。戰場在 battle.js。純邏輯，不碰 DOM，可以用 node --test 測試。
// 兩個孩子各做自己程度的題目，答對就幫自己的砲塔升級。
import { donut } from "./kids.js";

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

// 題目格式：{ text 算式或題目, scene 圖（HTML，可以是空的）, choices [三個數字], answer 正確選項的位置, ans 答案 }
export const TYPES = [
  { id: "count", name: "數甜甜圈（10 以內）", make(rng) {
    const n = rnd(rng, 2, 10), c = DONUT[rnd(rng, 0, DONUT.length - 1)];
    return { text: "?", scene: `<div class="dgrid small" style="--cols:5">${Array.from({ length: n }, () => donut(c)).join("")}</div>`, ans: n, ...three(n, [n - 1, n + 1, n - 2, n + 2], rng, 1) };
  } },
  { id: "add5", name: "5 以內加法", make(rng) {
    const a = rnd(rng, 1, 4), b = rnd(rng, 1, 5 - a), p = a + b;
    return { text: `${a} + ${b}`, scene: "", ans: p, ...three(p, [p - 1, p + 1, p + 2], rng, 1) };
  } },
  { id: "add10", name: "10 以內加法", make(rng) {
    const a = rnd(rng, 1, 9), b = rnd(rng, 1, 10 - a), p = a + b;
    return { text: `${a} + ${b}`, scene: "", ans: p, ...three(p, [p - 1, p + 1, p - 2, p + 2], rng, 1) };
  } },
  { id: "addsub10", name: "10 以內加減", make(rng) {
    if (rng() < 0.5) return TYPES[2].make(rng);
    const a = rnd(rng, 2, 10), b = rnd(rng, 1, a - 1), p = a - b;
    return { text: `${a} − ${b}`, scene: "", ans: p, ...three(p, [p - 1, p + 1, p + 2, a + b], rng, 0) };
  } },
  { id: "times", name: "九九乘法", make(rng) {
    const a = rnd(rng, 2, 9), b = rnd(rng, 2, 9), p = a * b;
    // 錯的選項是「隔壁」的乘法，要真的會才分得出來
    return { text: `${a} × ${b}`, scene: "", ans: p, ...three(p, [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b], rng, 1) };
  } },
];
export const typeOf = (id) => TYPES.find((t) => t.id === id) || TYPES[2];
