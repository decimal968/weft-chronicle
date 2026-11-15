"use strict";

// src/engine.ts
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
function computePools(sheet) {
  const lv = Math.max(1, Math.floor(sheet.level));
  const con = Math.max(1, Math.floor(sheet.stats.con));
  const intStat = Math.max(1, Math.floor(sheet.stats.int));
  return {
    hpMax: 40 + 3 * con + 4 * (lv - 1),
    spMax: 14 + 2 * con + (lv - 1),
    mpMax: 14 + 2 * intStat,
    xpNext: 100 * lv
  };
}
function recomputeSheetPools(sheet, opts = {}) {
  const prevHpMax = sheet.hpMax;
  const prevSpMax = sheet.spMax;
  const prevMpMax = sheet.mpMax;
  const next = computePools(sheet);
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
  return { system: true, tracker: true, dice: true };
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
    trackXp: true,
    includeWorldInPrompt: true,
    includeSheetInPrompt: true,
    includeRollsInPrompt: true,
    showInlineSystem: true,
    showInlineTracker: true,
    showInlineNotices: true,
    showInlineDice: true,
    inlineStartsOpen: false,
    inlinePlacement: "inside",
    trackerShowBond: true,
    trackerShowSpark: true,
    trackerShowHeat: true,
    trackerShowThought: true,
    trackerShowSecret: true,
    maxHistoryRolls: 30
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
    npcs: [],
    threads: [],
    notes: ""
  };
}
function normalizeChatData(data, defaultModules = createDefaultModules()) {
  if (!data.modules) {
    data.modules = { ...defaultModules };
  }
  if (!Array.isArray(data.notices)) data.notices = [];
  if (!Array.isArray(data.rolls)) data.rolls = [];
  if (!data.snapshots) data.snapshots = {};
  if (typeof data.world.arc !== "string") data.world.arc = "Opening";
  if (typeof data.world.phase !== "string") data.world.phase = "Setup";
  for (const n of data.world.npcs) {
    if (typeof n.mood !== "string") n.mood = n.attitude || "Wary";
    if (typeof n.bond !== "number") n.bond = clamp(Math.round((n.relationship + 100) / 2), 0, 100);
    if (typeof n.spark !== "number") n.spark = 15;
    if (typeof n.heat !== "number") n.heat = 15;
  }
  recomputeSheetPools(data.sheet);
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
    updatedAt: Date.now()
  };
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
function autoAllocateAllPoints(sheet) {
  if (sheet.pts <= 0) return "No points to assign.";
  const total = sheet.pts;
  const ranked = [...STAT_KEYS].sort((a, b) => sheet.stats[b] - sheet.stats[a]);
  const changes = { str: 0, dex: 0, int: 0, cha: 0, con: 0, wis: 0 };
  let i = 0;
  while (sheet.pts > 0) {
    const pick = ranked[i % Math.min(3, ranked.length)];
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
function performDiceRoll(sheet, opts) {
  const dc = clamp(opts.dc, 1, 40);
  const statValue = opts.stat === "none" ? 5 : sheet.stats[opts.stat];
  const statMod = opts.stat === "none" ? 0 : statModifier(statValue);
  const gearBonus = clamp(opts.gearBonus ?? 0, -3, 3);
  const roll = fairD20(opts.rng);
  const total = roll + statMod + gearBonus;
  const verdict = evaluateVerdict(roll, total, dc);
  return {
    id: makeId("roll"),
    timestamp: Date.now(),
    who: (opts.who || sheet.name || "Character").trim(),
    action: (opts.action || "Attempt risky action").trim(),
    stat: opts.stat,
    statValue,
    statMod,
    gearBonus,
    roll,
    total,
    dc,
    verdict,
    consumed: false
  };
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
    } else if (sd.rest === "short") {
      sheet.sp = clamp(sheet.sp + Math.ceil(sheet.spMax * 0.5), 0, sheet.spMax);
      if (sheet.useMp) sheet.mp = clamp(sheet.mp + Math.ceil(sheet.mpMax * 0.5), 0, sheet.mpMax);
      notes.push("Short rest");
    }
    if (typeof sd.hpDelta === "number" && sd.hpDelta !== 0) {
      sheet.hp = clamp(sheet.hp + sd.hpDelta, 0, sheet.hpMax);
      notes.push(`HP ${sd.hpDelta > 0 ? "+" : ""}${sd.hpDelta}`);
      changeLines.push(`HP ${sd.hpDelta > 0 ? "+" : ""}${sd.hpDelta} (${sheet.hp}/${sheet.hpMax})`);
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
        recomputeSheetPools(sheet, { raiseCurrentByMaxDelta: true });
        sheet.hp = clamp(sheet.hp + Math.ceil(sheet.hpMax * 0.25), 0, sheet.hpMax);
        sheet.sp = clamp(sheet.sp + Math.ceil(sheet.spMax * 0.25), 0, sheet.spMax);
        if (sheet.useMp) {
          sheet.mp = clamp(sheet.mp + Math.ceil(sheet.mpMax * 0.25), 0, sheet.mpMax);
        }
      }
      if (levelsGained > 0) {
        const autoSummary = settings.allocMode === "auto" ? autoAllocateAllPoints(sheet) : "";
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
      const remaining = [];
      for (const ef of sheet.effects) {
        if (ef.duration === null) remaining.push(ef);
        else if (ef.duration > 1) remaining.push({ ...ef, duration: ef.duration - 1 });
      }
      sheet.effects = remaining;
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
            note: sk.note || ""
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
  normalizeChatData(data, settings.defaultModules);
  if (!data.enabled || !settings.injectPrompt) return null;
  const wantSystem = data.modules.system && settings.includeSheetInPrompt && data.initialized;
  const wantTracker = data.modules.tracker && settings.includeWorldInPrompt && data.initialized;
  const pendingRolls = data.modules.dice && settings.includeRollsInPrompt ? data.rolls.filter((r) => !r.consumed) : [];
  if (!wantSystem && !wantTracker && pendingRolls.length === 0) return null;
  const lines = ["<weft_chronicle_state>"];
  lines.push(
    "Authoritative state tracked externally by Weft Chronicle. Honor these injuries, gear, NPC feelings/thoughts, and rolled outcomes in prose without quoting raw stats, HP, XP, or dice numbers in story text. Do NOT emit <Status>, <World_State>, or fake <Dice> XML tags \u2014 the extension displays them automatically."
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
    lines.push(`[STATS] ${statsLine}`);
    const eqParts = ["weapon", "armor", "accessory"].map((slot) => {
      const it = s.gear[slot];
      if (!it) return "";
      const r = it.rarity !== "ordinary" ? ` (${it.rarity})` : "";
      return `${slot}: ${it.name}${r}`;
    }).filter(Boolean);
    if (eqParts.length > 0) lines.push(`[EQUIPPED] ${eqParts.join(" | ")}`);
    if (s.bag.length > 0) {
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
        const obs = q.objectives.map((o) => `${o.done ? "[x]" : "[ ]"} ${o.text}`).join("; ");
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
    if (w.npcs.length > 0) {
      const present = w.npcs.filter((n) => n.present);
      const away = w.npcs.filter((n) => !n.present).slice(0, 4);
      const fmtNpc = (n) => `${n.name} (${n.mood || n.attitude}, Bond ${n.bond}/100, Spark ${n.spark}/100, Heat ${n.heat}/100${n.goal ? `; wants: ${n.goal}` : ""})`;
      if (present.length > 0) lines.push(`[NPCS PRESENT] ${present.map(fmtNpc).join(" | ")}`);
      if (away.length > 0) lines.push(`[NPCS OFFSCREEN] ${away.map((n) => `${n.name} @ ${n.location}`).join(" | ")}`);
    }
    const activeThreads = w.threads.filter((t) => t.status !== "resolved").slice(0, 5);
    if (activeThreads.length > 0) {
      lines.push(`[THREADS] ${activeThreads.map((t) => `[${t.status}] ${t.title}: ${t.detail}`).join(" | ")}`);
    }
  }
  if (pendingRolls.length > 0) {
    lines.push("[BINDING DICE ROLLS \u2014 ALREADY ROLLED WITH FAIR RNG; NARRATE THESE EXACT OUTCOMES]");
    for (const r of pendingRolls) {
      const statStr = r.stat === "none" ? "Flat" : `${r.stat.toUpperCase()} ${formatMod(r.statMod)}`;
      const gearStr = r.gearBonus !== 0 ? ` + Gear ${formatMod(r.gearBonus)}` : "";
      lines.push(
        `- ${r.who} attempts "${r.action}": d20=${r.roll} (${statStr}${gearStr}) = ${r.total} vs DC ${r.dc} -> ${r.verdict.toUpperCase()}`
      );
    }
  }
  lines.push("</weft_chronicle_state>");
  return lines.join("\n");
}

// src/extractor.ts
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
    "questsUpserted": [{ "title": "string", "kind": "main|side", "status": "active|available", "objectives": [{ "text": "string", "done": false }], "reward": "" }],
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
function buildDeltaMessages(data, recentTranscript) {
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
    "skillsAdded": [{ "name": "string", "cost": "", "note": "" }],
    "questsUpserted": [{ "title": "string", "kind": "main|side", "status": "active|available|done|failed", "objectives": [{ "text": "string", "done": false }], "reward": "" }],
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
      npcs: w.npcs.map((n) => ({
        name: n.name,
        present: n.present,
        mood: n.mood,
        bond: n.bond,
        spark: n.spark,
        heat: n.heat
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
- If nothing changed at all, return {}.`;
  const user = `CURRENT_STATE:
${JSON.stringify(stateObj)}

LATEST TURN:
${recentTranscript.slice(-4500)}`;
  return [
    { role: "system", content: system },
    { role: "user", content: user }
  ];
}
function parseJsonDelta(raw) {
  if (!raw || typeof raw !== "string") return null;
  const withoutThinking = raw.replace(/<(?:think|thought|reasoning)>[\s\S]*?<\/(?:think|thought|reasoning)>/gi, "").trim();
  const stripped = withoutThinking.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const tryParse = (s) => {
    try {
      const parsed = JSON.parse(s);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      try {
        const cleaned = s.replace(/,\s*([}\]])/g, "$1");
        const parsed = JSON.parse(cleaned);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
      }
    }
    return null;
  };
  const direct = tryParse(stripped);
  if (direct) return direct;
  const start = stripped.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < stripped.length; i++) {
    const ch = stripped[i];
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
        return tryParse(stripped.slice(start, i + 1));
      }
    }
  }
  return null;
}

// src/backend.ts
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
function userKey(userId) {
  return userId && userId.trim() ? userId.trim() : "__default__";
}
function safeFileSegment(id) {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96) || "unknown";
}
function chatCacheKey(userId, chatId) {
  return `${userKey(userId)}::${chatId}`;
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
        normalizeChatData(stored, settings.defaultModules);
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
function recordSnapshot(data, messageId, swipeId, turnNotices = [], turnRolls = []) {
  const key = `${messageId}:${swipeId}`;
  const snap = {
    messageId,
    swipeId,
    timestamp: Date.now(),
    sheet: deepClone(data.sheet),
    world: deepClone(data.world),
    notices: deepClone(turnNotices),
    rolls: deepClone(turnRolls)
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
    statusNote: extra?.statusNote
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
      return { transcript: "", tailMessageId: null, tailSwipeId: 0, prevMessageKey: null };
    }
    const isUserMsg = (m) => typeof m.is_user === "boolean" ? m.is_user : m.role === "user";
    const transcript = msgs.map((m) => `${isUserMsg(m) ? "[PLAYER]" : "[AI]"} ${m.name || ""}: ${m.content || ""}`).join("\n\n");
    const tail = msgs[msgs.length - 1];
    const prevAi = [...msgs.slice(0, -1)].reverse().find((m) => !isUserMsg(m));
    return {
      transcript,
      tailMessageId: tail.id,
      tailSwipeId: tail.swipe_id ?? 0,
      prevMessageKey: prevAi ? `${prevAi.id}:${prevAi.swipe_id ?? 0}` : null
    };
  } catch (err) {
    spindle.log.warn(`getMessages failed for ${chatId}: ${String(err)}`);
    return { transcript: "", tailMessageId: null, tailSwipeId: 0, prevMessageKey: null };
  }
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
        max_tokens: 1400
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
              max_tokens: 1400
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
          "No active LLM connection profile found. Open \u2699\uFE0F Settings and select a Sidecar LLM Connection."
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
    const { transcript, tailMessageId, tailSwipeId } = await gatherRecentTranscript(chatId, 6);
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
    const delta = parseJsonDelta(raw);
    if (!delta) {
      spindle.toast.warning("Sidecar returned unreadable JSON during init. Try again or pick another sidecar model in \u2699\uFE0F Settings.", {
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
      recordSnapshot(data, tailMessageId, tailSwipeId, outcome.notices, []);
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
  try {
    const { transcript, tailMessageId, tailSwipeId, prevMessageKey } = await gatherRecentTranscript(chatId, 4);
    const effectiveMsgId = opts?.messageId || tailMessageId;
    if (opts?.isSwipeOrRegen && prevMessageKey && data.snapshots[prevMessageKey]) {
      restoreSnapshot(data, prevMessageKey);
    }
    const effectiveTranscript = transcript || (opts?.fallbackContent ? `[AI]: ${opts.fallbackContent}` : "");
    if (!effectiveTranscript.trim()) return;
    const promptMsgs = buildDeltaMessages(data, effectiveTranscript);
    const raw = await runSidecarLlm(promptMsgs, settings, userId);
    const delta = parseJsonDelta(raw);
    if (!delta) {
      if (opts?.manual) {
        spindle.toast.warning("Could not parse state delta JSON from sidecar model.", { userId });
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
      recordSnapshot(data, effectiveMsgId, tailSwipeId, outcome.notices, resolvedThisTurn);
    }
    await saveChatData(data, userId);
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
spindle.on("GENERATION_ENDED", async (payload, rawUserId) => {
  if (!payload?.chatId || payload.error) return;
  if (payload.generationType === "impersonate" || payload.generationType === "quiet") return;
  const userId = rememberUserForChat(payload.chatId, rawUserId);
  const settings = await loadSettings(userId);
  const data = await loadChatData(payload.chatId, userId);
  if (!data.enabled) return;
  if (!settings.autoSync || !data.modules.system && !data.modules.tracker) {
    const resolved = [];
    for (const r of data.rolls) {
      if (!r.consumed) {
        r.consumed = true;
        if (payload.messageId) r.messageId = payload.messageId;
        resolved.push(r);
      }
    }
    if (resolved.length > 0) {
      if (payload.messageId) {
        recordSnapshot(data, payload.messageId, 0, [], resolved);
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
        const patch = msg.patch || {};
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
        if (mod !== "system" && mod !== "tracker" && mod !== "dice") return;
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
        const data = await loadChatData(activeChatId, userId);
        const note = autoAllocateAllPoints(data.sheet);
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
        if (typeof patch.name === "string") s.name = patch.name.trim() || s.name;
        if (typeof patch.race === "string") s.race = patch.race.trim();
        if (typeof patch.cls === "string") s.cls = patch.cls.trim();
        if (typeof patch.subcls === "string") s.subcls = patch.subcls.trim();
        if (typeof patch.rank === "string") s.rank = patch.rank.trim();
        if (typeof patch.guild === "string") s.guild = patch.guild.trim();
        if (typeof patch.title === "string") s.title = patch.title.trim();
        if (typeof patch.cash === "string") s.cash = patch.cash.trim();
        if (typeof patch.useMp === "boolean") s.useMp = patch.useMp;
        if (typeof patch.mpLabel === "string" && patch.mpLabel.trim()) s.mpLabel = patch.mpLabel.trim();
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
          name: sk.name.trim(),
          cost: sk.cost || "",
          note: sk.note || ""
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
          existing.title = th.title.trim();
          if (th.status) existing.status = th.status;
          if (th.detail !== void 0) existing.detail = th.detail;
        } else {
          data.world.threads.push({
            id: makeId("th"),
            title: th.title.trim(),
            status: th.status || "active",
            detail: th.detail || ""
          });
        }
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
          action: typeof msg.action === "string" ? msg.action : "Attempt check",
          stat: msg.stat || "none",
          dc: typeof msg.dc === "number" ? msg.dc : 15,
          gearBonus: typeof msg.gearBonus === "number" ? msg.gearBonus : 0,
          who: typeof msg.who === "string" && msg.who.trim() ? msg.who : data.sheet.name
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
        await saveChatData(fresh, userId);
        await pushStateToFrontend(activeChatId, userId, { statusNote: "Chat state reset" });
        return;
      }
      case "import_json": {
        if (!activeChatId) return;
        const raw = typeof msg.json === "string" ? msg.json : "";
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.sheet || !parsed.world) {
          spindle.toast.error("Invalid Weft Chronicle JSON backup.", { userId });
          return;
        }
        const data = await loadChatData(activeChatId, userId);
        data.sheet = parsed.sheet;
        data.world = parsed.world;
        data.rolls = Array.isArray(parsed.rolls) ? parsed.rolls : [];
        data.initialized = true;
        normalizeChatData(data);
        refreshLatestSnapshot(data);
        await saveChatData(data, userId);
        spindle.toast.success("Imported Weft Chronicle state.", { userId });
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
