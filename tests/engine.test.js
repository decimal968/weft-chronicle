"use strict";
// Pure-core unit tests for the committed backend bundle.
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadInternals } = require("./mock-host.js");
const b = loadInternals();

test("statModifier bands match the Weft preset table exactly", () => {
  // preset: 1-2 -2, 3-4 -1, 5-6 0, 7-8 +1, 9-10 +2, 11-12 +3, 13-14 +4, 15-16 +5, 17+ +6
  const table = [[1, -2], [2, -2], [3, -1], [4, -1], [5, 0], [6, 0], [7, 1], [8, 1], [9, 2], [10, 2], [11, 3], [12, 3], [13, 4], [14, 4], [15, 5], [16, 5], [17, 6], [99, 6]];
  for (const [v, mod] of table) assert.equal(b.statModifier(v), mod, `stat ${v}`);
  assert.equal(b.statModifier(NaN), 0); // non-finite falls back to 5
});

test("computePools matches the preset formulas", () => {
  const p = b.computePools({ level: 1, stats: { con: 5, int: 6 } });
  assert.equal(p.hpMax, 40 + 3 * 5);
  assert.equal(p.spMax, 14 + 2 * 5);
  assert.equal(p.mpMax, 14 + 2 * 6);
  assert.equal(p.xpNext, 100);
  const p2 = b.computePools({ level: 3, stats: { con: 7, int: 9 } });
  assert.equal(p2.hpMax, 40 + 21 + 8);
  assert.equal(p2.spMax, 14 + 14 + 2);
  assert.equal(p2.mpMax, 14 + 18);
  assert.equal(p2.xpNext, 300);
  const lifted = b.computePools({ level: 10, stats: { con: 5, int: 5 } }, { xpCurve: "lifted" });
  assert.equal(lifted.xpNext, Math.floor(100 * Math.pow(10, 1.35)));
});

test("recomputeSheetPools raises current pools by the max delta (never drops)", () => {
  const sheet = { level: 1, stats: { con: 5, int: 5 }, hp: 10, sp: 3, mp: 2, hpMax: 55, spMax: 24, mpMax: 24, xpNext: 100 };
  sheet.stats.con = 8; // +3 CON → +9 HP max, +6 SP max
  b.recomputeSheetPools(sheet, { raiseCurrentByMaxDelta: true });
  assert.equal(sheet.hpMax, 40 + 24);
  assert.equal(sheet.hp, 19); // 10 + 9
  assert.equal(sheet.sp, 9); // 3 + 6
});

test("evaluateVerdict: nat 20 / nat 1 / success / success-at-cost / fail", () => {
  assert.equal(b.evaluateVerdict(20, 1, 30), "nat 20");
  assert.equal(b.evaluateVerdict(1, 99, 3), "nat 1");
  assert.equal(b.evaluateVerdict(10, 15, 15), "success");
  assert.equal(b.evaluateVerdict(10, 13, 15), "success, at a cost");
  assert.equal(b.evaluateVerdict(10, 12, 15), "fail");
});

test("fairD20 stays in 1..20 and is unbiased-ish over a long run", () => {
  // deterministic rng path: sweep the full [0,1) range evenly
  for (let i = 0; i < 20; i++) {
    const v = (i + 0.5) / 20;
    assert.equal(b.fairD20(() => v), i + 1);
  }
  // clamp extremes
  assert.equal(b.fairD20(() => 0), 1);
  assert.equal(b.fairD20(() => 0.999999), 20);
  // crypto path: all faces appear over many rolls
  const seen = new Set();
  for (let i = 0; i < 4000; i++) seen.add(b.fairD20());
  assert.equal(seen.size, 20);
});

test("performDiceRoll: advantage keeps the high die, disadvantage the low", () => {
  const sheet = b.createDefaultSheet("Tester");
  const adv = b.performDiceRoll(sheet, { action: "x", dc: 15, stat: "none", mode: "adv", rng: (() => { let n = 0; const seq = [0.05, 0.9]; return () => seq[n++ % seq.length]; })() });
  assert.equal(adv.mode, "adv");
  assert.equal(adv.roll, 19); // max(2, 19)
  assert.equal(adv.advRoll, 2); // dropped die
  const dis = b.performDiceRoll(sheet, { action: "x", dc: 15, stat: "none", mode: "dis", rng: (() => { let n = 0; const seq = [0.05, 0.9]; return () => seq[n++ % seq.length]; })() });
  assert.equal(dis.mode, "dis");
  assert.equal(dis.roll, 2);
  assert.equal(dis.advRoll, 19);
  // invalid stat normalizes to none with 0 mod
  const weird = b.performDiceRoll(sheet, { action: "x", dc: 15, stat: 42, mode: "normal", rng: () => 0.5 });
  assert.equal(weird.stat, "none");
  assert.equal(weird.statMod, 0);
});

test("parseAllocPriority tolerates human separators and dedups", () => {
  assert.deepEqual(b.parseAllocPriority("DEX>CON>STR"), ["dex", "con", "str"]);
  assert.deepEqual(b.parseAllocPriority("dex, con; dex"), ["dex", "con"]);
  assert.equal(b.parseAllocPriority("strength over charisma"), null);
  assert.equal(b.parseAllocPriority(""), null);
  assert.equal(b.parseAllocPriority("foo bar"), null);
});

test("autoAllocateAllPoints honors priority order cyclically", () => {
  const sheet = b.createDefaultSheet("Tester");
  sheet.pts = 5;
  b.autoAllocateAllPoints(sheet, "dex>con");
  // 3 into DEX, 2 into CON (cyclic)
  assert.equal(sheet.stats.dex, 6 + 3);
  assert.equal(sheet.stats.con, 5 + 2);
  assert.equal(sheet.pts, 0);
  // no priority → top-3-by-rank behavior still works
  const s2 = b.createDefaultSheet("Tester");
  s2.pts = 2;
  b.autoAllocateAllPoints(s2, "");
  assert.equal(s2.pts, 0);
});

test("tickEffectsInPlace burns one turn of timed effects and drops expired", () => {
  const sheet = b.createDefaultSheet("Tester");
  sheet.effects = [
    { name: "Ongoing", duration: null },
    { name: "Two turns", duration: 2 },
    { name: "Final turn", duration: 1 },
  ];
  b.tickEffectsInPlace(sheet);
  assert.deepEqual(sheet.effects.map((e) => e.name), ["Ongoing", "Two turns"]);
  assert.equal(sheet.effects[1].duration, 1);
});

test("bshStage matches the preset ladders", () => {
  assert.equal(b.bshStage("bond", 0), "Stranger");
  assert.equal(b.bshStage("bond", 45), "Trusted");
  assert.equal(b.bshStage("bond", 85), "Bonded");
  assert.equal(b.bshStage("spark", 10), "Noticed");
  assert.equal(b.bshStage("spark", 64), "Attracted");
  assert.equal(b.bshStage("heat", 25), "Warm");
  assert.equal(b.bshStage("heat", 75), "Past thinking");
});
