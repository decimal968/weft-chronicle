/* weft-chronicle v2.4.1 — bundle built from src/ (see repository) */

// src/backend/choices.ts
/*! src/backend/choices.ts */
var MAX_CHOICE_OPTIONS = 6;
var MAX_CHOICE_TEXT = 400;
function parseChoicesBlock(raw) {
  if (!raw || typeof raw !== "string") return null;
  const blockMatch = raw.match(/<choices\b([^>]*)>([\s\S]*?)<\/choices>/i);
  if (!blockMatch) return null;
  const options = [];
  const optRe = /<c\b([^>]*)>([\s\S]*?)<\/c>/gi;
  let om;
  while ((om = optRe.exec(blockMatch[2])) !== null) {
    if (options.length >= MAX_CHOICE_OPTIONS) break;
    const oAttrs = om[1] || "";
    const body = (om[2] || "").trim();
    if (!body) continue;
    const kind = ((oAttrs.match(/k\s*=\s*"([^"<>]*)"/i) || [])[1] || "").trim().toLowerCase().slice(0, 24);
    const heatRaw = ((oAttrs.match(/h\s*=\s*"([^"<>]*)"/i) || [])[1] || "").trim();
    const heat = heatRaw === "1" || heatRaw === "2" || heatRaw === "3" ? Number(heatRaw) : 0;
    const segs = body.split("||").map((s) => s.trim());
    const text = (segs[0] || "").trim().slice(0, MAX_CHOICE_TEXT);
    if (!text) continue;
    let stakes = "";
    let req = "";
    if (segs.length === 2) {
      stakes = segs[1].slice(0, 200);
    } else if (segs.length >= 3) {
      stakes = segs[1].slice(0, 200);
      req = segs.slice(2).join(" || ").trim().slice(0, 200);
    }
    options.push({ kind, heat, text, stakes, req });
  }
  if (options.length === 0) return null;
  return { options, claimed: [] };
}

// src/backend/engine.ts
/*! src/backend/engine.ts */
var DEFAULT_WEATHER_LADDER = "Clear, Windy, Overcast, Fog, Rain, Storm, Snow";
var STAT_KEYS = ["str", "dex", "int", "cha", "con", "wis"];
var DEFAULT_STAT_LABELS = {
  str: "STR",
  dex: "DEX",
  int: "INT",
  cha: "CHA",
  con: "CON",
  wis: "WIS"
};
function makeId(prefix = "id") {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    const buf = new Uint32Array(2);
    cryptoObj.getRandomValues(buf);
    const rand2 = (buf[0].toString(36) + buf[1].toString(36)).slice(0, 10);
    return `${prefix}_${Date.now().toString(36)}_${rand2}`;
  }
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}
function clamp(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}
function statModifier(value) {
  const v = Math.floor(Number.isFinite(value) ? value : 5);
  if (v <= 2) return -2;
  if (v <= 4) return -1;
  if (v <= 6) return 0;
  if (v <= 8) return 1;
  if (v <= 10) return 2;
  if (v <= 12) return 3;
  if (v <= 14) return 4;
  if (v <= 16) return 5;
  return 6;
}
function formatMod(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}
function computePools(sheet, opts = {}) {
  const lv = Math.max(1, Math.floor(sheet.level));
  const con = Math.max(1, Math.floor(sheet.stats.con));
  const intStat = Math.max(1, Math.floor(sheet.stats.int));
  const xpCurve = opts.xpCurve === "lifted" ? "lifted" : "flat";
  return {
    hpMax: 40 + 3 * con + 4 * (lv - 1),
    spMax: 14 + 2 * con + (lv - 1),
    mpMax: 14 + 2 * intStat,
    xpNext: xpCurve === "lifted" ? Math.max(1, Math.floor(100 * Math.pow(lv, 1.35))) : 100 * lv
  };
}
function recomputeSheetPools(sheet, opts = {}) {
  const prevHpMax = sheet.hpMax;
  const prevSpMax = sheet.spMax;
  const prevMpMax = sheet.mpMax;
  const next = computePools(sheet, { xpCurve: opts.xpCurve });
  sheet.hpMax = next.hpMax;
  sheet.spMax = next.spMax;
  sheet.mpMax = next.mpMax;
  sheet.xpNext = next.xpNext;
  if (opts.fillToMax) {
    sheet.hp = sheet.hpMax;
    sheet.sp = sheet.spMax;
    sheet.mp = sheet.mpMax;
  } else if (opts.raiseCurrentByMaxDelta) {
    sheet.hp = clamp(sheet.hp + Math.max(0, sheet.hpMax - prevHpMax), 0, sheet.hpMax);
    sheet.sp = clamp(sheet.sp + Math.max(0, sheet.spMax - prevSpMax), 0, sheet.spMax);
    sheet.mp = clamp(sheet.mp + Math.max(0, sheet.mpMax - prevMpMax), 0, sheet.mpMax);
  } else {
    sheet.hp = clamp(sheet.hp, 0, sheet.hpMax);
    sheet.sp = clamp(sheet.sp, 0, sheet.spMax);
    sheet.mp = clamp(sheet.mp, 0, sheet.mpMax);
  }
  return sheet;
}
function createDefaultModules() {
  return { system: true, tracker: true, dice: true, choices: true };
}
function createDefaultSettings() {
  return {
    enabledByDefault: true,
    defaultModules: createDefaultModules(),
    injectPrompt: true,
    autoSync: true,
    sidecarConnectionId: "",
    theme: "sakura",
    systemTheme: "follow",
    allocMode: "player",
    allocPriority: "",
    trackXp: true,
    includeWorldInPrompt: true,
    includeSheetInPrompt: true,
    includeRollsInPrompt: true,
    showInlineSystem: true,
    showInlineTracker: true,
    showInlineNotices: true,
    showInlineDice: true,
    showInlineChoices: true,
    inlineStartsOpen: false,
    inlinePlacement: "inside",
    trackerShowBond: true,
    trackerShowSpark: true,
    trackerShowHeat: true,
    trackerShowThought: true,
    trackerShowSecret: true,
    heatDisplay: "always",
    maxHistoryRolls: 30,
    transcriptCap: 8e3,
    sidecarMaxTokens: 2200,
    syncMode: "every",
    xpCurve: "flat",
    promptBudget: "standard",
    inlineDiceCompact: false,
    autoBackup: true,
    survivalEnabled: false,
    survivalDc: 15,
    survivalTable: "wasteland",
    survivalCustomTable: "",
    clockEnabled: false,
    clockStepMinutes: 45,
    weatherDrift: true,
    weatherDriftChance: 20,
    weatherLadder: DEFAULT_WEATHER_LADDER
  };
}
function createDefaultSheet(name = "Survivor") {
  const stats = {
    str: 5,
    dex: 6,
    int: 6,
    cha: 5,
    con: 5,
    wis: 6
  };
  const pools = computePools({ level: 1, stats });
  return {
    name,
    race: "Human",
    cls: "",
    subcls: "",
    rank: "",
    guild: "",
    title: "",
    level: 1,
    xp: 0,
    xpNext: pools.xpNext,
    pts: 0,
    hp: pools.hpMax,
    hpMax: pools.hpMax,
    sp: pools.spMax,
    spMax: pools.spMax,
    useMp: false,
    mpLabel: "MP",
    mp: pools.mpMax,
    mpMax: pools.mpMax,
    stats,
    statLabels: { ...DEFAULT_STAT_LABELS },
    gear: { weapon: null, armor: null, accessory: null },
    bag: [],
    cash: "",
    skills: [],
    effects: [],
    quests: [],
    lastLog: "Sheet created."
  };
}
function createDefaultWorld() {
  return {
    location: "Unknown",
    time: "Day 1",
    weather: "",
    mood: "",
    arc: "Opening",
    phase: "Setup",
    dayCount: 1,
    minutesOfDay: 480,
    npcs: [],
    threads: [],
    notes: "",
    pc: { outfit: "", pos: "", cond: "", carry: "" }
  };
}
function userKey(userId) {
  return userId && userId.trim() ? userId.trim() : "__default__";
}
function safeFileSegment(id) {
  return String(id ?? "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96) || "unknown";
}
function chatCacheKey(userId, chatId) {
  return `${userKey(userId)}::${chatId}`;
}
function fnv1a(str) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0 || 1;
  return function() {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var LOOT_TABLES = {
  wasteland: [
    { w: 12, name: "Canned rations", qty: 2, cat: "potion", rarity: "ordinary" },
    { w: 10, name: "Scrap metal", qty: 3, cat: "material", rarity: "ordinary" },
    { w: 8, name: "Rusty knife", qty: 1, cat: "weapon", rarity: "ordinary" },
    { w: 7, name: "Dirty bandages", qty: 2, cat: "potion", rarity: "ordinary" },
    { w: 6, name: "Jury-rigged shiv", qty: 1, cat: "weapon", rarity: "common" },
    { w: 6, name: "Copper wiring", qty: 2, cat: "material", rarity: "ordinary" },
    { w: 5, name: "Purified water skin", qty: 1, cat: "potion", rarity: "common" },
    { w: 5, name: "Vintage paperback", qty: 1, cat: "book", rarity: "ordinary" },
    { w: 4, name: "Optics lens", qty: 1, cat: "material", rarity: "uncommon" },
    { w: 4, name: "Locked strongbox", qty: 1, cat: "key", rarity: "uncommon" },
    { w: 4, name: "Revolver bullets", qty: 6, cat: "material", rarity: "ordinary" },
    { w: 3, name: "Pre-Fall medkit", qty: 1, cat: "potion", rarity: "uncommon" },
    { w: 3, name: "Machete with fresh edge", qty: 1, cat: "weapon", rarity: "uncommon" },
    { w: 2, name: "Old military bayonet", qty: 1, cat: "weapon", rarity: "rare" },
    { w: 2, name: "Sealed stim vial", qty: 1, cat: "potion", rarity: "uncommon" },
    { w: 2, name: "Gas mask filter, unused", qty: 2, cat: "material", rarity: "uncommon" },
    { w: 1, name: "Pre-war pistol, well kept", qty: 1, cat: "weapon", rarity: "rare" },
    { w: 1, name: "Cache of goodwill (saved by a survivor)", qty: 1, cat: "valuable", rarity: "epic" }
  ],
  urban: [
    { w: 12, name: "Bottled water", qty: 2, cat: "potion", rarity: "ordinary" },
    { w: 10, name: "Duct tape roll", qty: 1, cat: "material", rarity: "ordinary" },
    { w: 9, name: "Canned soup", qty: 2, cat: "potion", rarity: "ordinary" },
    { w: 8, name: "Toolkit, half-empty", qty: 1, cat: "material", rarity: "ordinary" },
    { w: 6, name: "Crowbar", qty: 1, cat: "weapon", rarity: "common" },
    { w: 6, name: "Spare battery pack", qty: 1, cat: "material", rarity: "common" },
    { w: 5, name: "First-aid kit", qty: 1, cat: "potion", rarity: "common" },
    { w: 5, name: "Building access keycard", qty: 1, cat: "key", rarity: "uncommon" },
    { w: 4, name: "Bicycle multi-tool", qty: 1, cat: "material", rarity: "common" },
    { w: 4, name: "Cigarettes (trade bait)", qty: 1, cat: "valuable", rarity: "common" },
    { w: 4, name: "Novelty lighter", qty: 1, cat: "valuable", rarity: "ordinary" },
    { w: 3, name: "Kitchen knife, sharp", qty: 1, cat: "weapon", rarity: "common" },
    { w: 3, name: "Hybrid painkillers", qty: 4, cat: "potion", rarity: "uncommon" },
    { w: 2, name: "Enforced basement key", qty: 1, cat: "key", rarity: "rare" },
    { w: 2, name: "Handheld scanner", qty: 1, cat: "valuable", rarity: "uncommon" },
    { w: 2, name: "Tactical flashlight", qty: 1, cat: "valuable", rarity: "uncommon" },
    { w: 1, name: "Maintenance shotgun, 4 shells", qty: 1, cat: "weapon", rarity: "rare" },
    { w: 1, name: "Unopened vintage bottle", qty: 1, cat: "valuable", rarity: "epic" }
  ],
  wilderness: [
    { w: 12, name: "Trail mix pouch", qty: 2, cat: "potion", rarity: "ordinary" },
    { w: 10, name: "Fresh firewood bundle", qty: 1, cat: "material", rarity: "ordinary" },
    { w: 9, name: "Edible berries", qty: 1, cat: "potion", rarity: "ordinary" },
    { w: 8, name: "Clean bandages", qty: 1, cat: "potion", rarity: "ordinary" },
    { w: 7, name: "Rope length (10m)", qty: 1, cat: "material", rarity: "ordinary" },
    { w: 6, name: "Field knife", qty: 1, cat: "weapon", rarity: "common" },
    { w: 6, name: "Flint and steel", qty: 1, cat: "material", rarity: "common" },
    { w: 5, name: "Water filtration squeeze bottle", qty: 1, cat: "potion", rarity: "uncommon" },
    { w: 5, name: "Hiking map, annotated", qty: 1, cat: "key", rarity: "common" },
    { w: 4, name: "Camouflage tarp", qty: 1, cat: "material", rarity: "common" },
    { w: 4, name: "Snare wire kit", qty: 1, cat: "material", rarity: "common" },
    { w: 3, name: "Medicinal herb bundle", qty: 1, cat: "potion", rarity: "uncommon" },
    { w: 3, name: "Hunting bow, strung", qty: 1, cat: "weapon", rarity: "uncommon" },
    { w: 2, name: "Bear-resistant canister", qty: 1, cat: "material", rarity: "uncommon" },
    { w: 2, name: "Antique compass", qty: 1, cat: "valuable", rarity: "uncommon" },
    { w: 2, name: "Trailhead cache ledger", qty: 1, cat: "book", rarity: "rare" },
    { w: 1, name: "Antique longbow, masterwork", qty: 1, cat: "weapon", rarity: "rare" },
    { w: 1, name: "Four-leaf clover press (omen)", qty: 1, cat: "valuable", rarity: "epic" }
  ]
};
var LOOT_CATEGORY_SET = /* @__PURE__ */ new Set(["weapon", "armor", "accessory", "potion", "material", "key", "book", "valuable", "misc"]);
var LOOT_RARITY_SET = /* @__PURE__ */ new Set(["ordinary", "common", "uncommon", "rare", "epic", "legendary", "mythic"]);
function parseLootTableText(text) {
  const entries = [];
  let rejected = 0;
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length < 2) {
      rejected++;
      continue;
    }
    const w = Math.floor(Number(parts[0]));
    const name = (parts[1] || "").slice(0, 60);
    if (!Number.isFinite(w) || w < 1 || !name) {
      rejected++;
      continue;
    }
    const qty = Math.max(1, Math.min(99, Math.floor(Number(parts[2]) || 1)));
    const catRaw = (parts[3] || "misc").toLowerCase();
    const rarRaw = (parts[4] || "ordinary").toLowerCase();
    entries.push({
      w: Math.min(999, w),
      name,
      qty,
      cat: LOOT_CATEGORY_SET.has(catRaw) ? catRaw : "misc",
      rarity: LOOT_RARITY_SET.has(rarRaw) ? rarRaw : "ordinary"
    });
  }
  return { entries, rejected };
}
function pickWeighted(entries, rand) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  let total = 0;
  for (const e of entries) total += e.w;
  let roll = rand() * total;
  for (const e of entries) {
    roll -= e.w;
    if (roll <= 0) return e;
  }
  return entries[entries.length - 1];
}
function resolveSurvivalPool(settings) {
  const custom = parseLootTableText(settings?.survivalCustomTable || "");
  const wanted = typeof settings?.survivalTable === "string" ? settings.survivalTable : "wasteland";
  if (wanted === "custom") {
    return { entries: custom.entries, rejected: custom.rejected, source: "custom", empty: custom.entries.length === 0 };
  }
  const base = (LOOT_TABLES[wanted] || LOOT_TABLES.wasteland).map((e) => ({ ...e }));
  return { entries: [...base, ...custom.entries], rejected: custom.rejected, source: wanted, empty: false };
}
function encounterBeat(roll) {
  const r = roll;
  if (r <= 3) return { beat: "Nothing stirring", severity: 0, detail: "Wind, distance, silence. The area feels empty \u2014 for now." };
  if (r <= 7) return { beat: "Distant signs", severity: 1, detail: "A bird bursts up. Wires hum. Something moved far off, or the world is settling." };
  if (r <= 11) return { beat: "Fresh tracks", severity: 2, detail: "Prints in the dust/mud \u2014 recent. Heading somewhere. Maybe the same way." };
  if (r <= 14) return { beat: "Ambiguous follower", severity: 3, detail: "Movement at the edge of sight. Probably nothing. Probably." };
  if (r <= 17) return { beat: "Hard evidence", severity: 4, detail: "A kill cache, markings, fresh droppings, a drag trail \u2014 something is here and hunting." };
  if (r <= 19) return { beat: "Direct threat", severity: 5, detail: "Eyes in the dark, too close. It has not committed yet. Neither have you." };
  return { beat: "Ambush imminent", severity: 6, detail: "The quiet breaks. It charges \u2014 or springs \u2014 from close range." };
}
function parseWeatherLadder(text) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const part of String(text || "").split(",")) {
    const t = part.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t.slice(0, 24));
  }
  return out.length >= 2 ? out.slice(0, 12) : DEFAULT_WEATHER_LADDER.split(",").map((x) => x.trim());
}
var PHASE_TABLE = [
  [0, "Deep Night"],
  [5, "Dawn"],
  [7, "Morning"],
  [12, "Midday"],
  [14, "Afternoon"],
  [18, "Dusk"],
  [21, "Night"]
];
function phaseWord(minutes) {
  const m = (Math.floor(Number(minutes) || 0) % 1440 + 1440) % 1440;
  let word = "Deep Night";
  for (const [h, w] of PHASE_TABLE) {
    if (m >= h * 60) word = w;
  }
  return word;
}
function advanceSceneClock(world, stepMinutes, opts, rand) {
  const step = Math.max(15, Math.min(180, Math.floor(Number(stepMinutes) || 45)));
  const r = typeof rand === "function" ? rand : Math.random;
  let m = (Math.floor(Number(world.minutesOfDay)) || 480) + step;
  let days = 0;
  while (m >= 1440) {
    m -= 1440;
    days += 1;
  }
  world.minutesOfDay = m;
  if (days > 0) world.dayCount = clamp((Math.floor(Number(world.dayCount)) || 1) + days, 1, 99999);
  world.time = `Day ${world.dayCount} \xB7 ${phaseWord(m)}`;
  if (!opts?.drift) return false;
  const ladder = parseWeatherLadder(opts.ladder);
  const cur = String(world.weather || "").trim().toLowerCase();
  const idx = ladder.findIndex((x) => x.toLowerCase() === cur);
  if (idx === -1) return false;
  const chance = Math.max(0, Math.min(100, Number(opts.chance) || 0)) / 100;
  if (r() >= chance) return false;
  const dir = r() < 0.5 ? -1 : 1;
  let next = idx + dir;
  if (next < 0) next = 0;
  if (next > ladder.length - 1) next = ladder.length - 1;
  if (next === idx) return false;
  world.weather = ladder[next];
  return true;
}

// src/backend/extractor.ts
/*! src/backend/extractor.ts */
function buildInitMessages(input) {
  const schemaParts = [];
  if (input.modules.system) {
    schemaParts.push(`  "sheet": {
    "name": "string (player character name)",
    "race": "string (default Human)",
    "cls": "string (grounded role like Survivor, Homesteader, Knight, Mage \u2014 empty if none fits)",
    "rank": "string (ONLY if setting has official hunter/guild ranks, else empty string)",
    "levelSet": 1,
    "useMp": false,
    "mpLabel": "MP",
    "statsSet": { "str": 5, "dex": 6, "int": 6, "cha": 5, "con": 5, "wis": 6 },
    "cashSet": "",
    "itemsAdded": [
      { "name": "string", "category": "weapon|armor|accessory|potion|material|key|book|valuable|misc", "rarity": "ordinary|common|uncommon|rare|epic|legendary|mythic", "qty": 1, "note": "short", "equip": false }
    ],
    "skillsAdded": [{ "name": "string", "cost": "optional", "note": "short" }],
    "questsUpserted": [{ "title": "string", "kind": "main|side|daily", "status": "active|available", "objectives": [{ "text": "string", "done": false }], "reward": "" }],
    "logSummary": "Initialized from opening scene."
  }`);
  }
  if (input.modules.tracker) {
    schemaParts.push(`  "world": {
    "location": "current specific place",
    "time": "time of day / timeline",
    "weather": "weather if mentioned",
    "mood": "short 3-6 word scene mood",
    "arc": "Opening|Rising|Turning|Climax|Fallout",
    "phase": "Setup|Tension|Confrontation|Intimacy|Aftermath",
    "npcsUpserted": [
      {
        "name": "NPC name",
        "role": "short role",
        "present": true,
        "location": "place",
        "mood": "1-3 word current mood",
        "attitude": "Wary/Warm/Guarded/Hostile/etc",
        "bondSet": 50,
        "sparkSet": 15,
        "heatSet": 15,
        "goal": "what they want right now",
        "secret": "hidden motive or unspoken truth if any",
        "lastThought": "short 1-sentence private inner thought in their voice"
      }
    ],
    "threadsUpserted": [{ "title": "short hook or timer", "status": "active|seed", "detail": "one concise line" }]
  }`);
  }
  const system = `You are a deterministic RPG & Story Tracker state initializer for a text roleplay.
Output ONLY valid JSON (no markdown fences, no commentary) matching this exact schema:
{
${schemaParts.join(",\n")}
}
Rules:
- Adapt strictly to the world. Set useMp=false in realistic/modern/zombie/non-magic worlds unless magic/psionics/Sanity explicitly exists.
- If persona or card specifies an explicit starting level or numbers, respect them; otherwise levelSet=1 with six stats in 3-8 totalling ~33 shaped by background.
- Ordinary modern/survival items use rarity="ordinary". Do not invent fantasy gear or fake quests out of nothing.
- Tracker meters are 0..100: bondSet (trust/warmth: 0 hostile, 50 neutral, 100 devoted), sparkSet (chemistry/intrigue 0..100), heatSet (tension/danger/intensity 0..100).`;
  const user = [
    `PLAYER PERSONA: ${input.userName}`,
    input.personaDesc ? input.personaDesc.slice(0, 1200) : "(No persona description)",
    "",
    `CHARACTER CARD: ${input.charName}`,
    input.scenario ? `SCENARIO: ${input.scenario.slice(0, 800)}` : "",
    input.charDesc ? `CARD NOTES: ${input.charDesc.slice(0, 2200)}` : "",
    "",
    "OPENING MESSAGES:",
    input.recentTranscript.slice(0, 4e3)
  ].filter(Boolean).join("\n");
  return [
    { role: "system", content: system },
    { role: "user", content: user }
  ];
}
function buildDeltaMessages(data, recentTranscript, settings) {
  const transcriptCap = clamp(Number(settings?.transcriptCap) || 8e3, 1500, 2e4);
  const s = data.sheet;
  const w = data.world;
  const stateObj = {};
  const schemaParts = [];
  if (data.modules.system) {
    stateObj.sheet = {
      name: s.name,
      level: s.level,
      hp: `${s.hp}/${s.hpMax}`,
      sp: `${s.sp}/${s.spMax}`,
      useMp: s.useMp,
      mp: s.useMp ? `${s.mp}/${s.mpMax}` : void 0,
      gear: {
        weapon: s.gear.weapon?.name || null,
        armor: s.gear.armor?.name || null,
        accessory: s.gear.accessory?.name || null
      },
      bag: s.bag.map((x) => `${x.name} x${x.qty}`),
      effects: s.effects.map((e) => `${e.name}(${e.duration ?? "ongoing"})`),
      quests: s.quests.map((q) => ({ title: q.title, status: q.status }))
    };
    schemaParts.push(`  "sheet": {
    "hpDelta": 0,          // negative for wounds (graze -1..-4, solid -5..-12, serious -13..-25, crippling -26+), positive for healing
    "spDelta": 0,          // negative for strenuous effort (-2..-8), positive for catching breath
    "mpDelta": 0,          // only if useMp is true
    "xpGain": 0,           // ONLY for overcoming real risk or solving a real obstacle (minor 5-15, notable 20-50, major 60-120; 0 for casual talk)
    "rest": "none",        // "short" or "long" if character actually rested/slept
    "cashSet": "optional new funds string",
    "itemsAdded": [{ "name": "string", "category": "weapon|armor|accessory|potion|material|key|book|valuable|misc", "rarity": "ordinary|common|uncommon|rare|epic|legendary|mythic", "qty": 1, "note": "short", "equip": false }],
    "itemsRemoved": [{ "name": "exact item name", "qty": 1 }],
    "effectsAdded": [{ "name": "string", "kind": "buff|debuff|neutral", "duration": 3, "note": "short" }],
    "effectsRemoved": ["effect name"],
    "tickEffects": true,
    "skillsAdded": [{ "name": "string", "cost": "", "note": "", "bonus": 0 }],   // bonus = dice bonus (-2..10) when this skill applies to a check; 0 otherwise
    "questsUpserted": [{ "title": "string", "kind": "main|side|daily", "status": "active|available|done|failed", "objectives": [{ "text": "string", "done": false }], "reward": "" }],
    "logSummary": "short 1-line summary of what changed"
  }`);
  }
  if (data.modules.tracker) {
    stateObj.world = {
      location: w.location,
      time: w.time,
      weather: w.weather,
      arc: w.arc,
      phase: w.phase,
      pc: w.pc && typeof w.pc === "object" ? { outfit: w.pc.outfit || "", pos: w.pc.pos || "", cond: w.pc.cond || "", carry: w.pc.carry || "" } : { outfit: "", pos: "", cond: "", carry: "" },
      npcs: w.npcs.map((n) => ({
        name: n.name,
        present: n.present,
        mood: n.mood,
        bond: n.bond,
        spark: n.spark,
        heat: n.heat,
        goal: n.goal || "",
        secret: n.secret || "",
        lastThought: n.lastThought || ""
      })),
      threads: w.threads.filter((t) => t.status !== "resolved").map((t) => `[${t.status}] ${t.title}`)
    };
    schemaParts.push(`  "world": {
    "location": "only if moved",
    "time": "only if time passed",
    "weather": "only if weather changed",
    "mood": "short 3-6 word scene mood",
    "arc": "Opening|Rising|Turning|Climax|Fallout (only if shifted)",
    "phase": "Setup|Tension|Confrontation|Intimacy|Aftermath (only if shifted)",
    "dayDelta": 0,
    "pcUpserted": { "outfit": "what they are wearing/condition of it", "pos": "physical position right now", "cond": "physical condition right now (unhurt, bleeding, exhausted)", "carry": "notable things on their body right now" },
    "npcsUpserted": [{ "name": "NPC name", "role": "", "present": true, "location": "", "mood": "1-3 word mood", "attitude": "", "bondDelta": 0, "sparkDelta": 0, "heatDelta": 0, "goal": "current want", "secret": "", "lastThought": "1-sentence private thought in their voice" }],
    "threadsUpserted": [{ "title": "string", "status": "active|seed|resolved", "detail": "one line" }]
  }`);
  }
  const system = `You are a strict RPG & Story Tracker delta extractor.
Read the latest roleplay turn and compare it against CURRENT_STATE. Output ONLY valid JSON (no markdown fences, no commentary) containing ONLY fields that actually changed on the page. Never compute level-ups or max HP yourself \u2014 emit raw deltas only.
Schema (all keys optional; omit unchanged fields):
{
${schemaParts.join(",\n")}
}
Rules:
- Never change numbers without an explicit cause in the latest turn.
- Keep bondDelta / sparkDelta / heatDelta grounded (-10 to +10 per turn; 0 if unchanged).
- Always refresh lastThought and mood for NPCs who spoke or acted in the latest turn.
- Always include pcUpserted with the PC's CURRENT visible state on every reply (a camera would see it): what they wear, where they are positioned, their physical condition, and notable carried items. Keep values terse and concrete \u2014 clothes, not vibes. If unchanged since last turn, still repeat the same values.
- If nothing changed at all, return {}.`;
  const user = `CURRENT_STATE:
${JSON.stringify(stateObj)}

LATEST TURN:
${recentTranscript.slice(-transcriptCap)}`;
  return [
    { role: "system", content: system },
    { role: "user", content: user }
  ];
}
function sanitizeJsonControlChars(s) {
  let out = "";
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const code = s.charCodeAt(i);
    if (inStr) {
      if (esc) {
        out += ch;
        esc = false;
        continue;
      }
      if (ch === "\\") {
        out += ch;
        esc = true;
        continue;
      }
      if (ch === '"') {
        out += ch;
        inStr = false;
        continue;
      }
      if (code < 32) {
        if (ch === "\n") out += "\\n";
        else if (ch === "\r") out += "\\r";
        else if (ch === "	") out += "\\t";
        continue;
      }
      out += ch;
      continue;
    }
    if (ch === '"') inStr = true;
    out += ch;
  }
  return out;
}
function parseJsonDelta(raw) {
  if (!raw || typeof raw !== "string") return null;
  const withoutThinking = raw.replace(/<(?:think|thought|reasoning)>[\s\S]*?<\/(?:think|thought|reasoning)>/gi, "").trim();
  const stripped = withoutThinking.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const noFences = stripped.replace(/```(?:json)?/gi, "").trim();
  const tryParse = (s) => {
    const candidates = [s, sanitizeJsonControlChars(s)];
    for (const c of candidates) {
      try {
        const parsed = JSON.parse(c);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        try {
          const cleaned = c.replace(/,\s*([}\]])/g, "$1");
          const parsed = JSON.parse(cleaned);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed;
          }
        } catch {
        }
      }
    }
    return null;
  };
  const direct = tryParse(noFences);
  if (direct) return direct;
  const start = noFences.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < noFences.length; i++) {
    const ch = noFences[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return tryParse(noFences.slice(start, i + 1));
      }
    }
  }
  return null;
}
function bshStage(kind, value) {
  const v = Number(value) || 0;
  if (kind === "bond") {
    if (v < 10) return "Stranger";
    if (v < 25) return "Acquainted";
    if (v < 45) return "Familiar";
    if (v < 65) return "Trusted";
    if (v < 85) return "Close";
    return "Bonded";
  }
  if (kind === "spark") {
    if (v < 10) return "None";
    if (v < 25) return "Noticed";
    if (v < 45) return "Interested";
    if (v < 65) return "Attracted";
    if (v < 85) return "Charged";
    return "Consumed";
  }
  if (v < 25) return "Calm";
  if (v < 50) return "Warm";
  if (v < 75) return "Hot";
  return "Past thinking";
}

// src/backend/sanitize.ts
/*! src/backend/sanitize.ts */
var SAN_MAX_STRING = 2e3;
var RARITY_SET = /* @__PURE__ */ new Set(["ordinary", "common", "uncommon", "rare", "epic", "legendary", "mythic"]);
var CATEGORY_SET = /* @__PURE__ */ new Set(["weapon", "armor", "accessory", "potion", "material", "key", "book", "valuable", "misc"]);
var QUEST_STATUS_SET = /* @__PURE__ */ new Set(["active", "available", "done", "failed"]);
var EFFECT_KIND_SET = /* @__PURE__ */ new Set(["buff", "debuff", "neutral"]);
var KNOWN_THEMES = /* @__PURE__ */ new Set(["sakura", "ocean", "ember", "forest", "violet", "gold", "teal", "crimson", "mono", "lumiverse", "contrast"]);
function sanitizeThemeId(v) {
  const s = sanitizeString(v, 24).toLowerCase();
  return KNOWN_THEMES.has(s) ? s : null;
}
var ARC_SET = /* @__PURE__ */ new Set(["Opening", "Rising", "Turning", "Climax", "Fallout"]);
var PHASE_SET = /* @__PURE__ */ new Set(["Setup", "Tension", "Confrontation", "Intimacy", "Aftermath"]);
function sanitizeString(v, maxLen = SAN_MAX_STRING) {
  if (typeof v !== "string") return "";
  return v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim().slice(0, maxLen);
}
function sanitizeId(v, prefix = "id") {
  const s = sanitizeString(v, 48);
  return /^[A-Za-z0-9_-]{1,48}$/.test(s) ? s : makeId(prefix);
}
function sanitizeNumber(v, fallback, min, max) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return clamp(fallback, min, max);
  return clamp(n, min, max);
}
function sanitizeBool(v, fallback = false) {
  return typeof v === "boolean" ? v : fallback;
}
function sanitizeArray(v, fn, cap) {
  if (!Array.isArray(v)) return [];
  const out = [];
  for (const item of v) {
    if (out.length >= cap) break;
    const cleaned = fn(item);
    if (cleaned) out.push(cleaned);
  }
  return out;
}
function sanitizeStats(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for (const k of STAT_KEYS) out[k] = sanitizeNumber(src[k], 5, 1, 99);
  return out;
}
function sanitizeStatLabels(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for (const k of STAT_KEYS) out[k] = sanitizeString(src[k], 24) || DEFAULT_STAT_LABELS[k];
  return out;
}
function sanitizeGearItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = sanitizeString(raw.name, 80);
  if (!name) return null;
  const out = { ...raw, id: sanitizeId(raw.id, "itm"), name };
  out.category = CATEGORY_SET.has(raw.category) ? raw.category : "misc";
  out.rarity = RARITY_SET.has(raw.rarity) ? raw.rarity : "ordinary";
  out.qty = sanitizeNumber(raw.qty, 1, 1, 999);
  out.note = sanitizeString(raw.note, 200);
  if (Number.isFinite(Number(raw.rollBonus))) out.rollBonus = clamp(Number(raw.rollBonus), -3, 10);
  else delete out.rollBonus;
  return out;
}
function sanitizeSkill(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = sanitizeString(raw.name, 80);
  if (!name) return null;
  const out = { ...raw, id: sanitizeId(raw.id, "sk"), name };
  out.cost = sanitizeString(raw.cost, 60);
  out.note = sanitizeString(raw.note, 200);
  if (Number.isFinite(Number(raw.bonus))) out.bonus = clamp(Number(raw.bonus), -2, 10);
  return out;
}
function sanitizeEffect(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = sanitizeString(raw.name, 80);
  if (!name) return null;
  const out = { ...raw, id: sanitizeId(raw.id, "fx"), name };
  out.kind = EFFECT_KIND_SET.has(raw.kind) ? raw.kind : "neutral";
  out.duration = raw.duration === void 0 || raw.duration === null || typeof raw.duration === "string" ? null : sanitizeNumber(raw.duration, 3, 1, 999);
  out.note = sanitizeString(raw.note, 200);
  return out;
}
function sanitizeQuest(raw) {
  if (!raw || typeof raw !== "object") return null;
  const title = sanitizeString(raw.title, 140);
  if (!title) return null;
  const out = { ...raw, id: sanitizeId(raw.id, "q"), title };
  out.kind = raw.kind === "main" || raw.kind === "side" || raw.kind === "daily" ? raw.kind : "side";
  out.status = QUEST_STATUS_SET.has(raw.status) ? raw.status : "active";
  out.objectives = sanitizeArray(raw.objectives, (o) => {
    if (!o || typeof o !== "object") return null;
    const text = sanitizeString(o.text, 220);
    if (!text) return null;
    const obj = { ...o, id: sanitizeId(o.id, "ob"), text, done: sanitizeBool(o.done) };
    if (typeof o.progress === "string" && o.progress.trim()) obj.progress = sanitizeString(o.progress, 80);
    else delete obj.progress;
    return obj;
  }, 12);
  out.reward = sanitizeString(raw.reward, 200);
  out.penalty = sanitizeString(raw.penalty, 200);
  return out;
}
function sanitizeSheet(raw) {
  const base = raw && typeof raw === "object" ? { ...raw } : {};
  base.level = sanitizeNumber(base.level, 1, 1, 999);
  base.stats = sanitizeStats(base.stats);
  base.statLabels = sanitizeStatLabels(base.statLabels);
  const pools = computePools(base);
  base.name = sanitizeString(base.name, 60) || "Survivor";
  base.race = sanitizeString(base.race, 60) || "Human";
  base.cls = sanitizeString(base.cls, 60);
  base.subcls = sanitizeString(base.subcls, 60);
  base.rank = sanitizeString(base.rank, 40);
  base.guild = sanitizeString(base.guild, 60);
  base.title = sanitizeString(base.title, 60);
  base.xp = sanitizeNumber(base.xp, 0, 0, 1e8);
  base.xpNext = pools.xpNext;
  base.pts = sanitizeNumber(base.pts, 0, 0, 30);
  base.hpMax = pools.hpMax;
  base.spMax = pools.spMax;
  base.mpMax = pools.mpMax;
  base.hp = sanitizeNumber(base.hp, pools.hpMax, 0, pools.hpMax);
  base.sp = sanitizeNumber(base.sp, pools.spMax, 0, pools.spMax);
  base.mp = sanitizeNumber(base.mp, pools.mpMax, 0, pools.mpMax);
  base.useMp = sanitizeBool(base.useMp);
  base.mpLabel = sanitizeString(base.mpLabel, 24) || "MP";
  const gear = base.gear && typeof base.gear === "object" ? base.gear : {};
  base.gear = {
    weapon: sanitizeGearItem(gear.weapon),
    armor: sanitizeGearItem(gear.armor),
    accessory: sanitizeGearItem(gear.accessory)
  };
  base.bag = sanitizeArray(base.bag, sanitizeGearItem, 24);
  base.cash = sanitizeString(base.cash, 60);
  base.skills = sanitizeArray(base.skills, sanitizeSkill, 30);
  base.effects = sanitizeArray(base.effects, sanitizeEffect, 12);
  base.quests = sanitizeArray(base.quests, sanitizeQuest, 20);
  base.lastLog = sanitizeString(base.lastLog, 240);
  return base;
}
function sanitizeNpc(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = sanitizeString(raw.name, 60);
  if (!name) return null;
  const out = { ...raw, id: sanitizeId(raw.id, "npc"), name };
  out.role = sanitizeString(raw.role, 60);
  out.present = sanitizeBool(raw.present, true);
  out.location = sanitizeString(raw.location, 120);
  out.mood = sanitizeString(raw.mood, 48) || "Guarded";
  out.attitude = sanitizeString(raw.attitude, 48) || "Wary";
  out.relationship = sanitizeNumber(raw.relationship, 0, -100, 100);
  out.bond = sanitizeNumber(raw.bond, clamp(Math.round((out.relationship + 100) / 2), 0, 100), 0, 100);
  out.spark = sanitizeNumber(raw.spark, 15, 0, 100);
  out.heat = sanitizeNumber(raw.heat, 15, 0, 100);
  out.goal = sanitizeString(raw.goal, 240);
  out.secret = sanitizeString(raw.secret, 300);
  out.lastThought = sanitizeString(raw.lastThought, 300);
  return out;
}
function sanitizeThread(raw) {
  if (!raw || typeof raw !== "object") return null;
  const title = sanitizeString(raw.title, 160);
  if (!title) return null;
  const out = { ...raw, id: sanitizeId(raw.id, "th"), title };
  out.status = sanitizeString(raw.status, 30).toLowerCase() || "active";
  out.detail = sanitizeString(raw.detail, 500);
  if (raw.kind === "timer") {
    out.kind = "timer";
    out.turnsLeft = sanitizeNumber(raw.turnsLeft, 1, 0, 99);
  } else if (typeof raw.kind === "string" && raw.kind.trim()) {
    out.kind = sanitizeString(raw.kind, 24).toLowerCase();
  }
  return out;
}
function sanitizePc(raw) {
  const base = raw && typeof raw === "object" ? raw : {};
  return {
    outfit: sanitizeString(base.outfit, 160),
    pos: sanitizeString(base.pos, 160),
    cond: sanitizeString(base.cond, 160),
    carry: sanitizeString(base.carry, 160)
  };
}
function sanitizeWorld(raw) {
  const base = raw && typeof raw === "object" ? { ...raw } : {};
  base.location = sanitizeString(base.location, 120) || "Unknown";
  base.time = sanitizeString(base.time, 80) || "Day 1";
  base.weather = sanitizeString(base.weather, 80);
  base.mood = sanitizeString(base.mood, 80);
  base.arc = ARC_SET.has(base.arc) ? base.arc : sanitizeString(base.arc, 40) || "Opening";
  base.phase = PHASE_SET.has(base.phase) ? base.phase : sanitizeString(base.phase, 40) || "Setup";
  base.dayCount = sanitizeNumber(base.dayCount, 1, 1, 99999);
  base.minutesOfDay = sanitizeNumber(base.minutesOfDay, 480, 0, 1439);
  base.npcs = sanitizeArray(base.npcs, sanitizeNpc, 20);
  base.threads = sanitizeArray(base.threads, sanitizeThread, 14);
  base.notes = sanitizeString(base.notes, 2e3);
  base.pc = sanitizePc(base.pc);
  return base;
}
function sanitizeRoll(raw) {
  if (!raw || typeof raw !== "object") return null;
  const roll = sanitizeNumber(raw.roll, 1, 1, 20);
  const out = { ...raw, id: sanitizeId(raw.id, "roll"), roll };
  out.timestamp = sanitizeNumber(raw.timestamp, Date.now(), 0, 4e12);
  out.who = sanitizeString(raw.who, 60) || "Character";
  out.action = sanitizeString(raw.action, 160) || "Attempt check";
  out.stat = normalizeRollStat(raw.stat);
  out.statValue = sanitizeNumber(raw.statValue, 5, 1, 99);
  out.statMod = sanitizeNumber(raw.statMod, 0, -2, 6);
  out.gearBonus = sanitizeNumber(raw.gearBonus, 0, -3, 3);
  out.mode = raw.mode === "adv" || raw.mode === "dis" ? raw.mode : "normal";
  out.advRoll = raw.advRoll === null || raw.advRoll === void 0 ? null : sanitizeNumber(raw.advRoll, 1, 1, 20);
  out.skillBonus = sanitizeNumber(raw.skillBonus, 0, -2, 10);
  out.skillLabel = sanitizeString(raw.skillLabel, 60);
  out.total = sanitizeNumber(raw.total, out.roll, -10, 40);
  out.dc = sanitizeNumber(raw.dc, 15, 1, 40);
  out.verdict = sanitizeString(raw.verdict, 30).toLowerCase() || "success";
  out.consumed = sanitizeBool(raw.consumed, true);
  if (Array.isArray(raw.loot)) {
    out.loot = sanitizeArray(
      raw.loot,
      (i) => {
        if (!i || typeof i !== "object") return null;
        const name = sanitizeString(i.name, 60);
        if (!name) return null;
        return { name, qty: sanitizeNumber(i.qty, 1, 1, 99), rarity: sanitizeString(i.rarity, 20) || "ordinary" };
      },
      6
    );
  }
  out.lootSummary = sanitizeString(raw.lootSummary, 240);
  return out;
}
function sanitizeNotices(raw) {
  return sanitizeArray(raw, (n) => {
    if (!n || typeof n !== "object") return null;
    const title = sanitizeString(n.title, 100);
    if (!title) return null;
    const out = { ...n, id: sanitizeId(n.id, "ntc"), title };
    out.timestamp = sanitizeNumber(n.timestamp, Date.now(), 0, 4e12);
    out.kind = sanitizeString(n.kind, 40).toLowerCase() || "system";
    out.lines = sanitizeArray(n.lines, (l) => sanitizeString(l, 300) || null, 12);
    return out;
  }, 15);
}
var MAX_IMPORT_BYTES = 15e5;
function sanitizeImportedState(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  if (!parsed.sheet || typeof parsed.sheet !== "object" || !parsed.world || typeof parsed.world !== "object") {
    return null;
  }
  return {
    sheet: sanitizeSheet(parsed.sheet),
    world: sanitizeWorld(parsed.world),
    rolls: sanitizeArray(parsed.rolls, sanitizeRoll, 60),
    notices: sanitizeNotices(parsed.notices)
  };
}
function extractTagText(block, tag) {
  const m = block.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">", "i"));
  return m ? m[1].trim() : null;
}
function parseTagPair(raw) {
  const m = String(raw || "").match(/(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  return { cur: Number(m[1]), max: Number(m[2]) };
}
function parseStatusBlock(block) {
  const stats = {};
  const statLabels = {};
  for (const k of STAT_KEYS) {
    const m = block.match(new RegExp("<" + k + '(?:\\s+l="([^"]*)")?\\s*>([^<]*)</' + k + ">", "i"));
    const v = m ? parseInt(m[2], 10) : 5;
    stats[k] = Number.isFinite(v) ? v : 5;
    const lbl = m && m[1] ? sanitizeString(m[1], 24) : "";
    if (lbl && lbl.toUpperCase() !== k.toUpperCase()) statLabels[k] = lbl;
  }
  const gearItem = (tag, category) => {
    const m = block.match(new RegExp("<" + tag + "[^>]*>\\s*<it>([\\s\\S]*?)</it>\\s*</" + tag + ">", "i"));
    if (!m) return null;
    let rawName = sanitizeString(m[1], 80);
    if (!rawName) return null;
    let rarity = "ordinary";
    const rm = rawName.match(/\(([a-z]+)\)\s*$/i);
    if (rm && RARITY_SET.has(rm[1].toLowerCase())) {
      rarity = rm[1].toLowerCase();
      rawName = rawName.slice(0, rawName.length - rm[0].length).trim();
    }
    let qty = 1;
    const qm = rawName.match(/\sx\s*(\d+)\s*$/i);
    if (qm) {
      qty = Math.min(999, Math.max(1, Number(qm[1])));
      rawName = rawName.slice(0, rawName.length - qm[0].length).trim();
    }
    return { name: rawName, rarity, qty, category, note: "" };
  };
  const skills = [];
  const sklBlock = extractTagText(block, "skl");
  if (sklBlock) {
    for (const m of sklBlock.matchAll(/<it>([\s\S]*?)<\/it>/gi)) {
      const rawName = sanitizeString(m[1], 80);
      if (!rawName) continue;
      const bm = rawName.match(/\s*\+\s*(-?\d+)\s*$/);
      skills.push({
        name: bm ? rawName.slice(0, rawName.length - bm[0].length).trim() : rawName,
        bonus: bm ? clamp(Number(bm[1]), -2, 10) : 0,
        cost: "",
        note: ""
      });
    }
  }
  const effects = [];
  const fxBlock = extractTagText(block, "fx");
  if (fxBlock) {
    for (const m of fxBlock.matchAll(/<it>([\s\S]*?)<\/it>/gi)) {
      const rawName = sanitizeString(m[1], 80);
      if (!rawName) continue;
      const dm = rawName.match(/:\s*(\d+)\s*t(?:urns?)?\s*$/i);
      const isOngoing = /:\s*ongoing\s*$/i.test(rawName);
      const name = dm || isOngoing ? rawName.replace(/:\s*(\d+\s*t(?:urns?)?|ongoing)\s*$/i, "").trim() : rawName;
      effects.push({
        name,
        kind: "neutral",
        duration: dm ? clamp(Number(dm[1]), 1, 999) : null,
        note: ""
      });
    }
  }
  const bag = [];
  const bagBlock = extractTagText(block, "bag");
  if (bagBlock) {
    for (const m of bagBlock.matchAll(/<itm\b([^>]*)>([\s\S]*?)<\/itm>/gi)) {
      const attrs = m[1];
      const name = sanitizeString(m[2], 80);
      if (!name) continue;
      const t = (attrs.match(/\bt="([^"]*)"/) || [])[1]?.toLowerCase();
      const r = (attrs.match(/\br="([^"]*)"/) || [])[1]?.toLowerCase();
      const n = (attrs.match(/\bn="(\d+)"/) || [])[1];
      bag.push({
        name,
        category: CATEGORY_SET.has(t) ? t : PRESET_CATEGORY_ALIASES[t] || "misc",
        rarity: RARITY_SET.has(r) ? r : "ordinary",
        qty: clamp(Number(n) || 1, 1, 999),
        note: ""
      });
    }
  }
  const quests = [];
  const questsBlock = extractTagText(block, "quests");
  if (questsBlock) {
    for (const qm of questsBlock.matchAll(/<quest\b([^>]*)>([\s\S]*?)<\/quest>/gi)) {
      const attrs = qm[1];
      const qbody = qm[2];
      const status = (attrs.match(/\bs="([^"]*)"/) || [])[1]?.toLowerCase();
      const kind = (attrs.match(/\bk="([^"]*)"/) || [])[1]?.toLowerCase();
      const title = sanitizeString(extractTagText(qbody, "qt") || "Quest", 140);
      const objectives = [];
      for (const om of qbody.matchAll(/<ob\b([^>]*)>([\s\S]*?)<\/ob>/gi)) {
        const otext = sanitizeString(om[2], 220);
        if (!otext) continue;
        objectives.push({ text: otext, done: /\bx="1"/.test(om[1]) });
      }
      quests.push({
        title,
        status: QUEST_STATUS_SET.has(status) ? status : "active",
        kind: kind === "main" || kind === "side" || kind === "daily" ? kind : "side",
        objectives,
        reward: sanitizeString(extractTagText(qbody, "rw") || "", 200),
        penalty: sanitizeString(extractTagText(qbody, "pn") || "", 200)
      });
    }
  }
  const hp = parseTagPair(extractTagText(block, "hp"));
  const sp = parseTagPair(extractTagText(block, "sp"));
  const mp = parseTagPair(extractTagText(block, "mp"));
  const mpLabelMatch = block.match(/<mp\s+l="([^"]*)"/i);
  const xp = parseTagPair(extractTagText(block, "xp"));
  const sheet = {
    name: sanitizeString(extractTagText(block, "nm") || "", 60) || "Survivor",
    level: clamp(firstIntSafe(extractTagText(block, "lv")) ?? 1, 1, 999),
    race: sanitizeString(extractTagText(block, "race") || "", 60) || "Human",
    cls: emptyIfNone(extractTagText(block, "cls") || "", 60),
    subcls: emptyIfNone(extractTagText(block, "subcls") || "", 60),
    guild: emptyIfNone(extractTagText(block, "guild") || "", 60),
    title: emptyIfNone(extractTagText(block, "ttl") || "", 60),
    rank: emptyIfNone(extractTagText(block, "rank") || "", 40),
    stats,
    statLabels,
    xp: clamp(xp ? xp.cur : 0, 0, 1e8),
    pts: clamp(firstIntSafe(extractTagText(block, "pts")) ?? 0, 0, 30),
    hp: hp ? clamp(hp.cur, 0, 1e6) : void 0,
    sp: sp ? clamp(sp.cur, 0, 1e6) : void 0,
    useMp: Boolean(mp),
    mpLabel: mpLabelMatch ? sanitizeString(mpLabelMatch[1], 24) || "MP" : "MP",
    mp: mp ? clamp(mp.cur, 0, 1e6) : void 0,
    gear: { weapon: gearItem("wpn", "weapon"), armor: gearItem("arm", "armor"), accessory: gearItem("acc", "accessory") },
    bag,
    skills,
    effects,
    quests,
    cash: sanitizeString(extractTagText(block, "cash") || "", 60),
    lastLog: sanitizeString(extractTagText(block, "log") || "", 240) || "Imported from chat log."
  };
  return sheet;
}
function emptyIfNone(v, maxLen = 60) {
  const s = sanitizeString(v, maxLen);
  return /^(none|n\/a|—|–|-|unknown)$/i.test(s) ? "" : s;
}
function firstIntSafe(raw) {
  const m = String(raw || "").match(/-?\d+/);
  return m ? Number(m[0]) : null;
}
var PRESET_CATEGORY_ALIASES = { consumable: "potion", food: "potion", scroll: "book", letter: "key", document: "key", map: "valuable" };
var WEFT_ARC_LADDER = { setup: "Opening", escalation: "Rising", complication: "Turning", crisis: "Climax", resolution: "Fallout" };
var WEFT_PHASE_LADDER = { "early simmer": "Setup", building: "Tension", "midpoint tension": "Confrontation", climax: "Confrontation", breather: "Aftermath" };
function parseWorldStateBlock(block) {
  const grab = (tag) => sanitizeString(extractTagText(block, tag) || "", 300);
  const clock = grab("clock");
  let dayCount = 1;
  let time = clock;
  const dm = clock.match(/day\s*(\d+)/i);
  if (dm) {
    dayCount = clamp(Number(dm[1]), 1, 99999);
    time = clock.replace(/day\s*\d+\s*,?/i, "").trim() || clock;
  }
  const kvLine = (lines, key) => {
    const m = (lines || "").match(new RegExp("^\\s*" + key + ":\\s*(.+)$", "im"));
    return m ? sanitizeString(m[1], 300) : "";
  };
  const pcBlock = extractTagText(block, "pc") || "";
  const world = {
    location: grab("place") || "Unknown",
    time: time || "Day 1",
    weather: grab("weather"),
    mood: "",
    dayCount,
    pc: {
      outfit: kvLine(pcBlock, "outfit"),
      pos: kvLine(pcBlock, "pos"),
      cond: kvLine(pcBlock, "cond"),
      carry: kvLine(pcBlock, "carry")
    },
    npcs: [],
    threads: []
  };
  for (const nm of block.matchAll(/<npc>([\s\S]*?)<\/npc>/gi)) {
    const b = nm[1];
    const num = (key) => {
      const m = b.match(new RegExp("^\\s*" + key + ":\\s*(\\d+)", "im"));
      return m ? clamp(Number(m[1]), 0, 100) : void 0;
    };
    const name = sanitizeString(kvLine(b, "name"), 60);
    if (!name) continue;
    world.npcs.push({
      name,
      role: "",
      present: true,
      location: kvLine(b, "pos"),
      mood: sanitizeString(kvLine(b, "mood"), 48) || "Guarded",
      attitude: sanitizeString(kvLine(b, "mood"), 48) || "Guarded",
      relationship: 0,
      bond: num("bond") ?? 15,
      spark: num("spark") ?? 15,
      heat: num("heat") ?? 15,
      goal: kvLine(b, "want"),
      secret: kvLine(b, "secret"),
      lastThought: kvLine(b, "think")
    });
  }
  for (const om of block.matchAll(/<off>([\s\S]*?)<\/off>/gi)) {
    const raw = sanitizeString(om[1], 300);
    const m = raw.match(/^([^:]+):\s*(.*)$/);
    const name = sanitizeString(m ? m[1] : raw, 60);
    if (!name) continue;
    world.npcs.push({
      name,
      role: "",
      present: false,
      location: sanitizeString(m ? m[2] : "", 120),
      mood: "Guarded",
      attitude: "Wary",
      relationship: 0,
      bond: 15,
      spark: 15,
      heat: 15,
      goal: "",
      secret: "",
      lastThought: ""
    });
  }
  for (const tm of block.matchAll(/<thread>([\s\S]*?)<\/thread>/gi)) {
    world.threads.push({ title: sanitizeString(tm[1], 160), status: "active", detail: "" });
  }
  for (const sm of block.matchAll(/<seed>([\s\S]*?)<\/seed>/gi)) {
    world.threads.push({ title: sanitizeString(sm[1], 160), status: "seed", detail: "" });
  }
  for (const tm of block.matchAll(/<timer>([\s\S]*?)<\/timer>/gi)) {
    const raw = sanitizeString(tm[1], 300);
    const turns = firstIntSafe(raw);
    const parts = raw.split(":").map((s) => s.trim()).filter(Boolean);
    world.threads.push({
      title: sanitizeString(parts[0] || raw, 160),
      status: "active",
      kind: "timer",
      turnsLeft: turns !== null ? clamp(turns, 0, 99) : 1,
      detail: sanitizeString(parts.slice(1).join(": ").replace(/\s*\d+\s*turns?\s*(left)?\s*$/i, ""), 500)
    });
  }
  const mapLadder = (raw, ladderSet, ladder) => {
    const s = sanitizeString(raw || "", 40);
    if (!s) return "";
    const lower = s.toLowerCase();
    for (const v of ladderSet) if (v.toLowerCase() === lower) return v;
    return ladder[lower] || s;
  };
  world.arc = mapLadder(grab("arc"), ARC_SET, WEFT_ARC_LADDER) || "Opening";
  world.phase = mapLadder(grab("phase"), PHASE_SET, WEFT_PHASE_LADDER) || "Setup";
  return world;
}
function findLastTaggedBlock(messages, re) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m || m.is_user) continue;
    const c = String(m.content || "");
    const match = c.match(re);
    if (match) return { block: match[0], inner: match[1], messageId: m.id, index: i };
  }
  return null;
}
function scanChatLog(messages) {
  const report = { status: 0, world: 0, dice: 0, choices: 0, npcs: 0, latestLevel: null, latestName: null };
  for (const m of messages) {
    if (!m || m.is_user) continue;
    const c = String(m.content || "");
    if (/<Status\b/i.test(c)) report.status += 1;
    if (/<World_State\b/i.test(c)) report.world += 1;
    if (/<Dice\b/i.test(c)) report.dice += 1;
    if (/<choices\b/i.test(c)) report.choices += 1;
  }
  const lastStatus = findLastTaggedBlock(messages, /<Status\b[^>]*>([\s\S]*?)<\/Status>/i);
  if (lastStatus) {
    const name = extractTagText(lastStatus.inner, "nm");
    const lv = firstIntSafe(extractTagText(lastStatus.inner, "lv"));
    report.latestName = name ? sanitizeString(name, 60) : null;
    report.latestLevel = lv !== null ? clamp(lv, 1, 999) : null;
  }
  report.canImport = Boolean(lastStatus) || Boolean(findLastTaggedBlock(messages, /<World_State\b[^>]*>([\s\S]*?)<\/World_State>/i));
  report.warnings = [];
  if (report.status > 0 && report.world > 0) {
    report.warnings.push("This chat still contains raw <Status>/<World_State> blocks from the preset. If Weft Chronicle's System Window and Tracker are ON, the state renders twice \u2014 turn OFF 'System window' and 'Tracker' in the preset's Prompt Variables.");
  }
  if (report.dice > 0) {
    report.warnings.push(`Found ${report.dice} <Dice> block(s) in the log \u2014 if the preset's dice variable is ON, rolls will double up. Turn it OFF and let the extension roll.`);
  }
  return report;
}
function normalizeChatData(data, defaultModules = createDefaultModules(), xpCurve = "flat") {
  if (data && typeof data === "object") {
    data.themeOverride = sanitizeThemeId(data.themeOverride);
    if (!data.modules || typeof data.modules !== "object") {
      data.modules = { ...defaultModules };
    } else {
      data.modules = { ...defaultModules, ...data.modules };
    }
    data.sheet = data.sheet && typeof data.sheet === "object" ? sanitizeSheet(data.sheet) : createDefaultSheet("Survivor");
    data.world = data.world && typeof data.world === "object" ? sanitizeWorld(data.world) : createDefaultWorld();
    data.notices = sanitizeNotices(data.notices);
    data.rolls = Array.isArray(data.rolls) ? sanitizeArray(data.rolls, sanitizeRoll, 60) : [];
    if (!data.snapshots || typeof data.snapshots !== "object") data.snapshots = {};
    if (!Array.isArray(data.syncLog)) data.syncLog = [];
    if (data.syncLog.length > MAX_SYNC_LOG) data.syncLog = data.syncLog.slice(-MAX_SYNC_LOG);
    if (!data.spend || typeof data.spend !== "object") data.spend = { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    for (const k of ["calls", "promptTokens", "completionTokens", "totalTokens"]) {
      const v = Number(data.spend[k]);
      data.spend[k] = Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
    }
    data.scavengeCount = sanitizeNumber(data.scavengeCount, 0, 0, 1e9);
    data.encounterCount = sanitizeNumber(data.encounterCount, 0, 0, 1e9);
    data.syncLog = data.syncLog.map((e) => {
      if (!e || typeof e !== "object") return { ts: Date.now(), ok: false, error: "Unknown error" };
      return {
        ts: sanitizeNumber(e.ts, Date.now(), 0, 4e12),
        ok: sanitizeBool(e.ok, false),
        ...typeof e.error === "string" ? { error: sanitizeString(e.error, 200) } : {},
        ...Number.isFinite(e.tokens) ? { tokens: Math.max(0, Math.floor(e.tokens)) } : {}
      };
    });
    if (data.lastSyncError && typeof data.lastSyncError !== "string") data.lastSyncError = null;
  }
  recomputeSheetPools(data.sheet, { xpCurve });
  return data;
}
function createDefaultChatData(chatId, enabled = true, userName = "Survivor", modules = createDefaultModules()) {
  return {
    chatId,
    initialized: false,
    enabled,
    modules: { ...modules },
    sheet: createDefaultSheet(userName),
    world: createDefaultWorld(),
    rolls: [],
    notices: [],
    snapshots: {},
    lastSyncedKey: null,
    lastSyncError: null,
    spend: { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    scavengeCount: 0,
    encounterCount: 0,
    syncLog: [],
    themeOverride: null,
    updatedAt: Date.now()
  };
}
var backupStampByChat = /* @__PURE__ */ new Map();
var MAX_AUTO_BACKUPS = 5;
function backupFileName(chatId, ts) {
  return `chats/backups/${safeFileSegment(chatId)}/${ts}.json`;
}
function backupEnvelope(data) {
  return {
    format: "weft-chronicle",
    version: 3,
    backup: true,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    sheet: data.sheet,
    world: data.world,
    rolls: data.rolls,
    notices: (data.notices || []).slice(0, 5)
  };
}
async function maybeAutoBackup(chatId, data, userId, settings, opts) {
  if (!settings?.autoBackup) return;
  const key = chatCacheKey(userId, chatId);
  const now = Date.now();
  const last = backupStampByChat.get(key) || 0;
  if (!opts?.force && now - last < 6e4) return;
  backupStampByChat.set(key, now);
  try {
    const path = backupFileName(chatId, now);
    await spindle.userStorage.setJson(path, backupEnvelope(data), userId);
    const prefix = `chats/backups/${safeFileSegment(chatId)}/`;
    const files = (await spindle.userStorage.list(prefix, userId)).filter((f) => String(f).endsWith(".json")).sort();
    const excess = files.slice(0, Math.max(0, files.length - MAX_AUTO_BACKUPS));
    for (const f of excess) {
      try {
        await spindle.userStorage.delete(f, userId);
      } catch {
      }
    }
  } catch (err) {
    spindle.log.warn(`Auto-backup for ${chatId} failed: ${String(err)}`);
  }
}
var MAX_SYNC_LOG = 12;
function estimateTokensFromText(text) {
  const s = typeof text === "string" ? text : "";
  return Math.max(0, Math.ceil(s.length / 4));
}
function estimateTokensForCall(messages, rawOutput) {
  let prompt = 0;
  for (const m of Array.isArray(messages) ? messages : []) {
    prompt += estimateTokensFromText(m && typeof m.content === "string" ? m.content : "");
  }
  return { promptTokens: prompt, completionTokens: estimateTokensFromText(rawOutput), calls: 1 };
}
function addSpend(data, usage) {
  if (!data || typeof data !== "object" || !usage) return;
  if (!data.spend || typeof data.spend !== "object") data.spend = { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  const s = data.spend;
  const p = Math.max(0, Math.floor(usage.promptTokens || 0));
  const c = Math.max(0, Math.floor(usage.completionTokens || 0));
  s.calls += Math.max(1, Math.floor(usage.calls || 1));
  s.promptTokens += p;
  s.completionTokens += c;
  s.totalTokens += p + c;
}
function noteSyncOutcome(data, ok, error, usage) {
  if (!data || typeof data !== "object") return;
  if (!Array.isArray(data.syncLog)) data.syncLog = [];
  data.syncLog.push({
    ts: Date.now(),
    ok: Boolean(ok),
    error: ok ? void 0 : sanitizeString(String(error || "Unknown error"), 200),
    tokens: usage && Number.isFinite(usage.promptTokens) ? Math.max(0, Math.floor(usage.promptTokens || 0)) + Math.max(0, Math.floor(usage.completionTokens || 0)) : void 0
  });
  if (usage) addSpend(data, usage);
  if (data.syncLog.length > MAX_SYNC_LOG) data.syncLog = data.syncLog.slice(-MAX_SYNC_LOG);
  data.lastSyncError = ok ? null : sanitizeString(String(error || "Sync failed"), 200);
}
function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}
function allocateStatPoint(sheet, stat, amount = 1) {
  const amt = Math.floor(amount);
  if (amt <= 0) return { ok: false, reason: "Amount must be positive." };
  if (sheet.pts < amt) return { ok: false, reason: "Not enough unspent points." };
  const before = sheet.stats[stat];
  sheet.stats[stat] = clamp(before + amt, 1, 99);
  sheet.pts -= amt;
  recomputeSheetPools(sheet, { raiseCurrentByMaxDelta: true });
  sheet.lastLog = `Allocated ${sheet.statLabels[stat]} +${amt} (${before} \u2192 ${sheet.stats[stat]}).`;
  return { ok: true };
}
function parseAllocPriority(raw) {
  const keys = sanitizeString(raw || "", 60).toLowerCase().split(/[^a-z]+/g).filter((k) => STAT_KEYS.includes(k));
  const dedup = [...new Set(keys)];
  return dedup.length > 0 ? dedup : null;
}
function autoAllocateAllPoints(sheet, priorityRaw) {
  if (sheet.pts <= 0) return "No points to assign.";
  const total = sheet.pts;
  const preferred = parseAllocPriority(priorityRaw);
  const ranked = preferred || [...STAT_KEYS].sort((a, b) => sheet.stats[b] - sheet.stats[a]);
  const changes = { str: 0, dex: 0, int: 0, cha: 0, con: 0, wis: 0 };
  let i = 0;
  while (sheet.pts > 0) {
    const pick = preferred ? ranked[i % ranked.length] : ranked[i % Math.min(3, ranked.length)];
    sheet.stats[pick] += 1;
    sheet.pts -= 1;
    changes[pick] += 1;
    i += 1;
  }
  recomputeSheetPools(sheet, { raiseCurrentByMaxDelta: true });
  const parts = STAT_KEYS.filter((k) => changes[k] > 0).map(
    (k) => `${sheet.statLabels[k]} +${changes[k]}`
  );
  sheet.lastLog = `Auto-allocated ${total} pts: ${parts.join(", ")}.`;
  return sheet.lastLog;
}
function equipItem(sheet, itemId) {
  const idx = sheet.bag.findIndex((x) => x.id === itemId);
  if (idx === -1) return false;
  const item = sheet.bag[idx];
  if (item.category !== "weapon" && item.category !== "armor" && item.category !== "accessory") {
    return false;
  }
  const slot = item.category;
  const prev = sheet.gear[slot];
  if (item.qty > 1) {
    item.qty -= 1;
    sheet.gear[slot] = { ...item, id: makeId("eq"), qty: 1 };
  } else {
    sheet.bag.splice(idx, 1);
    sheet.gear[slot] = item;
  }
  if (prev) {
    addItemToBag(sheet, prev);
  }
  sheet.lastLog = `Equipped ${item.name}.`;
  return true;
}
function unequipSlot(sheet, slot) {
  const prev = sheet.gear[slot];
  if (!prev) return false;
  sheet.gear[slot] = null;
  addItemToBag(sheet, prev);
  sheet.lastLog = `Unequipped ${prev.name}.`;
  return true;
}
function addItemToBag(sheet, input) {
  const qty = Math.max(1, Math.floor(input.qty || 1));
  const normName = input.name.trim();
  if (!normName) return;
  const existing = sheet.bag.find(
    (x) => x.name.toLowerCase() === normName.toLowerCase() && x.rarity === (input.rarity || "ordinary")
  );
  if (existing) {
    existing.qty += qty;
    if (input.note && !existing.note) existing.note = input.note;
  } else {
    if (sheet.bag.length >= 24) return;
    sheet.bag.push({
      id: input.id || makeId("itm"),
      name: normName,
      category: input.category || "misc",
      rarity: input.rarity || "ordinary",
      qty,
      note: input.note || "",
      rollBonus: input.rollBonus
    });
  }
}
function removeItemFromBag(sheet, nameOrId, qty = 1) {
  const lower = nameOrId.trim().toLowerCase();
  const idx = sheet.bag.findIndex((x) => x.id === nameOrId || x.name.toLowerCase() === lower);
  if (idx === -1) return false;
  const removeCount = Math.max(1, Math.floor(qty));
  if (sheet.bag[idx].qty > removeCount) {
    sheet.bag[idx].qty -= removeCount;
  } else {
    sheet.bag.splice(idx, 1);
  }
  return true;
}
function fairD20(rng) {
  if (rng) {
    return clamp(Math.floor(rng() * 20) + 1, 1, 20);
  }
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    const limit = Math.floor(4294967296 / 20) * 20;
    let val = 0;
    do {
      cryptoObj.getRandomValues(buf);
      val = buf[0];
    } while (val >= limit);
    return val % 20 + 1;
  }
  return Math.floor(Math.random() * 20) + 1;
}
function evaluateVerdict(roll, total, dc) {
  if (roll === 20) return "nat 20";
  if (roll === 1) return "nat 1";
  if (total >= dc) return "success";
  if (total >= dc - 2) return "success, at a cost";
  return "fail";
}
function normalizeRollStat(stat) {
  const s = typeof stat === "string" ? stat.toLowerCase().trim() : "";
  return STAT_KEYS.includes(s) ? s : "none";
}
function performDiceRoll(sheet, opts) {
  const dc = clamp(opts.dc, 1, 40);
  const stat = normalizeRollStat(opts.stat);
  const statValue = stat === "none" ? 5 : sheet.stats[stat];
  const statMod = stat === "none" ? 0 : statModifier(statValue);
  const gearBonus = clamp(opts.gearBonus ?? 0, -3, 3);
  const skillBonus = clamp(Number(opts.skillBonus) || 0, -2, 10);
  const skillLabel = sanitizeString(opts.skillLabel || "", 60);
  const modeRaw = typeof opts.mode === "string" ? opts.mode.toLowerCase().trim() : "";
  const mode = modeRaw === "adv" || modeRaw === "advantage" ? "adv" : modeRaw === "dis" || modeRaw === "disadvantage" ? "dis" : "normal";
  const first = fairD20(opts.rng);
  const second = mode !== "normal" ? fairD20(opts.rng) : null;
  const roll = mode === "normal" ? first : mode === "adv" ? Math.max(first, second) : Math.min(first, second);
  const advRoll = second === null ? null : mode === "adv" ? Math.min(first, second) : Math.max(first, second);
  const total = roll + statMod + gearBonus + skillBonus;
  const verdict = evaluateVerdict(roll, total, dc);
  return {
    id: makeId("roll"),
    timestamp: Date.now(),
    who: (opts.who || sheet.name || "Character").trim(),
    action: (opts.action || "Attempt risky action").trim(),
    stat,
    statValue,
    statMod,
    gearBonus,
    skillBonus,
    skillLabel,
    mode,
    advRoll,
    roll,
    total,
    dc,
    verdict,
    consumed: false
  };
}
function tickEffectsInPlace(sheet) {
  const remaining = [];
  for (const ef of sheet.effects) {
    if (ef.duration === null) remaining.push(ef);
    else if (ef.duration > 1) remaining.push({ ...ef, duration: ef.duration - 1 });
  }
  sheet.effects = remaining;
}
function applyDelta(data, delta, settings) {
  normalizeChatData(data);
  const sheet = data.sheet;
  const world = data.world;
  const oldLevel = sheet.level;
  let levelsGained = 0;
  let ptsGained = 0;
  let xpGained = 0;
  const notes = [];
  const turnNotices = [];
  const changeLines = [];
  const wasInitialized = data.initialized;
  const sd = data.modules.system ? delta.sheet : void 0;
  if (sd) {
    if (typeof sd.name === "string" && sd.name.trim()) sheet.name = sd.name.trim();
    if (typeof sd.race === "string") sheet.race = sd.race.trim();
    if (typeof sd.cls === "string") sheet.cls = sd.cls.trim();
    if (typeof sd.subcls === "string") sheet.subcls = sd.subcls.trim();
    if (typeof sd.rank === "string") sheet.rank = sd.rank.trim();
    if (typeof sd.guild === "string") sheet.guild = sd.guild.trim();
    if (typeof sd.title === "string") sheet.title = sd.title.trim();
    if (typeof sd.useMp === "boolean") sheet.useMp = sd.useMp;
    if (typeof sd.mpLabel === "string" && sd.mpLabel.trim()) sheet.mpLabel = sd.mpLabel.trim();
    if (typeof sd.cashSet === "string") sheet.cash = sd.cashSet.trim();
    let statsChanged = false;
    if (sd.statsSet) {
      for (const k of STAT_KEYS) {
        const v = sd.statsSet[k];
        if (typeof v === "number" && Number.isFinite(v)) {
          sheet.stats[k] = clamp(v, 1, 99);
          statsChanged = true;
        }
      }
    }
    if (typeof sd.levelSet === "number" && Number.isFinite(sd.levelSet) && sd.levelSet >= 1) {
      sheet.level = clamp(sd.levelSet, 1, 999);
      statsChanged = true;
    }
    if (statsChanged) {
      recomputeSheetPools(sheet, { fillToMax: !wasInitialized });
    }
    if (sd.rest === "long") {
      sheet.sp = sheet.spMax;
      if (sheet.useMp) sheet.mp = sheet.mpMax;
      sheet.hp = clamp(sheet.hp + Math.ceil(sheet.hpMax * 0.35), 0, sheet.hpMax);
      notes.push("Long rest");
      changeLines.push("Restored stamina and recovered 35% HP from a long rest.");
      tickEffectsInPlace(sheet);
    } else if (sd.rest === "short") {
      sheet.sp = clamp(sheet.sp + Math.ceil(sheet.spMax * 0.5), 0, sheet.spMax);
      if (sheet.useMp) sheet.mp = clamp(sheet.mp + Math.ceil(sheet.mpMax * 0.5), 0, sheet.mpMax);
      notes.push("Short rest");
    }
    if (typeof sd.hpDelta === "number" && sd.hpDelta !== 0) {
      const prevHp = sheet.hp;
      sheet.hp = clamp(sheet.hp + sd.hpDelta, 0, sheet.hpMax);
      notes.push(`HP ${sd.hpDelta > 0 ? "+" : ""}${sd.hpDelta}`);
      changeLines.push(`HP ${sd.hpDelta > 0 ? "+" : ""}${sd.hpDelta} (${sheet.hp}/${sheet.hpMax})`);
      if (prevHp > 0 && sheet.hp === 0) {
        notes.push("HP 0 \u2014 DOWN");
        changeLines.push("HP 0 \u2014 character is down and cannot act until stabilized.");
        turnNotices.push({
          id: makeId("ntc"),
          timestamp: Date.now(),
          kind: "warn",
          title: "SYSTEM: DOWNED",
          lines: [
            `${sheet.name} has hit 0 HP and is down/unconscious.`,
            "They cannot act \u2014 another solid hit while down is fatal.",
            "Heals/medical attention are required before they can stand."
          ]
        });
      } else if (sheet.hp > 0 && sheet.hp <= Math.max(1, Math.floor(sheet.hpMax * 0.25)) && prevHp > Math.max(1, Math.floor(sheet.hpMax * 0.25))) {
        changeLines.push("HP critically low \u2014 one clean hit could drop them.");
      }
    }
    if (typeof sd.spDelta === "number" && sd.spDelta !== 0) {
      sheet.sp = clamp(sheet.sp + sd.spDelta, 0, sheet.spMax);
      notes.push(`SP ${sd.spDelta > 0 ? "+" : ""}${sd.spDelta}`);
    }
    if (sheet.useMp && typeof sd.mpDelta === "number" && sd.mpDelta !== 0) {
      sheet.mp = clamp(sheet.mp + sd.mpDelta, 0, sheet.mpMax);
      notes.push(`${sheet.mpLabel} ${sd.mpDelta > 0 ? "+" : ""}${sd.mpDelta}`);
    }
    if (typeof sd.ptsGain === "number" && sd.ptsGain > 0) {
      const bonus = Math.floor(sd.ptsGain);
      sheet.pts += bonus;
      ptsGained += bonus;
      notes.push(`+${bonus} pts`);
      changeLines.push(`+${bonus} Bonus Attribute Points`);
    }
    if (settings.trackXp && typeof sd.xpGain === "number" && sd.xpGain > 0) {
      xpGained = Math.floor(sd.xpGain);
      sheet.xp += xpGained;
      notes.push(`+${xpGained} XP`);
      while (sheet.xp >= sheet.xpNext) {
        sheet.xp -= sheet.xpNext;
        sheet.level += 1;
        levelsGained += 1;
        sheet.pts += 2;
        ptsGained += 2;
        recomputeSheetPools(sheet, { raiseCurrentByMaxDelta: true, xpCurve: settings.xpCurve });
        sheet.hp = clamp(sheet.hp + Math.ceil(sheet.hpMax * 0.25), 0, sheet.hpMax);
        sheet.sp = clamp(sheet.sp + Math.ceil(sheet.spMax * 0.25), 0, sheet.spMax);
        if (sheet.useMp) {
          sheet.mp = clamp(sheet.mp + Math.ceil(sheet.mpMax * 0.25), 0, sheet.mpMax);
        }
      }
      if (levelsGained > 0) {
        const autoSummary = settings.allocMode === "auto" ? autoAllocateAllPoints(sheet, settings.allocPriority) : "";
        notes.push(`LEVEL UP \u2192 Lv ${sheet.level}`);
        turnNotices.push({
          id: makeId("ntc"),
          timestamp: Date.now(),
          kind: "levelup",
          title: "LEVEL UP",
          lines: [
            `${sheet.name} reached Level ${sheet.level} (was Lv ${oldLevel}).`,
            settings.allocMode === "auto" ? autoSummary : `+${ptsGained} Attribute Points ready to allocate.`,
            `Pools expanded & recovered +25% (HP ${sheet.hp}/${sheet.hpMax}, SP ${sheet.sp}/${sheet.spMax}).`
          ]
        });
      } else {
        changeLines.push(`+${xpGained} XP (${sheet.xp}/${sheet.xpNext})`);
      }
    }
    const addedItemNames = [];
    if (Array.isArray(sd.itemsAdded)) {
      for (const it of sd.itemsAdded) {
        if (!it || !it.name?.trim()) continue;
        const entry = {
          id: makeId("itm"),
          name: it.name.trim(),
          category: it.category || "misc",
          rarity: it.rarity || "ordinary",
          qty: Math.max(1, Math.floor(it.qty || 1)),
          note: it.note || ""
        };
        if (it.equip && (entry.category === "weapon" || entry.category === "armor" || entry.category === "accessory")) {
          const prev = sheet.gear[entry.category];
          sheet.gear[entry.category] = { ...entry, qty: 1 };
          if (prev) addItemToBag(sheet, prev);
        } else {
          addItemToBag(sheet, entry);
        }
        addedItemNames.push(`${entry.name}${entry.qty > 1 ? ` \xD7${entry.qty}` : ""}`);
      }
    }
    if (wasInitialized && addedItemNames.length > 0) {
      turnNotices.push({
        id: makeId("ntc"),
        timestamp: Date.now(),
        kind: "item",
        title: "ITEM ACQUIRED",
        lines: addedItemNames.map((n) => `Obtained ${n}`)
      });
    }
    if (Array.isArray(sd.itemsRemoved)) {
      for (const rm of sd.itemsRemoved) {
        if (!rm || !rm.name?.trim()) continue;
        removeItemFromBag(sheet, rm.name, rm.qty ?? 1);
      }
    }
    if (sd.tickEffects) {
      tickEffectsInPlace(sheet);
    }
    if (Array.isArray(sd.effectsRemoved) && sd.effectsRemoved.length > 0) {
      const rmSet = new Set(sd.effectsRemoved.map((e) => e.trim().toLowerCase()));
      sheet.effects = sheet.effects.filter((e) => !rmSet.has(e.name.toLowerCase()));
    }
    if (Array.isArray(sd.effectsAdded)) {
      for (const ef of sd.effectsAdded) {
        if (!ef || !ef.name?.trim()) continue;
        const existing = sheet.effects.find((x) => x.name.toLowerCase() === ef.name.trim().toLowerCase());
        if (existing) {
          existing.duration = ef.duration ?? existing.duration;
          if (ef.note) existing.note = ef.note;
        } else {
          sheet.effects.push({
            id: makeId("fx"),
            name: ef.name.trim(),
            kind: ef.kind || "neutral",
            duration: ef.duration ?? null,
            note: ef.note || ""
          });
          if (wasInitialized) {
            changeLines.push(`Condition gained: ${ef.name.trim()}`);
          }
        }
      }
    }
    const newSkills = [];
    if (Array.isArray(sd.skillsAdded)) {
      for (const sk of sd.skillsAdded) {
        if (!sk || !sk.name?.trim()) continue;
        const exists = sheet.skills.some((x) => x.name.toLowerCase() === sk.name.trim().toLowerCase());
        if (!exists) {
          sheet.skills.push({
            id: makeId("sk"),
            name: sk.name.trim(),
            cost: sk.cost || "",
            note: sk.note || "",
            bonus: clamp(Number(sk.bonus) || 0, -2, 10)
          });
          newSkills.push(sk.name.trim());
        }
      }
    }
    if (wasInitialized && newSkills.length > 0) {
      turnNotices.push({
        id: makeId("ntc"),
        timestamp: Date.now(),
        kind: "skill",
        title: "SKILL UNLOCKED",
        lines: newSkills
      });
    }
    const questNoticeLines = [];
    if (Array.isArray(sd.questsUpserted)) {
      for (const q of sd.questsUpserted) {
        if (!q || !q.title?.trim()) continue;
        const existing = sheet.quests.find((x) => x.title.toLowerCase() === q.title.trim().toLowerCase());
        if (existing) {
          const prevStatus = existing.status;
          if (q.status) existing.status = q.status;
          if (q.kind) existing.kind = q.kind;
          if (q.reward !== void 0) existing.reward = q.reward;
          if (q.penalty !== void 0) existing.penalty = q.penalty;
          if (Array.isArray(q.objectives) && q.objectives.length > 0) {
            existing.objectives = q.objectives.map((o) => ({
              id: makeId("ob"),
              text: o.text,
              done: Boolean(o.done),
              progress: o.progress
            }));
          }
          if (wasInitialized && q.status && q.status !== prevStatus) {
            questNoticeLines.push(`${existing.title} \u2192 ${q.status.toUpperCase()}`);
          }
        } else {
          sheet.quests.push({
            id: makeId("q"),
            title: q.title.trim(),
            kind: q.kind || "side",
            status: q.status || "active",
            objectives: (q.objectives || []).map((o) => ({
              id: makeId("ob"),
              text: o.text,
              done: Boolean(o.done),
              progress: o.progress
            })),
            reward: q.reward || "",
            penalty: q.penalty || ""
          });
          if (wasInitialized) {
            questNoticeLines.push(`New Quest: ${q.title.trim()}`);
          }
        }
      }
      const rankStatus = (q) => {
        if (q.status === "active") return q.kind === "main" ? 0 : 1;
        if (q.status === "available") return 2;
        if (q.status === "done") return 3;
        return 4;
      };
      const finished = sheet.quests.filter((q) => q.status === "done" || q.status === "failed");
      const open = sheet.quests.filter((q) => q.status === "active" || q.status === "available");
      const trimmedFinished = finished.slice(-3);
      sheet.quests = [...open, ...trimmedFinished].sort((a, b) => rankStatus(a) - rankStatus(b)).slice(0, 8);
    }
    if (questNoticeLines.length > 0) {
      turnNotices.push({
        id: makeId("ntc"),
        timestamp: Date.now(),
        kind: "quest",
        title: "QUEST UPDATED",
        lines: questNoticeLines
      });
    }
    if (wasInitialized && turnNotices.length === 0 && changeLines.length > 0) {
      turnNotices.push({
        id: makeId("ntc"),
        timestamp: Date.now(),
        kind: sd.hpDelta && sd.hpDelta <= -10 ? "warn" : "change",
        title: sd.hpDelta && sd.hpDelta <= -10 ? "WARNING" : "NOTIFICATION",
        lines: changeLines
      });
    }
    if (typeof sd.logSummary === "string" && sd.logSummary.trim()) {
      sheet.lastLog = sd.logSummary.trim();
    } else if (notes.length > 0) {
      sheet.lastLog = notes.join(" \xB7 ");
    }
  }
  const wd = data.modules.tracker ? delta.world : void 0;
  if (wd) {
    if (typeof wd.location === "string" && wd.location.trim()) world.location = wd.location.trim();
    if (typeof wd.time === "string" && wd.time.trim()) world.time = wd.time.trim();
    if (typeof wd.weather === "string") world.weather = wd.weather.trim();
    if (typeof wd.mood === "string") world.mood = wd.mood.trim();
    if (typeof wd.arc === "string" && wd.arc.trim()) world.arc = wd.arc.trim();
    if (typeof wd.phase === "string" && wd.phase.trim()) world.phase = wd.phase.trim();
    if (typeof wd.dayDelta === "number" && wd.dayDelta > 0) {
      world.dayCount = Math.max(1, world.dayCount + Math.floor(wd.dayDelta));
    }
    if (wd.pcUpserted && typeof wd.pcUpserted === "object") {
      const pc = world.pc && typeof world.pc === "object" ? world.pc : world.pc = { outfit: "", pos: "", cond: "", carry: "" };
      for (const k of ["outfit", "pos", "cond", "carry"]) {
        const v = wd.pcUpserted[k];
        if (typeof v === "string" && v.trim()) pc[k] = sanitizeString(v, 160);
      }
    }
    if (typeof wd.notes === "string") world.notes = wd.notes.trim();
    if (Array.isArray(wd.npcsUpserted)) {
      for (const n of wd.npcsUpserted) {
        if (!n || !n.name?.trim()) continue;
        const existing = world.npcs.find((x) => x.name.toLowerCase() === n.name.trim().toLowerCase());
        if (existing) {
          if (typeof n.role === "string" && n.role.trim()) existing.role = n.role.trim();
          if (typeof n.present === "boolean") existing.present = n.present;
          if (typeof n.location === "string" && n.location.trim()) existing.location = n.location.trim();
          if (typeof n.mood === "string" && n.mood.trim()) existing.mood = n.mood.trim();
          if (typeof n.attitude === "string" && n.attitude.trim()) existing.attitude = n.attitude.trim();
          if (typeof n.bondSet === "number") existing.bond = clamp(n.bondSet, 0, 100);
          else if (typeof n.bondDelta === "number") existing.bond = clamp(existing.bond + n.bondDelta, 0, 100);
          else if (typeof n.relSet === "number") {
            existing.relationship = clamp(n.relSet, -100, 100);
            existing.bond = clamp(Math.round((existing.relationship + 100) / 2), 0, 100);
          } else if (typeof n.relDelta === "number") {
            existing.relationship = clamp(existing.relationship + n.relDelta, -100, 100);
            existing.bond = clamp(existing.bond + Math.round(n.relDelta / 2), 0, 100);
          }
          if (typeof n.bondSet === "number" || typeof n.bondDelta === "number") {
            existing.relationship = clamp(existing.bond * 2 - 100, -100, 100);
          }
          if (typeof n.sparkSet === "number") existing.spark = clamp(n.sparkSet, 0, 100);
          else if (typeof n.sparkDelta === "number") existing.spark = clamp(existing.spark + n.sparkDelta, 0, 100);
          if (typeof n.heatSet === "number") existing.heat = clamp(n.heatSet, 0, 100);
          else if (typeof n.heatDelta === "number") existing.heat = clamp(existing.heat + n.heatDelta, 0, 100);
          if (typeof n.goal === "string") existing.goal = n.goal.trim();
          if (typeof n.secret === "string") existing.secret = n.secret.trim();
          if (typeof n.lastThought === "string") existing.lastThought = n.lastThought.trim();
        } else {
          const bond = typeof n.bondSet === "number" ? clamp(n.bondSet, 0, 100) : typeof n.bondDelta === "number" ? clamp(50 + n.bondDelta, 0, 100) : typeof n.relSet === "number" ? clamp(Math.round((n.relSet + 100) / 2), 0, 100) : clamp(50 + Math.round((n.relDelta ?? 0) / 2), 0, 100);
          const rel = typeof n.relSet === "number" ? clamp(n.relSet, -100, 100) : clamp(bond * 2 - 100, -100, 100);
          const npc = {
            id: makeId("npc"),
            name: n.name.trim(),
            role: n.role?.trim() || "",
            present: n.present ?? true,
            location: n.location?.trim() || world.location,
            mood: n.mood?.trim() || n.attitude?.trim() || "Guarded",
            attitude: n.attitude?.trim() || n.mood?.trim() || "Wary",
            relationship: rel,
            bond,
            spark: clamp(n.sparkSet ?? 15 + (n.sparkDelta ?? 0), 0, 100),
            heat: clamp(n.heatSet ?? 15 + (n.heatDelta ?? 0), 0, 100),
            goal: n.goal?.trim() || "",
            secret: n.secret?.trim() || "",
            lastThought: n.lastThought?.trim() || ""
          };
          world.npcs.push(npc);
        }
      }
      if (world.npcs.length > 20) {
        world.npcs = world.npcs.slice(-20);
      }
    }
    if (Array.isArray(wd.threadsUpserted)) {
      for (const th of wd.threadsUpserted) {
        if (!th || !th.title?.trim()) continue;
        const existing = world.threads.find(
          (x) => x.title.toLowerCase() === th.title.trim().toLowerCase()
        );
        if (existing) {
          if (th.status) existing.status = th.status;
          if (typeof th.detail === "string" && th.detail.trim()) existing.detail = th.detail.trim();
        } else {
          const entry = {
            id: makeId("th"),
            title: th.title.trim(),
            status: th.status || "active",
            detail: th.detail?.trim() || ""
          };
          world.threads.push(entry);
        }
      }
      if (world.threads.length > 14) {
        world.threads = world.threads.slice(-14);
      }
    }
    for (const t of world.threads) {
      if (t.kind === "timer" && t.status !== "resolved" && typeof t.turnsLeft === "number" && t.turnsLeft > 0) {
        t.turnsLeft -= 1;
        if (t.turnsLeft === 0) {
          turnNotices.push({
            id: makeId("ntc"),
            timestamp: Date.now(),
            kind: "warn",
            title: "TIMER UP",
            lines: [`Timer expired: ${t.title}`, t.detail ? t.detail : "The consequence arrives now."]
          });
          changeLines.push(`TIMER EXPIRED: ${t.title}`);
        } else if (t.turnsLeft <= 2) {
          changeLines.push(`Timer "${t.title}" lands in ${t.turnsLeft} turn${t.turnsLeft === 1 ? "" : "s"}.`);
        }
      }
    }
  }
  if (settings && settings.clockEnabled && world && typeof world === "object") {
    advanceSceneClock(world, settings.clockStepMinutes, {
      drift: settings.weatherDrift,
      chance: settings.weatherDriftChance,
      ladder: settings.weatherLadder
    });
  }
  if (turnNotices.length > 0) {
    data.notices = [...turnNotices, ...data.notices].slice(0, 15);
  }
  data.initialized = true;
  data.updatedAt = Date.now();
  return {
    leveledUp: levelsGained > 0,
    oldLevel,
    newLevel: sheet.level,
    levelsGained,
    ptsGained,
    xpGained,
    notices: turnNotices,
    summary: notes.join(" \xB7 ") || "State synced"
  };
}
function buildPromptBlock(data, settings) {
  normalizeChatData(data, settings.defaultModules, settings.xpCurve);
  if (!data.enabled || !settings.injectPrompt) return null;
  const wantSystem = data.modules.system && settings.includeSheetInPrompt && data.initialized;
  const wantTracker = data.modules.tracker && settings.includeWorldInPrompt && data.initialized;
  const pendingRolls = data.modules.dice && settings.includeRollsInPrompt ? data.rolls.filter((r) => !r.consumed) : [];
  const lean = settings.promptBudget === "lean";
  if (!wantSystem && !wantTracker && pendingRolls.length === 0) return null;
  const lines = ["<weft_chronicle_state>"];
  lines.push(
    "Authoritative state tracked externally by Weft Chronicle. Honor these injuries, gear, NPC feelings/thoughts, and rolled outcomes in prose without quoting raw stats, HP, XP, or dice numbers in story text. Lines marked [NPC-private] are for consistency only \u2014 never narrate the secret or quote the thought directly; let them shape behavior. HP 0 means the character is down/unconscious and cannot act until stabilized. Bond/Spark/Heat meters belong to the player's knowledge \u2014 NPCs act on their own wants, not on the meters. If an Unspent pts count is listed, the character has attribute points ready to allocate \u2014 a natural training or development opening may exist in the story if they seek it. Do NOT emit <Status>, <World_State>, or fake <Dice> XML tags \u2014 the extension displays them automatically."
  );
  if (wantSystem) {
    const s = data.sheet;
    const identity = [s.name, `Lv ${s.level}`, s.race, s.cls, s.subcls, s.rank ? `Rank ${s.rank}` : ""].filter(Boolean).join(" \xB7 ");
    const pools = [
      `HP ${s.hp}/${s.hpMax}`,
      `SP ${s.sp}/${s.spMax}`,
      s.useMp ? `${s.mpLabel} ${s.mp}/${s.mpMax}` : "",
      settings.trackXp ? `XP ${s.xp}/${s.xpNext}` : "",
      s.pts > 0 ? `Unspent pts: ${s.pts}` : ""
    ].filter(Boolean).join(" | ");
    const statsLine = STAT_KEYS.map(
      (k) => `${s.statLabels[k]} ${s.stats[k]} (${formatMod(statModifier(s.stats[k]))})`
    ).join(", ");
    lines.push(`[CHARACTER] ${identity}`);
    lines.push(`[POOLS] ${pools}`);
    if (s.hp === 0) {
      lines.push("[CRITICAL] The character is DOWN at 0 HP \u2014 unconscious and unable to act. Any further damage is fatal until they are stabilized/healed.");
    }
    lines.push(`[STATS] ${statsLine}`);
    const eqParts = ["weapon", "armor", "accessory"].map((slot) => {
      const it = s.gear[slot];
      if (!it) return "";
      const r = it.rarity !== "ordinary" ? ` (${it.rarity})` : "";
      return `${slot}: ${it.name}${r}`;
    }).filter(Boolean);
    if (eqParts.length > 0) lines.push(`[EQUIPPED] ${eqParts.join(" | ")}`);
    if (lean) {
      if (s.cash) lines.push(`[FUNDS] ${s.cash}`);
    } else if (s.bag.length > 0) {
      const bagText = s.bag.slice(0, 14).map((it) => `${it.name}${it.qty > 1 ? ` x${it.qty}` : ""}`).join(", ");
      lines.push(`[BAG] ${bagText}${s.cash ? ` | Funds: ${s.cash}` : ""}`);
    } else if (s.cash) {
      lines.push(`[FUNDS] ${s.cash}`);
    }
    if (s.skills.length > 0) {
      lines.push(`[SKILLS] ${s.skills.map((k) => k.name).join(", ")}`);
    }
    if (s.effects.length > 0) {
      const fx = s.effects.map((e) => `${e.name}${e.duration !== null ? ` (${e.duration}t)` : ""}`).join(", ");
      lines.push(`[EFFECTS] ${fx}`);
    }
    const openQuests = s.quests.filter((q) => q.status === "active" || q.status === "available");
    if (openQuests.length > 0) {
      const qLines = openQuests.slice(0, 5).map((q) => {
        const obs = lean ? "" : q.objectives.map((o) => `${o.done ? "[x]" : "[ ]"} ${o.text}`).join("; ");
        return `${q.title} (${q.status})${obs ? ": " + obs : ""}`;
      });
      lines.push(`[QUESTS] ${qLines.join(" | ")}`);
    }
  }
  if (wantTracker) {
    const w = data.world;
    const sceneBits = [
      w.location && w.location !== "Unknown" ? `Place: ${w.location}` : "",
      w.time ? `Time: ${w.time}` : "",
      w.weather ? `Weather: ${w.weather}` : "",
      w.mood ? `Mood: ${w.mood}` : "",
      w.arc ? `Arc: ${w.arc}` : "",
      w.phase ? `Phase: ${w.phase}` : ""
    ].filter(Boolean);
    if (sceneBits.length > 0) {
      lines.push(`[SCENE] ${sceneBits.join(" | ")}`);
    }
    if (w.pc && typeof w.pc === "object") {
      const pcBits = [
        w.pc.outfit && `Wearing: ${w.pc.outfit}`,
        w.pc.pos && `Position: ${w.pc.pos}`,
        w.pc.cond && `Condition: ${w.pc.cond}`,
        w.pc.carry && `Carrying: ${w.pc.carry}`
      ].filter(Boolean);
      if (pcBits.length > 0) lines.push(`[PC] ${pcBits.join(" | ")}`);
    }
    if (w.npcs.length > 0) {
      const present = w.npcs.filter((n) => n.present);
      const away = w.npcs.filter((n) => !n.present).slice(0, 4);
      const showHeat = (n) => settings.heatDisplay !== "charged" || n.heat >= 25;
      const fmtNpc = (n) => {
        const priv = [];
        if (n.secret) priv.push(`secret: ${n.secret}`);
        if (n.lastThought) priv.push(`thinking: "${n.lastThought}"`);
        const privStr = priv.length > 0 ? `; ${priv.join("; ")} [NPC-private]` : "";
        const sparkStr = lean && n.spark < 25 ? "" : `, Spark ${n.spark}/100 (${bshStage("spark", n.spark)})`;
        const heatStr = showHeat(n) && !(lean && n.heat < 25) ? `, Heat ${n.heat}/100 (${bshStage("heat", n.heat)})` : "";
        return `${n.name} (${n.mood || n.attitude}, Bond ${n.bond}/100 (${bshStage("bond", n.bond)})${sparkStr}${heatStr}${n.goal ? `; wants: ${n.goal}` : ""}${privStr})`;
      };
      const presentForBlock = lean ? present.slice(0, 5) : present;
      if (presentForBlock.length > 0) lines.push(`[NPCS PRESENT] ${presentForBlock.map(fmtNpc).join(" | ")}`);
      if (!lean && away.length > 0) lines.push(`[NPCS OFFSCREEN] ${away.map((n) => `${n.name} @ ${n.location}`).join(" | ")}`);
    }
    const activeThreads = w.threads.filter((t) => t.status !== "resolved").slice(0, 5);
    if (activeThreads.length > 0) {
      lines.push(`[THREADS] ${activeThreads.map((t) => `[${t.status}] ${t.title}: ${t.detail}`).join(" | ")}`);
    }
    const timers = w.threads.filter((t) => t.kind === "timer" && t.status !== "resolved" && typeof t.turnsLeft === "number" && t.turnsLeft > 0).slice(0, 6);
    if (timers.length > 0) {
      lines.push(`[TIMERS \u2014 consequence expected in N replies; honor the fuse] ${timers.map((t) => `${t.turnsLeft} turn${t.turnsLeft === 1 ? "" : "s"}: ${t.title}${t.detail ? ` (${t.detail})` : ""}`).join(" | ")}`);
    }
  }
  if (pendingRolls.length > 0) {
    lines.push("[BINDING DICE ROLLS \u2014 ALREADY ROLLED WITH FAIR RNG; NARRATE THESE EXACT OUTCOMES]");
    for (const r of pendingRolls) {
      const statStr = r.stat === "none" ? "Flat" : `${r.stat.toUpperCase()} ${formatMod(r.statMod)}`;
      const gearStr = r.gearBonus !== 0 ? ` + Gear ${formatMod(r.gearBonus)}` : "";
      const skillStr = r.skillLabel ? ` + Skill "${r.skillLabel}" ${formatMod(r.skillBonus)}` : "";
      const modeStr = r.mode && r.mode !== "normal" && Number.isFinite(r.advRoll) ? ` (${r.mode === "adv" ? "advantage" : "disadvantage"}, d20s ${Math.min(r.roll, r.advRoll)}/${Math.max(r.roll, r.advRoll)}, kept ${r.roll})` : "";
      const lootStr = r.lootSummary ? ` -> loot: ${r.lootSummary}` : "";
      lines.push(
        `- ${r.who} attempts "${r.action}": d20=${r.roll}${modeStr} (${statStr}${gearStr}${skillStr}) = ${r.total} vs DC ${r.dc} -> ${r.verdict.toUpperCase()}${lootStr}`
      );
    }
  }
  lines.push("</weft_chronicle_state>");
  return lines.join("\n");
}

// src/backend/backend.ts
/*! src/backend/backend.ts */
var MAX_SNAPSHOTS = 40;
var settingsCache = /* @__PURE__ */ new Map();
var chatCache = /* @__PURE__ */ new Map();
var activeChatByUser = /* @__PURE__ */ new Map();
var activeConnByUser = /* @__PURE__ */ new Map();
var lastUserByChat = /* @__PURE__ */ new Map();
var lastKnownUserId;
var syncingChats = /* @__PURE__ */ new Set();
var interceptorDisposer = null;
function rememberUserForChat(chatId, userId) {
  if (userId && userId.trim()) {
    const uid = userId.trim();
    lastKnownUserId = uid;
    if (chatId) lastUserByChat.set(chatId, uid);
    return uid;
  }
  if (chatId) {
    return lastUserByChat.get(chatId) || lastKnownUserId;
  }
  return lastKnownUserId;
}
var SETTINGS_ENUM_KEYS = {
  syncMode: ["every", "every2", "manual"],
  promptBudget: ["lean", "standard"],
  xpCurve: ["flat", "lifted"],
  heatDisplay: ["always", "charged"],
  inlinePlacement: ["inside", "below", "footer"],
  allocMode: ["player", "auto"],
  systemTheme: ["follow", "blue", "gold"],
  survivalTable: ["wasteland", "urban", "wilderness", "custom"],
  theme: null
  // free-form theme id, capped below
};
var SETTINGS_NUMBER_KEYS = {
  transcriptCap: [1500, 2e4],
  sidecarMaxTokens: [400, 6e3],
  maxHistoryRolls: [5, 100],
  survivalDc: [1, 40],
  clockStepMinutes: [15, 180],
  weatherDriftChance: [0, 100]
};
function sanitizeSettingsPatch(patch) {
  const out = {};
  if (!patch || typeof patch !== "object") return out;
  for (const [k, v] of Object.entries(patch)) {
    if (k === "defaultModules" && v && typeof v === "object") {
      const dm = {};
      for (const mk of ["system", "tracker", "dice", "choices"]) {
        if (typeof v[mk] === "boolean") dm[mk] = v[mk];
      }
      out.defaultModules = dm;
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(SETTINGS_ENUM_KEYS, k)) {
      const allowed = SETTINGS_ENUM_KEYS[k];
      const s = sanitizeString(v, 40).toLowerCase();
      if (allowed ? allowed.includes(s) : Boolean(s)) out[k] = allowed ? s : s;
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(SETTINGS_NUMBER_KEYS, k)) {
      const [min, max] = SETTINGS_NUMBER_KEYS[k];
      const n = sanitizeNumber(v, NaN, min, max);
      if (Number.isFinite(n)) out[k] = n;
      continue;
    }
    if (typeof v === "boolean") {
      out[k] = v;
      continue;
    }
    if (typeof v === "string") {
      out[k] = k === "survivalCustomTable" ? sanitizeString(v, 4e3) : k === "weatherLadder" ? sanitizeString(v, 320) : sanitizeString(v, 200);
      continue;
    }
  }
  return out;
}
async function loadSettings(userId) {
  const key = userKey(userId);
  const cached = settingsCache.get(key);
  if (cached) return cached;
  const defaults = createDefaultSettings();
  try {
    const stored = await spindle.userStorage.getJson("settings.json", {
      fallback: defaults,
      userId
    });
    const merged = {
      ...defaults,
      ...stored || {},
      defaultModules: {
        ...createDefaultModules(),
        ...stored?.defaultModules || {}
      }
    };
    settingsCache.set(key, merged);
    return merged;
  } catch {
    settingsCache.set(key, defaults);
    return defaults;
  }
}
async function saveSettings(settings, userId) {
  const key = userKey(userId);
  settingsCache.set(key, settings);
  try {
    await spindle.userStorage.setJson("settings.json", settings, { userId });
  } catch (err) {
    spindle.log.warn(`Failed to save settings: ${String(err)}`);
  }
}
async function resolvePersonaName(userId) {
  if (!spindle.permissions.has("personas")) return "Survivor";
  try {
    const active = await spindle.personas.getActive(userId);
    if (active?.name) return active.name;
    const def = await spindle.personas.getDefault(userId);
    if (def?.name) return def.name;
  } catch {
  }
  return "Survivor";
}
async function loadChatData(chatId, userId) {
  const ckey = chatCacheKey(userId, chatId);
  const cached = chatCache.get(ckey);
  if (cached) return cached;
  const settings = await loadSettings(userId);
  const path = `chats/${safeFileSegment(chatId)}.json`;
  try {
    const exists = await spindle.userStorage.exists(path, userId);
    if (exists) {
      const stored = await spindle.userStorage.getJson(path, {
        fallback: null,
        userId
      });
      if (stored && stored.sheet && stored.world) {
        normalizeChatData(stored, settings.defaultModules, settings.xpCurve);
        chatCache.set(ckey, stored);
        return stored;
      }
    }
  } catch (err) {
    spindle.log.warn(`Could not read chat data for ${chatId}: ${String(err)}`);
  }
  const userName = await resolvePersonaName(userId);
  const fresh = createDefaultChatData(chatId, settings.enabledByDefault, userName, settings.defaultModules);
  chatCache.set(ckey, fresh);
  return fresh;
}
async function saveChatData(data, userId) {
  data.updatedAt = Date.now();
  const ckey = chatCacheKey(userId, data.chatId);
  chatCache.set(ckey, data);
  const path = `chats/${safeFileSegment(data.chatId)}.json`;
  try {
    await spindle.userStorage.setJson(path, data, { userId });
  } catch (err) {
    spindle.log.warn(`Failed to save chat ${data.chatId}: ${String(err)}`);
  }
}
function recordSnapshot(data, messageId, swipeId, turnNotices = [], turnRolls = [], choices = null) {
  const key = `${messageId}:${swipeId}`;
  const snap = {
    messageId,
    swipeId,
    timestamp: Date.now(),
    sheet: deepClone(data.sheet),
    world: deepClone(data.world),
    notices: deepClone(turnNotices),
    rolls: deepClone(turnRolls),
    choices: choices ? deepClone(choices) : null
  };
  data.snapshots[key] = snap;
  data.lastSyncedKey = key;
  const keys = Object.keys(data.snapshots);
  if (keys.length > MAX_SNAPSHOTS) {
    keys.sort((a, b) => (data.snapshots[a]?.timestamp || 0) - (data.snapshots[b]?.timestamp || 0));
    for (const oldKey of keys.slice(0, keys.length - MAX_SNAPSHOTS)) {
      delete data.snapshots[oldKey];
    }
  }
}
function refreshLatestSnapshot(data) {
  if (!data.lastSyncedKey) return;
  const snap = data.snapshots[data.lastSyncedKey];
  if (!snap) return;
  snap.sheet = deepClone(data.sheet);
  snap.world = deepClone(data.world);
}
function restoreSnapshot(data, key) {
  const snap = data.snapshots[key];
  if (!snap) return false;
  data.sheet = deepClone(snap.sheet);
  data.world = deepClone(snap.world);
  data.lastSyncedKey = key;
  data.initialized = true;
  normalizeChatData(data);
  return true;
}
function getPermissionFlags() {
  return {
    interceptor: spindle.permissions.has("interceptor"),
    generation: spindle.permissions.has("generation"),
    chats: spindle.permissions.has("chats"),
    chat_mutation: spindle.permissions.has("chat_mutation"),
    characters: spindle.permissions.has("characters"),
    personas: spindle.permissions.has("personas")
  };
}
async function listConnectionsSafe(userId) {
  if (!spindle.permissions.has("generation")) return [];
  try {
    const list = await spindle.connections.list(userId);
    return list.filter((c) => Boolean(c?.id)).map((c) => ({
      id: c.id,
      name: c.name || c.model || c.provider || "Unnamed Connection",
      provider: c.provider || "",
      model: c.model || "",
      isDefault: Boolean(c.is_default)
    }));
  } catch {
    return [];
  }
}
async function pushStateToFrontend(chatId, rawUserId, extra) {
  const userId = rememberUserForChat(chatId, rawUserId);
  const settings = await loadSettings(userId);
  const data = chatId ? await loadChatData(chatId, userId) : null;
  const connections = await listConnectionsSafe(userId);
  const payload = {
    type: "state_update",
    chatId,
    data,
    settings,
    connections,
    permissions: getPermissionFlags(),
    activeConnectionId: activeConnByUser.get(userKey(userId)) || null,
    syncing: chatId ? syncingChats.has(chatCacheKey(userId, chatId)) : false,
    statusNote: extra?.statusNote,
    backupList: extra?.backupList,
    chatLogReport: extra?.chatLogReport,
    promptEstimate: (() => {
      try {
        if (!chatId || !data || !settings) return null;
        const block = buildPromptBlock(data, settings);
        return block ? { chars: block.length, tokens: Math.ceil(block.length / 4) } : { chars: 0, tokens: 0 };
      } catch {
        return null;
      }
    })()
  };
  spindle.sendToFrontend(
    payload,
    userId,
    extra?.frontendSessionId ? { frontendSessionId: extra.frontendSessionId } : void 0
  );
}
function extractTextFromGenerationResult(res) {
  if (typeof res === "string") return res;
  if (!res || typeof res !== "object") return "";
  const obj = res;
  const extractContentValue = (val) => {
    if (typeof val === "string") return val;
    if (Array.isArray(val)) {
      return val.map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          const p = part;
          if (p.type === "text" && typeof p.text === "string") return p.text;
          if (typeof p.text === "string") return p.text;
        }
        return "";
      }).filter(Boolean).join("\n");
    }
    return "";
  };
  const directContent = extractContentValue(obj.content);
  if (directContent) return directContent;
  if (typeof obj.text === "string") return obj.text;
  if (obj.message && typeof obj.message === "object") {
    const mc = extractContentValue(obj.message.content);
    if (mc) return mc;
  }
  if (Array.isArray(obj.choices) && obj.choices.length > 0) {
    const first = obj.choices[0];
    if (first?.message && typeof first.message === "object") {
      const mc = extractContentValue(first.message.content);
      if (mc) return mc;
    }
    if (typeof first?.text === "string") return first.text;
  }
  return "";
}
async function gatherRecentTranscript(chatId, tailCount = 4) {
  if (!spindle.permissions.has("chat_mutation")) {
    return { transcript: "", tailMessageId: null, tailSwipeId: 0, prevMessageKey: null };
  }
  try {
    let msgs = [];
    const supportsLean = Boolean(
      spindle.host?.capabilities?.["chat-lean-messages-v1"]
    );
    if (supportsLean) {
      try {
        msgs = await spindle.chat.getMessages(chatId, {
          tail: tailCount,
          light: true,
          includeExtra: false
        });
      } catch {
        const all = await spindle.chat.getMessages(chatId);
        msgs = all.slice(-tailCount);
      }
    } else {
      const all = await spindle.chat.getMessages(chatId);
      msgs = all.slice(-tailCount);
    }
    if (!msgs || msgs.length === 0) {
      return { transcript: "", tailMessageId: null, tailSwipeId: 0, prevMessageKey: null, tailContent: "", tailIsAi: false };
    }
    const isUserMsg = (m) => typeof m.is_user === "boolean" ? m.is_user : m.role === "user";
    const transcript = msgs.map((m) => `${isUserMsg(m) ? "[PLAYER]" : "[AI]"} ${m.name || ""}: ${m.content || ""}`).join("\n\n");
    const tail = msgs[msgs.length - 1];
    const tailIsAi = !isUserMsg(tail);
    const prevAi = [...msgs.slice(0, -1)].reverse().find((m) => !isUserMsg(m));
    return {
      transcript,
      tailMessageId: tail.id,
      tailSwipeId: tail.swipe_id ?? 0,
      prevMessageKey: prevAi ? `${prevAi.id}:${prevAi.swipe_id ?? 0}` : null,
      tailContent: tailIsAi && typeof tail.content === "string" ? tail.content : "",
      tailIsAi
    };
  } catch (err) {
    spindle.log.warn(`getMessages failed for ${chatId}: ${String(err)}`);
    return { transcript: "", tailMessageId: null, tailSwipeId: 0, prevMessageKey: null, tailContent: "", tailIsAi: false };
  }
}
function todayUtcDate() {
  const d = /* @__PURE__ */ new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
async function runSurvivalRoll(activeChatId, settings, kind, userId) {
  const data = await loadChatData(activeChatId, userId);
  const today = todayUtcDate();
  const counterKey = kind === "scavenge" ? "scavengeCount" : "encounterCount";
  data[counterKey] = (Number.isFinite(Number(data[counterKey])) ? Number(data[counterKey]) : 0) + 1;
  const attempt = data[counterKey];
  const seed = fnv1a(`${kind}:${activeChatId}:${today}:${attempt}`);
  const rng = mulberry32(seed);
  const dc = clamp(Number(settings.survivalDc) || 15, 1, 40);
  const isScavenge = kind === "scavenge";
  const record = performDiceRoll(data.sheet, {
    action: isScavenge ? "Scavenge supplies" : "Scan for threats",
    stat: "wis",
    dc,
    gearBonus: 0,
    skillBonus: 0,
    skillLabel: "",
    mode: "normal",
    who: data.sheet.name,
    rng
  });
  const notices = [];
  const pushNotice = (kind2, title, lines) => notices.push({
    id: makeId("ntc"),
    timestamp: Date.now(),
    kind: kind2,
    title,
    lines
  });
  if (isScavenge) {
    if (record.verdict === "nat 1") {
      record.loot = [];
      record.lootSummary = "";
      pushNotice("warn", "SCAVENGE FAILED", ["Bad luck, worse hands \u2014 you cut yourself on rusted metal.", "The search yields nothing. The next reply will narrate it."]);
    } else if (record.verdict === "fail") {
      record.loot = [];
      record.lootSummary = "";
      pushNotice("change", "SCAVENGE", ["Nothing useful this time \u2014 the search cost time, not supplies."]);
    } else {
      const pool = resolveSurvivalPool(settings);
      if (pool.empty) {
        record.loot = [];
        record.lootSummary = "";
        pushNotice("warn", "SCAVENGE", ["Your custom loot table is empty or unreadable \u2014 nothing to find. Fix it in Settings \u2192 Survival (Loot Tables)."]);
      } else {
        const takes = record.verdict === "nat 20" ? 2 : 1;
        const picked = [];
        for (let i = 0; i < takes; i++) {
          const e = pickWeighted(pool.entries, rng);
          if (!e) break;
          picked.push(e);
        }
        for (const p of picked) {
          addItemToBag(data.sheet, { name: p.name, qty: p.qty, category: p.cat, rarity: p.rarity, note: "scavenged" });
        }
        record.loot = picked.map((p) => ({ name: p.name, qty: p.qty, rarity: p.rarity }));
        record.lootSummary = picked.map((p) => `${p.name}${p.qty > 1 ? ` x${p.qty}` : ""}${p.rarity !== "ordinary" ? ` (${p.rarity})` : ""}`).join(", ");
        pushNotice("item", "SCAVENGED", [`Found: ${record.lootSummary}`, pool.source === "custom" ? "(from your custom table)" : `(from the ${pool.source} table)`]);
        if (pool.rejected > 0) pushNotice("change", "LOOT TABLE", [`${pool.rejected} custom line(s) could not be parsed and were ignored. Format: weight | name | qty | category | rarity`]);
      }
    }
  } else {
    const b = encounterBeat(record.roll);
    record.loot = [];
    record.lootSummary = "";
    pushNotice(b.severity >= 4 ? "warn" : "change", `ENCOUNTER \u2014 ${b.beat.toUpperCase()}`, [b.detail, "The roll is bound \u2014 the next reply will narrate exactly this."]);
  }
  data.rolls.unshift(record);
  if (data.rolls.length > settings.maxHistoryRolls) {
    data.rolls = data.rolls.slice(0, settings.maxHistoryRolls);
  }
  if (notices.length > 0) {
    data.notices = [...notices, ...data.notices || []].slice(0, 15);
  }
  await saveChatData(data, userId);
  const toastMsg = isScavenge ? record.lootSummary ? `Found: ${record.lootSummary}` : `d20=${record.roll} vs DC ${dc}: nothing found` : `Encounter \u2014 ${encounterBeat(record.roll).beat} (${record.verdict})`;
  spindle.toast.info(toastMsg, { title: isScavenge ? "Scavenge" : "Encounter", duration: 6e3, userId });
  await pushStateToFrontend(activeChatId, userId);
}
async function resolveConnectionId(settings, userId) {
  if (settings.sidecarConnectionId && settings.sidecarConnectionId.trim()) {
    return settings.sidecarConnectionId.trim();
  }
  const uiActive = activeConnByUser.get(userKey(userId));
  if (uiActive) return uiActive;
  try {
    const list = await spindle.connections.list(userId);
    const valid = list.filter((c) => Boolean(c?.id && c?.provider));
    const picked = valid.find((c) => c.is_default) || valid.find((c) => c.has_api_key) || valid[0] || list.find((c) => c.is_default) || list[0];
    if (picked?.id) return picked.id;
  } catch {
  }
  return void 0;
}
async function runSidecarLlm(messages, settings, userId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55e3);
  try {
    const connectionId = await resolveConnectionId(settings, userId);
    const quietReq = {
      type: "quiet",
      messages,
      parameters: {
        temperature: 0.15,
        max_tokens: clamp(Number(settings.sidecarMaxTokens) || 2200, 400, 6e3)
      },
      reasoning: { source: "off" },
      signal: controller.signal
    };
    if (userId) quietReq.userId = userId;
    if (connectionId) quietReq.connection_id = connectionId;
    try {
      const result = await spindle.generate.quiet(quietReq);
      return extractTextFromGenerationResult(result);
    } catch (quietErr) {
      if (connectionId) {
        try {
          const rawReq = {
            type: "raw",
            messages,
            connection_id: connectionId,
            parameters: {
              temperature: 0.15,
              max_tokens: clamp(Number(settings.sidecarMaxTokens) || 2200, 400, 6e3)
            },
            reasoning: { source: "off" },
            signal: controller.signal
          };
          if (userId) rawReq.userId = userId;
          const rawResult = await spindle.generate.raw(rawReq);
          return extractTextFromGenerationResult(rawResult);
        } catch {
          throw quietErr;
        }
      }
      const msg = quietErr instanceof Error ? quietErr.message : String(quietErr);
      if (/unknown provider/i.test(msg)) {
        throw new Error(
          "No active LLM connection profile found. Open Settings and select a Sidecar LLM Connection."
        );
      }
      throw quietErr;
    }
  } finally {
    clearTimeout(timer);
  }
}
async function runAiBootstrap(chatId, rawUserId) {
  const userId = rememberUserForChat(chatId, rawUserId);
  if (!spindle.permissions.has("generation")) {
    spindle.toast.warning('Grant the "generation" permission to auto-initialize from your chat.', { userId });
    return;
  }
  const data = await loadChatData(chatId, userId);
  if (!data.modules.system && !data.modules.tracker) {
    spindle.toast.info("Both System and Tracker modules are turned OFF for this chat.", { userId });
    return;
  }
  const ckey = chatCacheKey(userId, chatId);
  if (syncingChats.has(ckey)) return;
  syncingChats.add(ckey);
  await pushStateToFrontend(chatId, userId, { statusNote: "Initializing\u2026" });
  try {
    const settings = await loadSettings(userId);
    let userName = data.sheet.name || "Survivor";
    let personaDesc = "";
    if (spindle.permissions.has("personas")) {
      try {
        const persona = await spindle.personas.getActive(userId) || await spindle.personas.getDefault(userId);
        if (persona) {
          userName = persona.name || userName;
          personaDesc = [persona.title, persona.description].filter(Boolean).join("\n");
        }
      } catch {
      }
    }
    let charName = "World";
    let charDesc = "";
    let scenario = "";
    if (spindle.permissions.has("chats")) {
      try {
        const chatRow = await spindle.chats.get(chatId, userId);
        if (chatRow?.character_id && spindle.permissions.has("characters")) {
          const ch = await spindle.characters.get(chatRow.character_id, userId);
          if (ch) {
            charName = ch.name || charName;
            scenario = ch.scenario || "";
            charDesc = [ch.description, ch.personality, ch.first_mes].filter(Boolean).join("\n\n");
          }
        }
      } catch {
      }
    }
    const { transcript, tailMessageId, tailSwipeId, tailContent } = await gatherRecentTranscript(chatId, 6);
    const promptMsgs = buildInitMessages({
      modules: data.modules,
      userName,
      personaDesc,
      charName,
      charDesc,
      scenario,
      recentTranscript: transcript
    });
    const raw = await runSidecarLlm(promptMsgs, settings, userId);
    addSpend(data, estimateTokensForCall(promptMsgs, raw));
    const delta = parseJsonDelta(raw);
    if (!delta) {
      spindle.toast.warning("Sidecar returned unreadable JSON during init. Try again or pick another sidecar model in Settings.", {
        userId
      });
      return;
    }
    const freshDefaults = createDefaultChatData(chatId, data.enabled, userName, data.modules);
    if (data.modules.system) data.sheet = freshDefaults.sheet;
    if (data.modules.tracker) data.world = freshDefaults.world;
    data.initialized = false;
    const outcome = applyDelta(data, delta, settings);
    if (tailMessageId) {
      recordSnapshot(data, tailMessageId, tailSwipeId, outcome.notices, [], parseChoicesBlock(tailContent));
    }
    await saveChatData(data, userId);
    spindle.toast.success(
      `Initialized${data.modules.system ? ` ${data.sheet.name} (Lv ${data.sheet.level})` : ""}${data.modules.tracker ? ` \xB7 ${data.world.npcs.length} NPC(s)` : ""}.`,
      { userId }
    );
  } catch (err) {
    spindle.log.error(`Bootstrap error: ${String(err)}`);
    spindle.toast.error(`Init failed: ${err instanceof Error ? err.message : String(err)}`, { userId });
  } finally {
    syncingChats.delete(ckey);
    await pushStateToFrontend(chatId, userId);
  }
}
async function runDeltaSync(chatId, rawUserId, opts) {
  const userId = rememberUserForChat(chatId, rawUserId);
  if (!spindle.permissions.has("generation")) {
    if (opts?.manual) {
      spindle.toast.warning('Grant the "generation" permission to sync state automatically.', { userId });
    }
    return;
  }
  const settings = await loadSettings(userId);
  const data = await loadChatData(chatId, userId);
  if (!data.enabled) return;
  if (!data.modules.system && !data.modules.tracker) {
    if (opts?.manual) {
      spindle.toast.info("Both System and Tracker modules are OFF for this chat.", { userId });
    }
    return;
  }
  if (!data.initialized) {
    await runAiBootstrap(chatId, userId);
    return;
  }
  const ckey = chatCacheKey(userId, chatId);
  if (syncingChats.has(ckey)) return;
  syncingChats.add(ckey);
  await pushStateToFrontend(chatId, userId, { statusNote: "Syncing turn\u2026" });
  const usage = { calls: 0, promptTokens: 0, completionTokens: 0 };
  try {
    const { transcript, tailMessageId, tailSwipeId, tailContent, prevMessageKey } = await gatherRecentTranscript(chatId, 4);
    const effectiveMsgId = opts?.messageId || tailMessageId;
    const choices = parseChoicesBlock(tailContent || opts?.fallbackContent || "");
    if (opts?.isSwipeOrRegen && prevMessageKey && data.snapshots[prevMessageKey]) {
      restoreSnapshot(data, prevMessageKey);
    }
    const effectiveTranscript = transcript || (opts?.fallbackContent ? `[AI]: ${opts.fallbackContent}` : "");
    if (!effectiveTranscript.trim()) return;
    const promptMsgs = buildDeltaMessages(data, effectiveTranscript, settings);
    let raw = "";
    let sidecarError = null;
    let delta = null;
    try {
      raw = await runSidecarLlm(promptMsgs, settings, userId);
      const u1 = estimateTokensForCall(promptMsgs, raw);
      usage.calls += 1;
      usage.promptTokens += u1.promptTokens;
      usage.completionTokens += u1.completionTokens;
      delta = parseJsonDelta(raw);
    } catch (err) {
      usage.calls += 1;
      usage.promptTokens += estimateTokensForCall(promptMsgs, "").promptTokens;
      sidecarError = err;
    }
    if (!delta) {
      try {
        const retryMsgs = [
          ...promptMsgs,
          { role: "assistant", content: String(raw || "(empty response)").slice(0, 3e3) },
          { role: "user", content: "That was not valid JSON. Return ONLY the JSON object described above \u2014 no prose, no markdown fences, no commentary. If nothing changed, return {}." }
        ];
        const raw2 = await runSidecarLlm(retryMsgs, settings, userId);
        const u2 = estimateTokensForCall(retryMsgs, raw2);
        usage.calls += 1;
        usage.promptTokens += u2.promptTokens;
        usage.completionTokens += u2.completionTokens;
        delta = parseJsonDelta(raw2);
        if (delta) sidecarError = null;
      } catch (err2) {
        if (!sidecarError) sidecarError = err2;
      }
    }
    if (!delta) {
      if (effectiveMsgId && choices) {
        recordSnapshot(data, effectiveMsgId, tailSwipeId, [], [], choices);
      }
      const errMsg = sidecarError ? `Sidecar call failed: ${sidecarError instanceof Error ? sidecarError.message : String(sidecarError)}` : "Sidecar returned unparseable JSON twice.";
      noteSyncOutcome(data, false, errMsg, usage);
      await saveChatData(data, userId);
      if (opts?.manual) {
        spindle.toast.warning(`Sync failed \u2014 ${errMsg}`, { userId });
      }
      return;
    }
    const outcome = applyDelta(data, delta, settings);
    const resolvedThisTurn = [];
    for (const r of data.rolls) {
      if (!r.consumed) {
        r.consumed = true;
        if (effectiveMsgId) r.messageId = effectiveMsgId;
        resolvedThisTurn.push(r);
      }
    }
    if (effectiveMsgId) {
      recordSnapshot(data, effectiveMsgId, tailSwipeId, outcome.notices, resolvedThisTurn, choices);
    }
    noteSyncOutcome(data, true, void 0, usage);
    await saveChatData(data, userId);
    void maybeAutoBackup(chatId, data, userId, settings);
    if (outcome.leveledUp) {
      spindle.toast.success(
        `${data.sheet.name} reached Level ${outcome.newLevel}! (+${outcome.ptsGained} stat pts, +25% recovery)`,
        { title: "LEVEL UP", duration: 6e3, userId }
      );
    } else if (opts?.manual || resolvedThisTurn.length > 0) {
      spindle.toast.info(outcome.summary, { title: "Synced", duration: 3500, userId });
    }
  } catch (err) {
    spindle.log.error(`Delta sync failed for ${chatId}: ${String(err)}`);
    try {
      if (data && typeof data === "object") {
        noteSyncOutcome(data, false, err instanceof Error ? err.message : String(err), usage);
        await saveChatData(data, userId);
      }
    } catch (saveErr) {
      spindle.log.warn(`Could not persist sync failure state: ${String(saveErr)}`);
    }
    if (opts?.manual) {
      spindle.toast.error(`Sync failed: ${err instanceof Error ? err.message : String(err)}`, { userId });
    }
  } finally {
    syncingChats.delete(ckey);
    await pushStateToFrontend(chatId, userId);
  }
}
function ensureInterceptorRegistered() {
  if (!spindle.permissions.has("interceptor")) {
    if (interceptorDisposer) {
      interceptorDisposer();
      interceptorDisposer = null;
    }
    return;
  }
  if (interceptorDisposer) return;
  interceptorDisposer = spindle.registerInterceptor(
    async (messages, context) => {
      if (!context.chatId) return messages;
      rememberUserForChat(context.chatId, context.userId);
      const dispatchedConnId = context.mainDispatch?.descriptor?.connectionId;
      if (dispatchedConnId && context.userId) {
        activeConnByUser.set(userKey(context.userId), dispatchedConnId);
      }
      if (context.generationType === "quiet" || context.generationType === "impersonate") {
        return messages;
      }
      const settings = await loadSettings(context.userId);
      const data = await loadChatData(context.chatId, context.userId);
      const block = buildPromptBlock(data, settings);
      if (!block) return messages;
      const out = [...messages];
      let insertIdx = out.length;
      for (let i = out.length - 1; i >= 0; i--) {
        if (out[i].role === "user") {
          insertIdx = i;
          break;
        }
      }
      out.splice(insertIdx, 0, { role: "system", content: block });
      return {
        messages: out,
        breakdown: [{ messageIndex: insertIdx, name: "Weft Chronicle State" }]
      };
    },
    40
  );
}
ensureInterceptorRegistered();
spindle.on("PERMISSION_CHANGED", () => {
  ensureInterceptorRegistered();
  for (const [uid, chatId] of activeChatByUser.entries()) {
    void pushStateToFrontend(chatId, uid === "__default__" ? void 0 : uid);
  }
});
spindle.on("CONNECTION_PROFILE_LOADED", (payload, rawUserId) => {
  const obj = payload || {};
  const connId = typeof obj.connectionId === "string" ? obj.connectionId : typeof obj.profileId === "string" ? obj.profileId : typeof obj.id === "string" ? obj.id : null;
  const userId = rememberUserForChat(null, rawUserId);
  if (connId && userId) {
    activeConnByUser.set(userKey(userId), connId);
  }
});
spindle.on("CHAT_SWITCHED", async (payload, rawUserId) => {
  const obj = payload || {};
  const chatId = typeof obj.chatId === "string" ? obj.chatId : typeof obj.id === "string" ? obj.id : null;
  if (!chatId) return;
  const userId = rememberUserForChat(chatId, rawUserId);
  activeChatByUser.set(userKey(userId), chatId);
  await pushStateToFrontend(chatId, userId);
});
spindle.on("CHAT_FORKED", async (payload, rawUserId) => {
  try {
    const userId = rememberUserForChat(payload.sourceChatId, rawUserId);
    rememberUserForChat(payload.forkedChatId, userId);
    const src = await loadChatData(payload.sourceChatId, userId);
    const forked = deepClone(src);
    forked.chatId = payload.forkedChatId;
    const matchKey = Object.keys(src.snapshots).filter((k) => k.startsWith(`${payload.forkedAtMessageId}:`)).sort((a, b) => (src.snapshots[b]?.timestamp || 0) - (src.snapshots[a]?.timestamp || 0))[0];
    if (matchKey) {
      restoreSnapshot(forked, matchKey);
    }
    await saveChatData(forked, userId);
    spindle.log.info(`Copied Weft Chronicle state from ${payload.sourceChatId} to fork ${payload.forkedChatId}`);
  } catch (err) {
    spindle.log.warn(`CHAT_FORKED state copy failed: ${String(err)}`);
  }
});
spindle.on("MESSAGE_SWIPED", async (payload, rawUserId) => {
  if (!payload?.chatId || !payload.message?.id) return;
  const userId = rememberUserForChat(payload.chatId, rawUserId);
  if (payload.action === "navigated") {
    const data = await loadChatData(payload.chatId, userId);
    const key = `${payload.message.id}:${payload.swipeId}`;
    if (restoreSnapshot(data, key)) {
      await saveChatData(data, userId);
      await pushStateToFrontend(payload.chatId, userId, {
        statusNote: `Restored swipe #${payload.swipeId + 1}`
      });
    }
  }
});
spindle.on("MESSAGE_DELETED", async (payload, rawUserId) => {
  const obj = payload || {};
  const chatId = typeof obj.chatId === "string" ? obj.chatId : activeChatByUser.get(userKey(rawUserId));
  if (!chatId) return;
  const userId = rememberUserForChat(chatId, rawUserId);
  const data = await loadChatData(chatId, userId);
  const { tailMessageId, tailSwipeId } = await gatherRecentTranscript(chatId, 2);
  if (tailMessageId) {
    const key = `${tailMessageId}:${tailSwipeId}`;
    if (restoreSnapshot(data, key)) {
      await saveChatData(data, userId);
      await pushStateToFrontend(chatId, userId, { statusNote: "Rewound after delete" });
    }
  }
});
var syncTurnCounterByChat = /* @__PURE__ */ new Map();
var editingUntilByChat = /* @__PURE__ */ new Map();
function nextSyncTurn(chatId) {
  const n = (syncTurnCounterByChat.get(chatId) || 0) + 1;
  syncTurnCounterByChat.set(chatId, n);
  return n;
}
spindle.on("GENERATION_ENDED", async (payload, rawUserId) => {
  if (!payload?.chatId || payload.error) return;
  if (payload.generationType === "impersonate" || payload.generationType === "quiet") return;
  const userId = rememberUserForChat(payload.chatId, rawUserId);
  const settings = await loadSettings(userId);
  const data = await loadChatData(payload.chatId, userId);
  if (!data.enabled) return;
  const editingUntil = editingUntilByChat.get(payload.chatId) || 0;
  if (editingUntil && editingUntil <= Date.now()) editingUntilByChat.delete(payload.chatId);
  const userIsEditing = editingUntil > Date.now();
  const autoSyncWanted = settings.autoSync && (data.modules.system || data.modules.tracker) && !userIsEditing;
  const syncMode = settings.syncMode === "every2" || settings.syncMode === "manual" ? settings.syncMode : "every";
  const dueNow = syncMode === "every" || syncMode === "every2" && nextSyncTurn(payload.chatId) % 2 === 0;
  if (!autoSyncWanted || !dueNow) {
    const resolved = [];
    for (const r of data.rolls) {
      if (!r.consumed) {
        r.consumed = true;
        if (payload.messageId) r.messageId = payload.messageId;
        resolved.push(r);
      }
    }
    const choicesOnly = payload.messageId ? parseChoicesBlock(payload.content || "") : null;
    if (resolved.length > 0 || choicesOnly) {
      if (payload.messageId) {
        let swipeId = 0;
        try {
          const msgs = await spindle.chat.getMessages(payload.chatId);
          const m = (Array.isArray(msgs) ? msgs : []).find((x) => x && x.id === payload.messageId);
          if (m && Number.isFinite(m.swipe_id)) swipeId = m.swipe_id;
        } catch {
        }
        recordSnapshot(data, payload.messageId, swipeId, [], resolved, choicesOnly);
      }
      await saveChatData(data, userId);
      await pushStateToFrontend(payload.chatId, userId);
    }
    return;
  }
  const isSwipeOrRegen = payload.generationType === "swipe" || payload.generationType === "regenerate";
  void runDeltaSync(payload.chatId, userId, {
    messageId: payload.messageId,
    fallbackContent: payload.content,
    isSwipeOrRegen,
    manual: false
  });
});
spindle.onFrontendMessage(async (rawPayload, userId, frontendSessionId) => {
  if (!rawPayload || typeof rawPayload !== "object") return;
  const msg = rawPayload;
  const type = typeof msg.type === "string" ? msg.type : "";
  const reqChatId = typeof msg.chatId === "string" && msg.chatId ? msg.chatId : null;
  const activeChatId = reqChatId || activeChatByUser.get(userKey(userId)) || null;
  if (reqChatId) {
    activeChatByUser.set(userKey(userId), reqChatId);
    rememberUserForChat(reqChatId, userId);
  } else {
    rememberUserForChat(null, userId);
  }
  if (typeof msg.activeConnectionId === "string" && msg.activeConnectionId.trim()) {
    activeConnByUser.set(userKey(userId), msg.activeConnectionId.trim());
  }
  try {
    switch (type) {
      case "bootstrap": {
        let resolvedChatId = activeChatId;
        if (!resolvedChatId && spindle.permissions.has("chats")) {
          try {
            const active = await spindle.chats.getActive(userId);
            if (active?.id) {
              resolvedChatId = active.id;
              activeChatByUser.set(userKey(userId), active.id);
              rememberUserForChat(active.id, userId);
            }
          } catch {
          }
        }
        await pushStateToFrontend(resolvedChatId, userId, { frontendSessionId });
        return;
      }
      case "update_settings": {
        const patch = sanitizeSettingsPatch(msg.patch || {});
        const current = await loadSettings(userId);
        const next = {
          ...current,
          ...patch,
          defaultModules: {
            ...current.defaultModules,
            ...patch.defaultModules || {}
          }
        };
        await saveSettings(next, userId);
        await pushStateToFrontend(activeChatId, userId, { statusNote: "Settings saved" });
        return;
      }
      case "toggle_chat_enabled": {
        if (!activeChatId) return;
        const data = await loadChatData(activeChatId, userId);
        data.enabled = Boolean(msg.enabled);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "toggle_module": {
        if (!activeChatId) return;
        const mod = msg.module;
        if (mod !== "system" && mod !== "tracker" && mod !== "dice" && mod !== "choices") return;
        const data = await loadChatData(activeChatId, userId);
        data.modules[mod] = Boolean(msg.enabled);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId, {
          statusNote: `${mod[0].toUpperCase() + mod.slice(1)} ${data.modules[mod] ? "ON" : "OFF"}`
        });
        return;
      }
      case "allocate_stat": {
        if (!activeChatId) return;
        const stat = msg.stat;
        const amount = typeof msg.amount === "number" ? msg.amount : 1;
        const data = await loadChatData(activeChatId, userId);
        const res = allocateStatPoint(data.sheet, stat, amount);
        if (!res.ok) {
          spindle.toast.warning(res.reason || "Cannot allocate stat.", { userId });
          return;
        }
        data.initialized = true;
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "auto_allocate": {
        if (!activeChatId) return;
        const settings = await loadSettings(userId);
        const data = await loadChatData(activeChatId, userId);
        const note = autoAllocateAllPoints(data.sheet, settings.allocPriority);
        data.initialized = true;
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId, { statusNote: note });
        return;
      }
      case "update_stat": {
        if (!activeChatId) return;
        const stat = msg.stat;
        const value = Number(msg.value);
        if (!Number.isFinite(value)) return;
        const data = await loadChatData(activeChatId, userId);
        data.sheet.stats[stat] = clamp(value, 1, 99);
        recomputeSheetPools(data.sheet, { raiseCurrentByMaxDelta: true });
        data.initialized = true;
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "adjust_pool": {
        if (!activeChatId) return;
        const pool = msg.pool;
        const deltaVal = Number(msg.delta);
        if (!Number.isFinite(deltaVal)) return;
        const data = await loadChatData(activeChatId, userId);
        if (pool === "hp") data.sheet.hp = clamp(data.sheet.hp + deltaVal, 0, data.sheet.hpMax);
        if (pool === "sp") data.sheet.sp = clamp(data.sheet.sp + deltaVal, 0, data.sheet.spMax);
        if (pool === "mp") data.sheet.mp = clamp(data.sheet.mp + deltaVal, 0, data.sheet.mpMax);
        data.initialized = true;
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "rest": {
        if (!activeChatId) return;
        const kind = msg.kind === "long" ? "long" : "short";
        const settings = await loadSettings(userId);
        const data = await loadChatData(activeChatId, userId);
        applyDelta(data, { sheet: { rest: kind } }, settings);
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId, {
          statusNote: kind === "long" ? "Long rest applied" : "Short rest applied"
        });
        return;
      }
      case "add_xp": {
        if (!activeChatId) return;
        const amount = Number(msg.amount);
        if (!Number.isFinite(amount) || amount <= 0) return;
        const settings = await loadSettings(userId);
        const data = await loadChatData(activeChatId, userId);
        const outcome = applyDelta(data, { sheet: { xpGain: Math.floor(amount) } }, { ...settings, trackXp: true });
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        if (outcome.leveledUp) {
          spindle.toast.success(`LEVEL UP! ${data.sheet.name} is now Lv ${outcome.newLevel} (+${outcome.ptsGained} pts).`, {
            title: "LEVEL UP",
            userId
          });
        }
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "set_chat_theme": {
        if (!activeChatId) return;
        const data = await loadChatData(activeChatId, userId);
        const next = sanitizeThemeId(msg.theme);
        data.themeOverride = next;
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId, { statusNote: next ? `Chat theme: ${next}` : "Chat theme: follows global" });
        return;
      }
      case "set_editing": {
        if (!activeChatId) return;
        if (msg.editing) {
          const until = Number(msg.until);
          const clamped = Number.isFinite(until) ? Math.min(until, Date.now() + 5 * 60 * 1e3) : Date.now() + 9e4;
          editingUntilByChat.set(activeChatId, clamped);
        } else {
          editingUntilByChat.delete(activeChatId);
        }
        return;
      }
      case "dismiss_notice": {
        if (!activeChatId) return;
        const ids = Array.isArray(msg.ids) ? msg.ids.map((x) => sanitizeString(String(x), 48)).filter(Boolean) : typeof msg.ids === "string" ? msg.ids.split(",").map((s) => s.trim()).filter(Boolean) : [sanitizeString(String(msg.id || ""), 48)].filter(Boolean);
        if (ids.length === 0) return;
        const data = await loadChatData(activeChatId, userId);
        const before = data.notices.length;
        data.notices = data.notices.filter((n) => !ids.includes(n.id));
        if (data.notices.length !== before) await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "clear_notices": {
        if (!activeChatId) return;
        const data = await loadChatData(activeChatId, userId);
        data.notices = [];
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "update_identity": {
        if (!activeChatId) return;
        const patch = msg.patch || {};
        const data = await loadChatData(activeChatId, userId);
        const s = data.sheet;
        if (typeof patch.name === "string") s.name = sanitizeString(patch.name, 60) || s.name;
        if (typeof patch.race === "string") s.race = sanitizeString(patch.race, 60);
        if (typeof patch.cls === "string") s.cls = sanitizeString(patch.cls, 60);
        if (typeof patch.subcls === "string") s.subcls = sanitizeString(patch.subcls, 60);
        if (typeof patch.rank === "string") s.rank = sanitizeString(patch.rank, 40);
        if (typeof patch.guild === "string") s.guild = sanitizeString(patch.guild, 60);
        if (typeof patch.title === "string") s.title = sanitizeString(patch.title, 60);
        if (typeof patch.cash === "string") s.cash = sanitizeString(patch.cash, 60);
        if (typeof patch.useMp === "boolean") s.useMp = patch.useMp;
        if (typeof patch.mpLabel === "string" && patch.mpLabel.trim()) s.mpLabel = sanitizeString(patch.mpLabel, 24) || "MP";
        if (patch.statLabels && typeof patch.statLabels === "object") {
          const next = {};
          for (const k of STAT_KEYS) {
            const v = typeof patch.statLabels[k] === "string" ? patch.statLabels[k].trim().slice(0, 24) : "";
            next[k] = v || DEFAULT_STAT_LABELS[k];
          }
          s.statLabels = next;
        }
        if (typeof patch.level === "number" && Number.isFinite(patch.level)) {
          s.level = clamp(patch.level, 1, 999);
          recomputeSheetPools(s, { raiseCurrentByMaxDelta: true });
        }
        if (typeof patch.pts === "number" && Number.isFinite(patch.pts)) {
          s.pts = clamp(patch.pts, 0, 999);
        }
        data.initialized = true;
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "add_item": {
        if (!activeChatId) return;
        const item = msg.item || {};
        if (!item.name?.trim()) return;
        const data = await loadChatData(activeChatId, userId);
        addItemToBag(data.sheet, {
          name: item.name.trim(),
          category: item.category || "misc",
          rarity: item.rarity || "ordinary",
          qty: item.qty || 1,
          note: item.note || ""
        });
        if (item.equip) {
          const added = data.sheet.bag.find((x) => x.name.toLowerCase() === item.name.trim().toLowerCase());
          if (added) equipItem(data.sheet, added.id);
        }
        data.initialized = true;
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "update_item": {
        if (!activeChatId) return;
        const item = msg.item || {};
        if (!item.id || !item.name?.trim()) return;
        const data = await loadChatData(activeChatId, userId);
        const existing = data.sheet.bag.find((x) => x.id === item.id);
        if (!existing) return;
        existing.name = item.name.trim();
        if (item.category) existing.category = item.category;
        if (item.rarity) existing.rarity = item.rarity;
        if (typeof item.qty === "number" && Number.isFinite(item.qty)) {
          existing.qty = clamp(item.qty, 1, 9999);
        }
        if (item.note !== void 0) existing.note = item.note.trim();
        if (item.equip) equipItem(data.sheet, existing.id);
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "remove_item": {
        if (!activeChatId) return;
        const id = String(msg.id || "");
        const qty = typeof msg.qty === "number" ? msg.qty : 1;
        const data = await loadChatData(activeChatId, userId);
        removeItemFromBag(data.sheet, id, qty);
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "equip_item": {
        if (!activeChatId) return;
        const data = await loadChatData(activeChatId, userId);
        equipItem(data.sheet, String(msg.id || ""));
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "unequip_slot": {
        if (!activeChatId) return;
        const slot = msg.slot;
        const data = await loadChatData(activeChatId, userId);
        unequipSlot(data.sheet, slot);
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "add_effect": {
        if (!activeChatId) return;
        const ef = msg.effect || {};
        if (!ef.name?.trim()) return;
        const data = await loadChatData(activeChatId, userId);
        data.sheet.effects.push({
          id: makeId("fx"),
          name: ef.name.trim(),
          kind: ef.kind || "neutral",
          duration: typeof ef.duration === "number" ? ef.duration : null,
          note: ef.note || ""
        });
        data.initialized = true;
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "remove_effect": {
        if (!activeChatId) return;
        const id = String(msg.id || "");
        const data = await loadChatData(activeChatId, userId);
        data.sheet.effects = data.sheet.effects.filter((e) => e.id !== id);
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "add_skill": {
        if (!activeChatId) return;
        const sk = msg.skill || {};
        if (!sk.name?.trim()) return;
        const data = await loadChatData(activeChatId, userId);
        data.sheet.skills.push({
          id: makeId("sk"),
          name: sanitizeString(sk.name, 80),
          cost: sanitizeString(sk.cost, 60),
          note: sanitizeString(sk.note, 200),
          bonus: clamp(Number(sk.bonus) || 0, -2, 10)
        });
        data.initialized = true;
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "remove_skill": {
        if (!activeChatId) return;
        const id = String(msg.id || "");
        const data = await loadChatData(activeChatId, userId);
        data.sheet.skills = data.sheet.skills.filter((s) => s.id !== id);
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "upsert_quest": {
        if (!activeChatId) return;
        const q = msg.quest || {};
        if (!q.title?.trim()) return;
        const data = await loadChatData(activeChatId, userId);
        const existing = q.id ? data.sheet.quests.find((x) => x.id === q.id) : null;
        if (existing) {
          existing.title = q.title.trim();
          if (q.kind) existing.kind = q.kind;
          if (q.status) existing.status = q.status;
          if (q.reward !== void 0) existing.reward = q.reward;
          if (q.penalty !== void 0) existing.penalty = q.penalty;
          if (Array.isArray(q.objectives)) existing.objectives = q.objectives;
        } else {
          data.sheet.quests.push({
            id: makeId("q"),
            title: q.title.trim(),
            kind: q.kind || "side",
            status: q.status || "active",
            objectives: Array.isArray(q.objectives) ? q.objectives : [],
            reward: q.reward || "",
            penalty: q.penalty || ""
          });
        }
        data.initialized = true;
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "toggle_objective": {
        if (!activeChatId) return;
        const qid = String(msg.questId || "");
        const oid = String(msg.objectiveId || "");
        const data = await loadChatData(activeChatId, userId);
        const quest = data.sheet.quests.find((x) => x.id === qid);
        const obj = quest?.objectives.find((o) => o.id === oid);
        if (obj) obj.done = !obj.done;
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "remove_quest": {
        if (!activeChatId) return;
        const id = String(msg.id || "");
        const data = await loadChatData(activeChatId, userId);
        data.sheet.quests = data.sheet.quests.filter((q) => q.id !== id);
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "update_world": {
        if (!activeChatId) return;
        const patch = msg.patch || {};
        const data = await loadChatData(activeChatId, userId);
        if (typeof patch.location === "string") data.world.location = patch.location.trim();
        if (typeof patch.time === "string") data.world.time = patch.time.trim();
        if (typeof patch.weather === "string") data.world.weather = patch.weather.trim();
        if (typeof patch.mood === "string") data.world.mood = patch.mood.trim();
        if (typeof patch.arc === "string") data.world.arc = patch.arc.trim();
        if (typeof patch.phase === "string") data.world.phase = patch.phase.trim();
        if (typeof patch.notes === "string") data.world.notes = patch.notes.trim();
        if (typeof patch.dayCount === "number" && Number.isFinite(patch.dayCount)) {
          data.world.dayCount = clamp(patch.dayCount, 1, 99999);
        }
        if (patch.pc && typeof patch.pc === "object") {
          const pc = data.world.pc && typeof data.world.pc === "object" ? data.world.pc : data.world.pc = { outfit: "", pos: "", cond: "", carry: "" };
          for (const k of ["outfit", "pos", "cond", "carry"]) {
            if (typeof patch.pc[k] === "string") pc[k] = sanitizeString(patch.pc[k], 160);
          }
        }
        data.initialized = true;
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "upsert_npc": {
        if (!activeChatId) return;
        const npc = msg.npc || {};
        if (!npc.name?.trim()) return;
        const data = await loadChatData(activeChatId, userId);
        const existing = npc.id ? data.world.npcs.find((n) => n.id === npc.id) : data.world.npcs.find((n) => n.name.toLowerCase() === npc.name.trim().toLowerCase());
        if (existing) {
          existing.name = npc.name.trim();
          if (npc.role !== void 0) existing.role = npc.role;
          if (npc.present !== void 0) existing.present = Boolean(npc.present);
          if (npc.location !== void 0) existing.location = npc.location;
          if (npc.mood !== void 0) existing.mood = npc.mood;
          if (npc.attitude !== void 0) existing.attitude = npc.attitude;
          if (typeof npc.bond === "number") {
            existing.bond = clamp(npc.bond, 0, 100);
            existing.relationship = clamp(existing.bond * 2 - 100, -100, 100);
          } else if (typeof npc.relationship === "number") {
            existing.relationship = clamp(npc.relationship, -100, 100);
            existing.bond = clamp(Math.round((existing.relationship + 100) / 2), 0, 100);
          }
          if (typeof npc.spark === "number") existing.spark = clamp(npc.spark, 0, 100);
          if (typeof npc.heat === "number") existing.heat = clamp(npc.heat, 0, 100);
          if (npc.goal !== void 0) existing.goal = npc.goal;
          if (npc.secret !== void 0) existing.secret = npc.secret;
          if (npc.lastThought !== void 0) existing.lastThought = npc.lastThought;
        } else {
          const bond = typeof npc.bond === "number" ? clamp(npc.bond, 0, 100) : 50;
          data.world.npcs.push({
            id: makeId("npc"),
            name: npc.name.trim(),
            role: npc.role || "",
            present: npc.present ?? true,
            location: npc.location || data.world.location,
            mood: npc.mood || npc.attitude || "Guarded",
            attitude: npc.attitude || npc.mood || "Wary",
            bond,
            relationship: clamp(bond * 2 - 100, -100, 100),
            spark: clamp(npc.spark ?? 15, 0, 100),
            heat: clamp(npc.heat ?? 15, 0, 100),
            goal: npc.goal || "",
            secret: npc.secret || "",
            lastThought: npc.lastThought || ""
          });
        }
        data.initialized = true;
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "remove_npc": {
        if (!activeChatId) return;
        const id = String(msg.id || "");
        const data = await loadChatData(activeChatId, userId);
        data.world.npcs = data.world.npcs.filter((n) => n.id !== id);
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "upsert_thread": {
        if (!activeChatId) return;
        const th = msg.thread || {};
        if (!th.title?.trim()) return;
        const data = await loadChatData(activeChatId, userId);
        const existing = th.id ? data.world.threads.find((t) => t.id === th.id) : null;
        if (existing) {
          existing.title = sanitizeString(th.title, 160);
          if (th.status) existing.status = sanitizeString(th.status, 30).toLowerCase();
          if (th.detail !== void 0) existing.detail = sanitizeString(th.detail, 500);
          if (th.kind === "timer") {
            existing.kind = "timer";
            existing.turnsLeft = clamp(Number(th.turnsLeft) || 1, 0, 99);
          }
        } else {
          const entry = {
            id: makeId("th"),
            title: sanitizeString(th.title, 160),
            status: sanitizeString(th.status, 30).toLowerCase() || "active",
            detail: sanitizeString(th.detail, 500)
          };
          if (th.kind === "timer") {
            entry.kind = "timer";
            entry.turnsLeft = clamp(Number(th.turnsLeft) || 1, 1, 99);
          }
          data.world.threads.push(entry);
        }
        if (data.world.threads.length > 14) data.world.threads = data.world.threads.slice(-14);
        data.initialized = true;
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "remove_thread": {
        if (!activeChatId) return;
        const id = String(msg.id || "");
        const data = await loadChatData(activeChatId, userId);
        data.world.threads = data.world.threads.filter((t) => t.id !== id);
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "roll_dice": {
        if (!activeChatId) return;
        const settings = await loadSettings(userId);
        const data = await loadChatData(activeChatId, userId);
        const record = performDiceRoll(data.sheet, {
          action: (typeof msg.action === "string" ? msg.action.trim().slice(0, 160) : "") || "Attempt check",
          stat: msg.stat,
          dc: typeof msg.dc === "number" && Number.isFinite(msg.dc) ? msg.dc : 15,
          gearBonus: typeof msg.gearBonus === "number" && Number.isFinite(msg.gearBonus) ? msg.gearBonus : 0,
          skillBonus: typeof msg.skillBonus === "number" && Number.isFinite(msg.skillBonus) ? msg.skillBonus : 0,
          skillLabel: typeof msg.skillLabel === "string" ? msg.skillLabel.slice(0, 60) : "",
          mode: typeof msg.mode === "string" ? msg.mode : "normal",
          who: typeof msg.who === "string" && msg.who.trim() ? msg.who.trim().slice(0, 60) : data.sheet.name
        });
        data.rolls.unshift(record);
        if (data.rolls.length > settings.maxHistoryRolls) {
          data.rolls = data.rolls.slice(0, settings.maxHistoryRolls);
        }
        await saveChatData(data, userId);
        spindle.toast.info(
          `d20=${record.roll} \u2192 Total ${record.total} vs DC ${record.dc}: ${record.verdict.toUpperCase()}`,
          { title: `Roll \xB7 ${record.action}`, duration: 5e3, userId }
        );
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "contest_roll": {
        if (!activeChatId) return;
        const settings = await loadSettings(userId);
        const data = await loadChatData(activeChatId, userId);
        const npcName = sanitizeString(msg.opponent, 60);
        const npc = (data.world.npcs || []).find((n) => n.present && n.name.toLowerCase() === npcName.toLowerCase());
        if (!npc) {
          spindle.toast.warning("No present NPC by that name.", { userId });
          return;
        }
        const foeBonus = clamp(typeof msg.foeBonus === "number" && Number.isFinite(msg.foeBonus) ? msg.foeBonus : 3, -5, 10);
        const action = (typeof msg.action === "string" ? msg.action.trim().slice(0, 160) : "") || "Contested check";
        const dc = typeof msg.dc === "number" && Number.isFinite(msg.dc) ? clamp(msg.dc, 1, 40) : 15;
        const record = performDiceRoll(data.sheet, {
          action,
          stat: msg.stat,
          dc,
          gearBonus: typeof msg.gearBonus === "number" && Number.isFinite(msg.gearBonus) ? msg.gearBonus : 0,
          skillBonus: typeof msg.skillBonus === "number" && Number.isFinite(msg.skillBonus) ? msg.skillBonus : 0,
          skillLabel: typeof msg.skillLabel === "string" ? msg.skillLabel.slice(0, 60) : "",
          mode: typeof msg.mode === "string" ? msg.mode : "normal",
          who: data.sheet.name
        });
        const foeD20 = fairD20();
        const foeTotal = foeD20 + foeBonus;
        let verdict;
        if (record.roll === 20 || record.total > foeTotal) verdict = "win";
        else if (record.roll === 1 || record.total < foeTotal) verdict = "lose";
        else verdict = "tie";
        record.verdict = verdict;
        record.contestFoe = { name: npc.name, roll: foeD20, bonus: foeBonus, total: foeTotal };
        const foeRecord = {
          id: makeId("roll"),
          timestamp: record.timestamp,
          who: npc.name,
          action: `Opposes: ${action}`.slice(0, 160),
          stat: "none",
          statValue: 5,
          statMod: foeBonus,
          gearBonus: 0,
          skillBonus: 0,
          skillLabel: "",
          mode: "normal",
          advRoll: null,
          roll: foeD20,
          total: foeTotal,
          dc,
          verdict: verdict === "win" ? "fail" : "success",
          consumed: true,
          contestFoeOf: record.id
        };
        data.rolls.unshift(foeRecord);
        data.rolls.unshift(record);
        if (data.rolls.length > settings.maxHistoryRolls) {
          data.rolls = data.rolls.slice(0, settings.maxHistoryRolls);
        }
        await saveChatData(data, userId);
        spindle.toast.info(
          `${data.sheet.name} ${record.total} vs ${npc.name} ${foeTotal}: ${verdict.toUpperCase()}`,
          { title: `Contest \xB7 ${action}`, duration: 5e3, userId }
        );
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "chat_log_report": {
        if (!activeChatId) return;
        let messages = [];
        try {
          messages = await spindle.chat.getMessages(activeChatId);
        } catch (err) {
          spindle.toast.error("Could not read the chat log.", { userId });
          return;
        }
        const report = scanChatLog(Array.isArray(messages) ? messages : []);
        await pushStateToFrontend(activeChatId, userId, { chatLogReport: report });
        return;
      }
      case "import_chatlog": {
        if (!activeChatId) return;
        let messages = [];
        try {
          messages = await spindle.chat.getMessages(activeChatId);
        } catch (err) {
          spindle.toast.error("Could not read the chat log.", { userId });
          return;
        }
        const msgs = Array.isArray(messages) ? messages : [];
        const lastStatus = findLastTaggedBlock(msgs, /<Status\b[^>]*>([\s\S]*?)<\/Status>/i);
        const lastWorld = findLastTaggedBlock(msgs, /<World_State\b[^>]*>([\s\S]*?)<\/World_State>/i);
        if (!lastStatus && !lastWorld) {
          spindle.toast.warning("No <Status> or <World_State> blocks found in this chat log.", { userId });
          return;
        }
        const data = await loadChatData(activeChatId, userId);
        const importSettings = await loadSettings(userId);
        await maybeAutoBackup(activeChatId, data, userId, importSettings, { force: true });
        if (lastStatus) {
          const rawSheet = parseStatusBlock(lastStatus.inner);
          const merged = { ...data.sheet, ...rawSheet };
          for (const k of ["hp", "sp", "mp"]) if (rawSheet[k] === void 0) delete merged[k];
          data.sheet = sanitizeSheet(merged);
        }
        if (lastWorld) {
          const rawWorld = parseWorldStateBlock(lastWorld.inner);
          data.world = sanitizeWorld(rawWorld);
        }
        data.initialized = true;
        data.lastSyncedKey = null;
        normalizeChatData(data, importSettings.defaultModules, importSettings.xpCurve);
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        const bits = [];
        if (lastStatus) bits.push(`Lv ${data.sheet.level} ${data.sheet.name}`);
        if (lastWorld) bits.push(`${data.world.npcs.length} NPC${data.world.npcs.length === 1 ? "" : "s"}, Day ${data.world.dayCount}`);
        spindle.toast.success(`Imported from chat log: ${bits.join(" \xB7 ") || "state"}.`, { title: "Chat Log Import", duration: 6e3, userId });
        await pushStateToFrontend(activeChatId, userId, { statusNote: "Imported from chat log" });
        return;
      }
      case "scavenge_roll": {
        if (!activeChatId) return;
        const settings = await loadSettings(userId);
        if (!settings.survivalEnabled) {
          spindle.toast.warning("Enable Survival (Loot & Encounters) in Settings \u2192 Survival first.", { userId });
          return;
        }
        await runSurvivalRoll(activeChatId, settings, "scavenge", userId);
        return;
      }
      case "encounter_roll": {
        if (!activeChatId) return;
        const settings = await loadSettings(userId);
        if (!settings.survivalEnabled) {
          spindle.toast.warning("Enable Survival (Loot & Encounters) in Settings \u2192 Survival first.", { userId });
          return;
        }
        await runSurvivalRoll(activeChatId, settings, "encounter", userId);
        return;
      }
      case "clear_pending_rolls": {
        if (!activeChatId) return;
        const data = await loadChatData(activeChatId, userId);
        for (const r of data.rolls) r.consumed = true;
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "clear_roll_history": {
        if (!activeChatId) return;
        const data = await loadChatData(activeChatId, userId);
        data.rolls = [];
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "init_from_ai": {
        if (!activeChatId) return;
        void runAiBootstrap(activeChatId, userId);
        return;
      }
      case "sync_now": {
        if (!activeChatId) return;
        void runDeltaSync(activeChatId, userId, { manual: true });
        return;
      }
      case "reset_chat": {
        if (!activeChatId) return;
        const settings = await loadSettings(userId);
        const userName = await resolvePersonaName(userId);
        const fresh = createDefaultChatData(
          activeChatId,
          settings.enabledByDefault,
          userName,
          settings.defaultModules
        );
        const resetCurrent = await loadChatData(activeChatId, userId);
        await maybeAutoBackup(activeChatId, resetCurrent, userId, settings, { force: true });
        await saveChatData(fresh, userId);
        await pushStateToFrontend(activeChatId, userId, { statusNote: "Chat state reset" });
        return;
      }
      case "choice_claim": {
        if (!activeChatId) return;
        const key = typeof msg.key === "string" ? msg.key : "";
        const index = Number(msg.index);
        const data = await loadChatData(activeChatId, userId);
        const snap = data.snapshots?.[key];
        if (!snap || !snap.choices || !Array.isArray(snap.choices.options)) return;
        if (!Number.isInteger(index) || index < 0 || index >= snap.choices.options.length) return;
        if (!Array.isArray(snap.choices.claimed)) snap.choices.claimed = [];
        if (!snap.choices.claimed.includes(index)) {
          snap.choices.claimed.push(index);
          await saveChatData(data, userId);
        }
        await pushStateToFrontend(activeChatId, userId, {
          statusNote: `Choice sent: ${String(snap.choices.options[index]?.text || "").slice(0, 80)}`
        });
        return;
      }
      case "choice_feedback": {
        if (!activeChatId) return;
        const kind = typeof msg.kind === "string" ? msg.kind : "";
        if (kind === "copied") {
          spindle.toast.info("Choice copied to the clipboard \u2014 paste it into the composer and press Send.", { userId });
        } else if (kind === "busy") {
          spindle.toast.warning("A generation is still running \u2014 try the choice again when it finishes.", { userId });
        } else if (kind === "error") {
          spindle.toast.error("Could not send or copy the choice. Check the composer and try again.", { userId });
        }
        return;
      }
      case "import_json": {
        if (!activeChatId) return;
        const raw = typeof msg.json === "string" ? msg.json : "";
        if (raw.length > MAX_IMPORT_BYTES) {
          spindle.toast.error("Backup is too large to import.", { userId });
          return;
        }
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          spindle.toast.error("Backup is not valid JSON.", { userId });
          return;
        }
        const state = sanitizeImportedState(parsed);
        if (!state) {
          spindle.toast.error("Invalid Weft Chronicle backup (missing sheet/world).", { userId });
          return;
        }
        const data = await loadChatData(activeChatId, userId);
        const importSettings = await loadSettings(userId);
        await maybeAutoBackup(activeChatId, data, userId, importSettings, { force: true });
        data.sheet = state.sheet;
        data.world = state.world;
        data.rolls = state.rolls;
        if (state.notices.length > 0) data.notices = state.notices;
        data.initialized = true;
        normalizeChatData(data);
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        spindle.toast.success("Imported Weft Chronicle state.", { userId });
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
      case "list_backups": {
        if (!activeChatId) return;
        let files = [];
        try {
          const prefix = `chats/backups/${safeFileSegment(activeChatId)}/`;
          files = (await spindle.userStorage.list(prefix, userId)).filter((f) => String(f).endsWith(".json"));
        } catch {
          files = [];
        }
        const backups = files.map((f) => {
          const m = String(f).match(/(\d{10,})\.json$/);
          const ts = m ? Number(m[1]) : 0;
          return { path: String(f), ts };
        }).filter((b) => b.ts > 0).sort((a, b) => b.ts - a.ts).slice(0, 5);
        await pushStateToFrontend(activeChatId, userId, { backupList: backups });
        return;
      }
      case "restore_backup": {
        if (!activeChatId) return;
        const path = typeof msg.path === "string" ? msg.path : "";
        const prefix = `chats/backups/${safeFileSegment(activeChatId)}/`;
        if (!path.startsWith(prefix) || !path.endsWith(".json")) {
          spindle.toast.error("That backup path is outside this chat.", { userId });
          return;
        }
        let parsed;
        try {
          parsed = await spindle.userStorage.getJson(path, { fallback: null, userId });
        } catch {
          spindle.toast.error("Could not read that backup.", { userId });
          return;
        }
        const state = sanitizeImportedState(parsed);
        if (!state) {
          spindle.toast.error("Backup is not a valid Weft Chronicle state.", { userId });
          return;
        }
        const data = await loadChatData(activeChatId, userId);
        data.sheet = state.sheet;
        data.world = state.world;
        data.rolls = state.rolls;
        if (state.notices.length > 0) data.notices = state.notices;
        data.initialized = true;
        normalizeChatData(data);
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        spindle.toast.success("Restored Weft Chronicle backup.", { userId });
        await pushStateToFrontend(activeChatId, userId);
        return;
      }
    }
  } catch (err) {
    spindle.log.error(`RPC ${type} failed: ${String(err)}`);
    spindle.toast.error(`Action failed: ${err instanceof Error ? err.message : String(err)}`, { userId });
  }
});
spindle.log.info("Weft Chronicle v2 backend initialized.");
