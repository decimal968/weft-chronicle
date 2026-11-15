/*! src/backend/engine.ts */
export var DEFAULT_WEATHER_LADDER = "Clear, Windy, Overcast, Fog, Rain, Storm, Snow";
export var STAT_KEYS = ["str", "dex", "int", "cha", "con", "wis"];
export var DEFAULT_STAT_LABELS = {
  str: "STR",
  dex: "DEX",
  int: "INT",
  cha: "CHA",
  con: "CON",
  wis: "WIS"
};
export function makeId(prefix = "id") {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    const buf = new Uint32Array(2);
    cryptoObj.getRandomValues(buf);
    const rand = (buf[0].toString(36) + buf[1].toString(36)).slice(0, 10);
    return `${prefix}_${Date.now().toString(36)}_${rand}`;
  }
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}
export function clamp(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}
export function statModifier(value) {
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
interface PoolsOptions {
  xpCurve?: "flat" | "lifted" | string;
  fillToMax?: boolean;
  raiseCurrentByMaxDelta?: boolean;
}
interface PoolsInput {
  level: number;
  stats: { con: number; int: number; [key: string]: number };
}
interface SheetLike extends PoolsInput {
  hp: number; hpMax: number;
  sp: number; spMax: number;
  mp: number; mpMax: number;
  xpNext: number;
  [key: string]: unknown;
}
export function formatMod(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}
export function computePools(sheet: PoolsInput, opts: PoolsOptions = {}): { hpMax: number; spMax: number; mpMax: number; xpNext: number } {
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
export function recomputeSheetPools(sheet: SheetLike, opts: PoolsOptions = {}): SheetLike {
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
export function createDefaultModules() {
  return { system: true, tracker: true, dice: true, choices: true };
}
export function createDefaultSettings() {
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
    // "below" (sibling after the message row) is the most robust across hosts;
    // "inside" injection broke layouts on Hermitcrab/Lumiverse.
    inlinePlacement: "below",
    injectChoicePrompt: true,
    trackerShowBond: true,
    trackerShowSpark: true,
    trackerShowHeat: true,
    trackerShowThought: true,
    trackerShowSecret: true,
    heatDisplay: "always",
    maxHistoryRolls: 30,
    transcriptCap: 8000,
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
export function createDefaultSheet(name = "Survivor") {
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
export function createDefaultWorld() {
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
export function userKey(userId) {
  return userId && userId.trim() ? userId.trim() : "__default__";
}
export function safeFileSegment(id) {
  return String(id ?? "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96) || "unknown";
}
export function chatCacheKey(userId, chatId) {
  return `${userKey(userId)}::${chatId}`;
}

// ---------- Survival (loot & encounter rolls) ----------
// Deterministic seed → roll: same (chat, IRL date, attempt counter) yields the
// same outcome, so "scavenge" is reproducible and auditable. Fair D20 still
// backs ordinary checks; seeds are only used for the Survival actions.
export function fnv1a(str) {
  let h = 0x811c9dc5;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0);
}
export function mulberry32(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Built-in weighted tables. Format per entry: weight | name | qty | category | rarity.
// Categories use the extension's CATEGORY_SET (food = potion, documents = key).
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
var LOOT_CATEGORY_SET = new Set(["weapon", "armor", "accessory", "potion", "material", "key", "book", "valuable", "misc"]);
var LOOT_RARITY_SET = new Set(["ordinary", "common", "uncommon", "rare", "epic", "legendary", "mythic"]);
// Parses "weight | name | qty | category | rarity" lines; anything else is rejected
// and counted so the UI/toast can report it.
export function parseLootTableText(text) {
  const entries = [];
  let rejected = 0;
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length < 2) { rejected++; continue; }
    const w = Math.floor(Number(parts[0]));
    const name = (parts[1] || "").slice(0, 60);
    if (!Number.isFinite(w) || w < 1 || !name) { rejected++; continue; }
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
export function pickWeighted(entries, rand) {
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
export function resolveSurvivalPool(settings) {
  const custom = parseLootTableText(settings?.survivalCustomTable || "");
  const wanted = typeof settings?.survivalTable === "string" ? settings.survivalTable : "wasteland";
  if (wanted === "custom") {
    return { entries: custom.entries, rejected: custom.rejected, source: "custom", empty: custom.entries.length === 0 };
  }
  const base = (LOOT_TABLES[wanted] || LOOT_TABLES.wasteland).map((e) => ({ ...e }));
  return { entries: [...base, ...custom.entries], rejected: custom.rejected, source: wanted, empty: false };
}
// Encounter beat table — indexed by the raw d20.
export function encounterBeat(roll) {
  const r = roll;
  if (r <= 3) return { beat: "Nothing stirring", severity: 0, detail: "Wind, distance, silence. The area feels empty — for now." };
  if (r <= 7) return { beat: "Distant signs", severity: 1, detail: "A bird bursts up. Wires hum. Something moved far off, or the world is settling." };
  if (r <= 11) return { beat: "Fresh tracks", severity: 2, detail: "Prints in the dust/mud — recent. Heading somewhere. Maybe the same way." };
  if (r <= 14) return { beat: "Ambiguous follower", severity: 3, detail: "Movement at the edge of sight. Probably nothing. Probably." };
  if (r <= 17) return { beat: "Hard evidence", severity: 4, detail: "A kill cache, markings, fresh droppings, a drag trail — something is here and hunting." };
  if (r <= 19) return { beat: "Direct threat", severity: 5, detail: "Eyes in the dark, too close. It has not committed yet. Neither have you." };
  return { beat: "Ambush imminent", severity: 6, detail: "The quiet breaks. It charges — or springs — from close range." };
}
// ---------- Scene clock ----------
export function parseWeatherLadder(text) {
  const seen = new Set();
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
var PHASE_TABLE: Array<[number, string]> = [
  [0, "Deep Night"],
  [5, "Dawn"],
  [7, "Morning"],
  [12, "Midday"],
  [14, "Afternoon"],
  [18, "Dusk"],
  [21, "Night"]
];
export function phaseWord(minutes) {
  const m = ((Math.floor(Number(minutes) || 0) % 1440) + 1440) % 1440;
  let word = "Deep Night";
  for (const [h, w] of PHASE_TABLE) {
    if (m >= h * 60) word = w;
  }
  return word;
}
// Advances the clock; returns true if weather drifted this tick.
export function advanceSceneClock(world, stepMinutes, opts, rand) {
  const step = Math.max(15, Math.min(180, Math.floor(Number(stepMinutes) || 45)));
  const r = typeof rand === "function" ? rand : Math.random;
  let m = (Math.floor(Number(world.minutesOfDay)) || 480) + step;
  let days = 0;
  while (m >= 1440) { m -= 1440; days += 1; }
  world.minutesOfDay = m;
  if (days > 0) world.dayCount = clamp((Math.floor(Number(world.dayCount)) || 1) + days, 1, 99999);
  world.time = `Day ${world.dayCount} · ${phaseWord(m)}`;
  if (!opts?.drift) return false;
  const ladder = parseWeatherLadder(opts.ladder);
  const cur = String(world.weather || "").trim().toLowerCase();
  const idx = ladder.findIndex((x) => x.toLowerCase() === cur);
  if (idx === -1) return false; // custom weather text — leave it alone
  const chance = Math.max(0, Math.min(100, Number(opts.chance) || 0)) / 100;
  if (r() >= chance) return false;
  const dir = r() < 0.5 ? -1 : 1;
  let next = idx + dir;
  if (next < 0) next = 0;
  if (next > ladder.length - 1) next = ladder.length - 1;
  if (next === idx) return false; // parked at the ladder edge — no move this tick
  world.weather = ladder[next];
  return true;
}
