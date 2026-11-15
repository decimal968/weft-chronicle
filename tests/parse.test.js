"use strict";
// Sidecar-delta parsing and import sanitizing — the two places untrusted text enters.
const test = require("node:test");
const assert = require("node:assert/strict");
const { createMockHost, loadBackendWithHost } = require("./mock-host.js");

const host = createMockHost();
const b = loadBackendWithHost(host);

test("parseJsonDelta: plain JSON object", () => {
  assert.deepEqual(b.parseJsonDelta('{"a":1}'), { a: 1 });
});

test("parseJsonDelta: strips think-tags and json fences", () => {
  const raw = '<think>let me think\nabout braces { and "quotes"}</think>\n```json\n{"a":2}\n```';
  assert.deepEqual(b.parseJsonDelta(raw), { a: 2 });
});

test("parseJsonDelta: prose-wrapped JSON salvages the outermost object", () => {
  const raw = 'Here you go! {"sheetDelta":{"hpDelta":-3},"worldDelta":{}} hope that helps';
  assert.deepEqual(b.parseJsonDelta(raw), { sheetDelta: { hpDelta: -3 }, worldDelta: {} });
});

test("parseJsonDelta: truncated JSON returns null rather than garbage", () => {
  assert.equal(b.parseJsonDelta('{"a":'), null);
  assert.equal(b.parseJsonDelta("not json at all"), null);
  assert.equal(b.parseJsonDelta(""), null);
  assert.equal(b.parseJsonDelta(null), null);
});

test("parseJsonDelta: mid-object fence markers are dropped", () => {
  const raw = '{"a":1,\n```\n"b":2}';
  assert.deepEqual(b.parseJsonDelta(raw), { a: 1, b: 2 });
});

test("parseJsonDelta: trailing commas tolerated", () => {
  assert.deepEqual(b.parseJsonDelta('{"a":1,}'), { a: 1 });
});

test("parseJsonDelta: arrays at top level are rejected", () => {
  assert.equal(b.parseJsonDelta("[1,2,3]"), null);
});

test("parseJsonDelta: raw newlines inside strings are sanitized", () => {
  const raw = '{"note":"line one\nline two"}';
  const parsed = b.parseJsonDelta(raw);
  assert.equal(parsed.note, "line one\nline two");
});

test("sanitizeImportedState: rejects non-objects and missing sheet/world", () => {
  assert.equal(b.sanitizeImportedState(null), null);
  assert.equal(b.sanitizeImportedState({}), null);
  assert.equal(b.sanitizeImportedState({ sheet: 1, world: {} }), null);
});

test("sanitizeImportedState: NaN/string numbers are clamped to sane values", () => {
  const out = b.sanitizeImportedState({
    sheet: { level: "abc", xp: "lots", pts: 99999, hp: "<img src=x>", stats: { con: NaN } },
    world: { dayCount: "forever" },
  });
  assert.ok(out, "should return a sanitized state");
  assert.ok(Number.isFinite(out.sheet.level));
  assert.ok(out.sheet.level >= 1);
  assert.ok(Number.isFinite(out.sheet.xp));
  assert.ok(out.sheet.pts <= 30);
  assert.ok(Number.isFinite(out.world.dayCount));
  // stats are always six finite numbers
  for (const k of ["str", "dex", "int", "cha", "con", "wis"]) {
    assert.ok(Number.isFinite(out.sheet.stats[k]), k);
  }
});

test("sanitizeImportedState: oversized arrays are capped", () => {
  const bag = Array.from({ length: 500 }, (_, i) => ({ name: `Item ${i}`, category: "misc", rarity: "ordinary", qty: 1 }));
  const out = b.sanitizeImportedState({
    sheet: { bag },
    world: { npcs: Array.from({ length: 100 }, (_, i) => ({ name: `NPC ${i}`, bond: 50 })) },
  });
  assert.ok(out.sheet.bag.length <= 24);
  assert.ok(out.world.npcs.length <= 20);
});

test("sanitizeImportedState: imported strings get control chars stripped and length capped", () => {
  const evil = "a\u0000b\u0007" + "x".repeat(5000);
  const out = b.sanitizeImportedState({
    sheet: { name: evil },
    world: { location: evil },
  });
  assert.ok(!out.sheet.name.includes("\u0000"));
  assert.ok(out.sheet.name.length <= 60);
  assert.ok(out.world.location.length <= 120);
});
