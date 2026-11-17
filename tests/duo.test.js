import test from "node:test";
import assert from "node:assert/strict";
import { TYPES, typeOf, MIX_KINDS } from "../js/duo.js";

const calc = (t) => { const [x, op, y] = t.split(" "); return op === "×" ? x * y : op === "+" ? +x + +y : x - y; };
const basic = (q) => { assert.equal(q.choices.length, 3); assert.equal(new Set(q.choices).size, 3, `選項重複：${q.choices}`); assert.equal(q.choices[q.answer], q.ans); assert.ok(q.choices.every((c) => Number.isInteger(c) && c >= 0), `選項：${q.choices}`); };

test("一起守城堡：每種題目都是 3 個不重複的選項，答案在裡面而且算得對", () => {
  assert.equal(TYPES.length, 7);
  for (const t of TYPES.filter((x) => !x.id.startsWith("mix"))) for (let k = 0; k < 500; k++) {
    const q = t.make(Math.random);
    basic(q);
    if (t.id === "count") { assert.equal((q.scene.match(/class="donut/g) || []).length, q.ans); assert.ok(q.ans >= 2 && q.ans <= 10); assert.equal(q.text, "?", "數甜甜圈不用字"); }
    else assert.equal(calc(q.text), q.ans, q.text);
    if (t.id === "add5") assert.ok(q.ans <= 5);
    if (t.id === "add10" || t.id === "addsub10") assert.ok(q.ans >= 0 && q.ans <= 10);
  }
  assert.equal(typeOf("times").id, "times");
  assert.equal(typeOf("沒有這種").id, "add10");
});

test("綜合題：每一種都會出、連續兩題不同種、不用識字、答案正確", () => {
  for (const id of ["mixk", "mixs"]) {
    const t = typeOf(id), kinds = new Set();
    let last = null;
    for (let k = 0; k < 700; k++) {
      const q = t.make(Math.random);
      basic(q);
      kinds.add(q.kind);
      assert.notEqual(q.kind, last, "連續兩題同一種"); last = q.kind;
      // 畫面上的字只能是數字、符號、空白（不能有國字）
      assert.ok(!/[一-鿿]/.test(q.text), `有國字：${q.text}`);
      if (q.full) {
        assert.ok(q.text.includes("?") && q.solved && !q.solved.includes("?"));
        const m = q.solved.match(/^(\d+) ([+−×]) (\d+) = (\d+)$/);
        if (m) assert.equal(calc(`${m[1]} ${m[2]} ${m[3]}`), +m[4], q.solved);
        if (q.kind === "next") { const ns = q.solved.split(/\s+/).map(Number); for (let i = 1; i < ns.length; i++) assert.equal(ns[i] - ns[i - 1], 1); assert.equal(ns.at(-1), q.ans); }
      } else if (!q.scene) assert.equal(calc(q.text), q.ans, q.text);
      if (q.kind === "coins") { const fives = (q.scene.match(/kcoin c5/g) || []).length, ones = (q.scene.match(/kcoin c1/g) || []).length; assert.equal(fives * 5 + ones, q.ans); }
      if (q.kind === "clock") { assert.ok(q.ans >= 1 && q.ans <= 12); assert.ok(q.scene.includes(`rotate(${(q.ans % 12) * 30} 50 50)`)); }
      if (id === "mixk") assert.ok(q.ans <= 15, `幼稚園的答案太大：${q.text} ${q.ans}`);
    }
    assert.deepEqual([...kinds].sort(), [...MIX_KINDS[id]].sort());
  }
});
