// @ts-nocheck — types are being tightened incrementally; bundling and CI tests do not depend on this flag. Remove file-by-file.
/*! src/backend/sanitize.ts */
import { DEFAULT_STAT_LABELS, STAT_KEYS, advanceSceneClock, chatCacheKey, clamp, computePools, createDefaultModules, createDefaultSheet, createDefaultWorld, formatMod, makeId, recomputeSheetPools, safeFileSegment, statModifier } from "./engine";
import { bshStage } from "./extractor";
// Defensive coercion for anything crossing a trust boundary: imported backups,
// legacy saves, forked chats. Known keys are coerced to sane values; unknown
// keys are preserved (forward compatibility) but never rendered without escaping.
var SAN_MAX_STRING = 2000;
var RARITY_SET = new Set(["ordinary", "common", "uncommon", "rare", "epic", "legendary", "mythic"]);
var CATEGORY_SET = new Set(["weapon", "armor", "accessory", "potion", "material", "key", "book", "valuable", "misc"]);
var QUEST_STATUS_SET = new Set(["active", "available", "done", "failed"]);
var EFFECT_KIND_SET = new Set(["buff", "debuff", "neutral"]);
var KNOWN_THEMES = new Set(["sakura", "ocean", "ember", "forest", "violet", "gold", "teal", "crimson", "mono", "lumiverse", "contrast"]);
export function sanitizeThemeId(v) {
  const s = sanitizeString(v, 24).toLowerCase();
  return KNOWN_THEMES.has(s) ? s : null;
}
var ARC_SET = new Set(["Opening", "Rising", "Turning", "Climax", "Fallout"]);
var PHASE_SET = new Set(["Setup", "Tension", "Confrontation", "Intimacy", "Aftermath"]);
export function sanitizeString(v, maxLen = SAN_MAX_STRING) {
  if (typeof v !== "string") return "";
  // strip ASCII control characters (except tab/newline), cap length
  return v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim().slice(0, maxLen);
}
function sanitizeId(v, prefix = "id") {
  const s = sanitizeString(v, 48);
  return /^[A-Za-z0-9_-]{1,48}$/.test(s) ? s : makeId(prefix);
}
export function sanitizeNumber(v, fallback, min, max) {
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
  out.duration = raw.duration === void 0 || raw.duration === null || typeof raw.duration === "string"
    ? null // null = ongoing
    : sanitizeNumber(raw.duration, 3, 1, 999);
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
export function sanitizeSheet(raw) {
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
export function sanitizeWorld(raw) {
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
  base.notes = sanitizeString(base.notes, 2000);
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
  out.advRoll = raw.advRoll === null || raw.advRoll === undefined ? null : sanitizeNumber(raw.advRoll, 1, 1, 20);
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
export var MAX_IMPORT_BYTES = 1500000;
export function sanitizeImportedState(parsed) {
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

// ---------- Chat-log import (Weft preset hand-off) ----------
// Deterministic parse of the <Status>/<World_State> blocks the Weft preset
// writes into assistant messages. One-time bootstrap: no LLM, no tokens.
// Everything passes through sanitizeSheet/sanitizeWorld afterwards, so any
// partial or slightly-off parse is clamped to a safe state.
function extractTagText(block, tag) {
  const m = block.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">", "i"));
  return m ? m[1].trim() : null;
}
function parseTagPair(raw) {
  const m = String(raw || "").match(/(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  return { cur: Number(m[1]), max: Number(m[2]) };
}
export function parseStatusBlock(block) {
  const stats = {};
  const statLabels = {};
  for (const k of STAT_KEYS) {
    const m = block.match(new RegExp("<" + k + "(?:\\s+l=\"([^\"]*)\")?\\s*>([^<]*)</" + k + ">", "i"));
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
// Preset models sometimes write literal "None"/"N/A" instead of omitting a tag —
// treat those as empty on import.
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
export function parseWorldStateBlock(block) {
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
export function findLastTaggedBlock(messages, re) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m || m.is_user) continue;
    const c = String(m.content || "");
    const match = c.match(re);
    if (match) return { block: match[0], inner: match[1], messageId: m.id, index: i };
  }
  return null;
}
export function scanChatLog(messages) {
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
    report.warnings.push("This chat still contains raw <Status>/<World_State> blocks from the preset. If Weft Chronicle's System Window and Tracker are ON, the state renders twice — turn OFF 'System window' and 'Tracker' in the preset's Prompt Variables.");
  }
  if (report.dice > 0) {
    report.warnings.push(`Found ${report.dice} <Dice> block(s) in the log — if the preset's dice variable is ON, rolls will double up. Turn it OFF and let the extension roll.`);
  }
  return report;
}

export function normalizeChatData(data, defaultModules = createDefaultModules(), xpCurve = "flat") {
  if (data && typeof data === "object") {
    data.themeOverride = sanitizeThemeId(data.themeOverride);
    if (!data.modules || typeof data.modules !== "object") {
      data.modules = { ...defaultModules };
    } else {
      // Merge any missing module keys (e.g. after an extension update) without
      // overriding the user's explicit on/off choices for this chat.
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
        ...(typeof e.error === "string" ? { error: sanitizeString(e.error, 200) } : {}),
        ...(Number.isFinite(e.tokens) ? { tokens: Math.max(0, Math.floor(e.tokens)) } : {})
      };
    });
    if (data.lastSyncError && typeof data.lastSyncError !== "string") data.lastSyncError = null;
  }
  recomputeSheetPools(data.sheet, { xpCurve });
  return data;
}
export function createDefaultChatData(chatId, enabled = true, userName = "Survivor", modules = createDefaultModules()) {
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
var backupStampByChat = new Map();
var MAX_AUTO_BACKUPS = 5;
function backupFileName(chatId, ts) {
  return `chats/backups/${safeFileSegment(chatId)}/${ts}.json`;
}
function backupEnvelope(data) {
  return {
    format: "weft-chronicle",
    version: 3,
    backup: true,
    exportedAt: new Date().toISOString(),
    sheet: data.sheet,
    world: data.world,
    rolls: data.rolls,
    notices: (data.notices || []).slice(0, 5)
  };
}
export async function maybeAutoBackup(chatId, data, userId, settings, opts) {
  if (!settings?.autoBackup) return;
  const key = chatCacheKey(userId, chatId);
  const now = Date.now();
  const last = backupStampByChat.get(key) || 0;
  if (!opts?.force && now - last < 60e3) return; // at most one backup per minute per chat
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
        // best effort prune
      }
    }
  } catch (err) {
    spindle.log.warn(`Auto-backup for ${chatId} failed: ${String(err)}`);
  }
}
var MAX_SYNC_LOG = 12;
// Rough deterministic token estimate for sidecar spend tracking (no API cooperation needed):
// ~4 characters per token, counted across message contents + the model's raw output.
function estimateTokensFromText(text) {
  const s = typeof text === "string" ? text : "";
  return Math.max(0, Math.ceil(s.length / 4));
}
export function estimateTokensForCall(messages, rawOutput) {
  let prompt = 0;
  for (const m of Array.isArray(messages) ? messages : []) {
    prompt += estimateTokensFromText(m && typeof m.content === "string" ? m.content : "");
  }
  return { promptTokens: prompt, completionTokens: estimateTokensFromText(rawOutput), calls: 1 };
}
export function addSpend(data, usage) {
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
export function noteSyncOutcome(data, ok, error, usage) {
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
export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}
export function allocateStatPoint(sheet, stat, amount = 1) {
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
export function parseAllocPriority(raw) {
  const keys = sanitizeString(raw || "", 60).toLowerCase().split(/[^a-z]+/g).filter((k) => STAT_KEYS.includes(k));
  const dedup = [...new Set(keys)];
  return dedup.length > 0 ? dedup : null;
}
export function autoAllocateAllPoints(sheet, priorityRaw) {
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
export function equipItem(sheet, itemId) {
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
export function unequipSlot(sheet, slot) {
  const prev = sheet.gear[slot];
  if (!prev) return false;
  sheet.gear[slot] = null;
  addItemToBag(sheet, prev);
  sheet.lastLog = `Unequipped ${prev.name}.`;
  return true;
}
export function addItemToBag(sheet, input) {
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
export function removeItemFromBag(sheet, nameOrId, qty = 1) {
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
export function fairD20(rng) {
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
export function evaluateVerdict(roll, total, dc) {
  if (roll === 20) return "nat 20";
  if (roll === 1) return "nat 1";
  if (total >= dc) return "success";
  if (total >= dc - 2) return "success, at a cost";
  return "fail";
}
export function normalizeRollStat(stat) {
  const s = typeof stat === "string" ? stat.toLowerCase().trim() : "";
  return STAT_KEYS.includes(s) ? s : "none";
}
export function performDiceRoll(sheet, opts) {
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
  // advRoll stores the *dropped* die (null for straight rolls), so the UI can
  // honestly show "kept X, dropped Y". Kept is always `roll`.
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
export function tickEffectsInPlace(sheet) {
  const remaining = [];
  for (const ef of sheet.effects) {
    if (ef.duration === null) remaining.push(ef);
    else if (ef.duration > 1) remaining.push({ ...ef, duration: ef.duration - 1 });
  }
  sheet.effects = remaining;
}
export function applyDelta(data, delta, settings) {
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
      tickEffectsInPlace(sheet); // a full night's rest burns a turn of every timed condition
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
      // Death / downed state: warn exactly when crossing into 0 HP.
      if (prevHp > 0 && sheet.hp === 0) {
        notes.push("HP 0 — DOWN");
        changeLines.push("HP 0 — character is down and cannot act until stabilized.");
        turnNotices.push({
          id: makeId("ntc"),
          timestamp: Date.now(),
          kind: "warn",
          title: "SYSTEM: DOWNED",
          lines: [
            `${sheet.name} has hit 0 HP and is down/unconscious.`,
            "They cannot act — another solid hit while down is fatal.",
            "Heals/medical attention are required before they can stand."
          ]
        });
      } else if (sheet.hp > 0 && sheet.hp <= Math.max(1, Math.floor(sheet.hpMax * 0.25)) && prevHp > Math.max(1, Math.floor(sheet.hpMax * 0.25))) {
        changeLines.push("HP critically low — one clean hit could drop them.");
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
    // Countdown timers tick once per synced turn; expiry fires a warning notice.
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
export function buildPromptBlock(data, settings) {
  normalizeChatData(data, settings.defaultModules, settings.xpCurve);
  if (!data.enabled || !settings.injectPrompt) return null;
  const wantSystem = data.modules.system && settings.includeSheetInPrompt && data.initialized;
  const wantTracker = data.modules.tracker && settings.includeWorldInPrompt && data.initialized;
  const pendingRolls = data.modules.dice && settings.includeRollsInPrompt ? data.rolls.filter((r) => !r.consumed) : [];
  const lean = settings.promptBudget === "lean";
  if (!wantSystem && !wantTracker && pendingRolls.length === 0) return null;
  const lines = ["<weft_chronicle_state>"];
  lines.push(
    "Authoritative state tracked externally by Weft Chronicle. Honor these injuries, gear, NPC feelings/thoughts, and rolled outcomes in prose without quoting raw stats, HP, XP, or dice numbers in story text. Lines marked [NPC-private] are for consistency only — never narrate the secret or quote the thought directly; let them shape behavior. HP 0 means the character is down/unconscious and cannot act until stabilized. Bond/Spark/Heat meters belong to the player's knowledge — NPCs act on their own wants, not on the meters. If an Unspent pts count is listed, the character has attribute points ready to allocate — a natural training or development opening may exist in the story if they seek it. Do NOT emit <Status>, <World_State>, or fake <Dice> XML tags \u2014 the extension displays them automatically."
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
      lines.push("[CRITICAL] The character is DOWN at 0 HP — unconscious and unable to act. Any further damage is fatal until they are stabilized/healed.");
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
      // NPC-private lines are for consistency only: never narrate them directly.
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
      lines.push(`[TIMERS — consequence expected in N replies; honor the fuse] ${timers.map((t) => `${t.turnsLeft} turn${t.turnsLeft === 1 ? "" : "s"}: ${t.title}${t.detail ? ` (${t.detail})` : ""}`).join(" | ")}`);
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
