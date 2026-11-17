import test from "node:test";
import assert from "node:assert/strict";
import * as T from "../js/times.js";

test("九九乘法：72 題，口訣念法正確", () => {
  assert.equal(T.FACTS.length, 72);
  for (const f of T.FACTS) assert.equal(f.p, f.a * f.b);
  assert.equal(T.chant(2, 3), "二三得六");
  assert.equal(T.chant(3, 3), "三三得九");
  assert.equal(T.chant(2, 5), "二五一十");
  assert.equal(T.chant(3, 4), "三四十二");
  assert.equal(T.chant(4, 5), "四五二十");
  assert.equal(T.chant(7, 8), "七八五十六");
  assert.equal(T.chant(9, 9), "九九八十一");
  assert.equal(T.chant(5, 1), "五一得五");
  for (const f of T.FACTS) assert.ok(!/undefined|零/.test(T.chant(f.a, f.b)), f.key);
});

test("出題：算答案和填空，把答案放回去算式要成立", () => {
  for (const type of ["ans", "blank", "mix"]) for (const f of T.FACTS) for (let k = 0; k < 20; k++) {
    const q = T.makeQuestion(f, type);
    const parts = q.parts.map((x) => (x === null ? q.answer : x));
    assert.equal(parts[0] * parts[1], parts[2], T.questionText(q));
    assert.equal(q.parts.filter((x) => x === null).length, 1);
    if (type === "ans") assert.equal(q.answer, f.p);
    if (type === "blank") assert.ok(q.answer === f.a || q.answer === f.b);
    assert.match(T.questionText(q), /^(\d+|□) × (\d+|□) = (\d+|□)$/);
  }
});

test("題目順序：照順序背、打亂、只出選的乘法", () => {
  const seq = T.buildQueue({ tables: [7], order: "seq" });
  assert.deepEqual(seq.map((q) => q.key), ["7x1", "7x2", "7x3", "7x4", "7x5", "7x6", "7x7", "7x8", "7x9"]);
  assert.equal(T.buildQueue({ tables: [2, 3], order: "seq" }).length, 18);
  for (let k = 0; k < 50; k++) {
    const q = T.buildQueue({ tables: [6, 7, 8], order: "random", count: 20 });
    assert.equal(q.length, 20);
    assert.ok(q.every((x) => [6, 7, 8].includes(x.a)));
    assert.equal(new Set(q.map((x) => x.key)).size, 20, "20 題以內不該重複（3 個乘法有 27 題）");
    const one = T.buildQueue({ tables: [9], order: "random", count: 20 });
    for (let i = 1; i < one.length; i++) assert.notEqual(one[i].key, one[i - 1].key, "相鄰兩題不重複");
    assert.equal(new Set(one.slice(0, 9).map((x) => x.key)).size, 9, "先把 9 題都出過一輪");
  }
  assert.deepEqual(T.buildQueue({ tables: [] }), []);
});

test("熟練度：連續答對 3 次而且夠快才算熟練；答錯會掉下來", () => {
  let s;
  assert.equal(T.mastery(s), 0);
  s = T.record(s, false, 0, "2026-11-17"); assert.equal(T.mastery(s), 1);
  s = T.record(s, true, 3000); assert.equal(T.mastery(s), 2);
  s = T.record(s, true, 3000); assert.equal(T.mastery(s), 2);
  s = T.record(s, true, 3000); assert.equal(T.mastery(s), 3);
  assert.deepEqual([s.c, s.w, s.streak], [3, 1, 3]);
  s = T.record(s, false, 0); assert.equal(T.mastery(s), 1);
  // 答對但很慢（10 秒）：還可以，不算熟練
  let slow;
  for (let i = 0; i < 4; i++) slow = T.record(slow, true, 10000);
  assert.equal(T.mastery(slow), 2);
});

test("弱點加強：不熟的先出，熟練的最後；整體統計", () => {
  const stats = {};
  for (let i = 0; i < 3; i++) for (const f of T.FACTS) stats[f.key] = T.record(stats[f.key], true, 2000); // 全部熟練
  stats["7x8"] = T.record(stats["7x8"], false, 0);
  stats["6x7"] = T.record(T.record(stats["6x7"], false, 0), false, 0);
  delete stats["9x9"]; // 還沒練
  stats["4x4"] = T.record(undefined, true, 9000); // 還可以
  for (let k = 0; k < 20; k++) {
    const keys = T.weakest(stats, 10).map((f) => f.key);
    assert.equal(keys.length, 10);
    assert.deepEqual(keys.slice(0, 2), ["6x7", "7x8"], "錯比較多的排最前面");
    assert.equal(keys[2], "4x4");
    assert.equal(keys[3], "9x9");
    assert.equal(new Set(keys).size, 10);
  }
  assert.deepEqual(T.summary(stats), [1, 2, 1, 68]);
  assert.deepEqual(T.summary({}), [72, 0, 0, 0]);
  assert.equal(T.weakest({}, 10).length, 10);
});
