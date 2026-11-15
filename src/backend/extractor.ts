// @ts-nocheck — types are being tightened incrementally; bundling and CI tests do not depend on this flag. Remove file-by-file.
/*! src/backend/extractor.ts */
import { clamp } from "./engine";
export function buildInitMessages(input) {
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
export function buildDeltaMessages(data, recentTranscript, settings) {
  const transcriptCap = clamp(Number(settings?.transcriptCap) || 8000, 1500, 20000);
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
- Always include pcUpserted with the PC's CURRENT visible state on every reply (a camera would see it): what they wear, where they are positioned, their physical condition, and notable carried items. Keep values terse and concrete — clothes, not vibes. If unchanged since last turn, still repeat the same values.
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
// Escape raw control characters that appear inside JSON string literals.
// RP-heavy models routinely emit literal newlines/tabs inside "notes" fields,
// which makes JSON.parse reject the whole object — this makes the payload valid.
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
        else if (ch === "\t") out += "\\t";
        // drop other control characters entirely
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
export function parseJsonDelta(raw) {
  if (!raw || typeof raw !== "string") return null;
  const withoutThinking = raw.replace(/<(?:think|thought|reasoning)>[\s\S]*?<\/(?:think|thought|reasoning)>/gi, "").trim();
  const stripped = withoutThinking.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  // A single markdown fence can survive mid-object (e.g. the model closes the
  // JSON then opens a stray ``` before prose). Removing all fence markers is
  // safe for our schema because no string value should contain backticks.
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

export function bshStage(kind, value) {
  const v = Number(value) || 0;
  // Thresholds mirror the Weft preset's ladder exactly.
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
