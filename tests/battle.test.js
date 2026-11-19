import test from "node:test";
import assert from "node:assert/strict";
import * as B from "../js/battle.js";

const seeded = (seed) => { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };
// 模擬一整場：兩個孩子各隔幾秒答對一題（0 = 不答），升級卡隨便選
function play(gapA, gapB, seed, stage = 0) {
  const rng = seeded(seed), b = B.createBattle({ aspect: 0.75, stage, rng });
  let ta = gapA, tb = gapB;
  for (let i = 0; i < 400000; i++) {
    B.step(b, 0.05 * B.BATTLE_PACE); B.takeEvents(b);
    if (gapA && (ta -= 0.05) <= 0) { B.correct(b, 0); ta += gapA; }
    if (gapB && (tb -= 0.05) <= 0) { B.correct(b, 1); tb += gapB; }
    for (const t of b.turrets) while (t.offer) B.choose(b, t.p, t.offer[Math.floor(rng() * t.offer.length)].id);
    if (b.state === "clear") B.nextStage(b); else if (b.state !== "play") break;
  }
  return b;
}

test("平衡：不答題守不住；兩個人一起答題可以打完全 8 關", () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const idle = play(0, 0, seed);
    assert.equal(idle.state, "lose");
    assert.ok(idle.stage <= 1, "不答題最多撐到第 2 關");
    const team = play(9, 6, seed);
    assert.equal(team.state, "win", `seed ${seed}：中班 9 秒＋小二 6 秒一題應該要贏`);
    assert.equal(team.stage, 7);
  }
  // 只有一個人答題：有時候會輸（要合作）
  const solo = [1, 2, 3, 4, 5, 6].map((seed) => play(0, 5, seed).state);
  assert.ok(solo.includes("lose"), `只有一個人答題都贏了：${solo}`);
});

test("第 6–8 關有不同的怪物，主怪會成為魔王，且可以直接開始", () => {
  assert.equal(new Set(B.STAGES.map(({ monster }) => monster)).size, 8);
  for (let stage = 5; stage < B.STAGES.length; stage++) {
    const b = B.createBattle({ stage, aspect: 0.75, rng: seeded(stage) });
    const st = B.STAGES[stage];
    for (const t of b.turrets) t.weapons = {};
    for (let i = 0; i < 200 && b.spawned < 4; i++) B.step(b, 0.05);
    assert.deepEqual([...new Set(b.monsters.map(({ kind }) => kind))], [st.monster, ...st.guests]);
    b.spawned = st.count;
    b.spawnT = 0;
    B.step(b, 0.05);
    assert.equal(b.monsters.find(({ boss }) => boss)?.kind, st.monster);
    assert.equal(play(9, 6, stage, stage).state, "win", `從第 ${stage + 1} 關也可以過關`);
  }
});

test("答對：放大絕招；每答對 2 題可以選一張升級卡", () => {
  const b = B.createBattle({ rng: seeded(7) });
  for (let i = 0; i < 80; i++) B.step(b, 0.05); // 讓怪物出來
  B.correct(b, 0);
  const e1 = B.takeEvents(b);
  assert.ok(e1.some((e) => e.type === "special" && e.p === 0));
  assert.ok(e1.some((e) => e.type === "hit" && e.weapon === "special" && e.by === 0));
  assert.equal(b.turrets[0].offer, null);
  B.correct(b, 0);
  const offer = b.turrets[0].offer;
  assert.equal(offer.length, 3);
  assert.equal(new Set(offer.map((c) => c.id)).size, 3);
  assert.ok(offer.some((c) => c.kind === "new" || c.kind === "up"), "一定有一張武器卡");
  assert.equal(b.turrets[1].offer, null, "另一個人的不受影響");
});

test("升級卡：攻擊力、攻擊速度、學會新武器、武器升級都有效；武器最多 5 級", () => {
  const b = B.createBattle({ rng: seeded(3) }), t = b.turrets[1];
  const give = (card) => { t.picks = 1; t.offer = [card]; assert.ok(B.choose(b, 1, card.id)); };
  give({ id: "atk", kind: "atk" }); give({ id: "atk", kind: "atk" });
  assert.equal(t.atk, 2); assert.ok(B.dmgMult(t) > 1.7);
  give({ id: "spd", kind: "spd" });
  assert.equal(t.spd, 1); assert.ok(B.rateMult(t) > 1);
  give({ id: "new-laser", kind: "new", w: "laser" });
  assert.equal(t.weapons.laser, 1);
  for (let i = 0; i < 8; i++) give({ id: "up-laser", kind: "up", w: "laser" });
  assert.equal(t.weapons.laser, B.MAX_WLV);
  // 滿級的武器不會再出現在升級卡裡；已經會的武器不會再出現「學會」
  for (let k = 0; k < 100; k++) {
    for (const c of B.makeOffer(t, Math.random)) {
      assert.notEqual(c.id, "up-laser"); assert.notEqual(c.id, "new-laser"); assert.notEqual(c.id, "new-arrow");
    }
  }
  assert.equal(B.choose(b, 1, "沒有這張卡"), false);
});

test("五種武器都打得到怪物，冰凍會讓怪物變慢", () => {
  assert.deepEqual(B.WEAPON_IDS, ["arrow", "laser", "wave", "bolt", "ice"]);
  for (const w of B.WEAPON_IDS) {
    const b = B.createBattle({ rng: seeded(11) }), t = b.turrets[0];
    t.weapons = { [w]: 3 }; t.cd = { [w]: 5 };       // 先不射，等怪物走近
    b.turrets[1].weapons = {}; b.turrets[1].cd = {};
    for (let i = 0; i < 200; i++) B.step(b, 0.05);
    B.takeEvents(b);
    t.cd[w] = 0;
    B.step(b, 0.05);
    const ev = B.takeEvents(b);
    assert.ok(ev.some((e) => e.type === "hit" && e.by === 0 && e.weapon === w), `${w} 沒有打到怪物`);
    if (w === "ice") assert.ok(b.monsters.some((m) => m.slow > 0) || ev.some((e) => e.type === "kill"));
  }
});

test("砲塔先守自己那一半；進下一關城堡補血、砲塔保留", () => {
  const b = B.createBattle({ rng: seeded(5) });
  const left = { id: 901, x: 0.2, y: 0.5, hp: 50, max: 50, speed: 0, wob: 0, slow: 0, kind: "slime" };
  const right = { id: 902, x: 0.7, y: 0.5, hp: 50, max: 50, speed: 0, wob: 0, slow: 0, kind: "slime" };
  b.monsters = [left, right]; b.spawnT = 999;
  b.turrets[0].cd.arrow = 0; b.turrets[1].cd.arrow = 0;
  B.step(b, 0.01);
  const shots = B.takeEvents(b).filter((e) => e.type === "arrow");
  assert.ok(shots.find((e) => e.p === 0).x2 < 0.5, "左邊的砲塔先打左邊");
  assert.ok(shots.find((e) => e.p === 1).x2 >= 0.5, "右邊的砲塔先打右邊");
  b.castle = 5; b.turrets[0].weapons.wave = 2; b.state = "clear";
  B.nextStage(b);
  assert.equal(b.stage, 1); assert.equal(b.castle, 8); assert.equal(b.turrets[0].weapons.wave, 2); assert.equal(b.monsters.length, 0);
});
