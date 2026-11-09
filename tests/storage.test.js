import test from "node:test";
import assert from "node:assert/strict";
import { loadProfiles, activeProfile, selectProfile, addProfile, loadProgress, saveStars } from "../js/storage.js";

test("each family member keeps separate best stars and existing stars stay with the default profile", () => {
  const data = new Map([["soroban.progress.v1", JSON.stringify({ 1: 2 })]]);
  globalThis.localStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
  assert.deepEqual(loadProfiles(), ["我"]);
  assert.equal(loadProgress()[1], 2);
  assert.equal(addProfile("小明"), true);
  assert.equal(activeProfile(), "小明");
  assert.deepEqual(loadProgress(), {});
  assert.equal(saveStars(1, 3), 3);
  assert.equal(saveStars(1, 1), 3);
  assert.equal(addProfile("小明"), false);
  selectProfile("我");
  assert.equal(loadProgress()[1], 2);
  selectProfile("小明");
  assert.equal(loadProgress()[1], 3);
  delete globalThis.localStorage;
});
