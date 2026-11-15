"use strict";
// End-to-end RPC flows against the mocked host: import bootstrap, dice resolution,
// notice dismissal, edit-lease sidecar suppression.
const test = require("node:test");
const assert = require("node:assert/strict");
const { createMockHost, loadBackendWithHost } = require("./mock-host.js");

function fresh() {
  const host = createMockHost();
  loadBackendWithHost(host);
  return host;
}
const flush = async (n = 60) => {
  for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r));
};

const VALID_IMPORT = JSON.stringify({
  format: "weft-chronicle", version: 3,
  sheet: { name: "Test Hero", level: 2, stats: { str: 7, dex: 7, int: 5, cha: 5, con: 6, wis: 5 } },
  world: { location: "Port Ryujin" },
});

async function freshInitialized() {
  const host = fresh();
  const handler = host.getFrontendHandler();
  await handler({ type: "bootstrap" }, "user1", "session1");
  await flush();
  await handler({ type: "import_json", json: VALID_IMPORT }, "user1", "session1");
  await flush();
  return host;
}

const AI_MSG = 'You ease the door open. The hinges scream.\n<choices th="sakura">\n<c k="action">*Force the door* "Quietly" || too loud || needs a crowbar</c>\n</choices>';

test("GENERATION_ENDED records snapshot with choices + swipe_id key", async () => {
  const host = await freshInitialized();
  host.spindle.chat.getMessages = async () => [{ id: "m2", role: "assistant", content: AI_MSG, is_user: false, swipe_id: 3 }];
  await host.handlers["GENERATION_ENDED"]({ chatId: "chat1", messageId: "m2", error: null, generationType: "normal", content: AI_MSG }, "user1");
  await flush();
  const data = host.store.get("chats/chat1.json");
  assert.ok(data.snapshots, "snapshots recorded");
  const keys = Object.keys(data.snapshots);
  assert.deepEqual(keys, ["m2:3"]);
  assert.equal(data.snapshots["m2:3"].choices.options.length, 1);
  assert.equal(data.snapshots["m2:3"].choices.options[0].kind, "action");
});

test("roll_dice → GENERATION_ENDED marks roll consumed with messageId", async () => {
  const host = await freshInitialized();
  const handler = host.getFrontendHandler();
  await handler({ type: "roll_dice", action: "Pick the lock", stat: "dex", dc: 15 }, "user1", "session1");
  await flush();
  let data = host.store.get("chats/chat1.json");
  assert.equal(data.rolls.length, 1);
  assert.equal(data.rolls[0].consumed, false);
  await host.handlers["GENERATION_ENDED"]({ chatId: "chat1", messageId: "m9", error: null, generationType: "normal", content: "The lock clicks." }, "user1");
  await flush();
  data = host.store.get("chats/chat1.json");
  assert.equal(data.rolls[0].consumed, true);
  assert.equal(data.rolls[0].messageId, "m9");
});

test("import_json: garbage persists nothing; valid export initializes", async () => {
  const host = fresh();
  const handler = host.getFrontendHandler();
  await handler({ type: "bootstrap" }, "user1", "session1");
  await flush();
  await handler({ type: "import_json", json: "{\"sheet\":null}" }, "user1", "session1");
  await flush();
  assert.equal(host.store.get("chats/chat1.json"), undefined, "garbage import must not persist");
  await handler({ type: "import_json", json: VALID_IMPORT }, "user1", "session1");
  await flush();
  const data = host.store.get("chats/chat1.json");
  assert.equal(data.sheet.name, "Test Hero");
  assert.equal(data.sheet.level, 2);
  assert.equal(data.initialized, true);
});

test("dismiss_notice removes only the requested ids (seeded via import)", async () => {
  const host = fresh();
  const handler = host.getFrontendHandler();
  await handler({ type: "bootstrap" }, "user1", "session1");
  await flush();
  const seeded = JSON.stringify({
    format: "weft-chronicle", version: 3,
    sheet: { name: "Test Hero", level: 1, stats: { str: 5, dex: 5, int: 5, cha: 5, con: 5, wis: 5 } },
    world: { location: "Somewhere" },
    notices: [
      { id: "ntc_a", kind: "warn", title: "A", lines: [], timestamp: 1 },
      { id: "ntc_b", kind: "levelup", title: "B", lines: [], timestamp: 2 },
      { id: "ntc_c", kind: "item", title: "C", lines: [], timestamp: 3 },
    ],
  });
  await handler({ type: "import_json", json: seeded }, "user1", "session1");
  await flush();
  await handler({ type: "dismiss_notice", ids: ["ntc_a", "ntc_c"] }, "user1", "session1");
  await flush();
  const data = host.store.get("chats/chat1.json");
  assert.deepEqual(data.notices.map((n) => n.id), ["ntc_b"]);
});

test("set_editing lease suppresses auto-sync but rolls still resolve", async () => {
  const host = await freshInitialized();
  const handler = host.getFrontendHandler();
  await handler({ type: "update_settings", patch: { autoSync: true, syncMode: "every" } }, "user1", "session1");
  await flush();
  await handler({ type: "set_editing", editing: true, until: Date.now() + 90000 }, "user1", "session1");
  await flush();
  await handler({ type: "roll_dice", action: "Peek", stat: "wis", dc: 12 }, "user1", "session1");
  await flush();
  await host.handlers["GENERATION_ENDED"]({ chatId: "chat1", messageId: "m10", error: null, generationType: "normal", content: "You peek." }, "user1");
  await flush();
  const data = host.store.get("chats/chat1.json");
  assert.equal(data.rolls[0].consumed, true, "roll resolution still happens while editing");
  assert.equal((data.syncLog || []).length, 0, "sidecar must not run while an edit lease is held");
  // release the lease; sync mode is still "every" but we only assert the flag path here
  await handler({ type: "set_editing", editing: false }, "user1", "session1");
  await flush();
});

test("contest_roll stores both rolls; player roll binds with win/lose/tie", async () => {
  const seeded = JSON.stringify({
    format: "weft-chronicle", version: 3,
    sheet: { name: "Test Hero", level: 1, stats: { str: 5, dex: 5, int: 5, cha: 5, con: 5, wis: 5 } },
    world: {
      location: "Rooftops",
      npcs: [{ name: "The Pale Herald", present: true, bond: 0, spark: 0, heat: 0, mood: "Cold", attitude: "Hostile", goal: "", secret: "", lastThought: "" }],
    },
  });
  const host = fresh();
  const handler = host.getFrontendHandler();
  await handler({ type: "bootstrap" }, "user1", "session1");
  await flush();
  await handler({ type: "import_json", json: seeded }, "user1", "session1");
  await flush();
  await handler({ type: "contest_roll", action: "Sneak past the lookout", stat: "dex", dc: 13, opponent: "The Pale Herald", foeBonus: 4 }, "user1", "session1");
  await flush();
  const data = host.store.get("chats/chat1.json");
  assert.equal(data.rolls.length, 2, "player + foe rolls recorded");
  const player = data.rolls.find((r) => r.who === "Test Hero");
  const foe = data.rolls.find((r) => r.who === "The Pale Herald");
  assert.ok(player && foe);
  assert.equal(foe.consumed, true, "foe roll must not bind to the prompt");
  assert.equal(player.consumed, false, "player roll binds for the AI");
  assert.ok(["win", "lose", "tie"].includes(player.verdict));
  assert.equal(player.contestFoe.name, "The Pale Herald");
  assert.equal(player.contestFoe.total, foe.total);
  // unknown opponent is rejected without rolling
  const before = data.rolls.length;
  await handler({ type: "contest_roll", action: "x", stat: "dex", dc: 10, opponent: "Nobody", foeBonus: 0 }, "user1", "session1");
  await flush();
  const data2 = host.store.get("chats/chat1.json");
  assert.equal(data2.rolls.length, before, "no rolls added for a missing NPC");
});

const WEFT_LOG_AI_REPLY = `The rain keeps time against the paper walls of the tea house.
<Status th="sakura">
<nm>Sakamoto Taro</nm><lv>4</lv><race>Ronin</race><rank>C</rank>
<cls>Blade &amp; Board</cls><subcls></subcls><guild>None</guild><ttl>Left-Handed Wonder</ttl>
<hp>31/52</hp><sp>17/22</sp><mp l="Sanity">9/14</mp>
<xp>1200/400</xp>
<str l="Grit">8</str><dex>9</dex><int>5</int><cha>6</cha><con>7</con><wis>4</wis>
<pts>2</pts>
<wpn><it>Katana (rare)</it></wpn>
<skl><it>Swordsmanship +3</it><it>Tracking</it></skl>
<fx><it>Sprained ankle: 2t</it><it>Ongoing focus: ongoing</it></fx>
<log>HP -4 (spear graze), +150 XP</log>
<bag>
<itm t="consumable" r="common" n="3">Healing Salve</itm>
<itm t="key" r="rare" n="1">Sealed Letter</itm>
</bag>
<cash>34 ryō</cash>
<quests>
<quest s="active" k="main"><qt>The Jade Knot</qt><ob x="0">Find the contact in Kyoto</ob><ob x="1">Acquire a map</ob><rw>400 ryō</rw><pn>The trail goes cold</pn></quest>
</quests>
</Status>
<World_State th="sakura" st="strip">
<clock>Day 12, Dusk</clock>
<place>Riverside Tea House | East Bank</place>
<weather>Rain, cool</weather>
<pc>
name: Sakamoto Taro
outfit: Wet travelling cloak
pos: Seated by the brazier
cond: Bruised ribs
carry: Katana at hip
</pc>
<npc>
name: Madame Genji
mood: Amused
think: This ronin has no idea what he's carrying.
pos: Behind the counter
outfit: Silk kimono
want: Sell the forged map
bond: 42 | Familiar
spark: 61 | Attracted
heat: 33 | Warm
secret: She forged the map herself
</npc>
<off>The Pale Herald: Somewhere upriver</off>
<thread>Who forged the Jade Knot?</thread>
<seed>The letter smells of incense</seed>
<timer>The Herald's patience: He rides regardless: 3 turns left</timer>
<arc>Complication</arc>
<phase>Midpoint Tension</phase>
</World_State>
The next speaker is you.`;

test("import_chatlog migrates the last preset blocks (deterministic, no LLM)", async () => {
  const host = fresh();
  const handler = host.getFrontendHandler();
  await handler({ type: "bootstrap" }, "user1", "session1");
  await flush();
  host.spindle.chat.getMessages = async () => [
    { id: "m1", role: "user", content: "I enter the tea house.", is_user: true },
    { id: "m2", role: "assistant", content: WEFT_LOG_AI_REPLY, is_user: false },
  ];
  // report first
  await handler({ type: "chat_log_report" }, "user1", "session1");
  await flush();
  const reportMsg = [...host.sentToFrontend].reverse().find((m) => m.chatLogReport);
  assert.ok(reportMsg, "report was pushed");
  assert.equal(reportMsg.chatLogReport.status, 1);
  assert.equal(reportMsg.chatLogReport.world, 1);
  assert.equal(reportMsg.chatLogReport.latestLevel, 4);
  assert.equal(reportMsg.chatLogReport.latestName, "Sakamoto Taro");
  assert.ok(reportMsg.chatLogReport.canImport);
  assert.equal(reportMsg.chatLogReport.warnings.length >= 1, true, "double-render warning emitted");
  // then import
  await handler({ type: "import_chatlog" }, "user1", "session1");
  await flush();
  const data = host.store.get("chats/chat1.json");
  assert.equal(data.initialized, true);
  // sheet
  assert.equal(data.sheet.name, "Sakamoto Taro");
  assert.equal(data.sheet.guild, ""); // literal "None" blanked
  assert.equal(data.sheet.level, 4);
  assert.equal(data.sheet.stats.dex, 9);
  assert.equal(data.sheet.statLabels.str, "Grit");
  assert.ok(data.sheet.hpMax > 0);
  assert.equal(data.sheet.hp, Math.min(31, data.sheet.hpMax));
  assert.equal(data.sheet.useMp, true);
  assert.equal(data.sheet.mpLabel, "Sanity");
  assert.equal(data.sheet.pts, 2);
  assert.equal(data.sheet.gear.weapon.name, "Katana"); // trailing (rare) stripped as rarity
  assert.equal(data.sheet.gear.weapon.rarity, "rare");
  assert.equal(data.sheet.skills.length, 2);
  assert.equal(data.sheet.skills[0].bonus, 3);
  const salve = data.sheet.bag.find((i) => i.name === "Healing Salve");
  assert.ok(salve && salve.qty === 3 && salve.category === "potion");
  assert.equal(data.sheet.quests.length, 1);
  assert.equal(data.sheet.quests[0].objectives.length, 2);
  assert.equal(data.sheet.quests[0].objectives[1].done, true);
  assert.equal(data.sheet.quests[0].kind, "main");
  // world
  assert.equal(data.world.location, "Riverside Tea House | East Bank");
  assert.equal(data.world.dayCount, 12);
  assert.equal(data.world.arc, "Turning"); // Complication → Turning
  assert.equal(data.world.phase, "Confrontation"); // Midpoint Tension → Confrontation
  assert.equal(data.world.pc.cond, "Bruised ribs");
  const genji = data.world.npcs.find((n) => n.name === "Madame Genji");
  assert.ok(genji && genji.present);
  assert.equal(genji.bond, 42);
  assert.equal(genji.spark, 61);
  assert.match(genji.secret, /forged/);
  assert.equal(genji.goal, "Sell the forged map");
  const herald = data.world.npcs.find((n) => n.name === "The Pale Herald");
  assert.ok(herald && !herald.present);
  assert.match(herald.location, /upriver/);
  assert.equal(data.world.threads.filter((t) => t.status === "active" && t.kind !== "timer").length, 1);
  assert.equal(data.world.threads.filter((t) => t.status === "seed").length, 1);
  const timers = data.world.threads.filter((t) => t.kind === "timer");
  assert.equal(timers.length, 1);
  assert.equal(timers[0].turnsLeft, 3);
});

test("sidecar spend is tracked per chat; state_update carries promptEstimate", async () => {
  const host = fresh();
  const handler = host.getFrontendHandler();
  await handler({ type: "bootstrap" }, "user1", "session1");
  await flush();
  await handler({ type: "import_json", json: VALID_IMPORT }, "user1", "session1");
  await flush();
  host.spindle.chat.getMessages = async () => [
    { id: "m2", role: "assistant", content: "You peek.", is_user: false, swipe_id: 0 },
  ];
  await host.handlers["GENERATION_ENDED"]({ chatId: "chat1", messageId: "m2", error: null, generationType: "normal", content: "You peek." }, "user1");
  await flush();
  const data = host.store.get("chats/chat1.json");
  assert.ok(data.spend, "spend tracked on chat data");
  assert.equal(data.spend.calls, 1);
  assert.ok(data.spend.totalTokens > 0, "token estimate accumulated");
  assert.equal(data.spend.totalTokens, data.spend.promptTokens + data.spend.completionTokens);
  const okEntry = data.syncLog.find((e) => e.ok);
  assert.ok(okEntry && okEntry.tokens > 0, "sync log row carries token estimate");
  const pushes = host.sentToFrontend.filter((p) => p.type === "state_update" && p.promptEstimate);
  assert.ok(pushes.length > 0, "state_update carries promptEstimate");
  assert.ok(pushes.some((p) => p.promptEstimate.tokens > 50), "initialized chat yields a real prompt block estimate");
});

test("syncLog token estimates survive a normalize round-trip (load → re-save)", async () => {
  const host = await freshInitialized();
  host.spindle.chat.getMessages = async () => [{ id: "m2", role: "assistant", content: "You rest.", is_user: false, swipe_id: 0 }];
  await host.handlers["GENERATION_ENDED"]({ chatId: "chat1", messageId: "m2", error: null, generationType: "normal", content: "You rest." }, "user1");
  await flush();
  await host.handlers["GENERATION_ENDED"]({ chatId: "chat1", messageId: "m3", error: null, generationType: "normal", content: "Still resting." }, "user1");
  await flush();
  const data = host.store.get("chats/chat1.json");
  const okRows = data.syncLog.filter((e) => e.ok);
  assert.ok(okRows.length >= 2, "both syncs logged");
  for (const row of okRows) {
    assert.ok(Number.isFinite(row.tokens) && row.tokens > 0, `row lost its token estimate: ${JSON.stringify(row)}`);
  }
  assert.ok(data.spend.calls >= 2);
});

test("survival scavenge: blocked when disabled; seeded roll binds the AI; loot consistent with verdict", async () => {
  const host = await freshInitialized();
  const handler = host.getFrontendHandler();
  // Disabled by default → warning, no roll
  await handler({ type: "scavenge_roll" }, "user1", "session1");
  await flush();
  let data = host.store.get("chats/chat1.json");
  assert.equal(data.rolls.length, 0);
  assert.ok(host.toasts.warning.length > 0);

  await handler({ type: "update_settings", patch: { survivalEnabled: true, survivalDc: 15, survivalTable: "wasteland" } }, "user1", "session1");
  await flush();
  await handler({ type: "scavenge_roll" }, "user1", "session1");
  await flush();
  data = host.store.get("chats/chat1.json");
  assert.equal(data.rolls.length, 1);
  const r = data.rolls[0];
  assert.equal(r.action, "Scavenge supplies");
  assert.equal(r.stat, "wis");
  assert.equal(data.scavengeCount, 1);
  const found = r.verdict === "success" || r.verdict === "success, at a cost" || r.verdict === "nat 20";
  if (found) {
    assert.ok(Array.isArray(r.loot) && r.loot.length >= 1, "successful scavenge yields loot");
    assert.ok(r.lootSummary.length > 0);
  } else {
    assert.equal(r.loot.length, 0);
    assert.equal(r.lootSummary, "");
  }
  assert.ok(data.notices.some((n) => /SCAVENG|ENCOUNTER|SCAVENGE/.test(n.title)), "scavenge notice posted");

  // Determinism: second host, same chatId + date + attempt → identical roll
  const host2 = await freshInitialized();
  const handler2 = host2.getFrontendHandler();
  await handler2({ type: "update_settings", patch: { survivalEnabled: true, survivalDc: 15, survivalTable: "wasteland" } }, "user1", "session1");
  await handler2({ type: "scavenge_roll" }, "user1", "session1");
  await flush();
  const data2 = host2.store.get("chats/chat1.json");
  assert.equal(data2.rolls[0].roll, r.roll, "seeded roll must reproduce across runs");
  assert.equal(data2.rolls[0].lootSummary, r.lootSummary);
});

test("encounter roll posts a beat notice and increments its own counter", async () => {
  const host = await freshInitialized();
  const handler = host.getFrontendHandler();
  await handler({ type: "update_settings", patch: { survivalEnabled: true, survivalDc: 15 } }, "user1", "session1");
  await flush();
  await handler({ type: "encounter_roll" }, "user1", "session1");
  await flush();
  const data = host.store.get("chats/chat1.json");
  assert.equal(data.rolls.length, 1);
  assert.equal(data.rolls[0].action, "Scan for threats");
  assert.equal(data.encounterCount, 1);
  assert.equal(data.scavengeCount, 0, "encounter uses its own counter");
  assert.ok(data.notices.some((n) => /^ENCOUNTER — /.test(n.title)), "encounter notice posted");
});

test("scene clock: inert when disabled; advances per synced turn; rolls day at midnight", async () => {
  const host = await freshInitialized();
  const handler = host.getFrontendHandler();
  host.spindle.chat.getMessages = async () => [{ id: "m2", role: "assistant", content: "You wait.", is_user: false, swipe_id: 0 }];
  // Disabled → sync leaves the clock untouched
  await host.handlers["GENERATION_ENDED"]({ chatId: "chat1", messageId: "m2", error: null, generationType: "normal", content: "You wait." }, "user1");
  await flush();
  let data = host.store.get("chats/chat1.json");
  assert.equal(data.world.minutesOfDay, 480);

  await handler({ type: "update_settings", patch: { clockEnabled: true, clockStepMinutes: 45, weatherDrift: false } }, "user1", "session1");
  await flush();
  host.spindle.chat.getMessages = async () => [{ id: "m3", role: "assistant", content: "You wait more.", is_user: false, swipe_id: 0 }];
  await host.handlers["GENERATION_ENDED"]({ chatId: "chat1", messageId: "m3", error: null, generationType: "normal", content: "You wait more." }, "user1");
  await flush();
  data = host.store.get("chats/chat1.json");
  assert.equal(data.world.minutesOfDay, 525);
  assert.equal(data.world.time, "Day 1 · Morning");

  // Midnight rollover through the public flow: six 180-minute advances after the 45m one
  await handler({ type: "update_settings", patch: { clockStepMinutes: 180 } }, "user1", "session1");
  for (const mid of ["m5", "m6", "m7", "m8", "m9", "m10"]) {
    host.spindle.chat.getMessages = async () => [{ id: mid, role: "assistant", content: "Time passes.", is_user: false, swipe_id: 0 }];
    await host.handlers["GENERATION_ENDED"]({ chatId: "chat1", messageId: mid, error: null, generationType: "normal", content: "Time passes." }, "user1");
    await flush();
  }
  data = host.store.get("chats/chat1.json");
  assert.equal(data.world.minutesOfDay, 525 + 6 * 180 - 1440);
  assert.equal(data.world.dayCount, 2);
  assert.equal(data.world.time, "Day 2 · Deep Night");
});
