import test from "node:test";
import assert from "node:assert/strict";
import { makeSheet, sheetBlanks } from "../js/sheet.js";

test("練習單：6 個區塊、13 個格子，每格都有答案", () => {
  for (const level of [1, 2, 3]) for (let k = 0; k < 300; k++) {
    const s = makeSheet(level), blanks = sheetBlanks(s);
    assert.equal(blanks.length, 13);
    for (const b of blanks) assert.ok(b.label.length > 2 && (typeof b.ans === "number" ? b.ans >= 0 : [">", "<", "="].includes(b.ans)), JSON.stringify(b));
  }
});

test("練習單：每個區塊的答案都算得對，數字範圍符合難度", () => {
  for (const level of [1, 2, 3]) for (let k = 0; k < 300; k++) {
    const s = makeSheet(level), max = level === 1 ? 10 : level === 2 ? 20 : 100;
    // 接著填：等差、空 2 格、前兩格有給
    const vs = s.seq.cells.map((c) => c.v);
    for (let i = 1; i < 6; i++) assert.equal(vs[i] - vs[i - 1], s.seq.step);
    assert.equal(s.seq.cells.filter((c) => c.blank).length, 2);
    assert.ok(!s.seq.cells[0].blank && !s.seq.cells[1].blank);
    assert.ok(vs[5] <= max, `接著填太大：${vs}`);
    // 比大小
    for (const r of s.compare) assert.equal(r.ans, r.a > r.b ? ">" : r.a < r.b ? "<" : "=");
    if (level > 1) assert.ok(s.compare.some((r) => r.ans === "="));
    // 分一分
    for (const b of s.bonds) { assert.equal(b.shown + b.ans, b.total); assert.ok(b.shown >= 1 && b.ans >= 1 && b.total <= 18); }
    // 加、減
    for (const a of s.adds) { assert.equal(a.ans, a.a + a.b); assert.ok(a.ans <= (level === 1 ? 5 : level === 2 ? 10 : 18)); }
    for (const x of s.subs) { assert.equal(x.ans, x.a - x.b); assert.ok(x.ans >= 1 && x.a <= 18); }
    // 找數字：把答案放回去，算式要成立
    for (const f of s.finds) { assert.ok(f.check(f.ans), JSON.stringify(f.text)); assert.ok(f.ans >= 1 && f.ans <= 9); }
  }
});

test("練習單：同一個區塊的兩題不會一模一樣", () => {
  for (const level of [1, 2, 3]) for (let k = 0; k < 300; k++) {
    const s = makeSheet(level);
    assert.notDeepEqual([s.adds[0].a, s.adds[0].b], [s.adds[1].a, s.adds[1].b]);
    assert.notDeepEqual([s.subs[0].a, s.subs[0].b], [s.subs[1].a, s.subs[1].b]);
    assert.notDeepEqual([s.bonds[0].total, s.bonds[0].shown], [s.bonds[1].total, s.bonds[1].shown]);
  }
});
