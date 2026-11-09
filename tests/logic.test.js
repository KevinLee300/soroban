import test from "node:test";
import assert from "node:assert/strict";
import * as L from "../js/logic.js";

test("口訣用「加五減四」說法", () => {
  const plus1 = L.FIVE_RULES.find((r) => r.op === "+" && r.n === 1);
  const minus4 = L.FIVE_RULES.find((r) => r.op === "-" && r.n === 4);
  assert.equal(L.chantShort(plus1), "加五減四");
  assert.equal(L.chant(minus4), "減四，減五加一");
});

test("五的好朋友：每個起始數字都真的需要用到口訣", () => {
  for (const r of L.FIVE_RULES) {
    const s = L.fiveStarts(r);
    assert.ok(s.length > 0);
    for (const a of s) assert.ok(L.needsFive(a, r.op, r.n), `${a}${r.op}${r.n}`);
  }
});

test("五的好朋友：動畫最後一步等於答案，每步都在 0–9", () => {
  for (const r of L.FIVE_RULES) for (const a of L.fiveStarts(r)) {
    const { steps } = L.buildFiveSteps(r, a);
    assert.equal(steps.at(-1).v, L.apply(a, r.op, r.n));
    for (const s of steps) assert.ok(s.v >= 0 && s.v <= 9);
  }
});

test("直接加減判斷", () => {
  assert.ok(L.isDirect(2, "+", 2));
  assert.ok(L.isDirect(3, "+", 6));
  assert.ok(!L.isDirect(3, "+", 2)); // 要用五的好朋友
  assert.ok(L.isDirect(8, "-", 3));
  assert.ok(!L.isDirect(6, "-", 2));
  assert.ok(!L.isDirect(7, "+", 5));
});

test("直接加減與出題：答案都在範圍內", () => {
  for (let k = 0; k < 300; k++) {
    for (const q of [L.q1(), L.q2(), L.q3()]) {
      assert.ok(q.target >= 0 && q.target <= 9, JSON.stringify(q));
      assert.ok(q.start >= 0 && q.start <= 9);
    }
  }
  const { steps } = L.buildDirectSteps(7, "-", 6);
  assert.equal(steps.at(-1).v, 1);
});

test("星星計算", () => {
  assert.equal(L.stars(10, 10), 3);
  assert.equal(L.stars(9, 10), 3);
  assert.equal(L.stars(7, 10), 2);
  assert.equal(L.stars(5, 10), 1);
  assert.equal(L.stars(4, 10), 0);
});
