import test from "node:test";
import assert from "node:assert/strict";
import * as D from "../js/daily.js";

const entry = (d, id, c = 9, n = 10, w = []) => ({ d, t: 0, id, label: id, c, n, sec: 120, w });

test("每日任務：每天 3 個，2 個幼兒數學（不同遊戲）加 1 個珠算，同一天固定不變", () => {
  for (let i = 0; i < 40; i++) {
    const d = D.addDays("2026-11-17", i), t = D.pickTasks(d, {});
    assert.equal(t.length, 3);
    assert.ok(t[0].match.startsWith("m.") && t[1].match.startsWith("m."));
    assert.notEqual(t[0].match, t[1].match);
    assert.equal(t[2].match, "1");
    assert.equal(t[2].href, "#level-1-go");
    assert.deepEqual(D.pickTasks(d, {}), t);
  }
  // 連續幾天不會一直是同一個遊戲
  const seen = new Set();
  for (let i = 0; i < 30; i++) D.pickTasks(D.addDays("2026-11-17", i), {}).slice(0, 2).forEach((t) => seen.add(t.match));
  assert.ok(seen.size >= 12, `30 天只出現 ${seen.size} 種遊戲`);
});

test("每日任務：珠算照順序往下走，全部三顆星就改做題庫", () => {
  assert.equal(D.pickTasks("2026-11-17", { 1: 3 })[2].match, "2.add");
  assert.equal(D.pickTasks("2026-11-17", { 1: 3, "2.add": 3 })[2].href, "#level-2-sub");
  const all = { 1: 3, 4: 3 };
  for (const k of ["2.add", "2.sub", "2.mix", "3.make5", "3.plus", "3.from5", "3.minus", "3.mix"]) all[k] = 3;
  assert.equal(D.pickTasks("2026-11-17", all)[2].match, "drill.");
});

test("任務完成與連續天數", () => {
  const day = "2026-11-17", tasks = D.pickTasks(day, {});
  const ids = tasks.map((t) => (t.match.endsWith(".") ? t.match + "2" : t.match));
  let log = [entry(day, ids[0])];
  assert.equal(D.taskDone(tasks[0], log, day), true);
  assert.equal(D.taskDone(tasks[1], log, day), false);
  assert.equal(D.allDone(tasks, log, day), false);
  // 昨天、前天都全部完成，今天只做了一個：連續 2 天，不會歸零
  const daily = { [day]: tasks };
  for (const back of [1, 2]) {
    const d = D.addDays(day, -back), ts = D.pickTasks(d, {});
    daily[d] = ts;
    log = log.concat(ts.map((t) => entry(d, t.match.endsWith(".") ? t.match + "1" : t.match)));
  }
  assert.equal(D.streak(daily, log, day), 2);
  log = log.concat(ids.slice(1).map((id) => entry(day, id)));
  assert.equal(D.streak(daily, log, day), 3);
  assert.equal(D.streak({}, [], day), 0);
});

test("學習紀錄整理：每天、每個項目、答錯的題目", () => {
  const log = [
    entry("2026-11-15", "m.add.2", 5, 10, ["3 加 4 是多少？"]),
    entry("2026-11-17", "m.add.2", 6, 10, ["2 加 7 是多少？", "5 加 4 是多少？"]),
    entry("2026-11-17", "m.count.2", 10, 10),
    entry("2026-11-17", "m.count.2", 9, 10),
  ];
  const days = D.summarizeDays(log, "2026-11-17", 7);
  assert.equal(days.length, 7);
  assert.equal(days.at(-1).d, "2026-11-17");
  assert.deepEqual([days.at(-1).sessions, days.at(-1).n, days.at(-1).c], [3, 30, 25]);
  assert.equal(days.at(-3).n, 10);
  assert.equal(days[0].n, 0);
  const items = D.summarizeItems(log);
  assert.equal(items[0].id, "m.add.2");
  assert.equal(items[0].flag, "weak");
  assert.equal(items[1].flag, "strong");
  assert.equal(items[0].last, "2026-11-17");
  const wrong = D.recentWrong(log, 2);
  assert.deepEqual(wrong.map((w) => w.q), ["2 加 7 是多少？", "5 加 4 是多少？"]);
});

test("每日任務：國小排九九乘法，幼兒園維持原本的組合", () => {
  const day = "2026-11-17";
  const kinder = D.pickTasks(day, {});
  assert.ok(kinder.every((t) => t.g === "kinder"));
  assert.deepEqual(D.pickTasks(day, {}, { grade: "kinder" }).map((t) => t.match), kinder.map((t) => t.match));
  // 還沒練過九九乘法：先練習
  const first = D.pickTasks(day, {}, { grade: "school" });
  assert.equal(first.length, 3);
  assert.ok(first.every((t) => t.g === "school" && t.href.startsWith("#times-")));
  assert.deepEqual(first.map((t) => t.match), ["times.practice", "times.timed", "times.story."]);
  assert.equal(first[2].href, "#times-story-1");
  // 練過之後：弱點加強；應用題拿到三顆星就升一級
  const later = D.pickTasks(day, { "times.story.1": 3 }, { grade: "school", timesStarted: true });
  assert.equal(later[0].match, "times.weak");
  assert.equal(later[2].href, "#times-story-2");
  assert.match(later[2].title, /普通/);
  assert.equal(D.pickTasks(day, { "times.story.1": 3, "times.story.2": 3 }, { grade: "school", timesStarted: true })[2].href, "#times-story-3");
  // 應用題任務：哪一種難度做完都算
  const log = [{ d: day, id: "times.story.1", c: 8, n: 10 }];
  assert.equal(D.taskDone(later[2], log, day), true);
  assert.equal(D.taskDone(later[1], log, day), false);
});
