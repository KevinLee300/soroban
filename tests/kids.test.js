import test from "node:test";
import assert from "node:assert/strict";
import { GAMES, GROUPS, makeQuestion, findGame } from "../js/kids.js";

const N = 300;
const each = (id, fn) => { for (const level of [1, 2, 3]) for (let k = 0; k < N; k++) fn(makeQuestion(findGame(id), level), level); };
const picked = (q) => q.choices[q.answer].value;
const donutCount = (html) => (html.match(/class="donut/g) || []).length;

test("幼兒數學：12 個遊戲，每題都有題目、不重複的選項和正確答案", () => {
  assert.equal(GAMES.length, 12);
  assert.equal(GROUPS.length, 3);
  for (const g of GAMES) for (const level of [1, 2, 3]) for (let k = 0; k < N; k++) {
    const q = makeQuestion(g, level);
    assert.ok(q.say.length > 0, g.id);
    assert.ok(q.choices.length >= 2 && q.choices.length <= 4, `${g.id} 選項數`);
    assert.ok(q.answer >= 0 && q.answer < q.choices.length, `${g.id} 答案位置`);
    assert.equal(new Set(q.choices.map((c) => String(c.value))).size, q.choices.length, `${g.id} 選項重複：${q.choices.map((c) => c.value)}`);
  }
});

test("數甜甜圈：圖上的數量就是答案，最多 20 個", () => each("count", (q, level) => {
  assert.equal(picked(q), q.meta.n);
  assert.equal(donutCount(q.scene), level === 3 ? q.meta.total : q.meta.n);
  assert.ok(donutCount(q.scene) <= 20);
}));

test("哪一盤多：答案真的比較多（或比較少）", () => each("more", (q) => {
  const [a, b] = q.choices.map((c) => c.value), ans = picked(q);
  assert.equal(ans, q.meta.fewer ? Math.min(a, b) : Math.max(a, b));
  assert.equal(donutCount(q.choices[0].html), a);
}));

test("數字比大小", () => each("numcmp", (q) => {
  assert.equal(picked(q), q.meta.small ? Math.min(...q.meta.vals) : Math.max(...q.meta.vals));
}));

test("加法、減法、湊一湊、平分：算式正確，中班的數字範圍", () => {
  each("add", (q, level) => { assert.equal(picked(q), q.meta.a + q.meta.b); assert.ok(q.meta.a + q.meta.b <= (level === 1 ? 5 : level === 2 ? 10 : 18)); });
  each("sub", (q) => { assert.equal(picked(q), q.meta.a - q.meta.b); assert.ok(q.meta.a - q.meta.b >= 0 && q.meta.a <= 18); });
  each("make", (q) => { assert.equal(picked(q) + q.meta.a, q.meta.total); });
  each("share", (q) => { assert.equal(picked(q) * q.meta.kids, q.meta.total); assert.ok(q.meta.total <= 20); assert.equal(donutCount(q.scene), q.meta.total); });
});

test("數字接龍、找規律、數錢幣、形狀的邊", () => {
  each("next", (q) => assert.equal(picked(q), q.meta.ans));
  each("pattern", (q, level) => { if (level === 3) assert.equal(picked(q), q.meta.ans); else assert.equal(picked(q), q.meta.unit[q.meta.cut]); });
  each("coins", (q) => { assert.equal(picked(q), q.meta.tens * 10 + q.meta.fives * 5 + q.meta.ones); assert.ok(picked(q) <= 29); });
  each("shape", (q, level) => { if (level === 3) assert.equal(picked(q), q.meta.ans); else assert.equal(picked(q), q.meta.name); });
});

test("比長短：答案是最長（或最短），而且長度差得夠明顯", () => each("length", (q, level) => {
  const lens = q.meta.lens;
  assert.equal(picked(q), q.meta.short ? Math.min(...lens) : Math.max(...lens));
  const sorted = [...lens].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i] - sorted[i - 1] >= (level === 1 ? 18 : 9));
}));

test("學習紀錄用的題目說明：每個遊戲都說得出是哪一題", async () => {
  const { describe } = await import("../js/kids.js");
  for (const g of GAMES) for (const level of [1, 2, 3]) for (let k = 0; k < 50; k++) {
    const text = describe(g, makeQuestion(g, level));
    assert.ok(text.length >= 3 && !text.includes("undefined") && !text.includes("NaN"), `${g.id}: ${text}`);
  }
  assert.match(describe(findGame("numcmp"), makeQuestion(findGame("numcmp"), 3)), /^比大小：\d+、\d+、\d+$/);
});
