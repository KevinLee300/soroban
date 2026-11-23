import test from "node:test";
import assert from "node:assert/strict";
import { filters, collections, matchingCollections } from "../js/catalog.js";

test("活動入口唯一，每個程度、學習方式與主題都能找到活動", () => {
  const items = collections.flatMap(group => group.entries);
  assert.equal(new Set(items.map(item => item.route)).size, items.length);
  for (const [key, options] of Object.entries(filters)) {
    for (const item of items) assert.ok(item[key].length && item[key].every(v => options.includes(v)), item.title);
    for (const value of options) assert.ok(matchingCollections({ [key]: value }).length, value);
  }
});

test("搭配三個條件，僅保留符合全部條件的活動", () => {
  const hits = matchingCollections({ level: "基礎練習", method: "雙人合作", topic: "乘除" });
  assert.deepEqual(hits.flatMap(g => g.entries.map(i => i.route)), ["#duo"]);
  assert.deepEqual(matchingCollections({ method: "紙筆練習", topic: "時間" }), []);
});
