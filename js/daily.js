// 每日任務和學習紀錄的計算。純邏輯，不碰 DOM、不碰 localStorage，可以用 node --test 測試。
import { GROUPS } from "./kids.js";
import { LEVELS } from "./levels.js";

export function dayNumber(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}
export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number), t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

/* ---------- 每日任務：2 個幼兒數學（不同分類）＋ 1 個珠算 ---------- */
// 任務格式：{ match: 對應紀錄的項目代號（結尾是 . 表示開頭符合就算）, title, href }
export function pickTasks(dateStr, prog = {}) {
  const day = dayNumber(dateStr), tasks = [];
  // 幼兒數學：每天輪兩個分類，優先挑還沒全部拿到三顆星的遊戲
  for (const gi of [day % GROUPS.length, (day + 1) % GROUPS.length]) {
    const games = GROUPS[gi].games;
    const open = games.filter((g) => [1, 2, 3].some((lv) => (prog[`m.${g.id}.${lv}`] || 0) < 3));
    const pool = open.length ? open : games, g = pool[day % pool.length];
    tasks.push({ match: `m.${g.id}.`, title: `幼兒數學：${g.title}`, href: `#math-${g.id}` });
  }
  // 珠算：照順序，找第一個還沒拿到三顆星的練習；都拿到了就做算盤題庫
  let abacus = null;
  for (const lv of LEVELS.filter((l) => l.ready)) {
    for (const s of lv.practice || [{ id: "", label: "" }]) {
      const key = s.id ? `${lv.id}.${s.id}` : String(lv.id);
      if (!abacus && (prog[key] || 0) < 3) {
        abacus = { match: key, title: `珠算：第 ${lv.id} 關 ${lv.title}${s.label ? `（${s.label}）` : ""}`, href: `#level-${lv.id}-${s.id || "go"}` };
      }
    }
  }
  tasks.push(abacus || { match: "drill.", title: "珠算：算盤題庫", href: "#drill" });
  return tasks;
}

const hit = (task, e) => (task.match.endsWith(".") ? e.id.startsWith(task.match) : e.id === task.match);
export const taskDone = (task, log, dateStr) => log.some((e) => e.d === dateStr && hit(task, e));
export const allDone = (tasks, log, dateStr) => !!tasks && tasks.length > 0 && tasks.every((t) => taskDone(t, log, dateStr));

// 連續幾天完成全部任務。今天還沒做完不會歸零，從昨天往回算。
export function streak(daily, log, todayStr) {
  let n = 0, d = todayStr;
  if (!allDone(daily[d], log, d)) d = addDays(d, -1);
  while (allDone(daily[d], log, d)) { n++; d = addDays(d, -1); }
  return n;
}

/* ---------- 學習紀錄的整理 ---------- */
// 最近幾天，每天做了幾次、幾題、答對幾題、花幾秒（舊到新）
export function summarizeDays(log, todayStr, days = 7) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(todayStr, -i), es = log.filter((e) => e.d === d);
    out.push({ d, sessions: es.length, n: es.reduce((s, e) => s + e.n, 0), c: es.reduce((s, e) => s + e.c, 0), sec: es.reduce((s, e) => s + (e.sec || 0), 0) });
  }
  return out;
}

// 每個項目：做了幾次、答對率、最近一次。答對率低的排前面。
export function summarizeItems(log) {
  const map = new Map();
  for (const e of log) {
    const it = map.get(e.id) || { id: e.id, label: e.label, times: 0, n: 0, c: 0, last: "" };
    it.times++; it.n += e.n; it.c += e.c; it.label = e.label;
    if (e.d > it.last) it.last = e.d;
    map.set(e.id, it);
  }
  return [...map.values()].map((it) => {
    const acc = it.n ? it.c / it.n : 0;
    return { ...it, acc, flag: it.n >= 10 && acc < 0.7 ? "weak" : it.times >= 2 && acc >= 0.9 ? "strong" : "" };
  }).sort((a, b) => a.acc - b.acc || b.times - a.times);
}

// 最近答錯的題目（新到舊）
export function recentWrong(log, limit = 12) {
  const out = [];
  for (let i = log.length - 1; i >= 0 && out.length < limit; i--) {
    for (const q of log[i].w || []) { if (out.length < limit) out.push({ q, label: log[i].label, d: log[i].d }); }
  }
  return out;
}
