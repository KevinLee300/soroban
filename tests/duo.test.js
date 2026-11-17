import test from "node:test";
import assert from "node:assert/strict";
import { TYPES, typeOf } from "../js/duo.js";

const calc = (t) => { const [x, op, y] = t.split(" "); return op === "×" ? x * y : op === "+" ? +x + +y : x - y; };

test("一起打怪物：每種題目都是 3 個不重複的選項，答案在裡面而且算得對", () => {
  assert.equal(TYPES.length, 5);
  for (const t of TYPES) for (let k = 0; k < 500; k++) {
    const q = t.make(Math.random);
    assert.equal(q.choices.length, 3, t.id);
    assert.equal(new Set(q.choices).size, 3, `${t.id} 選項重複：${q.choices}`);
    assert.equal(q.choices[q.answer], q.ans);
    assert.ok(q.choices.every((c) => Number.isInteger(c) && c >= 0), `${t.id} 選項：${q.choices}`);
    if (t.id === "count") { assert.equal((q.scene.match(/class="donut/g) || []).length, q.ans); assert.ok(q.ans >= 2 && q.ans <= 10); }
    else assert.equal(calc(q.text), q.ans, q.text);
    if (t.id === "add5") assert.ok(q.ans <= 5);
    if (t.id === "add10" || t.id === "addsub10") assert.ok(q.ans >= 0 && q.ans <= 10);
    if (t.id === "times") assert.ok(q.choices.every((c) => c >= 1));
  }
  assert.equal(typeOf("times").id, "times");
  assert.equal(typeOf("沒有這種").id, "add10");
});
