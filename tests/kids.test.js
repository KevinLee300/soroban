import test from "node:test";
import assert from "node:assert/strict";
import { GAMES, GROUPS, makeQuestion, findGame } from "../js/kids.js";

const N = 300;
const each = (id, fn) => { for (const level of [1, 2, 3]) for (let k = 0; k < N; k++) fn(makeQuestion(findGame(id), level), level); };
const picked = (q) => q.choices[q.answer].value;
const donutCount = (html) => (html.match(/class="donut/g) || []).length;

test("幼兒數學：18 個遊戲，每題都有題目、不重複的選項和正確答案", () => {
  assert.equal(GAMES.length, 18);
  assert.equal(GROUPS.length, 5);
  for (const g of GAMES) for (const level of [1, 2, 3]) for (let k = 0; k < N; k++) {
    const q = makeQuestion(g, level);
    assert.ok(q.say.length > 0, g.id);
    assert.ok(q.choices.length >= 2 && q.choices.length <= 5, `${g.id} 選項數`);
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

test("時鐘：答案就是鐘面上的時間，選項裡有容易看錯的時間", async () => {
  const { timeText } = await import("../js/kids.js");
  assert.equal(timeText(3, 0), "3 點");
  assert.equal(timeText(3, 30), "3 點半");
  assert.equal(timeText(12, 45), "12 點 45 分");
  for (const id of ["clock", "clockpick"]) each(id, (q, level) => {
    assert.equal(picked(q), q.meta.time);
    assert.ok(q.meta.h >= 1 && q.meta.h <= 12);
    assert.ok((level === 1 ? [0] : level === 2 ? [0, 30] : [15, 45]).includes(q.meta.m));
    // 鐘面的指針角度要對：長針 m*6 度，短針 (h + m/60)*30 度
    const html = id === "clock" ? q.scene : q.choices[q.answer].html;
    assert.ok(html.includes(`rotate(${q.meta.m * 6} 50 50)`));
    assert.ok(html.includes(`rotate(${((q.meta.h % 12) + q.meta.m / 60) * 30} 50 50)`));
  });
});

test("小故事：重新算一次故事裡的數字，答案要一樣，而且在 0–18", () => each("story", (q) => {
  const ans = picked(q), nums = q.say.match(/\d+/g).map(Number);
  assert.equal(ans, q.meta.ans);
  assert.ok(ans >= 0 && ans <= 18, q.say);
  let expect;
  if (q.say.includes("後來") && q.say.indexOf("媽媽再給") < q.say.indexOf("後來")) expect = nums[0] + nums[1] - nums[2];
  else if (q.say.includes("後來")) expect = nums[0] - nums[1] + nums[2];
  else if (q.say.includes("一共") || /比.+多 \d+/.test(q.say) || q.say.includes("媽媽再給")) expect = nums[0] + nums[1];
  else expect = nums[0] - nums[1];
  assert.equal(ans, expect, q.say);
}));

test("誰最高：照線索排出來的順序，答案是最前面或最後面那一個", () => each("order", (q) => {
  const { rank, low } = q.meta;
  assert.equal(picked(q), low ? rank.at(-1) : rank[0]);
  // 每一句線索都要跟真正的順序一致
  for (const fact of q.say.split("。")[0].split("，")) {
    const [, a, b, word] = fact.match(/^(.+)比(.+)(高|矮|重|輕|快|慢)$/);
    const higher = ["高", "重", "快"].includes(word);
    assert.ok(higher ? rank.indexOf(a) < rank.indexOf(b) : rank.indexOf(a) > rank.indexOf(b), fact);
  }
  assert.equal(q.say.split("，").length, rank.length - 1);
}));

test("哪個不一樣、數字機器", () => {
  each("odd", (q) => {
    const htmls = q.choices.map((c) => c.html), odd = htmls[q.answer];
    assert.equal(htmls.filter((h) => h === odd).length, 1);
    assert.equal(new Set(htmls).size, 2);
  });
  each("machine", (q) => {
    const f = { "加": (x, k) => x + k, "減": (x, k) => x - k }[q.meta.rule[0]];
    const k = +q.meta.rule.match(/\d+/)[0], x = q.meta.xs[2];
    assert.equal(picked(q), f ? f(x, k) : x * 2);
    assert.ok(picked(q) >= 0);
  });
});
