// @ts-nocheck — types are being tightened incrementally; bundling and CI tests do not depend on this flag. Remove file-by-file.
/*! src/backend/backend.ts */
import { parseChoicesBlock } from "./choices";
import { DEFAULT_STAT_LABELS, STAT_KEYS, chatCacheKey, clamp, computePools, createDefaultModules, createDefaultSettings, createDefaultSheet, createDefaultWorld, encounterBeat, fnv1a, makeId, mulberry32, pickWeighted, recomputeSheetPools, resolveSurvivalPool, safeFileSegment, statModifier, userKey } from "./engine";
import { bshStage, buildDeltaMessages, buildInitMessages, parseJsonDelta } from "./extractor";
import { MAX_IMPORT_BYTES, addItemToBag, addSpend, allocateStatPoint, applyDelta, autoAllocateAllPoints, buildPromptBlock, createDefaultChatData, deepClone, equipItem, estimateTokensForCall, evaluateVerdict, fairD20, findLastTaggedBlock, maybeAutoBackup, normalizeChatData, normalizeRollStat, noteSyncOutcome, parseAllocPriority, parseStatusBlock, parseWorldStateBlock, performDiceRoll, removeItemFromBag, sanitizeImportedState, sanitizeNumber, sanitizeSheet, sanitizeString, sanitizeThemeId, sanitizeWorld, scanChatLog, tickEffectsInPlace, unequipSlot } from "./sanitize";
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
  theme: null // free-form theme id, capped below
};
var SETTINGS_NUMBER_KEYS = {
  transcriptCap: [1500, 20000],
  sidecarMaxTokens: [400, 6000],
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
      if (Number.isFinite(n)) out[k] = n; // drop garbage instead of persisting NaN
      continue;
    }
    // Booleans and theme-ish short strings pass through bounded.
    if (typeof v === "boolean") {
      out[k] = v;
      continue;
    }
    if (typeof v === "string") {
      out[k] = k === "survivalCustomTable" ? sanitizeString(v, 4000) : k === "weatherLadder" ? sanitizeString(v, 320) : sanitizeString(v, 200);
      continue;
    }
    // Drop anything else (objects, arrays, functions, numbers outside known keys).
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
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
// Seeded scavenge/encounter rolls (Survival module). Deterministic per
// (chat, IRL date, attempt counter) — same seed, same d20, for auditability.
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
      pushNotice("warn", "SCAVENGE FAILED", ["Bad luck, worse hands — you cut yourself on rusted metal.", "The search yields nothing. The next reply will narrate it."]);
    } else if (record.verdict === "fail") {
      record.loot = [];
      record.lootSummary = "";
      pushNotice("change", "SCAVENGE", ["Nothing useful this time — the search cost time, not supplies."]);
    } else {
      const pool = resolveSurvivalPool(settings);
      if (pool.empty) {
        record.loot = [];
        record.lootSummary = "";
        pushNotice("warn", "SCAVENGE", ["Your custom loot table is empty or unreadable — nothing to find. Fix it in Settings → Survival (Loot Tables)."]);
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
    pushNotice(b.severity >= 4 ? "warn" : "change", `ENCOUNTER — ${b.beat.toUpperCase()}`, [b.detail, "The roll is bound — the next reply will narrate exactly this."]);
  }
  data.rolls.unshift(record);
  if (data.rolls.length > settings.maxHistoryRolls) {
    data.rolls = data.rolls.slice(0, settings.maxHistoryRolls);
  }
  if (notices.length > 0) {
    data.notices = [...notices, ...(data.notices || [])].slice(0, 15);
  }
  await saveChatData(data, userId);
  const toastMsg = isScavenge
    ? record.lootSummary
      ? `Found: ${record.lootSummary}`
      : `d20=${record.roll} vs DC ${dc}: nothing found`
    : `Encounter — ${encounterBeat(record.roll).beat} (${record.verdict})`;
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
        max_tokens: clamp(Number(settings.sidecarMaxTokens) || 2200, 400, 6000)
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
              max_tokens: clamp(Number(settings.sidecarMaxTokens) || 2200, 400, 6000)
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
      // One corrective retry: many small/obedient models recover when told
      // exactly what went wrong on the first attempt.
      try {
        const retryMsgs = [
          ...promptMsgs,
          { role: "assistant", content: String(raw || "(empty response)").slice(0, 3000) },
          { role: "user", content: "That was not valid JSON. Return ONLY the JSON object described above — no prose, no markdown fences, no commentary. If nothing changed, return {}." }
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
      // Even if the sidecar failed, keep the <choices> card for this turn —
      // it costs nothing and does not depend on the sidecar at all.
      if (effectiveMsgId && choices) {
        recordSnapshot(data, effectiveMsgId, tailSwipeId, [], [], choices);
      }
      const errMsg = sidecarError
        ? `Sidecar call failed: ${sidecarError instanceof Error ? sidecarError.message : String(sidecarError)}`
        : "Sidecar returned unparseable JSON twice.";
      noteSyncOutcome(data, false, errMsg, usage);
      await saveChatData(data, userId);
      if (opts?.manual) {
        spindle.toast.warning(`Sync failed — ${errMsg}`, { userId });
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
var syncTurnCounterByChat = new Map();
// Chats with a live edit lease (set via set_editing RPC while a modal is
// open in the drawer) skip the sidecar auto-sync. Leases expire on their own.
var editingUntilByChat = new Map();
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
  // Sync pacing: "manual" never auto-syncs; "every2" syncs every 2nd reply.
  // Dice/choice recording below still runs regardless — only the sidecar is gated.
  const syncMode = settings.syncMode === "every2" || settings.syncMode === "manual" ? settings.syncMode : "every";
  const dueNow = syncMode === "every" || (syncMode === "every2" && nextSyncTurn(payload.chatId) % 2 === 0);
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
        // GENERATION_ENDED carries no swipe_id — look the message up so
        // swipe/fork undo restores the correct per-swipe snapshot.
        let swipeId = 0;
        try {
          const msgs = await spindle.chat.getMessages(payload.chatId);
          const m = (Array.isArray(msgs) ? msgs : []).find((x) => x && x.id === payload.messageId);
          if (m && Number.isFinite(m.swipe_id)) swipeId = m.swipe_id;
        } catch {
          // keep swipeId 0 if the lookup is unavailable
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
        data.themeOverride = next; // null clears → follow global
        await saveChatData(data, userId);
        await pushStateToFrontend(activeChatId, userId, { statusNote: next ? `Chat theme: ${next}` : "Chat theme: follows global" });
        return;
      }
      case "set_editing": {
        if (!activeChatId) return;
        if (msg.editing) {
          const until = Number(msg.until);
          const clamped = Number.isFinite(until) ? Math.min(until, Date.now() + 5 * 60 * 1000) : Date.now() + 90000;
          editingUntilByChat.set(activeChatId, clamped);
        } else {
          editingUntilByChat.delete(activeChatId);
        }
        return;
      }
      case "dismiss_notice": {
        if (!activeChatId) return;
        const ids = Array.isArray(msg.ids)
          ? msg.ids.map((x) => sanitizeString(String(x), 48)).filter(Boolean)
          : typeof msg.ids === "string"
            ? msg.ids.split(",").map((s) => s.trim()).filter(Boolean)
            : [sanitizeString(String(msg.id || ""), 48)].filter(Boolean);
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
          who: (typeof msg.who === "string" && msg.who.trim() ? msg.who.trim().slice(0, 60) : data.sheet.name)
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
        // Higher total wins; ties go to the defender (the one NOT acting) —
        // i.e. the player loses ties unless they rolled a nat 20.
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
          { title: `Contest · ${action}`, duration: 5e3, userId }
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
          // keep undefined hp/sp/mp so current pools fill from sanitizeSheet defaults
          for (const k of ["hp", "sp", "mp"]) if (rawSheet[k] === void 0) delete merged[k];
          // sanitizeSheet recomputes pools from (level, stats) — same formulas as the
          // preset — and clamps imported current values into the recomputed max.
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
        spindle.toast.success(`Imported from chat log: ${bits.join(" · ") || "state"}.`, { title: "Chat Log Import", duration: 6e3, userId });
        await pushStateToFrontend(activeChatId, userId, { statusNote: "Imported from chat log" });
        return;
      }
      case "scavenge_roll": {
        if (!activeChatId) return;
        const settings = await loadSettings(userId);
        if (!settings.survivalEnabled) {
          spindle.toast.warning("Enable Survival (Loot & Encounters) in Settings → Survival first.", { userId });
          return;
        }
        await runSurvivalRoll(activeChatId, settings, "scavenge", userId);
        return;
      }
      case "encounter_roll": {
        if (!activeChatId) return;
        const settings = await loadSettings(userId);
        if (!settings.survivalEnabled) {
          spindle.toast.warning("Enable Survival (Loot & Encounters) in Settings → Survival first.", { userId });
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
          spindle.toast.info("Choice copied to the clipboard — paste it into the composer and press Send.", { userId });
        } else if (kind === "busy") {
          spindle.toast.warning("A generation is still running — try the choice again when it finishes.", { userId });
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
        // Accept the versioned envelope ({ format, version, sheet, world }) or legacy raw exports.
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

// Test hook — plain `node --test` loads this bundle with a stubbed `spindle`
// global and reads these internals. Inert inside the host (module is unused).
