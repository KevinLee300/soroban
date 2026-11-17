import test from "node:test";
import assert from "node:assert/strict";
import { CHAPTERS, chapterSteps, handAngles, forwardAngle, applyTap, sameTime, timeText } from "../js/clocklesson.js";

test("時鐘小學堂：6 堂課，每一步都有話可以念，只教整點和半點", () => {
  assert.equal(CHAPTERS.length, 6);
  for (const ch of CHAPTERS) for (let k = 0; k < 100; k++) {
    const steps = chapterSteps(ch.id);
    assert.ok(steps.length >= 6, ch.id);
    let time = null;
    for (const s of steps) {
      assert.ok(s.say && s.say.length >= 4, `${ch.id} 少了說明`);
      if (s.time) time = s.time;
      for (const t of [s.time, s.target].filter(Array.isArray)) {
        assert.ok(t[0] >= 1 && t[0] <= 12 && [0, 30].includes(t[1]), `${ch.id} 出現整點、半點以外的時間：${t}`);
      }
      if (s.do) assert.ok(time, `${ch.id} 互動之前要先有時間`);
    }
    assert.ok(!steps.at(-1).do, `${ch.id} 最後一步要是結語`);
    assert.ok(steps.some((s) => s.do), `${ch.id} 要有「換你試試」`);
  }
});

test("時鐘小學堂：問答題的答案在選項裡、選項不重複；撥時鐘的目標做得到", () => {
  for (const ch of CHAPTERS) for (let k = 0; k < 200; k++) {
    let time = null;
    for (const s of chapterSteps(ch.id)) {
      if (s.time) time = s.time;
      if (s.do === "ask") {
        const texts = s.choices.map((c) => timeText(...c));
        assert.equal(new Set(texts).size, 3);
        assert.ok(texts.includes(timeText(...s.time)), s.say);
      }
      if (s.do === "set") {
        assert.ok(!sameTime(time, s.target), `${ch.id} 一開始就已經是答案：${s.say}`);
        // 要撥半點，就一定要可以撥長針
        if (s.target[1] !== time[1]) assert.ok(s.hands.includes("long"), s.say);
        // 照著撥：短針點目標的小時，長針點 12 或 6，就會到目標
        let t = applyTap(time, "short", s.target[0]);
        if (s.hands.includes("long")) t = applyTap(t, "long", s.target[1] === 0 ? 12 : 6);
        assert.ok(sameTime(t, s.target), s.say);
        // 題目說的時間要跟目標一樣
        const said = s.say.match(/(\d+) 點(半)?/);
        if (said && !/短針撥到/.test(s.say)) assert.equal(timeText(+said[1], said[2] ? 30 : 0), timeText(...s.target), s.say);
      }
      if (s.do === "tapNum") assert.ok(s.target >= 1 && s.target <= 12);
      if (s.do === "tapHand") assert.ok(["short", "long"].includes(s.target));
    }
  }
});

test("時鐘小學堂：說明裡提到的時間跟時鐘顯示的一樣", () => {
  for (const ch of CHAPTERS) {
    let time = null;
    for (const s of chapterSteps(ch.id)) {
      if (s.time) time = s.time;
      if (s.do) continue;
      const m = s.say.match(/[是就] ?(\d+) 點(半)?/);
      if (m) assert.equal(timeText(+m[1], m[2] ? 30 : 0), timeText(...time), `${ch.id}：「${s.say}」但時鐘是 ${timeText(...time)}`);
    }
  }
});

test("針的角度、只往前走、撥針規則", () => {
  assert.deepEqual(handAngles(3, 0), { ha: 90, ma: 0 });
  assert.deepEqual(handAngles(3, 30), { ha: 105, ma: 180 });
  assert.deepEqual(handAngles(12, 30), { ha: 15, ma: 180 });
  assert.equal(forwardAngle(0, 180), 180);
  assert.equal(forwardAngle(180, 0), 360);     // 從 6 回到 12 要往前繞
  assert.equal(forwardAngle(360, 0), 360);     // 已經在位置上就不動
  assert.equal(forwardAngle(90, 120), 120);
  assert.equal(forwardAngle(400, 30), 750);
  assert.deepEqual(applyTap([3, 0], "short", 5), [5, 0]);
  assert.deepEqual(applyTap([3, 0], "long", 6), [3, 30]);
  assert.deepEqual(applyTap([3, 30], "long", 12), [3, 0]);
  assert.equal(applyTap([3, 0], "long", 4), null);
  assert.ok(sameTime([12, 0], [12, 0]) && !sameTime([4, 0], [4, 30]));
});
