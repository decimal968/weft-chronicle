/* weft-chronicle v2.4.0 — bundle built from src/ (see repository) */

// src/frontend/engine.ts
/*! src/frontend/engine.ts */
var STAT_KEYS = ["str", "dex", "int", "cha", "con", "wis"];
var DC_PRESETS = [
  { dc: 5, label: "Trivial (5)" },
  { dc: 10, label: "Easy (10)" },
  { dc: 15, label: "Ordinary (15)" },
  { dc: 20, label: "Hard (20)" },
  { dc: 25, label: "Very Hard (25)" },
  { dc: 30, label: "Near-Impossible (30)" }
];
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
function statBandName(value) {
  const v = Math.floor(value);
  if (v <= 2) return "Frail";
  if (v <= 4) return "Weak";
  if (v <= 6) return "Average";
  if (v <= 8) return "Trained";
  if (v <= 10) return "Exceptional";
  if (v <= 12) return "Heroic";
  if (v <= 14) return "Master";
  if (v <= 16) return "Mythic";
  return "Transcendent";
}
function formatMod(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}
function rarityRollBonus(rarity) {
  switch (rarity) {
    case "uncommon":
    case "rare":
      return 1;
    case "epic":
      return 2;
    case "legendary":
    case "mythic":
      return 3;
    default:
      return 0;
  }
}
function computeMaxGearBonus(sheet) {
  let best = 0;
  for (const slot of ["weapon", "armor", "accessory"]) {
    const it = sheet.gear[slot];
    if (!it) continue;
    const b = typeof it.rollBonus === "number" ? it.rollBonus : rarityRollBonus(it.rarity);
    if (b > best) best = b;
  }
  return clamp(best, 0, 3);
}

// src/frontend/icons.ts
/*! src/frontend/icons.ts — shared inline SVG icon set (stroke-based, currentColor) */
var ICON_PATHS = {
  system: '<rect x="3.5" y="4.5" width="17" height="11.5" rx="2"/><path d="M9.5 20h5M12 16v4"/>',
  shield: '<path d="M12 3l7 2.9v5.3c0 4.7-3 9.1-7 10.8-4-1.7-7-6.1-7-10.8V5.9z"/>',
  map: '<path d="M9 4L3 6.3v13.5L9 17.8l6 2 6-2.3V4L15 6.3 9 4z"/><path d="M9 4v13.8M15 6.3v13.5"/>',
  d20: '<path d="M12 2.6l8.1 4.7v9.4L12 21.4l-8.1-4.7V7.3z"/><path d="M12 7.2l4.3 2.5v4.9L12 17.1l-4.3-2.5V9.7z"/>',
  chat: '<path d="M4.5 6.3A2.3 2.3 0 0 1 6.8 4h10.4a2.3 2.3 0 0 1 2.3 2.3v6.9a2.3 2.3 0 0 1-2.3 2.3H9.7l-5.2 4.6z"/>',
  cog: '<circle cx="12" cy="12" r="3.05"/><path d="M12 2.6v3.2M12 18.2v3.2M2.6 12h3.2M18.2 12h3.2M5 5l2.3 2.3M16.7 16.7L19 19M19 5l-2.3 2.3M7.3 16.7L5 19"/>',
  gem: '<path d="M7.2 3.5h9.6l4 6-8.8 11-8.8-11z"/><path d="M3.2 9.5h17.6M12 20.5L8.4 9.5 12 3.5l3.6 6z"/>',
  spark: '<path d="M12 3l1.9 5.2 5.2 1.9-5.2 1.9L12 17.2l-1.9-5.2-5.2-1.9 5.2-1.9z"/>',
  sparkles: '<path d="M10.5 5l1.5 3.9 3.9 1.5-3.9 1.5-1.5 3.9-1.5-3.9L5.1 10.4 9 8.9z"/><path d="M18.5 3l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  star: '<path d="M12 2.8l2.8 5.8 6.3.8-4.7 4.3 1.2 6.2L12 17.4l-5.6 3.5 1.2-6.2-4.7-4.3 6.3-.8z"/>',
  crosshair: '<circle cx="12" cy="12" r="7.2"/><path d="M12 2v4.4M12 17.6V22M2 12h4.4M17.6 12H22"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
  bag: '<path d="M6.2 8h11.6l1.3 11.2a2 2 0 0 1-2 2.3H6.9a2 2 0 0 1-2-2.3z"/><path d="M9.3 10.8V6.7a2.7 2.7 0 0 1 5.4 0v4.1"/>',
  compass: '<circle cx="12" cy="12" r="8.4"/><path d="M15.2 8.8l-1.8 4.6-4.6 1.8 1.8-4.6z"/>',
  clock: '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.2V12l3.2 2.1"/>',
  timer: '<circle cx="12" cy="13.2" r="7.4"/><path d="M12 9.6v3.8l2.4 1.5M9.3 2.6h5.4"/>',
  lock: '<rect x="5" y="10.4" width="14" height="9.4" rx="2.2"/><path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6"/>',
  check: '<path d="M4.5 12.6l5.1 5L19.7 6"/>',
  zap: '<path d="M13 2L5.5 13.5H11L10 22l7.5-11.5H12z"/>',
  arrow: '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
  warn: '<path d="M12 3.6L22 20.5H2z"/><path d="M12 10v4.6M12 17.6h.01"/>',
  eye: '<path d="M2.5 12S6.5 5.8 12 5.8 21.5 12 21.5 12 17.5 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'
};
function icon(name, size) {
  const px = Math.max(10, Math.min(24, Number(size) || 14));
  const body = ICON_PATHS[name];
  if (!body) return "";
  return `<svg class="wc-ic" width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

// src/frontend/cards.ts
/*! src/frontend/cards.ts */
function escXml(val) {
  return String(val ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escXmlAttr(val) {
  return escXml(val).replace(/"/g, "&quot;");
}
function esc(val) {
  return String(val ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function pct(cur, max) {
  if (!max || max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(cur / max * 100)));
}
function resolveSystemTheme(settings) {
  if (settings.systemTheme === "blue") return "ocean";
  if (settings.systemTheme === "gold") return "gold";
  return settings.theme;
}
function arcSegments(label) {
  const s = (label || "").toLowerCase().trim();
  const ladders = [
    ["opening", "setup", "calm", "arrival", "early simmer"],
    ["rising", "building", "escalation", "invest", "escal", "simmer"],
    ["turning", "complication", "midpoint tension", "tension", "twist"],
    ["climax", "crisis", "confrontation", "peak", "combat", "intimacy"],
    ["fallout", "resolution", "breather", "aftermath", "resolve", "epilog"]
  ];
  for (let i = 0; i < ladders.length; i++) {
    if (ladders[i].some((k) => s.includes(k))) return i + 1;
  }
  return 2;
}
function noticeIcon(kind) {
  switch (kind) {
    case "levelup":
      return icon("star", 18);
    case "quest":
      return icon("spark", 18);
    case "item":
      return icon("gem", 18);
    case "skill":
      return icon("zap", 18);
    case "change":
      return icon("arrow", 18);
    default:
      return icon("warn", 18);
  }
}
function verdictClass(verdict) {
  if (verdict === "nat 20") return "is-crit";
  if (verdict === "success" || verdict === "win") return "is-good";
  if (verdict === "success, at a cost" || verdict === "tie") return "is-warn";
  return "is-bad";
}
function renderNoticeCard(notice, theme) {
  return `
    <div class="wc-msn" data-wc-theme="${esc(theme)}" data-k="${esc(notice.kind)}" role="status" aria-live="polite">
      <div class="wc-msn-h">
        <div class="wc-msn-i">${noticeIcon(notice.kind)}</div>
        <div class="wc-msn-tt">${esc(notice.title)}</div>
      </div>
      <div class="wc-msn-b">
        ${notice.lines.map((line) => `<div class="wc-msn-ln">${esc(line)}</div>`).join("")}
      </div>
    </div>
  `;
}
function renderDiceCard(r, theme) {
  const statStr = r.stat === "none" ? "Flat" : `${r.stat.toUpperCase()} ${formatMod(r.statMod)}`;
  const gearStr = r.gearBonus !== 0 ? ` ${formatMod(r.gearBonus)}` : "";
  const skillStr = r.skillLabel ? ` + ${esc(r.skillLabel)} ${formatMod(r.skillBonus)}` : "";
  return `
    <div class="wc-mg-dice ${verdictClass(r.verdict)} ${!r.consumed ? "is-pending" : ""}" data-wc-theme="${esc(theme)}">
      <div class="wc-dice-ring">${r.total}</div>
      <div class="wc-dice-dt">
        <b>${esc(r.action)}</b>
        <span>${esc(r.who)}${!r.consumed ? " \xB7 Queued for next reply" : ""}</span>
      </div>
      <div class="wc-dice-dm">
        <em class="wc-dice-vd">${esc(r.verdict.toUpperCase())}</em>
        <small>d20 ${r.roll}${r.mode && r.mode !== "normal" ? ` <span class="wc-dice-edge">${r.mode === "adv" ? "ADV" : "DIS"}</span>` : ""} (${esc(statStr)}${esc(gearStr)}${skillStr}) <span class="wc-dice-dc">DC ${r.dc}</span>${r.contestFoe ? ` \xB7 vs ${esc(r.contestFoe.name)} ${r.contestFoe.total}` : ""}</small>
        ${r.lootSummary ? `<small class="wc-dice-loot">${icon("bag", 12)} ${esc(r.lootSummary)}</small>` : ""}
      </div>
    </div>
  `;
}
function renderDiceCardCompact(r, theme) {
  return `
    <div class="wc-dice-compact ${verdictClass(r.verdict)} ${!r.consumed ? "is-pending" : ""}" data-wc-theme="${esc(theme)}" title="${esc(r.action)} \u2014 d20 ${r.roll}${r.gearBonus !== 0 ? ` ${formatMod(r.gearBonus)} gear` : ""} vs DC ${r.dc}">
      <span class="wc-dice-compact-n">${r.total}</span>
      <span class="wc-dice-compact-t"><b>${esc(r.who)}</b> \xB7 ${esc(r.action)}${r.mode && r.mode !== "normal" ? r.mode === "adv" ? " \xB7 ADV" : " \xB7 DIS" : ""}${!r.consumed ? " \xB7 pending" : ""}</span>
      <em class="wc-dice-compact-v">${esc(r.verdict.toUpperCase())}</em>
    </div>
  `;
}
function formatRollForChat(r) {
  const statStr = r.stat === "none" ? "Flat" : `${r.stat.toUpperCase()} ${formatMod(r.statMod)}`;
  const gearStr = r.gearBonus !== 0 ? ` ${formatMod(r.gearBonus)} gear` : "";
  const skillStr = r.skillLabel ? ` + ${r.skillLabel} ${formatMod(r.skillBonus)}` : "";
  const edgeStr = r.mode === "adv" ? " (advantage)" : r.mode === "dis" ? " (disadvantage)" : "";
  const keptStr = r.advRoll !== null && r.advRoll !== void 0 ? ` [kept ${r.roll}, dropped ${r.advRoll}]` : "";
  const contestStr = r.contestFoe ? ` \u2014 defeats ${r.contestFoe.name} ${r.contestFoe.total}` : "";
  const lootStr = r.lootSummary ? ` \u2014 ${r.lootSummary}` : "";
  return `${r.who} \u2014 ${r.action}: d20 ${r.roll}${keptStr}${edgeStr} (${statStr}${gearStr}${skillStr}) vs DC ${r.dc} = ${r.total} \u2014 ${String(r.verdict).toUpperCase()}${contestStr}${lootStr}`;
}
function formatChoiceText(text) {
  return esc(text).replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
}
function renderChoicesCard(choices, theme, opts) {
  const options = Array.isArray(choices?.options) ? choices.options : [];
  if (options.length === 0) return "";
  const claimedArr = Array.isArray(choices.claimed) ? choices.claimed : [];
  const claimed = new Set(claimedArr.filter((n) => Number.isInteger(n)));
  const snapKey = opts?.snapKey || "";
  const startOpen = Boolean(opts?.open);
  const allClaimed = claimed.size >= options.length;
  return `
    <details class="wc-cy" data-wc-theme="${esc(theme)}" ${startOpen ? "open" : ""}>
      <summary class="wc-cy-h">
        <span class="wc-cy-gem">${icon("spark", 15)}</span>
        <span class="wc-cy-hd"><span class="wc-cy-lab">What now?</span><span class="wc-cy-sum">${allClaimed ? "Path chosen" : "Pick your next move"}</span></span>
        ${claimed.size > 0 ? `<span class="wc-cy-count">${claimed.size}/${options.length} sent</span>` : ""}
      </summary>
      <div class="wc-cy-b">
        ${options.map((o, i) => {
    const isClaimed = claimed.has(i);
    const kind = (o.kind || "").toLowerCase();
    const kindAttr = kind ? ` data-k="${esc(kind)}"` : "";
    const heat = Number(o.heat) || 0;
    const heatAttr = heat >= 1 && heat <= 3 ? ` data-h="${heat}"` : "";
    const heatDots = heat >= 1 && heat <= 3 ? `<i>${"\u25CF".repeat(heat)}</i>` : "";
    return `<button type="button" class="wc-cy-opt ${isClaimed ? "is-claimed" : ""}"${kindAttr}${heatAttr} data-act="choice_pick" data-key="${esc(snapKey)}" data-idx="${i}" ${isClaimed ? "disabled" : ""} title="${isClaimed ? "Already sent" : "Send this as your next message"}">
            <span class="wc-cy-n">${i + 1}</span>
            <span class="wc-cy-t">${kind ? `<span class="wc-cy-k">${esc(kind)}${heatDots}</span>` : ""}<strong class="wc-cy-tx">${formatChoiceText(o.text)}</strong>${o.stakes ? `<span class="wc-cy-st">${esc(o.stakes)}</span>` : ""}${o.req ? `<span class="wc-cy-rq">${icon("lock", 10)}${esc(o.req)}</span>` : ""}</span>
            <span class="wc-cy-go">${isClaimed ? icon("check", 16) : icon("arrow", 16)}</span>
          </button>`;
  }).join("")}
        <div class="wc-cy-hint">${allClaimed ? "Choice sent \u2014 the story continues" : "Tap a path to send it"}</div>
      </div>
    </details>
  `;
}
function renderQuestEntry(q, interactive) {
  return `
    <div class="wc-msq" data-s="${esc(q.status)}" data-k="${esc(q.kind)}">
      <div class="wc-msq-h">
        <b class="wc-msq-t">${esc(q.title)}</b>
        <span class="wc-msq-k">${esc(q.kind)}</span>
        <span class="wc-msq-s">${esc(q.status)}</span>
      </div>
      ${q.objectives.length > 0 ? `<div class="wc-msq-objs">
               ${q.objectives.map(
    (o) => interactive ? `<button type="button" class="wc-mso is-btn" data-x="${o.done ? "1" : "0"}" data-act="toggle_obj_btn" data-qid="${esc(q.id)}" data-oid="${esc(o.id)}"><span>${esc(o.text)}</span>${o.progress ? `<em class="wc-mso-prog">${esc(o.progress)}</em>` : ""}</button>` : `<div class="wc-mso" data-x="${o.done ? "1" : "0"}"><span>${esc(o.text)}</span>${o.progress ? `<em class="wc-mso-prog">${esc(o.progress)}</em>` : ""}</div>`
  ).join("")}
             </div>` : ""}
      ${q.reward ? `<div class="wc-msq-rw">${esc(q.reward)}</div>` : ""}
      ${q.penalty ? `<div class="wc-msq-pn">${esc(q.penalty)}</div>` : ""}
      ${interactive ? `<div class="wc-msq-acts">
               <button class="wc-btn is-xs" data-act="cycle_quest_status" data-id="${esc(q.id)}">${q.status === "active" ? "Mark Done" : q.status === "available" ? "Accept" : "Reopen"}</button>
               <button class="wc-btn is-xs" data-act="edit_quest" data-id="${esc(q.id)}">Edit</button>
               <button class="wc-btn is-xs" data-act="rm_quest" data-id="${esc(q.id)}">\xD7</button>
             </div>` : ""}
    </div>
  `;
}
function renderInventoryWindow(s, settings) {
  const sysTh = resolveSystemTheme(settings);
  const maxBonus = computeMaxGearBonus(s);
  const slots = [
    { key: "weapon", label: "WEAPON", defaultCat: "weapon" },
    { key: "armor", label: "ARMOR", defaultCat: "armor" },
    { key: "accessory", label: "ACCESSORY", defaultCat: "accessory" }
  ];
  return `
    <div class="wc-ms is-open-panel" data-wc-theme="${esc(sysTh)}">
      <div class="wc-ms-win">
        <div class="wc-ms-hdr">
          <div class="wc-ms-ic">${icon("gem", 17)}</div>
          <div class="wc-ms-tt2">INVENTORY</div>
          <button class="wc-btn is-primary is-xs" data-act="add_item" style="flex:none; height:34px; padding:0 10px;">+ Item</button>
        </div>

        <div class="wc-ms-sec" style="border-top:none; padding-top:0;">
          <div class="wc-ms-shd">
            <span>EQUIPPED GEAR</span>
            <span class="wc-ms-ptpill">ROLL BONUS +${maxBonus}</span>
          </div>
          <div class="wc-ms-eqgrid">
            ${slots.map(({ key, label, defaultCat }) => {
    const it = s.gear[key];
    if (!it) {
      return `
                    <div class="wc-ms-eqslot is-empty" data-t="${defaultCat}">
                      <span class="wc-ms-eqlbl">${label}</span>
                      <span class="wc-msit-i is-dim"></span>
                      <span class="wc-ms-eqnm is-empty">Empty</span>
                    </div>
                  `;
    }
    const rb = typeof it.rollBonus === "number" ? it.rollBonus : rarityRollBonus(it.rarity);
    return `
                  <div class="wc-ms-eqslot" data-t="${esc(it.category)}" data-r="${esc(it.rarity)}" title="${esc(it.note || it.name)}">
                    <span class="wc-ms-eqlbl">${label}</span>
                    ${rb > 0 ? `<span class="wc-ms-eqbon">+${rb}</span>` : ""}
                    <span class="wc-msit-i"></span>
                    <span class="wc-ms-eqnm">${esc(it.name)}</span>
                    <button class="wc-ms-eqbtn" data-act="unequip" data-slot="${key}">Unequip</button>
                  </div>
                `;
  }).join("")}
          </div>
        </div>

        <div class="wc-ms-sec">
          <div class="wc-ms-shd">
            <span>PACK (${s.bag.length} / 24)</span>
            <span class="wc-ms-sublbl">TAP TILE TO INSPECT</span>
          </div>
          ${s.bag.length > 0 ? `<div class="wc-ms-grid">
                   ${s.bag.map((it) => {
    const canEquip = it.category === "weapon" || it.category === "armor" || it.category === "accessory";
    return `
                         <div class="wc-msit" data-t="${esc(it.category)}" data-r="${esc(it.rarity)}" title="${esc(it.note || it.name)}">
                           ${it.qty > 1 ? `<span class="wc-msit-c">${it.qty}</span>` : ""}
                           <button type="button" class="wc-msit-hit" data-act="edit_item" data-id="${esc(it.id)}">
                             <span class="wc-msit-i"></span>
                             <span class="wc-msit-n">${esc(it.name)}</span>
                           </button>
                           <div class="wc-msit-bar">
                             ${canEquip ? `<button type="button" class="wc-msit-act is-eq" data-act="equip" data-id="${esc(it.id)}">Equip</button>` : ""}
                             <button type="button" class="wc-msit-act" data-act="rm_item" data-id="${esc(it.id)}">\u22121</button>
                           </div>
                         </div>
                       `;
  }).join("")}
                 </div>` : `<div class="wc-ms-empty">Your pack is empty. Tap <strong>+ Item</strong> or sync after looting.</div>`}
        </div>

        <div class="wc-ms-cash">
          <span class="wc-ms-cash-k">FUNDS</span>
          <span class="wc-ms-cash-v">${esc(s.cash || "None recorded")}</span>
          <button class="wc-btn is-xs" data-act="edit_identity">Edit</button>
        </div>
      </div>
    </div>
  `;
}
function renderQuestWindow(s, settings) {
  const sysTh = resolveSystemTheme(settings);
  const activeCount = s.quests.filter((q) => q.status === "active").length;
  const availCount = s.quests.filter((q) => q.status === "available").length;
  return `
    <div class="wc-ms is-open-panel" data-wc-theme="${esc(sysTh)}">
      <div class="wc-ms-win">
        <div class="wc-ms-hdr">
          <div class="wc-ms-ic">${icon("spark", 17)}</div>
          <div class="wc-ms-tt2">QUEST INFO</div>
          <button class="wc-btn is-primary is-xs" data-act="add_quest" style="flex:none; height:34px; padding:0 10px;">+ Quest</button>
        </div>

        <div class="wc-ms-shd">
          <span>ACTIVE: ${activeCount}${availCount ? ` \xB7 AVAILABLE: ${availCount}` : ""}</span>
          <span class="wc-ms-sublbl">${s.quests.length} / 8 LOGGED</span>
        </div>

        ${s.quests.length > 0 ? `<div class="wc-msq-list">
                 ${s.quests.map((q) => renderQuestEntry(q, true)).join("")}
               </div>` : `<div class="wc-ms-empty">No quests tracked yet. Tap <strong>+ Quest</strong> or sync your story.</div>`}
      </div>
    </div>
  `;
}
function renderSystemWindow(s, settings, opts) {
  const sysTh = resolveSystemTheme(settings);
  const hpPct = pct(s.hp, s.hpMax);
  const spPct = pct(s.sp, s.spMax);
  const mpPct = pct(s.mp, s.mpMax);
  const xpPct = pct(s.xp, s.xpNext);
  const metaTags = [s.race, s.cls, s.subcls, s.guild, s.title].filter(Boolean);
  const isDrawer = opts.mode === "drawer";
  const innerBody = `
    <div class="wc-ms-win">
      <div class="wc-ms-hero">
        <div class="wc-ms-hero-l">
          <div class="wc-ms-nm">${esc(s.name)}</div>
          <div class="wc-ms-meta">
            ${metaTags.length > 0 ? metaTags.map((t) => `<span class="wc-ms-tag">${esc(t)}</span>`).join("") : `<span class="wc-ms-tag is-dim">Unclassed</span>`}
          </div>
        </div>
        <div class="wc-ms-badges">
          <span class="wc-ms-bdg">LV ${s.level}</span>
          ${s.rank ? `<span class="wc-ms-bdg is-rank">${esc(s.rank)}</span>` : ""}
          ${isDrawer ? `<button class="wc-btn is-xs" data-act="edit_identity">Edit</button>` : ""}
        </div>
      </div>

      <div class="wc-ms-pools">
        <div class="wc-ms-pool">
          <div class="wc-ms-ph">
            <span class="wc-ms-pl is-hp">HP</span>
            <div class="wc-actions-row">
              <span class="wc-ms-pv">${s.hp} / ${s.hpMax}</span>
              ${isDrawer ? `<button class="wc-btn is-xs" data-act="pool" data-pool="hp" data-delta="-5">-5</button>
                     <button class="wc-btn is-xs" data-act="pool" data-pool="hp" data-delta="-1">-1</button>
                     <button class="wc-btn is-xs" data-act="pool" data-pool="hp" data-delta="1">+1</button>
                     <button class="wc-btn is-xs" data-act="pool" data-pool="hp" data-delta="5">+5</button>` : ""}
            </div>
          </div>
          <div class="wc-ms-bar"><i class="is-hp" style="width:${hpPct}%"></i></div>
        </div>

        <div class="wc-ms-pool">
          <div class="wc-ms-ph">
            <span class="wc-ms-pl is-sp">SP</span>
            <div class="wc-actions-row">
              <span class="wc-ms-pv">${s.sp} / ${s.spMax}</span>
              ${isDrawer ? `<button class="wc-btn is-xs" data-act="pool" data-pool="sp" data-delta="-3">-3</button>
                     <button class="wc-btn is-xs" data-act="pool" data-pool="sp" data-delta="3">+3</button>` : ""}
            </div>
          </div>
          <div class="wc-ms-bar"><i class="is-sp" style="width:${spPct}%"></i></div>
        </div>

        ${s.useMp ? `<div class="wc-ms-pool">
                <div class="wc-ms-ph">
                  <span class="wc-ms-pl is-mp">${esc(s.mpLabel)}</span>
                  <div class="wc-actions-row">
                    <span class="wc-ms-pv">${s.mp} / ${s.mpMax}</span>
                    ${isDrawer ? `<button class="wc-btn is-xs" data-act="pool" data-pool="mp" data-delta="-3">-3</button>
                           <button class="wc-btn is-xs" data-act="pool" data-pool="mp" data-delta="3">+3</button>` : ""}
                  </div>
                </div>
                <div class="wc-ms-bar"><i class="is-mp" style="width:${mpPct}%"></i></div>
              </div>` : ""}

        ${settings.trackXp ? `<div class="wc-ms-pool">
                <div class="wc-ms-ph">
                  <span class="wc-ms-pl is-xp">XP</span>
                  <div class="wc-actions-row">
                    <span class="wc-ms-pv">${s.xp} / ${s.xpNext}</span>
                    ${isDrawer ? `<button class="wc-btn is-xs" data-act="add_xp" data-xp="15">+15</button>
                           <button class="wc-btn is-xs" data-act="add_xp" data-xp="50">+50</button>` : ""}
                  </div>
                </div>
                <div class="wc-ms-bar"><i class="is-xp" style="width:${xpPct}%"></i></div>
              </div>` : ""}
      </div>

      ${isDrawer ? `<div class="wc-actions-row" style="justify-content:space-between; margin-top:2px;">
               <div class="wc-actions-row">
                 <button class="wc-btn is-xs" data-act="rest" data-kind="short">Short Rest</button>
                 <button class="wc-btn is-xs" data-act="rest" data-kind="long">Long Rest</button>
               </div>
               <span class="wc-ms-log">${esc(s.lastLog || "")}</span>
             </div>` : ""}

      <div class="wc-ms-sec">
        <div class="wc-ms-shd">
          <span>ATTRIBUTES</span>
          ${s.pts > 0 ? `<span class="wc-actions-row">
                   <span class="wc-ms-ptpill">+${s.pts} UNSPENT</span>
                   <button class="wc-btn is-primary is-xs" data-act="auto_alloc">Auto</button>
                 </span>` : `<span class="wc-ms-sublbl">WEFT BANDS (-2..+6)</span>`}
        </div>
        <div class="wc-ms-stats">
          ${STAT_KEYS.map((k) => {
    const v = s.stats[k];
    const mod = statModifier(v);
    return `
              <div class="wc-ms-st">
                <span class="wc-ms-stl">${esc(s.statLabels[k])}</span>
                <span class="wc-ms-stv">${v}</span>
                <span class="wc-ms-stm">${formatMod(mod)}</span>
                <span class="wc-ms-stb">${esc(statBandName(v))}</span>
                ${s.pts > 0 ? `<button class="wc-stat-plus" data-act="alloc" data-stat="${k}">+1</button>` : ""}
              </div>
            `;
  }).join("")}
        </div>
      </div>

      ${!isDrawer && (s.gear.weapon || s.gear.armor || s.gear.accessory || s.bag.length > 0) ? `<div class="wc-ms-sec">
               <div class="wc-ms-shd"><span>EQUIPMENT & PACK</span><span class="wc-ms-sublbl">Bonus +${computeMaxGearBonus(s)}${s.cash ? ` \xB7 ${esc(s.cash)}` : ""}</span></div>
               <div class="wc-ms-chips">
                 ${["weapon", "armor", "accessory"].map((slot) => {
    const it = s.gear[slot];
    if (!it) return "";
    const rb = typeof it.rollBonus === "number" ? it.rollBonus : rarityRollBonus(it.rarity);
    return `<span class="wc-msi" data-r="${esc(it.rarity)}"><b>${slot[0].toUpperCase()}: ${esc(it.name)}</b>${rb > 0 ? `<em>+${rb}</em>` : ""}</span>`;
  }).join("")}
                 ${s.bag.slice(0, 6).map(
    (it) => `<span class="wc-msi" data-r="${esc(it.rarity)}"><b>${esc(it.name)}${it.qty > 1 ? ` \xD7${it.qty}` : ""}</b></span>`
  ).join("")}
               </div>
             </div>` : ""}

      ${s.effects.length > 0 || isDrawer ? `<div class="wc-ms-sec">
               <div class="wc-ms-shd">
                 <span>ACTIVE EFFECTS</span>
                 ${isDrawer ? `<button class="wc-btn is-xs" data-act="modal_add" data-kind="effect">+ Effect</button>` : ""}
               </div>
               ${s.effects.length > 0 ? `<div class="wc-ms-chips">${s.effects.map(
    (e) => `<span class="wc-ms-chip ${e.kind === "buff" ? "is-buff" : e.kind === "debuff" ? "is-debuff" : ""}" title="${esc(e.note)}">
                              ${esc(e.name)}${e.duration !== null ? ` (${e.duration}t)` : ""}
                              ${isDrawer ? `<button class="wc-chip-x" data-act="rm_effect" data-id="${esc(e.id)}">\xD7</button>` : ""}
                            </span>`
  ).join("")}</div>` : `<div class="wc-ms-empty">No active conditions.</div>`}
             </div>` : ""}

      ${s.skills.length > 0 || isDrawer ? `<div class="wc-ms-sec">
               <div class="wc-ms-shd">
                 <span>SKILLS & TRAITS</span>
                 ${isDrawer ? `<button class="wc-btn is-xs" data-act="modal_add" data-kind="skill">+ Skill</button>` : ""}
               </div>
               ${s.skills.length > 0 ? `<div class="wc-ms-chips">${s.skills.map(
    (sk) => `<span class="wc-ms-chip" title="${esc(sk.note)}">
                              ${esc(sk.name)}${sk.cost ? ` \xB7 ${esc(sk.cost)}` : ""}
                              ${isDrawer ? `<button class="wc-chip-x" data-act="rm_skill" data-id="${esc(sk.id)}">\xD7</button>` : ""}
                            </span>`
  ).join("")}</div>` : `<div class="wc-ms-empty">No skills recorded yet.</div>`}
             </div>` : ""}

      ${!isDrawer && s.quests.some((q) => q.status === "active" || q.status === "available") ? `<div class="wc-ms-sec">
               <div class="wc-ms-shd"><span>ACTIVE QUESTS</span></div>
               <div class="wc-msq-list">
                 ${s.quests.filter((q) => q.status === "active" || q.status === "available").slice(0, 3).map((q) => renderQuestEntry(q, false)).join("")}
               </div>
             </div>` : ""}
    </div>
  `;
  if (isDrawer) {
    return `
      <div class="wc-ms is-open-panel" data-wc-theme="${esc(sysTh)}">
        <div class="wc-ms-headbar">
          <span class="wc-ms-gem">${icon("crosshair", 15)}</span>
          <div class="wc-ms-hd">
            <span class="wc-ms-lab">SYSTEM \xB7 STATUS</span>
            <span class="wc-ms-sum">${esc(s.name)} \xB7 LV ${s.level} \xB7 HP ${s.hp}/${s.hpMax}</span>
          </div>
          ${s.pts > 0 ? `<span class="wc-ms-ptb">+${s.pts}</span>` : ""}
        </div>
        ${innerBody}
      </div>
    `;
  }
  return `
    <details class="wc-ms" data-wc-theme="${esc(sysTh)}" ${opts.open ? "open" : ""}>
      <summary>
        <span class="wc-ms-gem">${icon("crosshair", 15)}</span>
        <span class="wc-ms-hd">
          <span class="wc-ms-lab">STATUS</span>
          <span class="wc-ms-sum">
            <span>${esc(s.name)}</span>
            <span class="wc-ms-slv">LV ${s.level}</span>
            <span class="wc-ms-shp">HP ${s.hp}/${s.hpMax}</span>
          </span>
        </span>
        ${s.pts > 0 ? `<span class="wc-ms-ptb">+${s.pts}</span>` : ""}
      </summary>
      ${innerBody}
    </details>
  `;
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
function renderTrackerBar(kind, label, value) {
  return `
    <div class="wc-mg-bar k-${kind}">
      <b>${label}</b>
      <span class="wc-mg-track"><u style="width:${pct(value, 100)}%"></u></span>
      <em>${value} \xB7 ${esc(bshStage(kind, value))}</em>
    </div>
  `;
}
function renderTrackerNpcCard(n, settings, isDrawer) {
  const initial = (n.name || "?").trim().charAt(0).toUpperCase();
  const bars = [
    settings.trackerShowBond ? renderTrackerBar("bond", "Bond", n.bond) : "",
    settings.trackerShowSpark ? renderTrackerBar("spark", "Spark", n.spark) : "",
    settings.trackerShowHeat && (settings.heatDisplay !== "charged" || n.heat >= 25) ? renderTrackerBar("heat", "Heat", n.heat) : ""
  ].filter(Boolean).join("");
  return `
    <div class="wc-mg-npc">
      <div class="wc-mg-npc-top">
        <div class="wc-mg-npc-id">
          <span class="wc-mg-av">${esc(initial)}</span>
          <div>
            <div class="wc-mg-npc-nm">
              <strong>${esc(n.name)}</strong>
              ${n.mood ? `<span class="wc-mg-mood">${esc(n.mood)}</span>` : ""}
            </div>
            ${n.role ? `<div class="wc-mg-npc-role">${esc(n.role)}</div>` : ""}
          </div>
        </div>
        ${isDrawer ? `<div class="wc-actions-row">
                 <button class="wc-btn is-xs" data-act="npc_bond" data-id="${esc(n.id)}" data-delta="-5">-5</button>
                 <button class="wc-btn is-xs" data-act="npc_bond" data-id="${esc(n.id)}" data-delta="5">+5</button>
                 <button class="wc-btn is-xs" data-act="edit_npc" data-id="${esc(n.id)}">Edit</button>
                 <button class="wc-btn is-xs" data-act="rm_npc" data-id="${esc(n.id)}">\xD7</button>
               </div>` : ""}
      </div>

      ${bars ? `<div class="wc-mg-bars">${bars}</div>` : ""}

      ${settings.trackerShowThought && n.lastThought ? `<div class="wc-mg-thought">\u201C${esc(n.lastThought)}\u201D</div>` : ""}

      ${n.goal ? `<div class="wc-mg-field"><b>Wants</b><span>${esc(n.goal)}</span></div>` : ""}

      ${settings.trackerShowSecret && n.secret ? `<details class="wc-mg-secret"><summary>Secret</summary><p>${esc(n.secret)}</p></details>` : ""}
    </div>
  `;
}
function renderTrackerCard(w, settings, opts) {
  const isDrawer = opts.mode === "drawer";
  const presentNpcs = w.npcs.filter((n) => n.present);
  const awayNpcs = w.npcs.filter((n) => !n.present);
  const openThreads = w.threads.filter((t) => t.status === "active");
  const seeds = w.threads.filter((t) => t.status === "seed");
  const resolvedThreads = w.threads.filter((t) => t.status === "resolved");
  const segs = (count) => [1, 2, 3, 4, 5].map((i) => `<i class="${i <= count ? "is-on" : ""}"></i>`).join("");
  const innerBody = `
    <div class="wc-mg-body">
      <div class="wc-mg-scene">
        <div class="wc-mg-scene-top">
          <div>
            <div class="wc-mg-loc">${esc(w.location || "Unknown Location")}</div>
            <div class="wc-mg-sub">${esc([`Day ${w.dayCount}`, w.time, w.weather, w.mood].filter(Boolean).join(" \xB7 "))}</div>
          </div>
          ${isDrawer ? `<button class="wc-btn is-xs" data-act="edit_world">Edit</button>` : ""}
        </div>
        <div class="wc-mg-meters">
          <div class="wc-mg-meter"><b>ARC</b><span class="wc-mg-seg">${segs(arcSegments(w.arc))}</span><em>${esc(w.arc || "Opening")}</em></div>
          <div class="wc-mg-meter"><b>PHASE</b><span class="wc-mg-seg">${segs(arcSegments(w.phase))}</span><em>${esc(w.phase || "Setup")}</em></div>
        </div>
        ${(() => {
    const pc = w.pc && typeof w.pc === "object" ? w.pc : {};
    const bits = [
      pc.outfit && `Wearing: <b>${esc(pc.outfit)}</b>`,
      pc.pos && `Position: <b>${esc(pc.pos)}</b>`,
      pc.cond && `Condition: <b>${esc(pc.cond)}</b>`,
      pc.carry && `Carrying: <b>${esc(pc.carry)}</b>`
    ].filter(Boolean);
    return bits.length > 0 ? `<div class="wc-pc-strip" title="What a camera would see">${bits.map((x) => `<span>${x}</span>`).join("<i>\xB7</i>")}</div>` : "";
  })()}
        ${w.notes ? `<div class="wc-mg-note">${esc(w.notes)}</div>` : ""}
      </div>

      <div class="wc-mg-sec">
        <div class="wc-mg-shd">
          <span>IN SCENE (${presentNpcs.length})</span>
          ${isDrawer ? `<button class="wc-btn is-xs is-primary" data-act="add_npc">+ NPC</button>` : ""}
        </div>
        ${presentNpcs.length > 0 ? `<div class="wc-mg-npclist">${presentNpcs.map((n) => renderTrackerNpcCard(n, settings, isDrawer)).join("")}</div>` : `<div class="wc-mg-empty">No characters tracked in scene yet.</div>`}
      </div>

      ${awayNpcs.length > 0 ? `<div class="wc-mg-sec">
               <div class="wc-mg-shd"><span>OFFSCREEN (${awayNpcs.length})</span></div>
               <div class="wc-mg-offlist">
                 ${awayNpcs.map(
    (n) => `
                       <div class="wc-mg-offrow">
                         <span><strong>${esc(n.name)}</strong> \xB7 ${esc(n.location || "Elsewhere")} \xB7 Bond ${n.bond}</span>
                         ${isDrawer ? `<span class="wc-actions-row">
                                  <button class="wc-btn is-xs" data-act="edit_npc" data-id="${esc(n.id)}">Edit</button>
                                  <button class="wc-btn is-xs" data-act="rm_npc" data-id="${esc(n.id)}">\xD7</button>
                                </span>` : ""}
                       </div>
                     `
  ).join("")}
               </div>
             </div>` : ""}

      <div class="wc-mg-sec">
        <div class="wc-mg-shd">
          <span>THREADS & SEEDS</span>
          ${isDrawer ? `<button class="wc-btn is-xs is-primary" data-act="modal_add" data-kind="thread">+ Thread</button>` : ""}
        </div>
        ${openThreads.length + seeds.length + (isDrawer ? resolvedThreads.length : 0) > 0 ? `<div class="wc-mg-tlist">
                 ${[...openThreads, ...seeds, ...isDrawer ? resolvedThreads : []].map((t) => {
    const cls = t.status === "resolved" ? "is-good" : t.status === "seed" ? "is-warn" : "";
    const isTimer = t.kind === "timer" && t.status !== "resolved" && Number.isFinite(t.turnsLeft);
    const urgent = isTimer && t.turnsLeft <= 2;
    return `
                       <div class="wc-mg-trow">
                         <div class="wc-mg-tmain">
                           <button class="wc-pill ${cls}" ${isDrawer ? `data-act="cycle_thread" data-id="${esc(t.id)}" style="cursor:pointer"` : ""}>${esc(t.status)}</button>
                           ${isTimer ? `<span class="wc-timer-chip${urgent ? " is-urgent" : ""}" title="Turns until the consequence lands">\u23F1 ${t.turnsLeft}t</span>` : ""}
                           <span><strong>${esc(t.title)}</strong>${t.detail ? ` \u2014 ${esc(t.detail)}` : ""}</span>
                         </div>
                         ${isDrawer ? `<button class="wc-btn is-xs" data-act="rm_thread" data-id="${esc(t.id)}">\xD7</button>` : ""}
                       </div>
                     `;
  }).join("")}
               </div>` : `<div class="wc-mg-empty">No open threads or timers logged.</div>`}
      </div>
    </div>
  `;
  if (isDrawer) {
    return `
      <div class="wc-mg is-open-panel" data-wc-theme="${esc(settings.theme)}">
        <div class="wc-mg-headbar">
          <span class="wc-mg-gem">${icon("spark", 14)}</span>
          <div class="wc-mg-hd">
            <span class="wc-mg-lab">STORY TRACKER</span>
            <span class="wc-mg-sum">${esc(w.location || "Scene")} \xB7 ${presentNpcs.length} here${openThreads.length ? ` \xB7 ${openThreads.length} thread${openThreads.length === 1 ? "" : "s"}` : ""}</span>
          </div>
        </div>
        ${innerBody}
      </div>
    `;
  }
  return `
    <details class="wc-mg" data-wc-theme="${esc(settings.theme)}" ${opts.open ? "open" : ""}>
      <summary>
        <span class="wc-mg-gem">${icon("spark", 14)}</span>
        <span class="wc-mg-hd">
          <span class="wc-mg-lab">TRACKER</span>
          <span class="wc-mg-sum">${esc(w.location || "Scene")} \xB7 ${esc(w.time || `Day ${w.dayCount}`)} \xB7 ${presentNpcs.length} in scene</span>
        </span>
      </summary>
      ${innerBody}
    </details>
  `;
}

// src/frontend/styles.ts
/*! src/frontend/styles.ts */
var WEFT_CHRONICLE_CSS = `
/* ---- Shared Theme RGB Tokens (matches Weft_v4_4 card_theme + Lumiverse Native) ---- */
.wc-root, .wc-inline-wrap, .wc-ms, .wc-msn, .wc-mg, .wc-mg-dice {
  --pr: 255, 130, 174;
  --vr: 253, 164, 184;
  --wc-accent: rgb(var(--pr));
  --wc-accent-2: rgb(var(--vr));
  --wc-accent-soft: rgba(var(--pr), 0.14);
  --wc-accent-border: rgba(var(--pr), 0.38);
  --wc-accent-ink: color-mix(in srgb, rgb(var(--pr)) 35%, #ffffff);
  --wc-bg: var(--lumiverse-fill-subtle, rgba(255, 255, 255, 0.03));
  --wc-card: var(--lumiverse-fill, rgba(255, 255, 255, 0.05));
  --wc-card-hover: rgba(255, 255, 255, 0.09);
  --wc-border: var(--lumiverse-border, rgba(255, 255, 255, 0.13));
  --wc-text: var(--lumiverse-text, #f2eef1);
  --wc-muted: var(--lumiverse-text-muted, rgba(242, 238, 241, 0.70));
  --wc-dim: var(--lumiverse-text-dim, rgba(242, 238, 241, 0.46));
  --wc-good: #34d399;
  --wc-warn: #fb923c;
  --wc-bad: #fb7185;
  --wc-hp: #f43f5e;
  --wc-sp: #f59e0b;
  --wc-mp: #38bdf8;
  --wc-xp: #34d399;
  --wc-radius: var(--lumiverse-radius, 10px);
  box-sizing: border-box;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

.wc-root *, .wc-inline-wrap *, .wc-modal * { box-sizing: border-box; }

[data-wc-theme="sakura"]    { --pr: 255, 130, 174; --vr: 253, 164, 184; }
[data-wc-theme="ocean"]     { --pr: 56, 189, 248;  --vr: 99, 102, 241;  }
[data-wc-theme="ember"]     { --pr: 251, 146, 60;  --vr: 244, 63, 94;   }
[data-wc-theme="forest"]    { --pr: 52, 211, 153;  --vr: 132, 204, 22;  }
[data-wc-theme="violet"]    { --pr: 192, 132, 252; --vr: 217, 70, 239;  }
[data-wc-theme="gold"]      { --pr: 250, 204, 21;  --vr: 217, 119, 6;   }
[data-wc-theme="teal"]      { --pr: 45, 212, 191;  --vr: 16, 185, 129;  }
[data-wc-theme="crimson"]   { --pr: 244, 63, 94;   --vr: 159, 18, 57;   }
[data-wc-theme="mono"]      { --pr: 161, 161, 170; --vr: 113, 113, 122; }
[data-wc-theme="lumiverse"] { --pr: 155, 140, 245; --vr: 129, 113, 229; }
[data-wc-theme="contrast"]  { --pr: 255, 214, 0;   --vr: 255, 176, 0;    }
/* High-contrast: pure black cards, #FFF text, hard borders, yellow accents */
.wc-root[data-wc-theme="contrast"], .wc-inline-wrap[data-wc-theme="contrast"], [data-wc-theme="contrast"] .wc-cy {
  --wc-card: #000000;
  --wc-card-hover: #111111;
  --wc-border: rgba(255, 255, 255, 0.9);
  --wc-text: #ffffff;
  --wc-muted: #f0f0f0;
  --wc-dim: #c9c9c9;
  --wc-good: #4ade80;
  --wc-warn: #ffd600;
  --wc-bad: #ff6b6b;
  --wc-accent-ink: #ffd600;
  --wc-accent-border: rgba(255, 214, 0, 0.75);
}

/* ---- Light Mode Adaptations ---- */
[data-theme-mode="light"] .wc-root,
[data-theme-mode="light"] .wc-inline-wrap {
  --wc-card: rgba(0, 0, 0, 0.035);
  --wc-card-hover: rgba(0, 0, 0, 0.065);
  --wc-border: rgba(0, 0, 0, 0.12);
  --wc-text: var(--lumiverse-text, #1d1a21);
  --wc-muted: var(--lumiverse-text-muted, rgba(29, 26, 33, 0.68));
  --wc-dim: var(--lumiverse-text-dim, rgba(29, 26, 33, 0.48));
  --wc-accent-ink: color-mix(in srgb, rgb(var(--pr)) 75%, #161018);
  --wc-good: #0f8a5f;
  --wc-warn: #c2650b;
  --wc-bad: #c82341;
}

/* ---- Drawer Root & Chrome ---- */
.wc-root {
  color: var(--wc-text);
  font-size: 13px;
  line-height: 1.45;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 10px 22px;
}

.wc-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--wc-radius);
  background: var(--wc-card);
  border: 1px solid var(--wc-border);
}
.wc-brand { display: flex; align-items: center; gap: 8px; min-width: 0; }
.wc-brand-dot {
  width: 9px; height: 9px; border-radius: 99px;
  background: var(--wc-accent);
  box-shadow: 0 0 9px var(--wc-accent);
  flex-shrink: 0;
}
.wc-brand-title { font-weight: 700; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wc-brand-sub { font-size: 11px; color: var(--wc-muted); }
.wc-brand-sub.is-bad { color: var(--wc-bad); font-weight: 700; }
.wc-actions-row { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }

.wc-tabs {
  display: flex;
  align-items: stretch;
  gap: 3px;
  padding: 4px;
  border-radius: var(--wc-radius);
  background: var(--wc-card);
  border: 1px solid var(--wc-border);
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.wc-tabs::-webkit-scrollbar { display: none; }
.wc-tab-icon { flex: 0 0 auto; width: 34px; padding-left: 0; padding-right: 0; }
.wc-tab {
  appearance: none;
  border: 1px solid transparent;
  background: transparent;
  color: var(--wc-muted);
  font-size: 10.5px;
  font-weight: 700;
  padding: 6px 7px;
  border-radius: calc(var(--wc-radius) - 3px);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex: 1 0 max-content;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.wc-tab .wc-ic { flex: none; }
.wc-tab:hover { color: var(--wc-text); background: var(--wc-card-hover); }
.wc-tab.is-active {
  background: var(--wc-accent-soft);
  color: var(--wc-accent-ink);
  border-color: var(--wc-accent-border);
}
.wc-tab.is-off { opacity: 0.45; }

/* ---- Generic Cards, Pills, Buttons, Form Controls ---- */
.wc-card {
  border-radius: var(--wc-radius);
  background: var(--wc-card);
  border: 1px solid var(--wc-border);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.wc-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.wc-card-title { font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--wc-accent-ink); }
.wc-muted { color: var(--wc-muted); font-size: 12px; }
.wc-dim { color: var(--wc-dim); font-size: 11px; }

.wc-pill {
  display: inline-flex; align-items: center;
  padding: 1px 6px; border-radius: 99px;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
  background: var(--wc-accent-soft); color: var(--wc-accent-ink); border: 1px solid var(--wc-accent-border);
}
.wc-pill.is-good { background: rgba(52,211,153,0.16); color: var(--wc-good); border-color: rgba(52,211,153,0.38); }
.wc-pill.is-warn { background: rgba(251,146,60,0.16); color: var(--wc-warn); border-color: rgba(251,146,60,0.38); }
.wc-pill.is-bad  { background: rgba(251,113,133,0.16); color: var(--wc-bad);  border-color: rgba(251,113,133,0.38); }
.wc-pill.is-muted { background: transparent; color: var(--wc-muted); border-color: var(--wc-border); }

.wc-btn {
  appearance: none;
  border: 1px solid var(--wc-border);
  background: rgba(127,127,127,0.10);
  color: inherit;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  padding: 5px 9px;
  border-radius: 7px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: background 0.14s, border-color 0.14s;
}
.wc-btn:hover:not(:disabled) { background: rgba(var(--pr), 0.18); border-color: rgba(var(--pr), 0.5); }
.wc-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.wc-btn.is-primary { background: rgba(var(--pr), 0.18); border-color: rgba(var(--pr), 0.48); color: var(--wc-accent-ink); }
.wc-btn.is-primary:hover:not(:disabled) { background: rgb(var(--pr)); color: #110c10; }
.wc-btn.is-danger { border-color: rgba(251,113,133,0.45); color: var(--wc-bad); }
.wc-btn.is-xs { padding: 2px 6px; font-size: 10.5px; border-radius: 5px; }

.wc-input, .wc-select, .wc-textarea {
  width: 100%;
  background: var(--wc-bg);
  color: var(--wc-text);
  border: 1px solid var(--wc-border);
  border-radius: 7px;
  padding: 6px 8px;
  font-family: inherit;
  font-size: 12.5px;
  outline: none;
}
.wc-input:focus, .wc-select:focus, .wc-textarea:focus { border-color: var(--wc-accent); }
.wc-field { display: flex; flex-direction: column; gap: 4px; }
.wc-field label { font-size: 11px; font-weight: 600; color: var(--wc-muted); }
.wc-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.wc-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
@media (max-width: 480px) {
  .wc-row-2, .wc-row-3 { grid-template-columns: 1fr; }
  .wc-modal-foot { flex-wrap: wrap; }
}
.wc-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 4px 0; cursor: pointer; }
.wc-toggle-row span { font-size: 12.5px; }
.wc-toggle-row small { display: block; font-size: 11px; color: var(--wc-dim); }
.wc-toggle-row input[type="checkbox"] { width: 16px; height: 16px; accent-color: rgb(var(--pr)); cursor: pointer; flex-shrink: 0; }

.wc-banner {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--wc-accent-border);
  background: var(--wc-accent-soft);
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

/* ============================================================================
   1. AUTHENTIC WEFT LITRPG SYSTEM WINDOW (.wc-ms) \u2014 Glowing 8-Corner HUD Frame
   ============================================================================ */
.wc-ms {
  --a: rgb(var(--pr));
  --tx: color-mix(in srgb, rgb(var(--vr)) 14%, #ffffff);
  --dim: color-mix(in srgb, var(--tx) 64%, transparent);
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(var(--pr), 0.46);
  color: var(--tx);
  background:
    radial-gradient(125% 85% at 50% 0%, rgba(var(--pr), 0.25), rgba(var(--vr), 0.08) 46%, transparent 70%),
    linear-gradient(172deg, color-mix(in srgb, rgb(var(--pr)) 14%, #0a090e), color-mix(in srgb, rgb(var(--vr)) 8%, #050508));
  box-shadow: 0 8px 26px -12px rgba(var(--pr), 0.48), inset 0 0 28px rgba(var(--pr), 0.14);
}
.wc-ms::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  border-radius: 8px;
  background:
    linear-gradient(var(--a), var(--a)) 0 0/13px 2px no-repeat,
    linear-gradient(var(--a), var(--a)) 0 0/2px 13px no-repeat,
    linear-gradient(var(--a), var(--a)) 100% 0/13px 2px no-repeat,
    linear-gradient(var(--a), var(--a)) 100% 0/2px 13px no-repeat,
    linear-gradient(var(--a), var(--a)) 0 100%/13px 2px no-repeat,
    linear-gradient(var(--a), var(--a)) 0 100%/2px 13px no-repeat,
    linear-gradient(var(--a), var(--a)) 100% 100%/13px 2px no-repeat,
    linear-gradient(var(--a), var(--a)) 100% 100%/2px 13px no-repeat;
  opacity: 0.92;
}
[data-theme-mode="light"] .wc-ms {
  --tx: color-mix(in srgb, rgb(var(--vr)) 45%, #18141c);
  --dim: color-mix(in srgb, var(--tx) 66%, transparent);
  background:
    radial-gradient(125% 85% at 50% 0%, rgba(var(--pr), 0.18), rgba(var(--vr), 0.06) 50%, transparent 74%),
    linear-gradient(172deg, color-mix(in srgb, rgb(var(--pr)) 8%, #ffffff), color-mix(in srgb, rgb(var(--vr)) 5%, #f7f6fa));
  box-shadow: 0 6px 20px -10px rgba(var(--pr), 0.35), inset 0 0 22px rgba(var(--pr), 0.09);
}

.wc-ms > summary, .wc-ms-headbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 13px;
  list-style: none;
  user-select: none;
  border-bottom: 1px solid rgba(var(--pr), 0.22);
}
.wc-ms > summary { cursor: pointer; }
.wc-ms > summary::-webkit-details-marker { display: none; }
.wc-ms > summary::after {
  content: "";
  flex: none;
  width: 7px; height: 7px;
  border-right: 1.6px solid var(--tx);
  border-bottom: 1.6px solid var(--tx);
  opacity: 0.65;
  margin-top: -3px;
  transform: rotate(45deg);
  transition: transform 0.2s;
}
.wc-ms[open] > summary::after { margin-top: 3px; transform: rotate(225deg); }
.wc-ms:not([open]):not(.is-open-panel) > summary { border-bottom-color: transparent; }

.wc-ms-gem {
  flex: none;
  display: grid;
  place-items: center;
  width: 30px; height: 30px;
  border-radius: 6px;
  border: 1px solid rgba(var(--pr), 0.58);
  background: linear-gradient(155deg, rgba(var(--pr), 0.24), rgba(var(--vr), 0.1));
  color: var(--tx);
  box-shadow: 0 0 12px -3px rgba(var(--pr), 0.72);
}
.wc-ms-hd { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.wc-ms-lab { font-size: 10.5px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--a); text-shadow: 0 0 10px rgba(var(--pr), 0.5); }
.wc-ms-sum { font-size: 12px; color: var(--dim); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.wc-ms-slv { color: var(--tx); font-weight: 700; }
.wc-ms-ptb {
  padding: 2px 8px; border-radius: 99px;
  border: 1px solid rgba(var(--pr), 0.75);
  background: rgba(var(--pr), 0.22);
  color: var(--tx);
  font-size: 11px; font-weight: 800;
  box-shadow: 0 0 10px -2px rgba(var(--pr), 0.65);
}

.wc-ms-win { padding: 11px 12px 13px; display: flex; flex-direction: column; gap: 11px; }
.wc-ms-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.wc-ms-nm { font-size: 16.5px; font-weight: 800; letter-spacing: 0.02em; }
.wc-ms-meta { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 3px; }
.wc-ms-tag {
  font-size: 10.5px; font-weight: 600;
  padding: 1px 7px; border-radius: 4px;
  border: 1px solid rgba(var(--pr), 0.3);
  background: rgba(var(--pr), 0.1);
  color: var(--tx);
}
.wc-ms-tag.is-dim { opacity: 0.65; }
.wc-ms-badges { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
.wc-ms-bdg {
  padding: 2px 8px; border-radius: 5px;
  border: 1px solid rgba(var(--pr), 0.65);
  background: linear-gradient(145deg, rgba(var(--pr), 0.26), rgba(var(--vr), 0.12));
  font-size: 11.5px; font-weight: 800; letter-spacing: 0.05em;
  box-shadow: 0 0 10px -3px rgba(var(--pr), 0.55);
}

.wc-ms-pools { display: flex; flex-direction: column; gap: 7px; }
.wc-ms-pool { display: flex; flex-direction: column; gap: 3px; }
.wc-ms-ph { display: flex; align-items: center; justify-content: space-between; font-size: 11.5px; gap: 6px; }
.wc-ms-pl { font-weight: 800; letter-spacing: 0.08em; }
.wc-ms-pl.is-hp { color: #fb7185; }
.wc-ms-pl.is-sp { color: #fbbf24; }
.wc-ms-pl.is-mp { color: #38bdf8; }
.wc-ms-pl.is-xp { color: #34d399; }
.wc-ms-pv { font-variant-numeric: tabular-nums; font-weight: 600; color: var(--dim); }
.wc-ms-bar {
  height: 7px; width: 100%; border-radius: 3px;
  background: rgba(127, 127, 127, 0.22);
  border: 1px solid rgba(var(--pr), 0.2);
  overflow: hidden;
}
.wc-ms-bar i { display: block; height: 100%; border-radius: 2px; transition: width 0.25s ease; }
.wc-ms-bar i.is-hp { background: linear-gradient(90deg, #e11d48, #fb7185); box-shadow: 0 0 8px rgba(244,63,94,0.55); }
.wc-ms-bar i.is-sp { background: linear-gradient(90deg, #d97706, #fbbf24); box-shadow: 0 0 8px rgba(245,158,11,0.5); }
.wc-ms-bar i.is-mp { background: linear-gradient(90deg, #2563eb, #38bdf8); box-shadow: 0 0 8px rgba(56,189,248,0.55); }
.wc-ms-bar i.is-xp { background: linear-gradient(90deg, #059669, #34d399); box-shadow: 0 0 8px rgba(52,211,153,0.55); }
.wc-ms-log { font-size: 11px; color: var(--dim); text-align: right; }

.wc-ms-sec { display: flex; flex-direction: column; gap: 6px; padding-top: 6px; border-top: 1px solid rgba(var(--pr), 0.2); }
.wc-ms-shd { display: flex; align-items: center; justify-content: space-between; font-size: 10px; font-weight: 800; letter-spacing: 0.14em; color: var(--a); }
.wc-ms-sublbl { font-size: 9.5px; letter-spacing: 0.05em; color: var(--dim); font-weight: 600; }
.wc-ms-ptpill { padding: 1px 7px; border-radius: 99px; background: rgba(var(--pr), 0.24); border: 1px solid rgba(var(--pr), 0.6); color: var(--tx); font-size: 10px; font-weight: 800; }

.wc-ms-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.wc-ms-st {
  border-radius: 6px;
  border: 1px solid rgba(var(--pr), 0.3);
  background: rgba(var(--pr), 0.06);
  padding: 7px 5px;
  display: flex; flex-direction: column; align-items: center; gap: 1px;
}
.wc-ms-stl { font-size: 10px; font-weight: 800; letter-spacing: 0.12em; color: var(--dim); }
.wc-ms-stv { font-size: 18px; font-weight: 800; line-height: 1.1; font-variant-numeric: tabular-nums; }
.wc-ms-stm { font-size: 11px; font-weight: 800; color: var(--a); }
.wc-ms-stb { font-size: 9.5px; color: var(--dim); }
.wc-stat-plus {
  margin-top: 3px; width: 100%; padding: 2px 4px; font-size: 11px; font-weight: 800;
  border-radius: 4px; border: 1px solid rgba(var(--pr), 0.65);
  background: rgba(var(--pr), 0.24); color: var(--tx); cursor: pointer;
}
.wc-stat-plus:hover { background: rgb(var(--pr)); color: #120c10; }

.wc-ms-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.wc-ms-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 8px; border-radius: 4px; font-size: 11px;
  border: 1px solid rgba(var(--pr), 0.32); background: rgba(var(--pr), 0.08);
}
.wc-ms-chip.is-buff { border-color: rgba(52,211,153,0.5); color: var(--wc-good); }
.wc-ms-chip.is-debuff { border-color: rgba(251,113,133,0.5); color: var(--wc-bad); }
.wc-ms-empty { font-size: 11.5px; color: var(--dim); }
.wc-ms-qlist { display: flex; flex-direction: column; gap: 5px; }
.wc-ms-qrow { padding: 6px 8px; border-radius: 5px; border: 1px solid rgba(var(--pr), 0.24); background: rgba(var(--pr), 0.05); font-size: 12px; }
.wc-ms-qobj { font-size: 11.5px; color: var(--dim); margin-top: 2px; }
.wc-ms-qobj.is-done { text-decoration: line-through; opacity: 0.6; }

/* ============================================================================
   1B. AUTHENTIC WEFT HOLOGRAPHIC INVENTORY GRID & QUEST INFO WINDOW
   ============================================================================ */
.wc-ms-hdr {
  display: flex;
  align-items: center;
  gap: 6px;
}
.wc-ms-ic {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 1.5px solid var(--tx);
  background: rgba(var(--pr), 0.09);
  color: var(--tx);
}
.wc-ms-tt2 {
  flex: 1;
  height: 34px;
  border-radius: 5px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(var(--pr), 0.48);
  background: rgba(var(--pr), 0.06);
  font-size: 13.5px;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  text-shadow: 0 0 10px var(--a);
}

.wc-ms-eqgrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
}
.wc-ms-eqslot {
  --rc: rgba(var(--pr), 0.48);
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 5px 6px;
  border-radius: 4px 11px 4px 11px;
  border: 1px solid var(--rc);
  background: linear-gradient(160deg, rgba(var(--pr), 0.16), rgba(var(--pr), 0.04));
  box-shadow: 0 0 10px -4px var(--rc), inset 0 0 10px -5px var(--rc);
  text-align: center;
}
.wc-ms-eqslot.is-empty {
  border-style: dashed;
  border-color: rgba(var(--pr), 0.28);
  background: rgba(var(--pr), 0.03);
  box-shadow: none;
}
.wc-ms-eqlbl {
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--dim);
}
.wc-ms-eqbon {
  position: absolute;
  top: 3px;
  right: 5px;
  font-size: 9.5px;
  font-weight: 800;
  color: var(--rc);
  text-shadow: 0 0 6px var(--rc);
}
.wc-ms-eqnm {
  font-size: 10.5px;
  font-weight: 700;
  line-height: 1.2;
  max-width: 100%;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.wc-ms-eqnm.is-empty { color: var(--dim); font-weight: 500; }
.wc-ms-eqbtn {
  appearance: none;
  margin-top: auto;
  border: 1px solid rgba(var(--pr), 0.36);
  background: rgba(var(--pr), 0.1);
  color: var(--tx);
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 9.5px;
  font-weight: 700;
  cursor: pointer;
}
.wc-ms-eqbtn:hover { background: rgba(var(--pr), 0.28); }

.wc-ms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 8px;
}
.wc-msit {
  --rc: rgba(190, 230, 255, 0.48);
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 7px 4px 5px;
  border: 1px solid var(--rc);
  border-radius: 4px 12px 4px 12px;
  background: linear-gradient(160deg, rgba(var(--pr), 0.18), rgba(var(--pr), 0.04));
  box-shadow: 0 0 10px -3px var(--rc), inset 0 0 12px -5px var(--rc);
}
.wc-msit-hit {
  appearance: none;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0;
  cursor: pointer;
}
.wc-msit-i {
  flex: none;
  width: 28px;
  height: 28px;
  background: center/contain no-repeat url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpath%20fill%3D%27white%27%20fill-rule%3D%27evenodd%27%20d%3D%27M9%202h6l-1.2%203H16c3%203.2%205%206.8%205%2010.5%200%203.3-2.2%206.5-5.5%206.5h-7C5.2%2022%203%2018.8%203%2015.5%203%2011.8%205%208.2%208%205h2.2z%27%2F%3E%3C%2Fsvg%3E");
  filter: drop-shadow(0 0 5px rgba(var(--pr), 0.92)) drop-shadow(0 0 1px #fff);
}
.wc-msit-i.is-dim { opacity: 0.25; filter: none; }
[data-t="weapon" i] .wc-msit-i   { background-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpath%20fill%3D%27white%27%20fill-rule%3D%27evenodd%27%20d%3D%27M19%202h3v3L11%2016l-3-3zM5.5%2012.5l6%206-1.8%201.8-6-6zM7%2017l-4%204%202%202%204-4z%27%2F%3E%3C%2Fsvg%3E"); }
[data-t="armor" i] .wc-msit-i    { background-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpath%20fill%3D%27white%27%20fill-rule%3D%27evenodd%27%20d%3D%27M12%202l8.5%203v6.2c0%205.2-3.6%209.3-8.5%2010.8C7.1%2020.5%203.5%2016.4%203.5%2011.2V5z%27%2F%3E%3C%2Fsvg%3E"); }
[data-t="accessory" i] .wc-msit-i{ background-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpath%20fill%3D%27white%27%20fill-rule%3D%27evenodd%27%20d%3D%27M7%203h10l5%206-10%2012L2%209z%27%2F%3E%3C%2Fsvg%3E"); }
[data-t="potion" i] .wc-msit-i   { background-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpath%20fill%3D%27white%27%20fill-rule%3D%27evenodd%27%20d%3D%27M9%202h6v2h-1.2v4.3l4.6%209.1c.8%201.7-.4%203.6-2.3%203.6H7.9c-1.9%200-3.1-1.9-2.3-3.6l4.6-9.1V4H9z%27%2F%3E%3C%2Fsvg%3E"); }
[data-t="material" i] .wc-msit-i { background-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpath%20fill%3D%27white%27%20fill-rule%3D%27evenodd%27%20d%3D%27M20%203C10.5%203%204.5%208%204.5%2015c0%201.9.6%203.5%201.6%205C7.5%2015.5%2010.5%2012%2015%209.5%2011%2012.5%208.5%2016%207.5%2021%2017%2020.5%2020%2012%2020%203z%27%2F%3E%3C%2Fsvg%3E"); }
[data-t="key" i] .wc-msit-i      { background-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpath%20fill%3D%27white%27%20fill-rule%3D%27evenodd%27%20d%3D%27M15.5%202.5a6%206%200%201%200%200%2012%206%206%200%200%200%200-12zm0%203a1.8%201.8%200%201%201%200%203.6%201.8%201.8%200%200%201%200-3.6zM11.3%2013.7l-8.8%208.8V19l1.6-1.6%201.2%201.2%201.3-1.3-1.2-1.2%201.6-1.6%201.3%201.3%201.9-1.9z%27%2F%3E%3C%2Fsvg%3E"); }
[data-t="book" i] .wc-msit-i     { background-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpath%20fill%3D%27white%27%20fill-rule%3D%27evenodd%27%20d%3D%27M5%202h12a3%203%200%200%201%203%203v17H7a3%203%200%200%201-3-3V3a1%201%200%200%201%201-1zm2%203v11h10V5z%27%2F%3E%3C%2Fsvg%3E"); }
[data-t="valuable" i] .wc-msit-i { background-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%3E%3Cpath%20fill%3D%27white%27%20fill-rule%3D%27evenodd%27%20d%3D%27M12%202a10%2010%200%201%200%200%2020%2010%2010%200%200%200%200-20zm0%204a6%206%200%201%201%200%2012%206%206%200%200%201%200-12zm0%203a3%203%200%201%200%200%206%203%203%200%200%200%200-6z%27%2F%3E%3C%2Fsvg%3E"); }

.wc-msit-n {
  max-width: 100%;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1.18;
  text-align: center;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.wc-msit-c {
  position: absolute;
  top: 2px;
  right: 6px;
  font-size: 10px;
  font-weight: 800;
  text-shadow: 0 0 6px var(--a);
}
.wc-msit-c::before { content: "\xD7"; }
.wc-msit-bar {
  display: flex;
  gap: 3px;
  width: 100%;
  justify-content: center;
  margin-top: 2px;
}
.wc-msit-act {
  appearance: none;
  border: 1px solid rgba(var(--pr), 0.35);
  background: rgba(var(--pr), 0.1);
  color: var(--tx);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 9.5px;
  font-weight: 700;
  cursor: pointer;
}
.wc-msit-act.is-eq { border-color: var(--rc); background: rgba(var(--pr), 0.22); }
.wc-msit-act:hover { background: rgb(var(--pr)); color: #120c10; }

/* Authentic Weft Rarity Glow Tokens */
.wc-msit[data-r="common" i], .wc-ms-eqslot[data-r="common" i], .wc-msi[data-r="common" i]       { --rc: #9ca3af; }
.wc-msit[data-r="uncommon" i], .wc-ms-eqslot[data-r="uncommon" i], .wc-msi[data-r="uncommon" i] { --rc: #34d399; }
.wc-msit[data-r="rare" i], .wc-ms-eqslot[data-r="rare" i], .wc-msi[data-r="rare" i]             { --rc: #38bdf8; }
.wc-msit[data-r="epic" i], .wc-ms-eqslot[data-r="epic" i], .wc-msi[data-r="epic" i]             { --rc: #c084fc; }
.wc-msit[data-r="legendary" i], .wc-ms-eqslot[data-r="legendary" i], .wc-msi[data-r="legendary" i]{ --rc: #facc15; }
.wc-msit[data-r="mythic" i], .wc-ms-eqslot[data-r="mythic" i], .wc-msi[data-r="mythic" i]       { --rc: #fb7185; }

.wc-msi {
  --rc: rgba(var(--pr), 0.5);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 9px;
  border-radius: 999px;
  border: 1px solid var(--rc);
  background: rgba(var(--pr), 0.08);
  font-size: 11px;
  color: var(--tx);
}
.wc-msi b { font-weight: 600; }
.wc-msi em { font-style: normal; font-size: 9.5px; font-weight: 800; color: var(--rc); }

.wc-ms-cash {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 6px;
  border: 1px solid rgba(250, 204, 21, 0.45);
  background: linear-gradient(145deg, rgba(250, 204, 21, 0.14), rgba(217, 119, 6, 0.05));
}
.wc-ms-cash-k { font-size: 10px; font-weight: 800; letter-spacing: 0.14em; color: #facc15; }
.wc-ms-cash-v { flex: 1; font-size: 12.5px; font-weight: 700; }

/* Authentic Weft Quest Info Cards (.wc-msq + .wc-mso) */
.wc-msq-list { display: flex; flex-direction: column; gap: 8px; }
.wc-msq {
  padding: 9px 11px;
  border-radius: 6px;
  border: 1px solid rgba(var(--pr), 0.36);
  background: rgba(var(--pr), 0.06);
}
.wc-msq[data-s="done" i], .wc-msq[data-s="failed" i] { opacity: 0.78; }
.wc-msq[data-s="failed" i] { border-color: rgba(251, 113, 133, 0.55); }
.wc-msq-h { display: flex; flex-wrap: wrap; align-items: center; gap: 5px 6px; margin-bottom: 6px; }
.wc-msq-t { flex: 1 1 120px; font-size: 13px; letter-spacing: 0.02em; text-shadow: 0 0 8px rgba(var(--pr), 0.5); }
.wc-msq-k, .wc-msq-s {
  padding: 1px 7px;
  border: 1px solid rgba(var(--pr), 0.42);
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.wc-msq[data-s="active" i] .wc-msq-s    { color: #7dd3fc; border-color: #7dd3fc; }
.wc-msq[data-s="available" i] .wc-msq-s { color: #fcd34d; border-color: #fcd34d; }
.wc-msq[data-s="done" i] .wc-msq-s      { color: #4ade80; border-color: #4ade80; }
.wc-msq[data-s="failed" i] .wc-msq-s    { color: #fb7185; border-color: #fb7185; }

.wc-msq-objs { display: flex; flex-direction: column; }
.wc-mso {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  width: 100%;
  text-align: left;
  border: none;
  border-bottom: 1px dotted rgba(var(--pr), 0.28);
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12px;
}
.wc-mso.is-btn { cursor: pointer; }
.wc-mso.is-btn:hover { color: var(--a); }
.wc-mso::after { content: "\u2610"; flex: none; opacity: 0.85; font-size: 13px; }
.wc-mso[data-x="1"] { opacity: 0.72; }
.wc-mso[data-x="1"] span { text-decoration: line-through; }
.wc-mso[data-x="1"]::after { content: "\u2611"; color: #4ade80; text-shadow: 0 0 6px #4ade80; }

.wc-msq-rw, .wc-msq-pn { margin-top: 6px; font-size: 11.5px; }
.wc-msq-rw::before, .wc-msq-pn::before {
  font-weight: 800;
  font-size: 9.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-right: 7px;
}
.wc-msq-rw::before { content: "REWARD"; color: #4ade80; }
.wc-msq-pn::before { content: "WARNING"; color: #fb7185; }
.wc-msq-pn { color: #fda4af; }
.wc-msq-acts { display: flex; justify-content: flex-end; gap: 5px; margin-top: 7px; }

/* Light Mode adjustments for Inventory Grid & Quest Cards */
[data-theme-mode="light"] .wc-msit,
[data-theme-mode="light"] .wc-ms-eqslot,
[data-theme-mode="light"] .wc-msq {
  background: rgba(255, 255, 255, 0.86);
}
[data-theme-mode="light"] .wc-msit-i {
  filter: brightness(0.18) drop-shadow(0 0 2px rgba(var(--pr), 0.35));
}
[data-theme-mode="light"] .wc-ms-cash {
  background: rgba(254, 243, 199, 0.9);
  border-color: rgba(180, 83, 9, 0.45);
}
[data-theme-mode="light"] .wc-ms-cash-k { color: #92400e; }
[data-theme-mode="light"] .wc-msit[data-r="uncommon" i], [data-theme-mode="light"] .wc-ms-eqslot[data-r="uncommon" i], [data-theme-mode="light"] .wc-msi[data-r="uncommon" i] { --rc: #15803d; }
[data-theme-mode="light"] .wc-msit[data-r="rare" i], [data-theme-mode="light"] .wc-ms-eqslot[data-r="rare" i], [data-theme-mode="light"] .wc-msi[data-r="rare" i]             { --rc: #1d4ed8; }
[data-theme-mode="light"] .wc-msit[data-r="epic" i], [data-theme-mode="light"] .wc-ms-eqslot[data-r="epic" i], [data-theme-mode="light"] .wc-msi[data-r="epic" i]             { --rc: #7e22ce; }
[data-theme-mode="light"] .wc-msit[data-r="legendary" i], [data-theme-mode="light"] .wc-ms-eqslot[data-r="legendary" i], [data-theme-mode="light"] .wc-msi[data-r="legendary" i]{ --rc: #b45309; }
[data-theme-mode="light"] .wc-msit[data-r="mythic" i], [data-theme-mode="light"] .wc-ms-eqslot[data-r="mythic" i], [data-theme-mode="light"] .wc-msi[data-r="mythic" i]       { --rc: #be123c; }
[data-theme-mode="light"] .wc-msq[data-s="active" i] .wc-msq-s    { color: #0369a1; border-color: #0369a1; }
[data-theme-mode="light"] .wc-msq[data-s="available" i] .wc-msq-s { color: #b45309; border-color: #b45309; }
[data-theme-mode="light"] .wc-msq[data-s="done" i] .wc-msq-s      { color: #047857; border-color: #047857; }
[data-theme-mode="light"] .wc-msq[data-s="failed" i] .wc-msq-s    { color: #be123c; border-color: #be123c; }

/* ============================================================================
   2. AUTHENTIC WEFT SYSTEM NOTIFICATION (.wc-msn)
   ============================================================================ */
.wc-msn {
  --a: rgb(var(--pr));
  --tx: color-mix(in srgb, rgb(var(--vr)) 14%, #ffffff);
  --ln: rgba(var(--pr), 0.5);
  max-width: 460px;
  margin: 6px auto;
  padding: 9px;
  border: 1px solid rgba(var(--pr), 0.78);
  border-radius: 5px;
  color: var(--tx);
  text-align: center;
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(var(--pr), 0.28), rgba(var(--vr), 0.1) 46%, transparent 70%),
    linear-gradient(170deg, color-mix(in srgb, rgb(var(--pr)) 15%, #0a090e), color-mix(in srgb, rgb(var(--vr)) 8%, #050508));
  box-shadow: 0 0 0 1px rgba(var(--pr), 0.35), 0 0 20px -4px rgba(var(--pr), 0.45), inset 0 0 24px rgba(var(--pr), 0.16);
}
.wc-msn[data-k="levelup"] { --pr: 250, 204, 21; --vr: 217, 119, 6; }
.wc-msn[data-k="warn"]    { --pr: 251, 113, 133; --vr: 159, 18, 57; }
.wc-msn[data-k="item"]    { --pr: 94, 200, 242; --vr: 13, 116, 144; }
[data-theme-mode="light"] .wc-msn {
  --tx: color-mix(in srgb, rgb(var(--vr)) 45%, #18141c);
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(var(--pr), 0.2), rgba(var(--vr), 0.06) 50%, transparent 72%),
    linear-gradient(170deg, color-mix(in srgb, rgb(var(--pr)) 8%, #ffffff), #f7f6fa);
}
.wc-msn-h { display: flex; gap: 6px; margin-bottom: 8px; }
.wc-msn-i {
  flex: none; width: 34px; height: 34px; display: grid; place-items: center;
  border: 1.6px solid var(--tx); border-radius: 50%;
  background: rgba(var(--pr), 0.12); color: var(--tx);
  box-shadow: 0 0 8px rgba(var(--pr), 0.55);
}
.wc-msn-tt {
  flex: 1; display: grid; place-items: center;
  border: 1px solid var(--ln); background: rgba(var(--pr), 0.07);
  font-size: 13px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase;
  text-shadow: 0 0 10px rgba(var(--pr), 0.55);
}
.wc-msn-b { display: flex; flex-direction: column; gap: 3px; padding: 2px 4px; font-size: 12.5px; }

/* ============================================================================
   3. AUTHENTIC WEFT STORY TRACKER (.wc-mg) \u2014 Radial Dual-Accent + Bond/Spark/Heat
   ============================================================================ */
.wc-mg {
  --p: rgb(var(--pr));
  --v: rgb(var(--vr));
  --grad: linear-gradient(135deg, var(--p), var(--v));
  border-radius: 16px;
  border: 1px solid rgba(var(--pr), 0.34);
  overflow: hidden;
  color: var(--wc-text);
  background: linear-gradient(135deg, rgba(var(--pr), 0.08), rgba(var(--vr), 0.05) 55%, rgba(127,127,127,0.05));
  box-shadow: 0 10px 28px -14px rgba(var(--pr), 0.42);
}
[data-theme-mode="light"] .wc-mg {
  background: linear-gradient(135deg, rgba(var(--pr), 0.07), rgba(var(--vr), 0.04) 55%, rgba(255,255,255,0.88));
}
.wc-mg > summary, .wc-mg-headbar {
  display: flex; align-items: center; gap: 11px;
  padding: 10px 13px; list-style: none; user-select: none;
  background:
    radial-gradient(120% 160% at 0% 0%, rgba(var(--pr), 0.22), transparent 58%),
    radial-gradient(90% 140% at 100% 0%, rgba(var(--vr), 0.16), transparent 62%);
}
.wc-mg > summary { cursor: pointer; }
.wc-mg > summary::-webkit-details-marker { display: none; }
.wc-mg > summary::after {
  content: ""; flex: none; width: 7px; height: 7px;
  border-right: 1.6px solid currentColor; border-bottom: 1.6px solid currentColor;
  opacity: 0.55; margin-top: -3px; transform: rotate(45deg); transition: transform 0.2s;
}
.wc-mg[open] > summary::after { margin-top: 3px; transform: rotate(225deg); }
.wc-mg-gem {
  flex: none; display: grid; place-items: center;
  width: 32px; height: 32px; border-radius: 11px;
  background: var(--grad); color: #fff;
  box-shadow: 0 5px 16px -3px rgba(var(--pr), 0.55), inset 0 1px 0 rgba(255,255,255,0.35);
}
.wc-mg-hd { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.wc-mg-lab { font-size: 10.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--wc-accent-ink); }
.wc-mg-sum { font-size: 12px; color: var(--wc-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.wc-mg-body { padding: 10px 12px 13px; display: flex; flex-direction: column; gap: 11px; border-top: 1px solid rgba(127,127,127,0.16); }
.wc-mg-scene { display: flex; flex-direction: column; gap: 7px; }
.wc-mg-scene-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.wc-mg-loc { font-weight: 700; font-size: 14px; }
.wc-mg-sub { font-size: 11.5px; color: var(--wc-muted); }
.wc-mg-note { font-size: 11.5px; color: var(--wc-dim); }

.wc-mg-meters { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.wc-mg-meter {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 8px; border-radius: 9px;
  background: rgba(127,127,127,0.09); border: 1px solid rgba(127,127,127,0.16);
  font-size: 10.5px;
}
.wc-mg-meter b { font-weight: 800; letter-spacing: 0.08em; color: var(--wc-dim); }
.wc-mg-meter em { font-style: normal; font-weight: 700; color: var(--wc-text); margin-left: auto; }
.wc-mg-seg { display: flex; gap: 2px; }
.wc-mg-seg i { width: 8px; height: 5px; border-radius: 2px; background: rgba(127,127,127,0.24); }
.wc-mg-seg i.is-on { background: var(--grad); box-shadow: 0 0 6px rgba(var(--pr), 0.55); }

.wc-mg-sec { display: flex; flex-direction: column; gap: 6px; }
.wc-mg-shd { display: flex; align-items: center; justify-content: space-between; font-size: 10px; font-weight: 800; letter-spacing: 0.12em; color: var(--wc-accent-ink); }
.wc-mg-empty { font-size: 11.5px; color: var(--wc-dim); }

.wc-mg-npclist { display: flex; flex-direction: column; gap: 8px; }
.wc-mg-npc {
  padding: 9px 10px; border-radius: 12px;
  border: 1px solid rgba(127,127,127,0.2);
  background: rgba(127,127,127,0.06);
  display: flex; flex-direction: column; gap: 6px;
}
.wc-mg-npc-top { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.wc-mg-npc-id { display: flex; align-items: center; gap: 8px; min-width: 0; }
.wc-mg-av {
  width: 28px; height: 28px; border-radius: 9px; flex: none;
  display: grid; place-items: center;
  background: var(--grad); color: #fff; font-weight: 800; font-size: 13px;
}
.wc-mg-npc-nm { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 13px; }
.wc-mg-mood {
  font-size: 10.5px; font-weight: 600;
  padding: 1px 7px; border-radius: 99px;
  background: rgba(var(--pr), 0.14); color: var(--wc-accent-ink); border: 1px solid rgba(var(--pr), 0.3);
}
.wc-mg-npc-role { font-size: 11px; color: var(--wc-dim); }

.wc-mg-bars { display: flex; flex-direction: column; gap: 4px; }
.wc-mg-bar { display: grid; grid-template-columns: 42px 1fr 26px; align-items: center; gap: 7px; font-size: 11px; }
.wc-mg-bar b { font-weight: 700; color: var(--wc-muted); }
.wc-mg-bar em { font-style: normal; font-variant-numeric: tabular-nums; text-align: right; color: var(--wc-dim); font-weight: 700; }
.wc-mg-track { height: 6px; border-radius: 99px; background: rgba(127,127,127,0.2); overflow: hidden; display: block; }
.wc-mg-track u { display: block; height: 100%; border-radius: 99px; text-decoration: none; transition: width 0.25s ease; }
.wc-mg-bar.k-bond u  { background: linear-gradient(90deg, #f472b6, #fb7185); }
.wc-mg-bar.k-spark u { background: linear-gradient(90deg, #38bdf8, #a78bfa); }
.wc-mg-bar.k-heat u  { background: linear-gradient(90deg, #fb923c, #ef4444); }

.wc-mg-thought {
  font-style: italic; font-size: 12px; color: var(--wc-muted);
  padding: 5px 8px; border-left: 2px solid rgba(var(--pr), 0.55);
  background: rgba(var(--pr), 0.05); border-radius: 0 6px 6px 0;
}
.wc-mg-field { display: flex; gap: 6px; font-size: 12px; }
.wc-mg-field b { color: var(--wc-dim); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; flex: none; }
.wc-mg-secret { font-size: 11.5px; color: var(--wc-dim); }
.wc-mg-secret > summary { cursor: pointer; font-weight: 700; color: var(--wc-accent-ink); }
.wc-mg-secret p { margin: 3px 0 0; color: var(--wc-muted); }

.wc-mg-offlist, .wc-mg-tlist { display: flex; flex-direction: column; gap: 5px; }
.wc-mg-offrow, .wc-mg-trow {
  display: flex; align-items: center; justify-content: space-between; gap: 6px;
  padding: 6px 8px; border-radius: 9px;
  background: rgba(127,127,127,0.06); border: 1px solid rgba(127,127,127,0.16);
  font-size: 12px;
}
.wc-mg-tmain { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-width: 0; }

/* ============================================================================
   4. AUTHENTIC WEFT CIRCULAR d20 DICE CARD (.wc-mg-dice)
   ============================================================================ */
.wc-mg-dice {
  --c: rgb(var(--pr));
  display: flex; align-items: center; gap: 11px;
  padding: 8px 12px 8px 9px;
  border-radius: 15px;
  border: 1px solid rgba(127,127,127,0.28);
  background: linear-gradient(120deg, rgba(127,127,127,0.06), rgba(127,127,127,0.1));
  box-shadow: 0 8px 22px -15px var(--c);
}
.wc-mg-dice.is-crit { --c: #facc15; }
.wc-mg-dice.is-good { --c: #34d399; }
.wc-mg-dice.is-warn { --c: #fb923c; }
.wc-mg-dice.is-bad  { --c: #fb7185; }
.wc-mg-dice.is-pending { border-color: rgba(var(--pr), 0.55); background: rgba(var(--pr), 0.1); }

.wc-dice-ring {
  flex: none; display: grid; place-items: center;
  width: 44px; height: 44px; border-radius: 50%;
  border: 2px solid var(--c);
  background: radial-gradient(circle at 35% 30%, rgba(127,127,127,0.2), transparent 70%);
  box-shadow: 0 0 14px -3px var(--c), inset 0 0 10px -5px var(--c);
  font-size: 17px; font-weight: 800; font-variant-numeric: tabular-nums;
}
.wc-dice-dt { flex: 1 1 110px; min-width: 0; display: flex; flex-direction: column; }
.wc-dice-dt b { font-size: 13px; }
.wc-dice-dt span { opacity: 0.72; font-size: 11.5px; }
.wc-dice-dm { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; text-align: right; }
.wc-dice-vd {
  padding: 2px 9px; border-radius: 999px;
  border: 1px solid var(--c); background: rgba(127,127,127,0.08);
  font-size: 9.5px; font-style: normal; font-weight: 800; letter-spacing: 0.1em;
  color: var(--c); white-space: nowrap;
}
.wc-dice-dm small { font-size: 11px; opacity: 0.76; font-variant-numeric: tabular-nums; white-space: nowrap; }
.wc-dice-edge { font-style: normal; font-size: 9px; font-weight: 800; color: var(--wc-accent); border: 1px solid var(--wc-accent-border); border-radius: 4px; padding: 0 4px; letter-spacing: 0.08em; vertical-align: 1px; }
.wc-dice-dc { padding-left: 6px; margin-left: 4px; border-left: 1px solid rgba(127,127,127,0.35); }

/* ---- Inline Chat Bubble Container ---- */
[data-spindle-injected]:has(> .wc-inline-wrap) {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0;
}
.wc-inline-wrap {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: 8px 0 2px;
  width: 100%;
  max-width: 100%;
}
.wc-inline-wrap.is-after-island {
  margin-top: -6px;
}
.wc-inline-wrap.is-below {
  margin: 6px 0 2px;
}

/* ---- Gear, Quests, Chips & Modals ---- */
.wc-list { display: flex; flex-direction: column; gap: 6px; }
.wc-item-row {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 7px 9px; border-radius: 8px;
  border: 1px solid var(--wc-border); background: var(--wc-bg);
}
.wc-item-main { min-width: 0; flex: 1; }
.wc-item-name { font-weight: 600; font-size: 12.5px; display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
.wc-item-sub { font-size: 11px; color: var(--wc-muted); margin-top: 1px; }
.wc-chip-x { appearance: none; border: none; background: transparent; color: inherit; opacity: 0.65; cursor: pointer; padding: 0 2px; font-size: 12px; line-height: 1; }
.wc-chip-x:hover { opacity: 1; }
.wc-obj { display: flex; align-items: flex-start; gap: 6px; font-size: 12px; cursor: pointer; padding: 2px 0; }
.wc-obj.is-done { text-decoration: line-through; color: var(--wc-dim); }

.wc-rarity-uncommon  { color: #34d399; }
.wc-rarity-rare      { color: #38bdf8; }
.wc-rarity-epic      { color: #c084fc; }
.wc-rarity-legendary { color: #fbbf24; }
.wc-rarity-mythic    { color: #fb7185; }

/* ---- CYOA Choices ("What now?") ---- */
.wc-cy {
  margin: 6px auto;
  max-width: 520px;
  border: 1px solid var(--wc-accent-border);
  border-radius: var(--wc-radius, 12px);
  background:
    radial-gradient(120% 160% at 0% 0%, rgba(var(--pr), 0.14), transparent 58%),
    radial-gradient(90% 140% at 100% 0%, rgba(var(--vr), 0.12), transparent 62%),
    var(--wc-bg);
  box-shadow: 0 12px 32px -16px rgba(var(--pr), 0.35);
  overflow: hidden;
  font-size: 12.5px;
  color: var(--wc-text);
}
.wc-cy-h {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; cursor: pointer; list-style: none; user-select: none;
}
.wc-cy-h::-webkit-details-marker { display: none; }
.wc-cy-h::after { content: ""; flex: none; width: 7px; height: 7px; border-right: 1.6px solid currentColor; border-bottom: 1.6px solid currentColor; opacity: 0.5; margin-left: auto; transform: rotate(45deg); transition: transform 0.2s; }
.wc-cy[open] .wc-cy-h::after { transform: rotate(225deg); }
.wc-cy-gem {
  flex: none; display: grid; place-items: center; width: 30px; height: 30px;
  border-radius: 10px; background: linear-gradient(135deg, rgb(var(--pr)), rgb(var(--vr)));
  color: #fff;
  box-shadow: 0 5px 16px -3px rgba(var(--pr), 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.35);
}
.wc-cy-hd { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.wc-cy-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; background: linear-gradient(135deg, rgb(var(--pr)), rgb(var(--vr))); -webkit-background-clip: text; background-clip: text; color: transparent; }
.wc-cy-sum { font-size: 11px; color: var(--wc-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wc-cy-count { flex: none; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; color: var(--wc-accent); border: 1px solid var(--wc-accent-border); background: var(--wc-accent-soft); border-radius: 999px; padding: 2px 8px; }
.wc-cy-b { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px 12px; border-top: 1px solid var(--wc-border); }
.wc-cy-opt {
  --ka: var(--pr);
  position: relative; display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 8px 12px 8px 9px; border-radius: 10px; text-align: left; cursor: pointer;
  border: 1px solid rgba(var(--ka), 0.32);
  background: linear-gradient(100deg, rgba(var(--ka), 0.16), rgba(var(--ka), 0.05) 60%, rgba(127, 127, 127, 0.04));
  color: inherit; font: inherit; overflow: hidden;
  transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s, background 0.18s;
}
.wc-cy-opt::before { content: ""; position: absolute; left: 0; top: 14%; bottom: 14%; width: 3px; border-radius: 0 3px 3px 0; background: rgb(var(--ka)); }
.wc-cy-opt[data-k="direct"]     { --ka: 251, 113, 133; }
.wc-cy-opt[data-k="social"]     { --ka: 94, 200, 242; }
.wc-cy-opt[data-k="careful"]    { --ka: 52, 211, 153; }
.wc-cy-opt[data-k="investigate"]{ --ka: 250, 204, 21; }
.wc-cy-opt[data-k="action"]     { --ka: 251, 146, 60; }
.wc-cy-opt[data-k="intimate"]   { --ka: 244, 114, 182; }
.wc-cy-opt[data-k="wild"]       { --ka: 167, 139, 250; }
.wc-cy-opt:hover:not(:disabled) { border-color: rgba(var(--ka), 0.75); background: linear-gradient(100deg, rgba(var(--ka), 0.28), rgba(var(--ka), 0.08) 65%, rgba(127, 127, 127, 0.05)); box-shadow: 0 10px 26px -14px rgb(var(--ka)); transform: translateY(-1px); }
.wc-cy-opt:focus-visible { outline: 2px solid rgb(var(--ka)); outline-offset: 2px; }
.wc-cy-opt:disabled { opacity: 0.55; cursor: default; }
.wc-cy-opt.is-busy { opacity: 0.7; }
.wc-cy-opt.is-claimed { border-color: var(--wc-border); background: var(--wc-bg); }
.wc-cy-n {
  flex: none; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px;
  background: linear-gradient(135deg, rgb(var(--ka)), rgba(var(--ka), 0.62));
  color: #fff; font-size: 12px; font-weight: 800;
  box-shadow: 0 4px 12px -3px rgba(var(--ka), 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
.wc-cy-t { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; line-height: 1.42; }
.wc-cy-k { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 800; letter-spacing: 0.13em; text-transform: uppercase; color: rgb(var(--ka)); }
.wc-cy-k i { font-style: normal; letter-spacing: 2px; font-size: 8px; }
.wc-cy-tx { font-weight: 600; }
.wc-cy-tx em { font-style: italic; }
.wc-cy-st { font-size: 11px; color: var(--wc-muted); }
.wc-cy-rq { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: var(--wc-warn); }
.wc-cy-rq .wc-ic { opacity: 0.9; }
.wc-cy-go { flex: none; display: grid; place-items: center; color: rgb(var(--ka)); opacity: 0.6; padding-left: 6px; transition: transform 0.18s, opacity 0.18s; }
.wc-cy-opt:hover:not(:disabled) .wc-cy-go { opacity: 1; transform: translateX(3px); }
.wc-cy-opt.is-claimed .wc-cy-go { color: var(--wc-good); opacity: 1; }
.wc-cy-hint { text-align: center; font-size: 9.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--wc-dim); margin-top: 1px; }
@media (prefers-reduced-motion: reduce) {
  .wc-cy *, .wc-cy *::before, .wc-cy *::after { transition: none !important; }
  .wc-root *, .wc-root *::before, .wc-root *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
}

.wc-dice-compact { display: flex; align-items: center; gap: 9px; margin: 4px auto; max-width: 520px; padding: 5px 10px; border-radius: 9px; border: 1px solid var(--wc-accent-border); background: var(--wc-bg); font-size: 11px; color: var(--wc-text); }
.wc-dice-compact-n { flex: none; width: 26px; height: 26px; display: grid; place-items: center; border-radius: 7px; font-weight: 800; background: linear-gradient(135deg, rgb(var(--pr)), rgb(var(--vr))); color: #fff; font-size: 12px; }
.wc-dice-compact-t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--wc-muted); }
.wc-dice-compact-t b { color: var(--wc-text); }
.wc-dice-compact-v { flex: none; font-style: normal; font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em; }
.wc-dice-compact.is-good .wc-dice-compact-v { color: var(--wc-good); }
.wc-dice-compact.is-warn .wc-dice-compact-v { color: var(--wc-warn); }
.wc-dice-compact.is-bad .wc-dice-compact-v { color: var(--wc-bad); }
.wc-dice-compact.is-crit .wc-dice-compact-v { color: var(--wc-accent); }
.wc-dice-compact.is-pending { border-style: dashed; }
.wc-chip-row { display: flex; flex-wrap: wrap; gap: 5px; margin: 0 0 8px; }
.wc-chip { border: 1px solid var(--wc-border); background: transparent; color: var(--wc-muted); font-family: inherit; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; border-radius: 999px; padding: 3px 10px; cursor: pointer; transition: all 0.15s; }
.wc-chip:hover { color: var(--wc-text); border-color: var(--wc-accent-border); }
.wc-chip.is-active { color: #fff; border-color: transparent; background: linear-gradient(135deg, rgb(var(--pr)), rgb(var(--vr))); }
.wc-chip:focus-visible { outline: 2px solid var(--wc-accent); outline-offset: 2px; }
.wc-mso-prog { flex: none; margin-left: auto; font-style: normal; font-size: 9px; font-weight: 800; letter-spacing: 0.06em; color: var(--wc-accent); border: 1px solid var(--wc-accent-border); background: var(--wc-accent-soft); border-radius: 6px; padding: 1px 6px; }
.wc-notif-list { display: flex; flex-direction: column; gap: 5px; max-height: 280px; overflow-y: auto; }
.wc-notif-row { display: flex; align-items: center; gap: 8px; padding: 6px 9px; border-radius: 8px; background: rgba(var(--pr), 0.05); border-left: 2px solid var(--wc-accent-border); }
.wc-notif-row[data-k="levelup"] { border-left-color: #fbbf24; }
.wc-notif-row[data-k="quest"] { border-left-color: #34d399; }
.wc-notif-row[data-k="item"] { border-left-color: #5ec8f2; }
.wc-notif-row[data-k="skill"] { border-left-color: #1677a0; }
.wc-notif-row[data-k="warn"] { border-left-color: var(--wc-bad); }
.wc-notif-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.wc-notif-main b { font-size: 11px; }
.wc-notif-main span { font-size: 10.5px; color: var(--wc-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wc-ic { flex: none; }
.wc-root ::selection, .wc-inline-wrap ::selection { background: rgba(var(--pr, 244, 63, 94), 0.32); }
.wc-root ::-webkit-scrollbar, .wc-inline-wrap ::-webkit-scrollbar { width: 8px; height: 8px; }
.wc-root ::-webkit-scrollbar-thumb, .wc-inline-wrap ::-webkit-scrollbar-thumb { background: rgba(var(--pr, 244, 63, 94), 0.35); border-radius: 99px; }
.wc-root ::-webkit-scrollbar-track, .wc-inline-wrap ::-webkit-scrollbar-track { background: transparent; }
.wc-btn:focus-visible, .wc-tab:focus-visible, .wc-toggle-row input:focus-visible, .wc-input:focus-visible, .wc-select:focus-visible, .wc-textarea:focus-visible, .wc-mso.is-btn:focus-visible, .wc-pill:focus-visible { outline: 2px solid var(--wc-accent); outline-offset: 2px; }
.wc-synclog { display: flex; flex-direction: column; gap: 4px; }
.wc-synclog-row { display: flex; align-items: baseline; gap: 10px; font-size: 11px; padding: 3px 8px; border-radius: 6px; background: rgba(var(--pr), 0.05); border-left: 2px solid transparent; }
.wc-synclog-row span { flex: none; color: var(--wc-dim); font-variant-numeric: tabular-nums; }
.wc-synclog-row em { font-style: normal; color: var(--wc-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wc-synclog-row.is-ok { border-left-color: var(--wc-good); }
.wc-synclog-row.is-fail { border-left-color: var(--wc-bad); }
.wc-synclog-row.is-fail em { color: var(--wc-bad); }
.wc-seg { display: flex; gap: 4px; }
.wc-seg-btn { flex: 1; border: 1px solid var(--wc-border); background: transparent; color: var(--wc-muted); border-radius: 8px; padding: 5px 8px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.15s; font-family: inherit; }
.wc-seg-btn:hover { color: var(--wc-text); border-color: var(--wc-accent-border); }
.wc-seg-btn.is-active { color: #fff; border-color: transparent; background: linear-gradient(135deg, rgb(var(--pr)), rgb(var(--vr))); box-shadow: 0 6px 16px -6px rgba(var(--pr), 0.6); }
.wc-seg-btn:focus-visible { outline: 2px solid var(--wc-accent); outline-offset: 2px; }
.wc-pc-strip { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; margin: 6px 0 0; padding: 5px 9px; border: 1px dashed var(--wc-accent-border); border-radius: 8px; font-size: 11px; color: var(--wc-muted); background: rgba(var(--pr), 0.05); }
.wc-pc-strip b { color: var(--wc-text); font-weight: 700; }
.wc-pc-strip i { opacity: 0.5; font-style: normal; }
.wc-timer-chip { flex: none; display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--wc-warn); color: var(--wc-warn); background: rgba(251, 191, 36, 0.1); font-size: 10px; font-weight: 800; letter-spacing: 0.06em; border-radius: 999px; padding: 1px 8px; }
.wc-timer-chip.is-urgent { border-color: var(--wc-bad); color: var(--wc-bad); background: rgba(251, 113, 133, 0.12); animation: wc-timer-pulse 1.2s ease-in-out infinite; }
@keyframes wc-timer-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
@media (prefers-reduced-motion: reduce) { .wc-timer-chip.is-urgent { animation: none; } }
.wc-modal { padding: 12px; display: flex; flex-direction: column; gap: 10px; font-size: 13px; color: var(--lumiverse-text, inherit); }
.wc-modal-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
.wc-dice-loot { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; color: var(--wc-accent); margin-top: 2px; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

// src/frontend/frontend.ts
/*! src/frontend/frontend.ts */
var WEFT_THEMES = [
  { id: "sakura", label: "Sakura (pink)" },
  { id: "ocean", label: "Ocean (blue)" },
  { id: "ember", label: "Ember (amber)" },
  { id: "forest", label: "Forest (green)" },
  { id: "violet", label: "Violet (purple)" },
  { id: "gold", label: "Gold (warm)" },
  { id: "teal", label: "Teal (cyan)" },
  { id: "crimson", label: "Crimson (red)" },
  { id: "mono", label: "Mono (gray)" },
  { id: "lumiverse", label: "Lumiverse Native" },
  { id: "contrast", label: "High Contrast (black / #FFF)" }
];
var CREST_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 21 7 21 17 12 22 3 17 3 7 12 2"/><polyline points="3.3 7 12 12 20.7 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>`;
var DICE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z"/><path d="M12 22V12"/><path d="M12 12 3 7"/><path d="M12 12l9-5"/><circle cx="12" cy="7.5" r="0.8" fill="currentColor"/></svg>`;
function setup(ctx) {
  const cleanups = [];
  ctx.dom.addStyle(WEFT_CHRONICLE_CSS);
  cleanups.push(() => ctx.dom.cleanup());
  let openModalCount = 0;
  const rawShowModal = ctx.ui.showModal ? ctx.ui.showModal.bind(ctx.ui) : null;
  if (rawShowModal) {
    ctx.ui.showModal = (...args) => {
      openModalCount += 1;
      try {
        send("set_editing", { editing: true, until: Date.now() + 9e4 });
      } catch {
      }
      const modal = rawShowModal(...args);
      const rawDismiss = modal && typeof modal.dismiss === "function" ? modal.dismiss.bind(modal) : null;
      if (rawDismiss) {
        modal.dismiss = () => {
          openModalCount = Math.max(0, openModalCount - 1);
          try {
            if (openModalCount === 0) send("set_editing", { editing: false });
            else send("set_editing", { editing: true, until: Date.now() + 9e4 });
          } catch {
          }
          return rawDismiss();
        };
      }
      return modal;
    };
    cleanups.push(() => {
      ctx.ui.showModal = rawShowModal;
      try {
        send("set_editing", { editing: false });
      } catch {
      }
    });
  }
  let activeSubTab = "system";
  let chatId = ctx.getActiveChat().chatId;
  let data = null;
  let settings = null;
  let connections = [];
  let permissions = {
    interceptor: false,
    generation: false,
    chats: false,
    chat_mutation: false,
    characters: false,
    personas: false
  };
  let syncing = false;
  let statusNote = "";
  let promptEstimate = null;
  const injectedWrappers = /* @__PURE__ */ new Map();
  const rollDraft = {
    action: "",
    stat: "dex",
    dc: 15,
    gearBonus: 0,
    mode: "normal"
  };
  function getActiveConnectionId() {
    try {
      const active = ctx.connections?.getActive?.()?.activeProfileId;
      if (active) return active;
    } catch {
    }
    const def = connections.find((c) => c.isDefault) || connections[0];
    return def?.id || null;
  }
  const drawerTab = ctx.ui.registerDrawerTab({
    id: "weft_chronicle_tab",
    title: "Weft Chronicle",
    shortName: "Weft",
    headerTitle: "Weft Chronicle",
    description: "Authentic Weft System Window, Story Tracker, Inventory, Quests & Fair d20 Dice.",
    keywords: ["weft", "rpg", "status", "system", "tracker", "dice", "d20", "npc", "quests", "settings", "cyoa", "choices"],
    iconSvg: CREST_SVG
  });
  cleanups.push(() => drawerTab.destroy());
  let settingsTabHandle = null;
  if (typeof ctx.ui.registerSettingsTab === "function") {
    try {
      settingsTabHandle = ctx.ui.registerSettingsTab({
        id: "weft_chronicle_settings",
        title: "Weft Chronicle",
        shortName: "Weft",
        iconSvg: CREST_SVG,
        description: "Configure Weft Chronicle modules, themes, inline chat cards, and sidecar AI.",
        keywords: ["weft", "system", "tracker", "dice", "rpg", "sidecar", "theme", "cyoa", "choices"]
      });
      cleanups.push(() => settingsTabHandle?.destroy());
    } catch {
      settingsTabHandle = null;
    }
  }
  const rollAction = ctx.ui.registerInputBarAction({
    id: "weft_quick_roll",
    label: "Roll d20",
    subtitle: "Fair RNG check (Weft Chronicle)",
    iconSvg: DICE_SVG,
    enabled: true
  });
  cleanups.push(() => rollAction.destroy());
  function send(type, extra = {}) {
    const activeConnectionId = getActiveConnectionId();
    ctx.sendToBackend({ type, chatId, activeConnectionId, ...extra });
  }
  async function pickChoice(key, index, sourceBtn) {
    if (!key || !Number.isFinite(index)) return;
    const snap = data?.snapshots?.[key];
    const opt = snap?.choices?.options?.[index];
    if (!opt) return;
    if (Array.isArray(snap.choices.claimed) && snap.choices.claimed.includes(index)) return;
    const text = String(opt.text || "").trim().slice(0, 600);
    if (!text) return;
    const restoreBtn = () => {
      if (sourceBtn) {
        sourceBtn.disabled = false;
        sourceBtn.classList.remove("is-busy");
      }
    };
    if (sourceBtn) {
      sourceBtn.disabled = true;
      sourceBtn.classList.add("is-busy");
    }
    let outcome = "error";
    try {
      const composer = ctx.composer;
      if (composer && typeof composer.setText === "function" && typeof composer.send === "function") {
        let mounted = true;
        try {
          const state = typeof composer.getState === "function" ? composer.getState() : null;
          if (state && state.mounted === false) mounted = false;
        } catch {
          mounted = true;
        }
        if (mounted) {
          composer.setText(text);
          await composer.send();
          outcome = "sent";
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || "");
      outcome = /busy/i.test(msg) ? "busy" : "error";
    }
    if (outcome === "sent") {
      send("choice_claim", { key, index });
      return;
    }
    if (outcome === "busy") {
      restoreBtn();
      send("choice_feedback", { kind: "busy" });
      return;
    }
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        send("choice_claim", { key, index });
        send("choice_feedback", { kind: "copied" });
        restoreBtn();
        return;
      }
    } catch {
    }
    restoreBtn();
    send("choice_feedback", { kind: "error" });
  }
  function updateChromeState() {
    const diceOn = Boolean(data?.enabled && data?.modules?.dice);
    rollAction.setEnabled(diceOn);
    if (!data || !data.enabled) {
      drawerTab.setBadge(null);
      return;
    }
    const pendingRolls = data.modules.dice ? data.rolls.filter((r) => !r.consumed).length : 0;
    if (pendingRolls > 0) {
      drawerTab.setBadge(String(pendingRolls));
    } else if (data.modules.system && data.sheet.pts > 0) {
      drawerTab.setBadge(`+${data.sheet.pts}`);
    } else {
      drawerTab.setBadge(null);
    }
  }
  async function hydrateFrontendConnections() {
    if (connections.length > 0) return;
    try {
      const list = ctx.connections ? await ctx.connections.list() : [];
      if (Array.isArray(list) && list.length > 0) {
        connections = list.map((c) => ({
          id: c.id,
          name: c.name || c.model || c.provider,
          provider: c.provider,
          model: c.model,
          isDefault: Boolean(c.is_default)
        }));
        renderAll();
      }
    } catch {
    }
  }
  function clearAllInlineCards() {
    for (const entry of injectedWrappers.values()) {
      try {
        ctx.dom.uninject(entry.wrapper);
      } catch {
      }
    }
    injectedWrappers.clear();
  }
  function findSnapshotForMessage(d, messageId) {
    if (d.lastSyncedKey && d.lastSyncedKey.startsWith(`${messageId}:`)) {
      const activeSnap = d.snapshots[d.lastSyncedKey];
      if (activeSnap) return { snap: activeSnap, key: d.lastSyncedKey };
    }
    const matching = Object.entries(d.snapshots || {}).filter(([, s]) => s && s.messageId === messageId).sort((a, b) => (b[1]?.timestamp || 0) - (a[1]?.timestamp || 0));
    if (matching.length > 0) {
      return { snap: matching[0][1], key: matching[0][0] };
    }
    return null;
  }
  function findLatestChoices(d) {
    if (!d) return null;
    const entries = Object.entries(d.snapshots || {}).filter(([, s]) => s && s.choices && Array.isArray(s.choices.options) && s.choices.options.length > 0);
    if (entries.length === 0) return null;
    entries.sort((a, b) => (b[1]?.timestamp || 0) - (a[1]?.timestamp || 0));
    return { snap: entries[0][1], key: entries[0][0] };
  }
  function isInsideOurInjection(el) {
    return Boolean(el.closest(".wc-inline-wrap"));
  }
  function readHorizontalPadding(el) {
    if (!el) return null;
    try {
      const cs = window.getComputedStyle(el);
      const pl = parseFloat(cs.paddingLeft) || 0;
      const pr = parseFloat(cs.paddingRight) || 0;
      if (pl >= 6 || pr >= 6) {
        return { left: cs.paddingLeft, right: cs.paddingRight };
      }
    } catch {
    }
    return null;
  }
  function isHorizontalFlex(el) {
    if (!el) return false;
    try {
      const cs = window.getComputedStyle(el);
      return (cs.display === "flex" || cs.display === "inline-flex") && cs.flexDirection.startsWith("row");
    } catch {
      return false;
    }
  }
  function resolveInlineTarget(bubbleEl, placement) {
    if (placement === "below") {
      return { target: bubbleEl, position: "beforeend", padX: null, afterIsland: false };
    }
    if (placement === "footer") {
      const bodyAfter2 = bubbleEl.querySelector('[data-spindle-mount="message_body_after"]');
      if (bodyAfter2) {
        const ownPad = readHorizontalPadding(bodyAfter2);
        const sibPad = !ownPad ? readHorizontalPadding(bodyAfter2.previousElementSibling) : null;
        return { target: bodyAfter2, position: "beforeend", padX: sibPad, afterIsland: false };
      }
      const footer = bubbleEl.querySelector(
        '[data-spindle-mount="message_footer"], [data-spindle-mount="message_swipe_indicators"]'
      );
      if (footer && footer.parentElement && bubbleEl.contains(footer.parentElement)) {
        return {
          target: footer,
          position: "beforebegin",
          padX: readHorizontalPadding(footer),
          afterIsland: false
        };
      }
      return { target: bubbleEl, position: "beforeend", padX: null, afterIsland: false };
    }
    const nonInjectedChildrenCount = (parent) => Array.from(parent.children).filter(
      (c) => !c.hasAttribute("data-spindle-injected") && !c.querySelector(".wc-inline-wrap")
    ).length;
    const allDescendants = Array.from(bubbleEl.querySelectorAll("*"));
    const cardsOrIslands = allDescendants.filter(
      (el) => !isInsideOurInjection(el) && !el.closest('[data-spindle-mount="message_footer"], [data-spindle-mount="message_body_after"]') && (Boolean(el.shadowRoot) || el.matches("details.mg"))
    );
    const paragraphs = Array.from(bubbleEl.querySelectorAll("p")).filter(
      (p) => !isInsideOurInjection(p) && !p.closest("details, blockquote, [data-spindle-mount]")
    );
    const lastCard = cardsOrIslands[cardsOrIslands.length - 1] || null;
    const lastP = paragraphs[paragraphs.length - 1] || null;
    if (lastCard && (!lastP || Boolean(lastP.compareDocumentPosition(lastCard) & Node.DOCUMENT_POSITION_FOLLOWING))) {
      let anchor = lastCard;
      while (anchor.parentElement && anchor.parentElement !== bubbleEl && nonInjectedChildrenCount(anchor.parentElement) === 1) {
        try {
          const pcs = window.getComputedStyle(anchor.parentElement);
          if (parseFloat(pcs.borderBottomWidth) > 0) break;
        } catch {
        }
        anchor = anchor.parentElement;
      }
      if (!isHorizontalFlex(anchor.parentElement)) {
        return {
          target: anchor,
          position: "afterend",
          padX: null,
          afterIsland: Boolean(lastCard.shadowRoot)
        };
      }
    }
    const contentSelectors = [
      "[data-message-content]",
      '[data-testid="message-content"]',
      '[data-testid*="message-body"]',
      ".lumiverse-message-content",
      ".message-content",
      ".markdown-body",
      ".prose"
    ];
    for (const sel of contentSelectors) {
      const match = Array.from(bubbleEl.querySelectorAll(sel)).find((el) => !isInsideOurInjection(el));
      if (match && match !== bubbleEl) {
        return { target: match, position: "beforeend", padX: null, afterIsland: false };
      }
    }
    if (lastP && lastP.parentElement && bubbleEl.contains(lastP.parentElement)) {
      const pParent = lastP.parentElement;
      if (pParent !== bubbleEl) {
        return { target: pParent, position: "beforeend", padX: null, afterIsland: false };
      }
      return { target: lastP, position: "afterend", padX: null, afterIsland: false };
    }
    const bodyAfter = bubbleEl.querySelector('[data-spindle-mount="message_body_after"]');
    if (bodyAfter) {
      const ownPad = readHorizontalPadding(bodyAfter);
      const sibPad = !ownPad ? readHorizontalPadding(bodyAfter.previousElementSibling) : null;
      return { target: bodyAfter, position: "beforeend", padX: sibPad, afterIsland: false };
    }
    return { target: bubbleEl, position: "beforeend", padX: null, afterIsland: false };
  }
  function buildInlineHtml(d, cfg, snap, padX, afterIsland, snapKey) {
    const parts = [];
    const sysTh = resolveSystemTheme(cfg);
    if (d.initialized && d.modules.dice && cfg.showInlineDice && Array.isArray(snap.rolls) && snap.rolls.length > 0) {
      for (const r of snap.rolls) {
        parts.push(cfg.inlineDiceCompact ? renderDiceCardCompact(r, cfg.theme) : renderDiceCard(r, cfg.theme));
      }
    }
    if (d.initialized && d.modules.system && cfg.showInlineNotices && Array.isArray(snap.notices) && snap.notices.length > 0) {
      for (const n of snap.notices) {
        parts.push(renderNoticeCard(n, sysTh));
      }
    }
    if (d.initialized && d.modules.system && cfg.showInlineSystem) {
      parts.push(renderSystemWindow(snap.sheet, cfg, { mode: "inline", open: cfg.inlineStartsOpen }));
    }
    if (d.initialized && d.modules.tracker && cfg.showInlineTracker) {
      parts.push(renderTrackerCard(snap.world, cfg, { mode: "inline", open: cfg.inlineStartsOpen }));
    }
    if (d.modules.choices && cfg.showInlineChoices && snap.choices && Array.isArray(snap.choices.options) && snap.choices.options.length > 0) {
      parts.push(renderChoicesCard(snap.choices, cfg.theme, { open: cfg.inlineStartsOpen, snapKey }));
    }
    if (parts.length === 0) return "";
    const extraCls = [
      cfg.inlinePlacement === "below" ? "is-below" : "",
      afterIsland ? "is-after-island" : ""
    ].filter(Boolean).join(" ");
    const padStyle = padX ? ` style="padding-left:${esc(padX.left)};padding-right:${esc(padX.right)};"` : "";
    return `<div class="wc-inline-wrap${extraCls ? " " + extraCls : ""}" data-wc-theme="${esc(cfg.theme)}"${padStyle}>${parts.join("")}</div>`;
  }
  function syncInlineChatCards() {
    const choicesReady = Boolean(
      data && settings && data.enabled && data.modules && data.modules.choices && settings.showInlineChoices && Object.values(data.snapshots || {}).some((s) => s && s.choices && Array.isArray(s.choices.options) && s.choices.options.length > 0)
    );
    if (!data || !settings || !data.enabled || !data.initialized && !choicesReady) {
      clearAllInlineCards();
      return;
    }
    const wantAny = data.modules.system && (settings.showInlineSystem || settings.showInlineNotices) || data.modules.tracker && settings.showInlineTracker || data.modules.dice && settings.showInlineDice || data.modules.choices && settings.showInlineChoices;
    if (!wantAny) {
      clearAllInlineCards();
      return;
    }
    const activeIds = /* @__PURE__ */ new Set();
    const placement = settings.inlinePlacement === "below" || settings.inlinePlacement === "footer" ? settings.inlinePlacement : "inside";
    let mounted = [];
    try {
      mounted = ctx.dom.listMessageElements();
    } catch {
      mounted = [];
    }
    for (const item of mounted) {
      const found = findSnapshotForMessage(data, item.messageId);
      if (!found) continue;
      const snap = found.snap;
      const snapKey = found.key;
      const effectiveSnap = snap;
      const resolved = resolveInlineTarget(item.element, placement);
      const inlineCfg = data.themeOverride ? { ...settings, theme: data.themeOverride } : settings;
      const html = buildInlineHtml(data, inlineCfg, effectiveSnap, resolved.padX, resolved.afterIsland, snapKey);
      if (!html) continue;
      activeIds.add(item.messageId);
      const existing = injectedWrappers.get(item.messageId);
      const needsReinject = !existing || !existing.wrapper.isConnected || existing.target !== resolved.target || existing.position !== resolved.position;
      if (existing && !needsReinject) {
        const prevOpenStates = Array.from(existing.wrapper.querySelectorAll("details")).map((el) => el.open);
        existing.wrapper.innerHTML = html;
        const nextDetails = Array.from(existing.wrapper.querySelectorAll("details"));
        nextDetails.forEach((el, idx) => {
          if (typeof prevOpenStates[idx] === "boolean") el.open = prevOpenStates[idx];
        });
      } else {
        if (existing) {
          try {
            ctx.dom.uninject(existing.wrapper);
          } catch {
          }
          injectedWrappers.delete(item.messageId);
        }
        try {
          const wrapper = ctx.dom.inject(resolved.target, html, resolved.position);
          wrapper.addEventListener("click", (ev) => {
            const btn = ev.target?.closest("[data-act]");
            if (!btn) return;
            ev.stopPropagation();
            if (btn.dataset.act === "alloc" && btn.dataset.stat) {
              send("allocate_stat", { stat: btn.dataset.stat, amount: 1 });
            } else if (btn.dataset.act === "auto_alloc") {
              send("auto_allocate");
            } else if (btn.dataset.act === "choice_pick") {
              void pickChoice(btn.dataset.key, Number(btn.dataset.idx), btn);
            }
          });
          injectedWrappers.set(item.messageId, {
            wrapper,
            target: resolved.target,
            position: resolved.position
          });
        } catch {
        }
      }
    }
    for (const [mid, entry] of injectedWrappers.entries()) {
      if (!activeIds.has(mid) && !findSnapshotForMessage(data, mid)) {
        try {
          ctx.dom.uninject(entry.wrapper);
        } catch {
        }
        injectedWrappers.delete(mid);
      }
    }
  }
  let inlineTimer = null;
  let inlineSettleTimer = null;
  function scheduleInlineSync(delay = 120) {
    if (inlineTimer) clearTimeout(inlineTimer);
    if (inlineSettleTimer) clearTimeout(inlineSettleTimer);
    inlineTimer = setTimeout(() => {
      inlineTimer = null;
      syncInlineChatCards();
      inlineSettleTimer = setTimeout(() => {
        inlineSettleTimer = null;
        syncInlineChatCards();
      }, 420);
    }, delay);
  }
  cleanups.push(() => {
    if (inlineTimer) clearTimeout(inlineTimer);
    if (inlineSettleTimer) clearTimeout(inlineSettleTimer);
    clearAllInlineCards();
  });
  function edgeSegHtml(idPrefix, mode) {
    const attr = (m) => `data-edge="${m}"`;
    const cls = (m) => `wc-seg-btn${mode === m ? " is-active" : ""}`;
    if (idPrefix === "wc-m-edge") {
      return `<div class="wc-seg" id="${idPrefix}">
        <button type="button" class="${cls("normal")}" ${attr("normal")}>Normal</button>
        <button type="button" class="${cls("adv")}" ${attr("adv")}>Advantage</button>
        <button type="button" class="${cls("dis")}" ${attr("dis")}>Disadvantage</button>
      </div>`;
    }
    return `<div class="wc-seg" id="${idPrefix}">
      <button type="button" class="${cls("normal")}" data-act="edge" data-mode="normal">Normal</button>
      <button type="button" class="${cls("adv")}" data-act="edge" data-mode="adv">Advantage</button>
      <button type="button" class="${cls("dis")}" data-act="edge" data-mode="dis">Disadvantage</button>
    </div>`;
  }
  function openQuickRollModal() {
    if (!chatId) return;
    const sheet = data?.sheet;
    const autoGear = sheet ? computeMaxGearBonus(sheet) : 0;
    const modal = ctx.ui.showModal({ title: "Weft Fair d20 Roll", width: 420 });
    const statOpts = [
      `<option value="none">Flat (no stat \xB7 +0)</option>`,
      ...STAT_KEYS.map((k) => {
        const val = sheet ? sheet.stats[k] : 5;
        const lbl = sheet ? sheet.statLabels[k] : k.toUpperCase();
        const sel = rollDraft.stat === k ? "selected" : "";
        return `<option value="${k}" ${sel}>${esc(lbl)} ${val} (${formatMod(statModifier(val))})</option>`;
      })
    ].join("");
    const dcOpts = DC_PRESETS.map(
      (p) => `<option value="${p.dc}" ${p.dc === rollDraft.dc ? "selected" : ""}>${esc(p.label)}</option>`
    ).join("");
    modal.root.innerHTML = `
      <div class="wc-modal">
        <div class="wc-field">
          <label>What is ${esc(sheet?.name || "your character")} attempting?</label>
          <input class="wc-input" id="wc-m-action" placeholder="e.g., Force the rusted lock quietly" value="${esc(rollDraft.action)}" />
        </div>
        <div class="wc-row-2">
          <div class="wc-field"><label>Stat</label><select class="wc-select" id="wc-m-stat">${statOpts}</select></div>
          <div class="wc-field"><label>Difficulty (DC)</label><select class="wc-select" id="wc-m-dc-preset">${dcOpts}</select></div>
        </div>
        <div class="wc-row-2">
          <div class="wc-field"><label>Custom DC</label><input class="wc-input" id="wc-m-dc" type="number" min="1" max="40" value="${rollDraft.dc}" /></div>
          <div class="wc-field"><label>Gear Bonus (-3 to +3)</label><input class="wc-input" id="wc-m-gear" type="number" min="-3" max="3" value="${autoGear}" /></div>
        </div>
        ${(sheet?.skills || []).length > 0 ? `<div class="wc-field"><label>Skill (adds its dice bonus)</label><select class="wc-select" id="wc-m-skill"><option value="">\u2014 no skill \u2014</option>${(sheet.skills || []).map((sk) => {
      const b = Number(sk.bonus) || 0;
      return `<option value="${esc(sk.id)}">${esc(sk.name)} (${b >= 0 ? "+" : ""}${b})</option>`;
    }).join("")}</select></div>` : ""}
        <div class="wc-field"><label>Edge</label>${edgeSegHtml("wc-m-edge", rollDraft.mode)}</div>
        ${(data?.world?.npcs || []).some((n) => n.present) ? `<div class="wc-row-2">
          <div class="wc-field"><label>Opponent (contested)</label><select class="wc-select" id="wc-m-opp"><option value="">\u2014 none \u2014</option>${(data.world.npcs || []).filter((n) => n.present).map((n) => `<option value="${esc(n.name)}">${esc(n.name)}</option>`).join("")}</select></div>
          <div class="wc-field"><label>Foe Bonus</label><input class="wc-input" id="wc-m-foebonus" type="number" min="-5" max="10" value="3" /></div>
        </div>` : ""}
        ${settings?.survivalEnabled ? `<div class="wc-actions-row" style="margin-top:4px">
          <button class="wc-btn" id="wc-m-scavenge" title="WIS check vs your survival DC \u2014 finds go into the bag">${icon("compass", 14)} Scavenge</button>
          <button class="wc-btn" id="wc-m-encounter" title="d20 scan \u2014 who's out there?">${icon("eye", 14)} Encounter</button>
        </div>` : ""}
        <div class="wc-dim">Rolled with unbiased crypto RNG. Automatically binds the AI's next reply.</div>
        <div class="wc-modal-foot">
          <button class="wc-btn" id="wc-m-cancel">Cancel</button>
          <button class="wc-btn" id="wc-m-contest" title="Roll you vs the selected NPC (higher total wins)">Contest!</button>
          <button class="wc-btn is-primary" id="wc-m-roll">${icon("d20", 15)} Roll Fair d20</button>
        </div>
      </div>
    `;
    const presetSel = modal.root.querySelector("#wc-m-dc-preset");
    const dcInp = modal.root.querySelector("#wc-m-dc");
    presetSel?.addEventListener("change", () => {
      if (dcInp && presetSel) dcInp.value = presetSel.value;
    });
    modal.root.querySelectorAll("#wc-m-edge [data-edge]").forEach((btn) => {
      btn.addEventListener("click", () => {
        rollDraft.mode = btn.getAttribute("data-edge") || "normal";
        modal.root.querySelectorAll("#wc-m-edge [data-edge]").forEach((b) => b.classList.toggle("is-active", b === btn));
      });
    });
    modal.root.querySelector("#wc-m-cancel")?.addEventListener("click", () => modal.dismiss());
    modal.root.querySelector("#wc-m-scavenge")?.addEventListener("click", () => {
      send("scavenge_roll");
      modal.dismiss();
    });
    modal.root.querySelector("#wc-m-encounter")?.addEventListener("click", () => {
      send("encounter_roll");
      modal.dismiss();
    });
    const buildPayload = () => {
      const action = modal.root.querySelector("#wc-m-action")?.value.trim() || "Attempt check";
      const stat = modal.root.querySelector("#wc-m-stat")?.value || "none";
      const dc = Number(dcInp?.value || 15);
      const gearBonus = Number(modal.root.querySelector("#wc-m-gear")?.value || 0);
      const skillId = modal.root.querySelector("#wc-m-skill")?.value || "";
      const skill = (sheet?.skills || []).find((sk) => sk.id === skillId);
      const skillBonus = skill ? Number(skill.bonus) || 0 : 0;
      rollDraft.action = action;
      rollDraft.stat = stat;
      rollDraft.dc = dc;
      rollDraft.gearBonus = gearBonus;
      return { action, stat, dc, gearBonus, skillBonus, skillLabel: skill ? skill.name : "", mode: rollDraft.mode };
    };
    modal.root.querySelector("#wc-m-roll")?.addEventListener("click", () => {
      send("roll_dice", buildPayload());
      modal.dismiss();
    });
    modal.root.querySelector("#wc-m-contest")?.addEventListener("click", () => {
      const opponent = modal.root.querySelector("#wc-m-opp")?.value || "";
      if (!opponent) return;
      const foeBonus = Number(modal.root.querySelector("#wc-m-foebonus")?.value || 3);
      send("contest_roll", { ...buildPayload(), opponent, foeBonus });
      modal.dismiss();
    });
  }
  function openEditIdentityModal() {
    if (!data) return;
    const s = data.sheet;
    const modal = ctx.ui.showModal({ title: "Edit System Sheet", width: 440, maxHeight: 580 });
    modal.root.innerHTML = `
      <div class="wc-modal">
        <div class="wc-row-2">
          <div class="wc-field"><label>Name</label><input class="wc-input" id="wc-id-name" value="${esc(s.name)}" /></div>
          <div class="wc-field"><label>Race / Origin</label><input class="wc-input" id="wc-id-race" value="${esc(s.race)}" /></div>
        </div>
        <div class="wc-row-2">
          <div class="wc-field"><label>Class / Role</label><input class="wc-input" id="wc-id-cls" value="${esc(s.cls)}" placeholder="e.g., Survivor, Mage" /></div>
          <div class="wc-field"><label>Subclass / Specialty</label><input class="wc-input" id="wc-id-subcls" value="${esc(s.subcls)}" /></div>
        </div>
        <div class="wc-row-3">
          <div class="wc-field"><label>Level</label><input class="wc-input" id="wc-id-lv" type="number" min="1" value="${s.level}" /></div>
          <div class="wc-field"><label>Unspent Pts</label><input class="wc-input" id="wc-id-pts" type="number" min="0" value="${s.pts}" /></div>
          <div class="wc-field"><label>Rank (optional)</label><input class="wc-input" id="wc-id-rank" value="${esc(s.rank)}" /></div>
        </div>
        <div class="wc-row-2">
          <div class="wc-field"><label>Title</label><input class="wc-input" id="wc-id-title" value="${esc(s.title)}" /></div>
          <div class="wc-field"><label>Funds / Currency</label><input class="wc-input" id="wc-id-cash" value="${esc(s.cash)}" placeholder="e.g., 42g or $85" /></div>
        </div>
        <div class="wc-row-2">
          <label class="wc-toggle-row"><span>Enable 3rd Pool (MP/Sanity)</span><input type="checkbox" id="wc-id-usemp" ${s.useMp ? "checked" : ""} /></label>
          <div class="wc-field"><label>3rd Pool Label</label><input class="wc-input" id="wc-id-mplbl" value="${esc(s.mpLabel)}" /></div>
        </div>
        <div class="wc-card-title">Stat Names (setting labels)</div>
        <div class="wc-row-3">
          ${STAT_KEYS.map(
      (k) => `<div class="wc-field"><label>${esc(k.toUpperCase())}</label><input class="wc-input" id="wc-lb-${k}" maxlength="24" value="${esc(s.statLabels[k])}" /></div>`
    ).join("")}
        </div>
        <div class="wc-card-title">Direct Stat Overrides</div>
        <div class="wc-row-3">
          ${STAT_KEYS.map(
      (k) => `<div class="wc-field"><label>${esc(s.statLabels[k])}</label><input class="wc-input" id="wc-st-${k}" type="number" min="1" max="99" value="${s.stats[k]}" /></div>`
    ).join("")}
        </div>
        <div class="wc-modal-foot">
          <button class="wc-btn" id="wc-id-cancel">Cancel</button>
          <button class="wc-btn is-primary" id="wc-id-save">Save Changes</button>
        </div>
      </div>
    `;
    modal.root.querySelector("#wc-id-cancel")?.addEventListener("click", () => modal.dismiss());
    modal.root.querySelector("#wc-id-save")?.addEventListener("click", () => {
      const val = (id) => modal.root.querySelector(`#${id}`)?.value ?? "";
      send("update_identity", {
        patch: {
          name: val("wc-id-name"),
          race: val("wc-id-race"),
          cls: val("wc-id-cls"),
          subcls: val("wc-id-subcls"),
          rank: val("wc-id-rank"),
          title: val("wc-id-title"),
          cash: val("wc-id-cash"),
          level: Number(val("wc-id-lv")),
          pts: Number(val("wc-id-pts")),
          useMp: modal.root.querySelector("#wc-id-usemp")?.checked ?? false,
          mpLabel: val("wc-id-mplbl"),
          statLabels: Object.fromEntries(STAT_KEYS.map((k) => [k, (modal.root.querySelector(`#wc-lb-${k}`)?.value || "").trim().slice(0, 24) || k.toUpperCase()]))
        }
      });
      for (const k of STAT_KEYS) {
        const num = Number(val(`wc-st-${k}`));
        if (Number.isFinite(num) && num !== s.stats[k]) {
          send("update_stat", { stat: k, value: num });
        }
      }
      modal.dismiss();
    });
  }
  function openItemModal(existing) {
    const modal = ctx.ui.showModal({
      title: existing ? `Inspect / Edit Item` : "Add Item to Inventory",
      width: 400
    });
    const cats = [
      ["misc", "Misc"],
      ["weapon", "Weapon"],
      ["armor", "Armor"],
      ["accessory", "Accessory"],
      ["potion", "Potion / Meds"],
      ["material", "Material / Ammo"],
      ["key", "Key Item"],
      ["book", "Book / Note"],
      ["valuable", "Valuable"]
    ];
    const rars = [
      ["ordinary", "Ordinary (+0)"],
      ["common", "Common (+0)"],
      ["uncommon", "Uncommon (+1)"],
      ["rare", "Rare (+1)"],
      ["epic", "Epic (+2)"],
      ["legendary", "Legendary (+3)"],
      ["mythic", "Mythic (+3)"]
    ];
    const curCat = existing?.category || "misc";
    const curRar = existing?.rarity || "ordinary";
    const canEquip = curCat === "weapon" || curCat === "armor" || curCat === "accessory";
    modal.root.innerHTML = `
      <div class="wc-modal">
        <div class="wc-field"><label>Item Name</label><input class="wc-input" id="wc-it-name" placeholder="e.g., Crowbar, First-Aid Kit, Iron Sword" value="${esc(existing?.name || "")}" /></div>
        <div class="wc-row-2">
          <div class="wc-field">
            <label>Category</label>
            <select class="wc-select" id="wc-it-cat">
              ${cats.map(([v, lbl]) => `<option value="${v}" ${curCat === v ? "selected" : ""}>${lbl}</option>`).join("")}
            </select>
          </div>
          <div class="wc-field">
            <label>Rarity</label>
            <select class="wc-select" id="wc-it-rar">
              ${rars.map(([v, lbl]) => `<option value="${v}" ${curRar === v ? "selected" : ""}>${lbl}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="wc-row-2">
          <div class="wc-field"><label>Quantity</label><input class="wc-input" id="wc-it-qty" type="number" min="1" value="${existing?.qty ?? 1}" /></div>
          <label class="wc-toggle-row" style="align-self:end"><span>${existing ? "Equip now" : "Equip immediately"}</span><input type="checkbox" id="wc-it-eq" ${existing && !canEquip ? "disabled" : ""} /></label>
        </div>
        <div class="wc-field"><label>Note / Effect</label><textarea class="wc-textarea" id="wc-it-note" rows="2" placeholder="Short effect, lore, or condition">${esc(existing?.note || "")}</textarea></div>
        <div class="wc-modal-foot">
          ${existing ? `<button class="wc-btn is-danger" id="wc-it-del" style="margin-right:auto">Remove All</button>` : ""}
          <button class="wc-btn" id="wc-it-cancel">Cancel</button>
          <button class="wc-btn is-primary" id="wc-it-save">${existing ? "Save Item" : "Add Item"}</button>
        </div>
      </div>
    `;
    const catSel = modal.root.querySelector("#wc-it-cat");
    const eqCb = modal.root.querySelector("#wc-it-eq");
    catSel?.addEventListener("change", () => {
      if (!eqCb) return;
      const v = catSel.value;
      const eq = v === "weapon" || v === "armor" || v === "accessory";
      eqCb.disabled = !eq;
      if (!eq) eqCb.checked = false;
    });
    modal.root.querySelector("#wc-it-del")?.addEventListener("click", () => {
      if (existing) send("remove_item", { id: existing.id, qty: existing.qty });
      modal.dismiss();
    });
    modal.root.querySelector("#wc-it-cancel")?.addEventListener("click", () => modal.dismiss());
    modal.root.querySelector("#wc-it-save")?.addEventListener("click", () => {
      const name = modal.root.querySelector("#wc-it-name")?.value.trim();
      if (!name) return;
      const payload = {
        id: existing?.id,
        name,
        category: modal.root.querySelector("#wc-it-cat")?.value,
        rarity: modal.root.querySelector("#wc-it-rar")?.value,
        qty: Number(modal.root.querySelector("#wc-it-qty")?.value || 1),
        note: modal.root.querySelector("#wc-it-note")?.value.trim() || "",
        equip: modal.root.querySelector("#wc-it-eq")?.checked ?? false
      };
      send(existing ? "update_item" : "add_item", { item: payload });
      modal.dismiss();
    });
  }
  function openQuestModal(existing) {
    const modal = ctx.ui.showModal({ title: existing ? "Edit Quest" : "Add Quest", width: 420 });
    const obsText = existing ? existing.objectives.map((o) => `${o.done ? "[x] " : ""}${o.text}`).join("\n") : "";
    modal.root.innerHTML = `
      <div class="wc-modal">
        <div class="wc-field"><label>Quest Title</label><input class="wc-input" id="wc-q-title" value="${esc(existing?.title || "")}" /></div>
        <div class="wc-row-2">
          <div class="wc-field"><label>Type</label><select class="wc-select" id="wc-q-kind"><option value="main" ${existing?.kind === "main" ? "selected" : ""}>Main</option><option value="side" ${existing?.kind === "side" || !existing ? "selected" : ""}>Side</option><option value="daily" ${existing?.kind === "daily" ? "selected" : ""}>Daily</option></select></div>
          <div class="wc-field"><label>Status</label><select class="wc-select" id="wc-q-status"><option value="active" ${!existing || existing.status === "active" ? "selected" : ""}>Active</option><option value="available" ${existing?.status === "available" ? "selected" : ""}>Available</option><option value="done" ${existing?.status === "done" ? "selected" : ""}>Done</option><option value="failed" ${existing?.status === "failed" ? "selected" : ""}>Failed</option></select></div>
        </div>
        <div class="wc-field"><label>Objectives (one per line; prefix "[x] " if done)</label><textarea class="wc-textarea" id="wc-q-obs" rows="3">${esc(obsText)}</textarea></div>
        <div class="wc-row-2">
          <div class="wc-field"><label>Reward (optional)</label><input class="wc-input" id="wc-q-rew" value="${esc(existing?.reward || "")}" /></div>
          <div class="wc-field"><label>Warning / Penalty</label><input class="wc-input" id="wc-q-pen" value="${esc(existing?.penalty || "")}" /></div>
        </div>
        <div class="wc-modal-foot"><button class="wc-btn" id="wc-q-cancel">Cancel</button><button class="wc-btn is-primary" id="wc-q-save">Save Quest</button></div>
      </div>
    `;
    modal.root.querySelector("#wc-q-cancel")?.addEventListener("click", () => modal.dismiss());
    modal.root.querySelector("#wc-q-save")?.addEventListener("click", () => {
      const title = modal.root.querySelector("#wc-q-title")?.value.trim();
      if (!title) return;
      const lines = (modal.root.querySelector("#wc-q-obs")?.value || "").split("\n").map((l) => l.trim()).filter(Boolean);
      const objectives = lines.map((line, i) => ({
        id: existing?.objectives[i]?.id || `ob_${Date.now()}_${i}`,
        text: line.replace(/^\[[x ]\]\s*/i, ""),
        done: /^\[x\]\s*/i.test(line)
      }));
      send("upsert_quest", {
        quest: {
          id: existing?.id,
          title,
          kind: modal.root.querySelector("#wc-q-kind")?.value,
          status: modal.root.querySelector("#wc-q-status")?.value,
          objectives,
          reward: modal.root.querySelector("#wc-q-rew")?.value.trim() || "",
          penalty: modal.root.querySelector("#wc-q-pen")?.value.trim() || ""
        }
      });
      modal.dismiss();
    });
  }
  function openWorldModal() {
    if (!data) return;
    const w = data.world;
    const modal = ctx.ui.showModal({ title: "Edit Scene & Arc", width: 420 });
    modal.root.innerHTML = `
      <div class="wc-modal">
        <div class="wc-field"><label>Current Location</label><input class="wc-input" id="wc-w-loc" value="${esc(w.location)}" /></div>
        <div class="wc-row-2">
          ${settings?.clockEnabled ? `<div class="wc-field"><label>Time (managed by Scene Clock)</label><input class="wc-input" id="wc-w-time" value="${esc(w.time)}" disabled title="Disable Scene Clock in Settings to edit time freely." /></div>` : `<div class="wc-field"><label>Time / Timeline</label><input class="wc-input" id="wc-w-time" value="${esc(w.time)}" /></div>`}
          <div class="wc-field"><label>Day #</label><input class="wc-input" id="wc-w-day" type="number" min="1" value="${w.dayCount}" /></div>
        </div>
        <div class="wc-row-2">
          <div class="wc-field"><label>Arc</label><input class="wc-input" id="wc-w-arc" value="${esc(w.arc)}" placeholder="Opening / Rising / Turning / Climax" /></div>
          <div class="wc-field"><label>Scene Phase</label><input class="wc-input" id="wc-w-phase" value="${esc(w.phase)}" placeholder="Setup / Tension / Confrontation" /></div>
        </div>
        <div class="wc-row-2">
          <div class="wc-field"><label>Weather</label><input class="wc-input" id="wc-w-weather" value="${esc(w.weather)}" /></div>
          <div class="wc-field"><label>Scene Mood</label><input class="wc-input" id="wc-w-mood" value="${esc(w.mood)}" /></div>
        </div>
        <div class="wc-field"><label>Notes</label><textarea class="wc-textarea" id="wc-w-notes" rows="2">${esc(w.notes)}</textarea></div>
        <div class="wc-row-2">
          <div class="wc-field"><label>PC Outfit</label><input class="wc-input" id="wc-w-pc-outfit" value="${esc(w.pc?.outfit || "")}" placeholder="Rain-soaked coat" /></div>
          <div class="wc-field"><label>PC Position</label><input class="wc-input" id="wc-w-pc-pos" value="${esc(w.pc?.pos || "")}" placeholder="On the rail, hand on the brass key" /></div>
        </div>
        <div class="wc-row-2">
          <div class="wc-field"><label>PC Condition</label><input class="wc-input" id="wc-w-pc-cond" value="${esc(w.pc?.cond || "")}" placeholder="Exhausted, left side numb" /></div>
          <div class="wc-field"><label>PC Carrying</label><input class="wc-input" id="wc-w-pc-carry" value="${esc(w.pc?.carry || "")}" placeholder="Brass key, revolver, locket" /></div>
        </div>
        <div class="wc-modal-foot"><button class="wc-btn" id="wc-w-cancel">Cancel</button><button class="wc-btn is-primary" id="wc-w-save">Save</button></div>
      </div>
    `;
    modal.root.querySelector("#wc-w-cancel")?.addEventListener("click", () => modal.dismiss());
    modal.root.querySelector("#wc-w-save")?.addEventListener("click", () => {
      send("update_world", {
        patch: {
          location: modal.root.querySelector("#wc-w-loc")?.value || "",
          ...settings?.clockEnabled ? {} : { time: modal.root.querySelector("#wc-w-time")?.value || "" },
          dayCount: Number(modal.root.querySelector("#wc-w-day")?.value || 1),
          arc: modal.root.querySelector("#wc-w-arc")?.value || "",
          phase: modal.root.querySelector("#wc-w-phase")?.value || "",
          weather: modal.root.querySelector("#wc-w-weather")?.value || "",
          mood: modal.root.querySelector("#wc-w-mood")?.value || "",
          notes: modal.root.querySelector("#wc-w-notes")?.value || "",
          pc: {
            outfit: modal.root.querySelector("#wc-w-pc-outfit")?.value || "",
            pos: modal.root.querySelector("#wc-w-pc-pos")?.value || "",
            cond: modal.root.querySelector("#wc-w-pc-cond")?.value || "",
            carry: modal.root.querySelector("#wc-w-pc-carry")?.value || ""
          }
        }
      });
      modal.dismiss();
    });
  }
  function openBackupModal(list) {
    const modal = ctx.ui.showModal({ title: "Automatic Backups (This Chat)", width: 460 });
    const rows = (Array.isArray(list) ? list : []).map((b) => {
      const ts = b && Number.isFinite(b.ts) ? b.ts : 0;
      const label = ts ? new Date(ts).toLocaleString() : "Unknown backup";
      return `
        <div class="wc-synclog-row is-ok" style="justify-content:space-between;gap:12px">
          <span>${esc(label)}</span>
          <button class="wc-btn is-xs" data-act="restore_backup" data-path="${esc(b.path)}">Restore</button>
        </div>`;
    }).join("");
    modal.root.innerHTML = `
      <div class="wc-modal">
        <div class="wc-muted" style="margin-bottom:6px">Last ${list?.length || 0} automatic backups (one per minute, newest first). Restoring replaces this chat's sheet, tracker and dice history.</div>
        <div class="wc-synclog">${rows || '<div class="wc-dim">No backups yet \u2014 they are written as state syncs.</div>'}</div>
        <div class="wc-modal-foot"><button class="wc-btn" id="wc-bk-close">Close</button></div>
      </div>
    `;
    modal.root.querySelector("#wc-bk-close")?.addEventListener("click", () => modal.dismiss());
    modal.root.addEventListener("click", (ev) => {
      const btn = ev.target.closest('[data-act="restore_backup"]');
      if (!btn) return;
      const path = btn.getAttribute("data-path") || "";
      if (!path) return;
      send("restore_backup", { path });
      modal.dismiss();
    });
  }
  function openNpcModal(existing) {
    const modal = ctx.ui.showModal({ title: "Edit NPC", width: 430, maxHeight: 580 });
    modal.root.innerHTML = `
      <div class="wc-modal">
        <div class="wc-row-2">
          <div class="wc-field"><label>Name</label><input class="wc-input" id="wc-n-name" value="${esc(existing?.name || "")}" /></div>
          <div class="wc-field"><label>Role</label><input class="wc-input" id="wc-n-role" value="${esc(existing?.role || "")}" /></div>
        </div>
        <div class="wc-row-2">
          <div class="wc-field"><label>Current Mood</label><input class="wc-input" id="wc-n-mood" value="${esc(existing?.mood || existing?.attitude || "Guarded")}" /></div>
          <label class="wc-toggle-row" style="align-self:end"><span>Present in scene</span><input type="checkbox" id="wc-n-pres" ${existing ? existing.present ? "checked" : "" : "checked"} /></label>
        </div>
        <div class="wc-row-3">
          <div class="wc-field"><label>Bond (0-100)</label><input class="wc-input" id="wc-n-bond" type="number" min="0" max="100" value="${existing?.bond ?? 50}" /></div>
          <div class="wc-field"><label>Spark (0-100)</label><input class="wc-input" id="wc-n-spark" type="number" min="0" max="100" value="${existing?.spark ?? 15}" /></div>
          <div class="wc-field"><label>Heat (0-100)</label><input class="wc-input" id="wc-n-heat" type="number" min="0" max="100" value="${existing?.heat ?? 15}" /></div>
        </div>
        <div class="wc-field"><label>Location</label><input class="wc-input" id="wc-n-loc" value="${esc(existing?.location || data?.world.location || "")}" /></div>
        <div class="wc-field"><label>Private Thought</label><input class="wc-input" id="wc-n-th" value="${esc(existing?.lastThought || "")}" placeholder="What they are thinking right now..." /></div>
        <div class="wc-field"><label>Wants (Current Goal)</label><input class="wc-input" id="wc-n-goal" value="${esc(existing?.goal || "")}" /></div>
        <div class="wc-field"><label>Secret (optional)</label><input class="wc-input" id="wc-n-sec" value="${esc(existing?.secret || "")}" /></div>
        <div class="wc-modal-foot"><button class="wc-btn" id="wc-n-cancel">Cancel</button><button class="wc-btn is-primary" id="wc-n-save">Save NPC</button></div>
      </div>
    `;
    modal.root.querySelector("#wc-n-cancel")?.addEventListener("click", () => modal.dismiss());
    modal.root.querySelector("#wc-n-save")?.addEventListener("click", () => {
      const name = modal.root.querySelector("#wc-n-name")?.value.trim();
      if (!name) return;
      send("upsert_npc", {
        npc: {
          id: existing?.id,
          name,
          role: modal.root.querySelector("#wc-n-role")?.value.trim() || "",
          mood: modal.root.querySelector("#wc-n-mood")?.value.trim() || "Guarded",
          attitude: modal.root.querySelector("#wc-n-mood")?.value.trim() || "Guarded",
          bond: Number(modal.root.querySelector("#wc-n-bond")?.value ?? 50),
          spark: Number(modal.root.querySelector("#wc-n-spark")?.value ?? 15),
          heat: Number(modal.root.querySelector("#wc-n-heat")?.value ?? 15),
          location: modal.root.querySelector("#wc-n-loc")?.value.trim() || "",
          present: modal.root.querySelector("#wc-n-pres")?.checked ?? true,
          lastThought: modal.root.querySelector("#wc-n-th")?.value.trim() || "",
          goal: modal.root.querySelector("#wc-n-goal")?.value.trim() || "",
          secret: modal.root.querySelector("#wc-n-sec")?.value.trim() || ""
        }
      });
      modal.dismiss();
    });
  }
  function openChatLogModal(report) {
    const counts = [
      ["<Status>", report.status],
      ["<World_State>", report.world],
      ["<Dice>", report.dice],
      ["<choices>", report.choices]
    ].filter(([, n]) => n > 0);
    const warnings = Array.isArray(report.warnings) ? report.warnings : [];
    const modal = ctx.ui.showModal({ title: "Import from Chat Log", width: 480 });
    modal.root.innerHTML = `
      <div class="wc-modal">
        ${counts.length > 0 ? `<div class="wc-field"><label>Found in this chat's history</label>
          <div class="wc-actions-row" style="flex-wrap:wrap">${counts.map(([tag, n]) => `<span class="wc-chip is-active">${esc(tag)} \xD7 ${n}</span>`).join("")}</div>
        </div>` : `<div class="wc-dim">No preset state blocks found in this chat's history.</div>`}
        ${report.latestName || report.latestLevel ? `<div class="wc-dim">Latest snapshot: ${report.latestName ? esc(report.latestName) : "?"}${report.latestLevel ? ` \xB7 Lv ${report.latestLevel}` : ""}</div>` : ""}
        ${warnings.length > 0 ? `<div class="wc-field"><label>Health check</label>${warnings.map((w) => `<div class="wc-banner" style="margin-bottom:6px"><span>${esc(w)}</span></div>`).join("")}</div>` : `<div class="wc-dim">No double-rendering detected \u2014 the preset appears to be configured cleanly.</div>`}
        <div class="wc-dim">Importing replaces the extension's current sheet/world for this chat with the last <code>&lt;Status&gt;</code> / <code>&lt;World_State&gt;</code> in the log. A forced backup is taken first. Rolls and notices are kept.</div>
        <div class="wc-modal-foot">
          <button class="wc-btn" id="wc-clr-cancel">Close</button>
          ${report.canImport ? `<button class="wc-btn is-primary" id="wc-clr-import">Import &amp; Replace Chat State</button>` : ""}
        </div>
      </div>
    `;
    modal.root.querySelector("#wc-clr-cancel")?.addEventListener("click", () => modal.dismiss());
    modal.root.querySelector("#wc-clr-import")?.addEventListener("click", () => {
      send("import_chatlog");
      modal.dismiss();
    });
  }
  function openSimpleAddModal(kind) {
    if (kind === "export" && data) {
      const modal = ctx.ui.showModal({ title: "Export Weft Chronicle JSON", width: 460 });
      const json = JSON.stringify({ format: "weft-chronicle", version: 3, exportedAt: (/* @__PURE__ */ new Date()).toISOString(), sheet: data.sheet, world: data.world, rolls: data.rolls }, null, 2);
      modal.root.innerHTML = `
        <div class="wc-modal">
          <textarea class="wc-textarea" id="wc-exp" rows="12" readonly>${esc(json)}</textarea>
          <div class="wc-modal-foot">
            <button class="wc-btn is-primary" id="wc-exp-copy">Copy JSON</button>
            <button class="wc-btn" id="wc-exp-close">Close</button>
          </div>
        </div>
      `;
      modal.root.querySelector("#wc-exp-copy")?.addEventListener("click", () => {
        navigator.clipboard?.writeText(json).catch(() => {
        });
      });
      modal.root.querySelector("#wc-exp-close")?.addEventListener("click", () => modal.dismiss());
      return;
    }
    if (kind === "export_rolls" && data) {
      const modal = ctx.ui.showModal({ title: "Export Roll History", width: 520 });
      const rolls = Array.isArray(data.rolls) ? data.rolls : [];
      const mdCell = (v) => String(v ?? "").replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim();
      const toMarkdown = () => [
        "| When | Who | Action | d20 | Mods | DC | Total | Verdict |",
        "|---|---|---|---|---|---|---|---|",
        ...rolls.map((r) => {
          const mods = [
            r.stat === "none" ? "flat" : `${String(r.stat).toUpperCase()} ${formatMod(r.statMod)}`,
            r.gearBonus !== 0 ? `gear ${formatMod(r.gearBonus)}` : null,
            r.skillLabel ? `${r.skillLabel} ${formatMod(r.skillBonus)}` : null
          ].filter(Boolean).join(" ");
          const edge = r.mode === "adv" ? " ADV" : r.mode === "dis" ? " DIS" : "";
          const when = new Date(r.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
          return ["", when, r.who, r.action, `${r.roll}${edge}`, mods, r.dc, r.total, String(r.verdict).toUpperCase(), ""].map(mdCell).join("|");
        })
      ].join("\n");
      const toJson = () => JSON.stringify({ format: "weft-chronicle-rolls", version: 1, exportedAt: (/* @__PURE__ */ new Date()).toISOString(), rolls }, null, 2);
      modal.root.innerHTML = `
        <div class="wc-modal">
          <div class="wc-field"><label>Format</label>
            <div class="wc-actions-row">
              <button class="wc-btn is-xs" data-fmt="md">Markdown</button>
              <button class="wc-btn is-xs" data-fmt="json">JSON</button>
            </div>
          </div>
          <textarea class="wc-textarea" id="wc-expr" rows="12" readonly></textarea>
          <div class="wc-modal-foot">
            <button class="wc-btn is-primary" id="wc-expr-copy">Copy</button>
            <button class="wc-btn" id="wc-expr-close">Close</button>
          </div>
        </div>
      `;
      const area = modal.root.querySelector("#wc-expr");
      const setFmt = (fmt) => {
        area.value = fmt === "json" ? toJson() : toMarkdown();
      };
      modal.root.querySelectorAll("[data-fmt]").forEach((btn) => btn.addEventListener("click", () => setFmt(btn.dataset.fmt)));
      setFmt("md");
      modal.root.querySelector("#wc-expr-copy")?.addEventListener("click", () => {
        area.select();
        navigator.clipboard?.writeText(area.value).catch(() => {
        });
      });
      modal.root.querySelector("#wc-expr-close")?.addEventListener("click", () => modal.dismiss());
      return;
    }
    if (kind === "export_settings" && settings) {
      const modal = ctx.ui.showModal({ title: "Export Settings", width: 460 });
      const json = JSON.stringify({ format: "weft-chronicle-settings", version: 1, exportedAt: (/* @__PURE__ */ new Date()).toISOString(), settings }, null, 2);
      modal.root.innerHTML = `
        <div class="wc-modal">
          <textarea class="wc-textarea" id="wc-exs" rows="12" readonly>${esc(json)}</textarea>
          <div class="wc-modal-foot">
            <button class="wc-btn is-primary" id="wc-exs-copy">Copy JSON</button>
            <button class="wc-btn" id="wc-exs-close">Close</button>
          </div>
        </div>
      `;
      modal.root.querySelector("#wc-exs-copy")?.addEventListener("click", () => {
        const ta = modal.root.querySelector("#wc-exs");
        ta?.select();
        navigator.clipboard?.writeText(json).catch(() => {
        });
      });
      modal.root.querySelector("#wc-exs-close")?.addEventListener("click", () => modal.dismiss());
      return;
    }
    if (kind === "import_settings") {
      const modal = ctx.ui.showModal({ title: "Import Settings", width: 460 });
      modal.root.innerHTML = `
        <div class="wc-modal">
          <div class="wc-field"><label>Paste an exported settings JSON</label><textarea class="wc-textarea" id="wc-ims" rows="10" placeholder='{"format":"weft-chronicle-settings","settings":{...}}'></textarea></div>
          <div class="wc-modal-foot"><button class="wc-btn" id="wc-ims-cancel">Cancel</button><button class="wc-btn is-primary" id="wc-ims-go">Import</button></div>
        </div>
      `;
      modal.root.querySelector("#wc-ims-cancel")?.addEventListener("click", () => modal.dismiss());
      modal.root.querySelector("#wc-ims-go")?.addEventListener("click", () => {
        const raw = modal.root.querySelector("#wc-ims")?.value || "";
        try {
          const parsed = JSON.parse(raw);
          const patch = parsed && typeof parsed === "object" && parsed.settings && typeof parsed.settings === "object" ? parsed.settings : parsed;
          if (patch && typeof patch === "object" && !Array.isArray(patch)) send("update_settings", { patch });
        } catch {
        }
        modal.dismiss();
      });
      return;
    }
    if (kind === "export_weft" && data) {
      const modal = ctx.ui.showModal({ title: "Export Weft <Status>/<World_State>", width: 520 });
      const block = renderWeftBlock(data);
      modal.root.innerHTML = `
        <div class="wc-modal">
          <div class="wc-field"><label>Paste into chat as a user message, or into a preset for hand-editing</label>
            <textarea class="wc-textarea" id="wc-expw" rows="12" readonly>${esc(block)}</textarea>
          </div>
          <div class="wc-modal-foot">
            <button class="wc-btn is-primary" id="wc-expw-copy">Copy Block</button>
            <button class="wc-btn" id="wc-expw-close">Close</button>
          </div>
        </div>
      `;
      modal.root.querySelector("#wc-expw-copy")?.addEventListener("click", () => {
        modal.root.querySelector("#wc-expw")?.select();
        navigator.clipboard?.writeText(block).catch(() => {
        });
      });
      modal.root.querySelector("#wc-expw-close")?.addEventListener("click", () => modal.dismiss());
      return;
    }
    if (kind === "import") {
      const modal = ctx.ui.showModal({ title: "Import Weft Chronicle JSON", width: 460 });
      modal.root.innerHTML = `
        <div class="wc-modal">
          <div class="wc-field"><label>Paste exported JSON</label><textarea class="wc-textarea" id="wc-imp" rows="10" placeholder='{"sheet":...,"world":...}'></textarea></div>
          <div class="wc-modal-foot"><button class="wc-btn" id="wc-imp-cancel">Cancel</button><button class="wc-btn is-primary" id="wc-imp-go">Import</button></div>
        </div>
      `;
      modal.root.querySelector("#wc-imp-cancel")?.addEventListener("click", () => modal.dismiss());
      modal.root.querySelector("#wc-imp-go")?.addEventListener("click", () => {
        const json = modal.root.querySelector("#wc-imp")?.value || "";
        if (json.trim()) send("import_json", { json });
        modal.dismiss();
      });
      return;
    }
    if (kind === "effect") {
      const modal = ctx.ui.showModal({ title: "Add Active Effect", width: 380 });
      modal.root.innerHTML = `
        <div class="wc-modal">
          <div class="wc-field"><label>Effect Name</label><input class="wc-input" id="wc-ef-name" placeholder="e.g., Sprained Ankle, Adrenaline" /></div>
          <div class="wc-row-2">
            <div class="wc-field"><label>Kind</label><select class="wc-select" id="wc-ef-kind"><option value="debuff">Debuff</option><option value="buff">Buff</option><option value="neutral">Neutral</option></select></div>
            <div class="wc-field"><label>Duration (turns, blank=ongoing)</label><input class="wc-input" id="wc-ef-dur" type="number" min="1" /></div>
          </div>
          <div class="wc-field"><label>Note</label><input class="wc-input" id="wc-ef-note" /></div>
          <div class="wc-modal-foot"><button class="wc-btn" id="wc-ef-c">Cancel</button><button class="wc-btn is-primary" id="wc-ef-s">Add</button></div>
        </div>
      `;
      modal.root.querySelector("#wc-ef-c")?.addEventListener("click", () => modal.dismiss());
      modal.root.querySelector("#wc-ef-s")?.addEventListener("click", () => {
        const name = modal.root.querySelector("#wc-ef-name")?.value.trim();
        if (!name) return;
        const durRaw = modal.root.querySelector("#wc-ef-dur")?.value.trim();
        send("add_effect", {
          effect: {
            name,
            kind: modal.root.querySelector("#wc-ef-kind")?.value,
            duration: durRaw ? Number(durRaw) : null,
            note: modal.root.querySelector("#wc-ef-note")?.value.trim() || ""
          }
        });
        modal.dismiss();
      });
      return;
    }
    if (kind === "skill") {
      const modal = ctx.ui.showModal({ title: "Add Skill / Trait", width: 380 });
      modal.root.innerHTML = `
        <div class="wc-modal">
          <div class="wc-field"><label>Skill Name</label><input class="wc-input" id="wc-sk-name" placeholder="e.g., Field Triage, Lockpicking" /></div>
          <div class="wc-field"><label>Cost (optional)</label><input class="wc-input" id="wc-sk-cost" placeholder="e.g., 4 SP or Passive" /></div>
          <div class="wc-field"><label>Note</label><input class="wc-input" id="wc-sk-note" /></div>
          <div class="wc-field"><label>Dice Bonus (optional)</label><input class="wc-input" id="wc-sk-bonus" type="number" min="-2" max="10" placeholder="e.g., 2 \u2014 applies when rolling a relevant check" /></div>
          <div class="wc-modal-foot"><button class="wc-btn" id="wc-sk-c">Cancel</button><button class="wc-btn is-primary" id="wc-sk-s">Add</button></div>
        </div>
      `;
      modal.root.querySelector("#wc-sk-c")?.addEventListener("click", () => modal.dismiss());
      modal.root.querySelector("#wc-sk-s")?.addEventListener("click", () => {
        const name = modal.root.querySelector("#wc-sk-name")?.value.trim();
        if (!name) return;
        const bonus = Number(modal.root.querySelector("#wc-sk-bonus")?.value || 0);
        send("add_skill", {
          skill: {
            name,
            cost: modal.root.querySelector("#wc-sk-cost")?.value.trim() || "",
            note: modal.root.querySelector("#wc-sk-note")?.value.trim() || "",
            bonus: Number.isFinite(bonus) ? Math.min(10, Math.max(-2, Math.floor(bonus))) : 0
          }
        });
        modal.dismiss();
      });
      return;
    }
    if (kind === "thread") {
      const modal = ctx.ui.showModal({ title: "Add Thread / Seed", width: 380 });
      modal.root.innerHTML = `
        <div class="wc-modal">
          <div class="wc-field"><label>Title</label><input class="wc-input" id="wc-th-t" placeholder="e.g., Radio broadcast from Highway 111" /></div>
          <div class="wc-field"><label>Kind</label><select class="wc-select" id="wc-th-st"><option value="active">Open Thread</option><option value="seed">Seed</option><option value="timer">Countdown Timer</option><option value="resolved">Resolved</option></select></div>
          <div class="wc-field" id="wc-th-turns-wrap" style="display:none"><label>Turns until it lands</label><input class="wc-input" id="wc-th-turns" type="number" min="1" max="99" value="3" /></div>
          <div class="wc-field"><label>Detail</label><textarea class="wc-textarea" id="wc-th-d" rows="2"></textarea></div>
          <div class="wc-modal-foot"><button class="wc-btn" id="wc-th-c">Cancel</button><button class="wc-btn is-primary" id="wc-th-s">Add</button></div>
        </div>
      `;
      const kindSel = modal.root.querySelector("#wc-th-st");
      const turnsWrap = modal.root.querySelector("#wc-th-turns-wrap");
      kindSel?.addEventListener("change", () => {
        if (turnsWrap) turnsWrap.style.display = kindSel.value === "timer" ? "" : "none";
      });
      modal.root.querySelector("#wc-th-c")?.addEventListener("click", () => modal.dismiss());
      modal.root.querySelector("#wc-th-s")?.addEventListener("click", () => {
        const title = modal.root.querySelector("#wc-th-t")?.value.trim();
        if (!title) return;
        const kindVal = modal.root.querySelector("#wc-th-st")?.value;
        const turns = Math.floor(Number(modal.root.querySelector("#wc-th-turns")?.value || 3));
        const thread = kindVal === "timer" ? { title, status: "active", kind: "timer", turnsLeft: Math.min(99, Math.max(1, Number.isFinite(turns) ? turns : 3)), detail: modal.root.querySelector("#wc-th-d")?.value.trim() || "" } : { title, status: kindVal, detail: modal.root.querySelector("#wc-th-d")?.value.trim() || "" };
        send("upsert_thread", { thread });
        modal.dismiss();
      });
    }
  }
  function renderModuleDisabledCard(mod, title, desc) {
    return `
      <div class="wc-card">
        <div class="wc-card-title">${esc(title)} is OFF for this chat</div>
        <div class="wc-muted">${esc(desc)}</div>
        <div class="wc-actions-row">
          <button class="wc-btn is-primary" data-act="enable_mod" data-mod="${mod}">Turn ${esc(title)} ON</button>
        </div>
      </div>
    `;
  }
  var noticeFilter = "all";
  var NOTICE_FILTERS = [
    ["all", "All"],
    ["levelup", "Level"],
    ["quest", "Quests"],
    ["item", "Items"],
    ["skill", "Skills"],
    ["warn", "Warnings"],
    ["change", "Changes"]
  ];
  var ARC_TO_WEFT = { opening: "Setup", rising: "Escalation", turning: "Complication", climax: "Crisis", fallout: "Resolution" };
  var PHASE_TO_WEFT = { setup: "Early Simmer", tension: "Building", confrontation: "Midpoint Tension", intimacy: "Climax", aftermath: "Breather" };
  var WEFT_ARC_WORDS = /* @__PURE__ */ new Set(["setup", "escalation", "complication", "crisis", "resolution"]);
  var WEFT_PHASE_WORDS = /* @__PURE__ */ new Set(["early simmer", "building", "midpoint tension", "climax", "breather"]);
  function weftLadder(value, toWeft, known) {
    const s = String(value || "").trim();
    if (!s) return null;
    const lower = s.toLowerCase();
    if (known.has(lower)) return s;
    return toWeft[lower] || s;
  }
  function renderWeftBlock(d) {
    const s = d.sheet;
    const w = d.world;
    const th = escXmlAttr("sakura");
    const tag = (name, content, attrs) => {
      const attrStr = attrs ? ` ${attrs}` : "";
      return `<${name}${attrStr}>${content}</${name}>`;
    };
    const optTag = (name, value, attrs) => {
      const v = String(value ?? "").trim();
      return v ? `<${name}${attrs ? ` ${attrs}` : ""}>${escXml(v)}</${name}>` : "";
    };
    const lines = [];
    const status = [];
    status.push(`<Status th="${th}">`);
    status.push(`${optTag("nm", s.name)}${optTag("lv", s.level)}${optTag("race", s.race)}${optTag("rank", s.rank)}`);
    status.push(`${optTag("cls", s.cls)}${optTag("subcls", s.subcls)}${optTag("guild", s.guild)}${optTag("ttl", s.title)}`);
    status.push(`${optTag("hp", `${s.hp}/${s.hpMax}`)}${s.useMp ? optTag("mp", `${s.mp}/${s.mpMax}`, s.mpLabel && s.mpLabel !== "MP" ? `l="${escXmlAttr(s.mpLabel)}"` : "") : ""}${optTag("sp", `${s.sp}/${s.spMax}`)}`);
    status.push(optTag("xp", `${s.xp}/${s.xpNext}`));
    const statTag = (k) => {
      const label = s.statLabels?.[k] || k.toUpperCase();
      const renamed = label && label.toUpperCase() !== k.toUpperCase();
      return `<${k}${renamed ? ` l="${escXmlAttr(label)}"` : ""}>${s.stats[k]}</${k}>`;
    };
    status.push(STAT_KEYS.map(statTag).join(""));
    if (s.pts > 0) status.push(optTag("pts", s.pts));
    const gearLine = (tag2, key) => {
      const it = s.gear?.[key];
      if (!it) return "";
      const r = it.rarity && it.rarity !== "ordinary" ? ` (${it.rarity})` : "";
      const q = it.qty > 1 ? ` x${it.qty}` : "";
      return `<${tag2}><it>${escXml(it.name)}${escXml(r)}${escXml(q)}</it></${tag2}>`;
    };
    status.push(`${gearLine("wpn", "weapon")}${gearLine("arm", "armor")}${gearLine("acc", "accessory")}`);
    const skl = (s.skills || []).map((k) => `<it>${escXml(k.name)}${Number(k.bonus) ? ` +${Number(k.bonus)}` : ""}</it>`).join("");
    if (skl) status.push(`<skl>${skl}</skl>`);
    const fx = (s.effects || []).map((e) => `<it>${escXml(e.name)}: ${e.duration === null ? "ongoing" : `${e.duration}t`}</it>`).join("");
    if (fx) status.push(`<fx>${fx}</fx>`);
    status.push(`<log>Exported from Weft Chronicle</log>`);
    const bag = (s.bag || []).map((it) => `<itm t="${escXmlAttr(it.category)}" r="${escXmlAttr(it.rarity)}" n="${it.qty}">${escXml(it.name)}</itm>`).join("\n");
    if (bag) status.push(`<bag>
${bag}
</bag>`);
    if (s.cash) status.push(optTag("cash", s.cash));
    const quests = (s.quests || []).map((q) => {
      const obs = (q.objectives || []).map((o) => `<ob x="${o.done ? 1 : 0}">${escXml(o.text)}${o.progress ? ` (${escXml(o.progress)})` : ""}</ob>`).join("");
      return `<quest s="${escXmlAttr(q.status)}" k="${escXmlAttr(q.kind || "side")}"><qt>${escXml(q.title)}</qt>${obs}${q.reward ? `<rw>${escXml(q.reward)}</rw>` : ""}${q.penalty ? `<pn>${escXml(q.penalty)}</pn>` : ""}</quest>`;
    }).join("\n");
    if (quests) status.push(`<quests>
${quests}
</quests>`);
    status.push(`</Status>`);
    const world = [];
    world.push(`<World_State th="${th}" st="strip">`);
    {
      const raw = String(w.time || "");
      const cleaned = raw.replace(new RegExp(`^Day ${Number(w.dayCount) || 1}\\s*[\xB7,\u2014-]\\s*`), "").trim();
      world.push(optTag("clock", [`Day ${w.dayCount}`, cleaned].filter(Boolean).join(", ")));
    }
    world.push(optTag("place", w.location));
    if (w.weather) world.push(`<weather>${escXml(w.weather)}</weather>`);
    const pc = w.pc || {};
    const pcLines = [
      ["name", s.name],
      ["outfit", pc.outfit],
      ["pos", pc.pos],
      ["cond", pc.cond],
      ["carry", pc.carry]
    ].filter(([, v]) => String(v || "").trim());
    if (pcLines.length > 1 || pcLines.length === 1 && pcLines[0][0] !== "name") {
      world.push(`<pc>
${pcLines.map(([k, v]) => `${k}: ${escXml(v)}`).join("\n")}
</pc>`);
    }
    for (const n of (w.npcs || []).filter((x) => x.present)) {
      const npc = [];
      npc.push(`<npc>`);
      npc.push(`name: ${escXml(n.name)}`);
      npc.push(`mood: ${escXml(n.mood || n.attitude || "Guarded")}`);
      if (n.lastThought) npc.push(`think: ${escXml(n.lastThought)}`);
      npc.push(`pos: ${escXml(n.location || "In scene")}`);
      if (n.goal) npc.push(`want: ${escXml(n.goal)}`);
      npc.push(`bond: ${n.bond} | ${bshStage("bond", n.bond)}`);
      npc.push(`spark: ${n.spark} | ${bshStage("spark", n.spark)}`);
      if (n.heat >= 25) npc.push(`heat: ${n.heat} | ${bshStage("heat", n.heat)}`);
      if (n.secret) npc.push(`secret: ${escXml(n.secret)}`);
      npc.push(`</npc>`);
      world.push(npc.join("\n"));
    }
    for (const n of (w.npcs || []).filter((x) => !x.present)) {
      world.push(`<off>${escXml(n.name)}: ${escXml(n.location || "elsewhere")}</off>`);
    }
    const threads = (w.threads || []).filter((t) => t.status === "active" && t.kind !== "timer");
    const seeds = (w.threads || []).filter((t) => t.status === "seed" && t.kind !== "timer");
    const timers = (w.threads || []).filter((t) => t.kind === "timer" && t.status !== "resolved");
    for (const t of threads) world.push(`<thread>${escXml(t.title)}${t.detail ? ` \u2014 ${escXml(t.detail)}` : ""}</thread>`);
    for (const t of seeds) world.push(`<seed>${escXml(t.title)}${t.detail ? ` \u2014 ${escXml(t.detail)}` : ""}</seed>`);
    for (const t of timers) world.push(`<timer>${escXml(t.title)}${t.detail ? `: ${escXml(t.detail)}` : ""}: ${t.turnsLeft} turns left</timer>`);
    const arc = weftLadder(w.arc, ARC_TO_WEFT, WEFT_ARC_WORDS);
    const phase = weftLadder(w.phase, PHASE_TO_WEFT, WEFT_PHASE_WORDS);
    if (arc) world.push(`<arc>${escXml(arc)}</arc>`);
    if (phase) world.push(`<phase>${escXml(phase)}</phase>`);
    world.push(`</World_State>`);
    lines.push(status.filter(Boolean).join("\n"));
    lines.push(world.filter(Boolean).join("\n"));
    return lines.join("\n");
  }
  function groupNotices(list) {
    const out = [];
    for (const n of list) {
      const linesKey = JSON.stringify(Array.isArray(n.lines) ? n.lines : []);
      const prev = out.length > 0 ? out[out.length - 1] : null;
      if (prev && prev.kind === n.kind && prev.title === n.title && prev.linesKey === linesKey) {
        prev.count += 1;
        prev.ids.push(n.id);
      } else {
        out.push({ kind: n.kind, title: n.title, linesKey, count: 1, notice: n, ids: [n.id] });
      }
    }
    return out;
  }
  function renderNoticeFeed(d) {
    const list = Array.isArray(d.notices) ? d.notices : [];
    if (list.length === 0) return "";
    const filtered = list.filter((n) => noticeFilter === "all" || n.kind === noticeFilter);
    const grouped = groupNotices(filtered.slice(0, 12));
    const chips = NOTICE_FILTERS.map(([k, label]) => `<button class="wc-chip ${noticeFilter === k ? "is-active" : ""}" data-act="notice_filter" data-filter="${k}">${label}</button>`).join("");
    return `
    <div class="wc-card">
      <div class="wc-card-head"><span class="wc-card-title">Notifications</span><span class="wc-dim">${filtered.length} of ${list.length}</span></div>
      <div class="wc-chip-row">${chips}</div>
      <div class="wc-notif-list">
        ${grouped.length === 0 ? `<div class="wc-dim">Nothing in this filter.</div>` : grouped.map((g) => `
          <div class="wc-notif-row" data-k="${esc(g.notice.kind || "")}">
            <div class="wc-notif-main">
              <b>${esc(g.notice.title)}${g.count > 1 ? ` <span class="wc-pill">\xD7${g.count}</span>` : ""}</b>
              <span>${esc((g.notice.lines || []).join(" \xB7 "))}</span>
            </div>
            <button class="wc-btn is-xs" data-act="dismiss_notice" data-ids="${esc(g.ids.join(","))}" title="Dismiss" aria-label="Dismiss notification">\xD7</button>
          </div>`).join("")}
      </div>
      <div class="wc-actions-row" style="justify-content:flex-end"><button class="wc-btn is-xs" data-act="clear_notices">Clear All</button></div>
    </div>
  `;
  }
  function renderSystemTab(d, cfg) {
    if (!d.modules.system) {
      return renderModuleDisabledCard(
        "system",
        "System Window",
        "System stats, HP/SP/XP, inventory, quests, and System Notifications are paused for this chat (0 prompt tokens used)."
      );
    }
    const initBanner = !d.initialized ? `<div class="wc-banner">
           <span>Not initialized for this chat yet.</span>
           <button class="wc-btn is-primary is-xs" data-act="init_ai" ${syncing ? "disabled" : ""}>${icon("sparkles", 13)} Initialize with AI</button>
         </div>` : "";
    const latestNotices = renderNoticeFeed(d);
    return `
      ${initBanner}
      ${latestNotices}
      ${renderSystemWindow(d.sheet, cfg, { mode: "drawer" })}
    `;
  }
  function renderGearTab(d, cfg) {
    if (!d.modules.system) {
      return renderModuleDisabledCard(
        "system",
        "System Window (Inventory & Quests)",
        "Turn the System module ON to manage equipped gear, pack items, and quests."
      );
    }
    return `
      ${renderInventoryWindow(d.sheet, cfg)}
      ${renderQuestWindow(d.sheet, cfg)}
    `;
  }
  function renderTrackerTab(d, cfg) {
    if (!d.modules.tracker) {
      return renderModuleDisabledCard(
        "tracker",
        "Story Tracker",
        "Scene tracking, Bond/Spark/Heat NPC bars, private thoughts, secrets, and open threads are paused for this chat."
      );
    }
    const initBanner = !d.initialized ? `<div class="wc-banner">
           <span>Tracker not initialized yet.</span>
           <button class="wc-btn is-primary is-xs" data-act="init_ai" ${syncing ? "disabled" : ""}>${icon("sparkles", 13)} Initialize with AI</button>
         </div>` : "";
    return `
      ${initBanner}
      ${renderTrackerCard(d.world, cfg, { mode: "drawer" })}
    `;
  }
  function renderDiceTab(d, cfg) {
    if (!d.modules.dice) {
      return renderModuleDisabledCard(
        "dice",
        "Fair d20 Dice Roller",
        "Real-RNG dice rolling and the Roll d20 input-bar action are turned OFF for this chat."
      );
    }
    const pending = d.rolls.filter((r) => !r.consumed);
    const autoGear = computeMaxGearBonus(d.sheet);
    return `
      <div class="wc-card">
        <div class="wc-card-head">
          <span class="wc-card-title">Fair Real-RNG d20 Roller</span>
          ${pending.length > 0 ? `<button class="wc-btn is-xs" data-act="clear_pending">Clear Pending (${pending.length})</button>` : ""}
        </div>
        <div class="wc-field">
          <label>Action</label>
          <input class="wc-input" id="wc-d-action" placeholder="e.g., Climb the fire escape silently" value="${esc(rollDraft.action)}" />
        </div>
        <div class="wc-row-3">
          <div class="wc-field">
            <label>Stat</label>
            <select class="wc-select" id="wc-d-stat">
              <option value="none" ${rollDraft.stat === "none" ? "selected" : ""}>Flat (+0)</option>
              ${STAT_KEYS.map((k) => {
      const v = d.sheet.stats[k];
      return `<option value="${k}" ${rollDraft.stat === k ? "selected" : ""}>${esc(d.sheet.statLabels[k])} (${formatMod(statModifier(v))})</option>`;
    }).join("")}
            </select>
          </div>
          <div class="wc-field"><label>DC</label><input class="wc-input" id="wc-d-dc" type="number" min="1" max="40" value="${rollDraft.dc}" /></div>
          <div class="wc-field"><label>Gear</label><input class="wc-input" id="wc-d-gear" type="number" min="-3" max="3" value="${autoGear}" /></div>
        </div>
        ${(d.sheet.skills || []).length > 0 ? `<div class="wc-field"><label>Skill (adds its dice bonus)</label><select class="wc-select" id="wc-d-skill"><option value="">\u2014 no skill \u2014</option>${d.sheet.skills.map((sk) => {
      const b = Number(sk.bonus) || 0;
      return `<option value="${esc(sk.id)}">${esc(sk.name)} (${b >= 0 ? "+" : ""}${b})</option>`;
    }).join("")}</select></div>` : ""}
        <div class="wc-field"><label>Edge</label>${edgeSegHtml("wc-d-edge", rollDraft.mode)}</div>
        ${(d.world?.npcs || []).some((n) => n.present) ? `<div class="wc-row-2">
          <div class="wc-field"><label>Opponent (contested)</label><select class="wc-select" id="wc-d-opp"><option value="">\u2014 none \u2014</option>${(d.world.npcs || []).filter((n) => n.present).map((n) => `<option value="${esc(n.name)}">${esc(n.name)}</option>`).join("")}</select></div>
          <div class="wc-field"><label>Foe Bonus</label><input class="wc-input" id="wc-d-foebonus" type="number" min="-5" max="10" value="3" /></div>
        </div>` : ""}
        <div class="wc-actions-row">
          ${DC_PRESETS.slice(1, 5).map((p) => `<button class="wc-btn is-xs" data-act="set_dc" data-dc="${p.dc}">DC ${p.dc}</button>`).join("")}
          <button class="wc-btn is-primary" style="margin-left:auto" data-act="inline_contest" title="Roll you vs the selected NPC (higher total wins)">Contest!</button>
          <button class="wc-btn is-primary" data-act="inline_roll">${icon("d20", 14)} Roll d20</button>
        </div>
      </div>

      ${cfg.survivalEnabled ? `<div class="wc-card">
        <div class="wc-card-head">
          <span class="wc-card-title">${icon("compass", 13)} Survival</span>
          <span class="wc-dim">seeded by chat + date</span>
        </div>
        <div class="wc-dim" style="margin-bottom:8px">Scavenge: WIS check vs DC ${Number(cfg.survivalDc) || 15} \u2014 finds go straight into your bag. Encounter: who's out there? Both bind the AI's next reply.</div>
        <div class="wc-actions-row">
          <button class="wc-btn" data-act="scavenge_roll" title="Roll d20 + WIS vs your survival DC \u2014 seeded by chat, date and attempt #${(d.scavengeCount || 0) + 1}">${icon("compass", 13)} Scavenge</button>
          <button class="wc-btn" data-act="encounter_roll" title="Roll d20 \u2014 scans for signs of threats (attempt #${(d.encounterCount || 0) + 1})">${icon("eye", 13)} Encounter</button>
        </div>
      </div>` : ""}

      ${d.rolls.length > 0 ? `<div class="wc-list">
               ${d.rolls.slice(0, 10).map((r) => renderDiceCard(r, cfg.theme)).join("")}
               <div class="wc-actions-row" style="justify-content:flex-end;">
                 <button class="wc-btn is-xs" data-act="copy_last_roll" title="Copy the latest roll as plain text for the chat">Copy Last Roll</button>
                 <button class="wc-btn is-xs" data-act="modal_add" data-kind="export_rolls" title="Download/copy the full roll history as JSON or Markdown">Export History</button>
                 <button class="wc-btn is-xs" data-act="clear_rolls">Clear Roll History</button>
               </div>
             </div>` : `<div class="wc-card"><div class="wc-dim">Rolls use unbiased crypto RNG and automatically bind the AI's next reply.</div></div>`}
    `;
  }
  function renderChoicesTab(d, cfg) {
    if (!d.modules.choices) {
      return renderModuleDisabledCard(
        "choices",
        "CYOA Choices",
        "The What Now? choices card is turned OFF for this chat."
      );
    }
    const latest = findLatestChoices(d);
    if (!latest) {
      return `<div class="wc-card">
        <div class="wc-card-title">What Now?</div>
        <div class="wc-dim">No choices in the tracked replies yet. When the story ends with a <code>&lt;choices&gt;</code> block (Weft's CYOA), the options appear here and inline under the reply in chat.</div>
      </div>`;
    }
    return `<div class="wc-card">
      <div class="wc-card-head"><span class="wc-card-title">What Now? \xB7 Latest Reply</span><span class="wc-dim">one-shot</span></div>
      ${renderChoicesCard(latest.snap.choices, cfg.theme, { open: true, snapKey: latest.key })}
      <div class="wc-dim" style="margin-top:8px">Tapping a choice sends it as your next message. Picked paths are marked and can't be sent twice.</div>
    </div>`;
  }
  function renderSettingsContent(d, cfg) {
    const missingPerms = ["interceptor", "generation", "chats", "chat_mutation", "characters", "personas"].filter(
      (p) => !permissions[p]
    );
    const snapCount = d ? Object.keys(d.snapshots || {}).length : 0;
    const activeConnId = getActiveConnectionId();
    const activeConnObj = connections.find((c) => c.id === activeConnId) || connections.find((c) => c.isDefault);
    const activeConnLabel = activeConnObj ? `Use Active Connection (${activeConnObj.name})` : "Use Active Default Connection";
    return `
      ${missingPerms.length > 0 ? `<div class="wc-banner">
               <span>Missing permissions: ${esc(missingPerms.join(", "))}</span>
               <button class="wc-btn is-primary is-xs" data-act="req_perms">Grant</button>
             </div>` : ""}

      ${d ? `<div class="wc-card">
               <div class="wc-card-head">
                 <span class="wc-card-title">Modules (This Chat)</span>
                 <span class="wc-dim">Toggle any module off independently</span>
               </div>
               <label class="wc-toggle-row">
                 <span><strong>System Window</strong><small>Stats, HP/SP/XP, Gear, Quests & System Notices</small></span>
                 <input type="checkbox" data-mod-toggle="system" ${d.modules.system ? "checked" : ""} />
               </label>
               <label class="wc-toggle-row">
                 <span><strong>Story Tracker</strong><small>Scene/Arc, NPC Bond/Spark/Heat, Thoughts, Secrets & Threads</small></span>
                 <input type="checkbox" data-mod-toggle="tracker" ${d.modules.tracker ? "checked" : ""} />
               </label>
               <label class="wc-toggle-row">
                 <span><strong>Fair d20 Dice Roller</strong><small>Real crypto RNG checks & Roll d20 composer button</small></span>
                 <input type="checkbox" data-mod-toggle="dice" ${d.modules.dice ? "checked" : ""} />
               </label>
               <label class="wc-toggle-row">
                 <span><strong>CYOA Choices</strong><small>Tappable What Now? card from &lt;choices&gt; blocks \u2014 tap sends your next message</small></span>
                 <input type="checkbox" data-mod-toggle="choices" ${d.modules.choices ? "checked" : ""} />
               </label>
             </div>` : ""}

      <div class="wc-card">
        <div class="wc-card-head">
          <span class="wc-card-title">Inline Cards Inside Chat</span>
          <span class="wc-dim">Rendered with AI replies</span>
        </div>
        <div class="wc-field">
          <label>Card Placement</label>
          <select class="wc-select" id="wc-cfg-placement">
            <option value="inside" ${cfg.inlinePlacement !== "below" && cfg.inlinePlacement !== "footer" ? "selected" : ""}>Inside message body (with What Now?)</option>
            <option value="footer" ${cfg.inlinePlacement === "footer" ? "selected" : ""}>Message footer (below divider, above swipe)</option>
            <option value="below" ${cfg.inlinePlacement === "below" ? "selected" : ""}>Below message card</option>
          </select>
        </div>
        <label class="wc-toggle-row"><span>Show System Window card in chat</span><input type="checkbox" data-cfg="showInlineSystem" ${cfg.showInlineSystem ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Show System Notifications in chat</span><input type="checkbox" data-cfg="showInlineNotices" ${cfg.showInlineNotices ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Show Story Tracker card in chat</span><input type="checkbox" data-cfg="showInlineTracker" ${cfg.showInlineTracker ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Show Dice Result cards in chat</span><input type="checkbox" data-cfg="showInlineDice" ${cfg.showInlineDice ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Compact dice cards (one line)</span><input type="checkbox" data-cfg="inlineDiceCompact" ${cfg.inlineDiceCompact ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Show CYOA Choice cards in chat</span><input type="checkbox" data-cfg="showInlineChoices" ${cfg.showInlineChoices ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Inline cards start expanded</span><input type="checkbox" data-cfg="inlineStartsOpen" ${cfg.inlineStartsOpen ? "checked" : ""} /></label>
      </div>

      <div class="wc-card">
        <div class="wc-card-head"><span class="wc-card-title">Theme & Appearance</span></div>
        <div class="wc-row-2">
          <div class="wc-field">
            <label>Card & Panel Theme</label>
            <select class="wc-select" id="wc-cfg-theme">
              ${WEFT_THEMES.map((t) => `<option value="${t.id}" ${cfg.theme === t.id ? "selected" : ""}>${esc(t.label)}</option>`).join("")}
            </select>
          </div>
          <div class="wc-field">
            <label>This Chat's Theme Override</label>
            <select class="wc-select" id="wc-cfg-chattheme">
              <option value="">Follow global theme</option>
              ${WEFT_THEMES.map((t) => `<option value="${t.id}" ${d && d.themeOverride === t.id ? "selected" : ""}>${esc(t.label)}</option>`).join("")}
            </select>
          </div>
          <div class="wc-field">
            <label>System Window Color</label>
            <select class="wc-select" id="wc-cfg-systheme">
              <option value="follow" ${cfg.systemTheme === "follow" ? "selected" : ""}>Follow Card Theme</option>
              <option value="blue" ${cfg.systemTheme === "blue" ? "selected" : ""}>Classic System Blue</option>
              <option value="gold" ${cfg.systemTheme === "gold" ? "selected" : ""}>System Gold</option>
            </select>
          </div>
        </div>
        <div class="wc-card-title" style="margin-top:4px;">Tracker Display Fields</div>
        <div class="wc-row-2">
          <label class="wc-toggle-row"><span>Bond bar</span><input type="checkbox" data-cfg="trackerShowBond" ${cfg.trackerShowBond ? "checked" : ""} /></label>
          <label class="wc-toggle-row"><span>Spark bar</span><input type="checkbox" data-cfg="trackerShowSpark" ${cfg.trackerShowSpark ? "checked" : ""} /></label>
          <label class="wc-toggle-row"><span>Heat bar</span><input type="checkbox" data-cfg="trackerShowHeat" ${cfg.trackerShowHeat ? "checked" : ""} /></label>
          <label class="wc-toggle-row"><span>Private thought</span><input type="checkbox" data-cfg="trackerShowThought" ${cfg.trackerShowThought ? "checked" : ""} /></label>
          <label class="wc-toggle-row"><span>Secrets</span><input type="checkbox" data-cfg="trackerShowSecret" ${cfg.trackerShowSecret ? "checked" : ""} /></label>
        </div>
      </div>

      <div class="wc-card">
        <div class="wc-card-head">
          <span class="wc-card-title">AI Connection & Sync</span>
          <span class="wc-dim">${snapCount} swipe snap${snapCount === 1 ? "" : "s"}</span>
        </div>
        <div class="wc-field">
          <label>Sidecar LLM Connection (for Auto-Sync & Init)</label>
          <select class="wc-select" id="wc-cfg-conn">
            <option value="" ${!cfg.sidecarConnectionId ? "selected" : ""}>${esc(activeConnLabel)}</option>
            ${connections.map(
      (c) => `<option value="${esc(c.id)}" ${cfg.sidecarConnectionId === c.id ? "selected" : ""}>${esc(c.name)} (${esc(c.provider)} \xB7 ${esc(c.model)})</option>`
    ).join("")}
          </select>
        </div>
        <div class="wc-field">
          <label>Level-Up Stat Allocation</label>
          <select class="wc-select" id="wc-cfg-alloc">
            <option value="player" ${cfg.allocMode === "player" ? "selected" : ""}>You Choose (+2 pts/lv)</option>
            <option value="auto" ${cfg.allocMode === "auto" ? "selected" : ""}>Auto-Assign</option>
          </select>
        </div>
        <div class="wc-field">
          <label>Auto-Alloc Priority (optional)</label>
          <input class="wc-input" id="wc-cfg-allocpriority" value="${esc(cfg.allocPriority || "")}" placeholder="e.g., dex, con, str \u2014 empty = best stats first" />
        </div>
        <div class="wc-field">
          <label>Sync Pacing</label>
          <select class="wc-select" id="wc-cfg-syncmode">
            <option value="every" ${cfg.syncMode === "every" ? "selected" : ""}>After every AI reply</option>
            <option value="every2" ${cfg.syncMode === "every2" ? "selected" : ""}>Every 2nd AI reply</option>
            <option value="manual" ${cfg.syncMode === "manual" ? "selected" : ""}>Manual only (use Sync Now)</option>
          </select>
        </div>
        <div class="wc-field">
          <label>Prompt Budget</label>
          <select class="wc-select" id="wc-cfg-budget">
            <option value="standard" ${cfg.promptBudget === "standard" ? "selected" : ""}>Standard (full state block)</option>
            <option value="lean" ${cfg.promptBudget === "lean" ? "selected" : ""}>Lean (~half the tokens)</option>
          </select>
        </div>
        <div class="wc-dim" style="margin:-6px 0 8px">
          ${promptEstimate ? promptEstimate.tokens > 0 ? `Live prompt block: \u2248<b>${promptEstimate.tokens}</b> tokens (${promptEstimate.chars} chars \xF7 4), injected once per generation.` : `Live prompt block: empty right now \u2014 nothing gets injected for this chat's current settings.` : "Live prompt cost appears after the next state refresh."}
        </div>
        <div class="wc-field">
          <label>XP Curve</label>
          <select class="wc-select" id="wc-cfg-xpcurve">
            <option value="flat" ${cfg.xpCurve === "flat" ? "selected" : ""}>Flat (100 \xD7 level)</option>
            <option value="lifted" ${cfg.xpCurve === "lifted" ? "selected" : ""}>Lifted (100 \xD7 level^1.35)</option>
          </select>
        </div>
        <div class="wc-field">
          <label>Heat Bar Display</label>
          <select class="wc-select" id="wc-cfg-heatdisplay">
            <option value="always" ${cfg.heatDisplay === "always" ? "selected" : ""}>Always</option>
            <option value="charged" ${cfg.heatDisplay === "charged" ? "selected" : ""}>Only when charged (\u226525)</option>
          </select>
        </div>
        <label class="wc-toggle-row"><span>Auto-sync state after every AI reply</span><input type="checkbox" data-cfg="autoSync" ${cfg.autoSync ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Inject live state into AI prompt</span><input type="checkbox" data-cfg="injectPrompt" ${cfg.injectPrompt ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Track XP & automatic level-ups</span><input type="checkbox" data-cfg="trackXp" ${cfg.trackXp ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Automatic backups of chat state (keep last 5)</span><input type="checkbox" data-cfg="autoBackup" ${cfg.autoBackup !== false ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Enable automatically in new chats</span><input type="checkbox" data-cfg="enabledByDefault" ${cfg.enabledByDefault ? "checked" : ""} /></label>
      </div>

      <div class="wc-card">
        <div class="wc-card-head">
          <span class="wc-card-title">Survival & Scene Clock</span>
          <span class="wc-dim">off by default</span>
        </div>

        <div class="wc-card-title" style="margin-top:2px;">${icon("compass", 13)} Survival (Loot & Encounters)</div>
        <label class="wc-toggle-row"><span>Enable survival rolls in this profile <small>Dice tab buttons + roll quick actions; seeded by chat + date</small></span><input type="checkbox" data-cfg="survivalEnabled" ${cfg.survivalEnabled ? "checked" : ""} /></label>
        <div class="wc-row-2">
          <div class="wc-field"><label>Scavenge / Encounter DC</label><input class="wc-input" id="wc-cfg-survivaldc" type="number" min="1" max="40" value="${Number(cfg.survivalDc) || 15}" /></div>
          <div class="wc-field"><label>Loot Table</label><select class="wc-select" id="wc-cfg-survtable">
            <option value="wasteland" ${(cfg.survivalTable || "wasteland") === "wasteland" ? "selected" : ""}>Wasteland Salvage</option>
            <option value="urban" ${cfg.survivalTable === "urban" ? "selected" : ""}>Urban Remnants</option>
            <option value="wilderness" ${cfg.survivalTable === "wilderness" ? "selected" : ""}>Wilderness Forage</option>
            <option value="custom" ${cfg.survivalTable === "custom" ? "selected" : ""}>My Table (pasted below)</option>
          </select></div>
        </div>
        <div class="wc-field"><label>Custom Loot Lines</label>
          <textarea class="wc-textarea" id="wc-cfg-survcustom" rows="4" placeholder="weight | name | qty | category | rarity&#10;8 | Fine-cut cigars | 1 | valuable | uncommon&#10;# lines starting with # are comments">${esc(cfg.survivalCustomTable || "")}</textarea>
        </div>
        <div class="wc-dim" style="margin:-4px 0 10px">${(() => {
      const lines = String(cfg.survivalCustomTable || "").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
      const ok = lines.filter((l) => {
        const p = l.split("|").map((x) => x.trim());
        const w = Number(p[0]);
        return Number.isFinite(w) && w >= 1 && Boolean(p[1]);
      }).length;
      return ok > 0 ? `${ok} custom line(s) in play \u2014 appended to the built-in table (or used alone with \u201CMy Table\u201D).` + (lines.length - ok > 0 ? ` <span style="color:var(--wc-bad)">${lines.length - ok} line(s) rejected \u2014 see format above.</span>` : "") : "Format: <code>weight | name | qty | category | rarity</code> \u2014 custom lines extend the built-in table, or pick \u201CMy Table\u201D to use only yours.";
    })()}</div>

        <div class="wc-card-title" style="margin-top:4px;">${icon("clock", 13)} Scene Clock & Weather</div>
        <label class="wc-toggle-row"><span>Advance the scene clock every synced turn <small>phase words only \u2014 \u201CDay 12 \xB7 Evening\u201D in the tracker and prompt</small></span><input type="checkbox" data-cfg="clockEnabled" ${cfg.clockEnabled ? "checked" : ""} /></label>
        <div class="wc-row-2">
          <div class="wc-field"><label>Minutes per reply</label><input class="wc-input" id="wc-cfg-clockstep" type="number" min="15" max="180" step="5" value="${Number(cfg.clockStepMinutes) || 45}" /></div>
          <div class="wc-field"><label>Weather drift chance (%)</label><input class="wc-input" id="wc-cfg-weatherchance" type="number" min="0" max="100" value="${Number.isFinite(Number(cfg.weatherDriftChance)) ? Number(cfg.weatherDriftChance) : 20}" /></div>
        </div>
        <label class="wc-toggle-row"><span>Let weather drift one rung per turn</span><input type="checkbox" data-cfg="weatherDrift" ${cfg.weatherDrift !== false ? "checked" : ""} /></label>
        <div class="wc-field"><label>Weather ladder (comma-separated, calm \u2192 severe)</label><input class="wc-input" id="wc-cfg-weatherladder" value="${esc(cfg.weatherLadder || "Clear, Windy, Overcast, Fog, Rain, Storm, Snow")}" /></div>
        <div class="wc-dim" style="margin:-4px 0 6px">Phase words only \u2014 day rolls over at midnight. Off-ladder (custom) weather text is never touched. Time advances only on synced turns; nothing moves while you edit or read.</div>
      </div>

      ${d && Array.isArray(d.syncLog) && d.syncLog.length > 0 ? `<div class="wc-card">
               <div class="wc-card-head"><span class="wc-card-title">Recent Syncs</span><span class="wc-dim">last ${Math.min(8, d.syncLog.length)}</span></div>
               ${d.spend && d.spend.calls > 0 ? `<div class="wc-dim" style="margin-bottom:6px">Sidecar spend (this chat): <b>${d.spend.calls}</b> call${d.spend.calls === 1 ? "" : "s"} \xB7 \u2248<b>${d.spend.totalTokens}</b> tokens (est. chars\xF74 \u2014 ${d.spend.promptTokens} prompt / ${d.spend.completionTokens} completion)</div>` : ""}
               <div class="wc-synclog">
                 ${d.syncLog.slice(-8).reverse().map((e) => `
                   <div class="wc-synclog-row ${e.ok ? "is-ok" : "is-fail"}">
                     <span>${new Date(e.ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                     <em>${e.ok ? "synced" : esc(e.error || "failed")}${Number.isFinite(e.tokens) ? ` \xB7 \u2248${e.tokens} tok` : ""}</em>
                   </div>`).join("")}
               </div>
             </div>` : ""}

      <div class="wc-card">
        <div class="wc-card-head"><span class="wc-card-title">Settings (This Profile)</span><span class="wc-dim">share a tuned config</span></div>
        <div class="wc-actions-row">
          <button class="wc-btn is-xs" data-act="modal_add" data-kind="export_settings">Export Settings</button>
          <button class="wc-btn is-xs" data-act="modal_add" data-kind="import_settings">Import Settings\u2026</button>
        </div>
      </div>

      ${d ? `<div class="wc-card">
               <div class="wc-card-head"><span class="wc-card-title">Backup & Reset (This Chat)</span></div>
               <div class="wc-actions-row" style="justify-content:space-between;">
                 <div class="wc-actions-row">
                   <button class="wc-btn is-xs" data-act="modal_add" data-kind="export">Export JSON</button>
                   <button class="wc-btn is-xs" data-act="modal_add" data-kind="export_weft" title="Copy the state as a Weft preset &lt;Status&gt;/&lt;World_State&gt; block for hand-off">Export Weft Block</button>
                   <button class="wc-btn is-xs" data-act="modal_add" data-kind="import">Import JSON</button>
                   <button class="wc-btn is-xs" data-act="chat_log_report" title="Scan this chat's history for preset &lt;Status&gt;/&lt;World_State&gt; blocks and migrate them into the extension (no LLM, no tokens)">Import from Chat Log\u2026</button>
                   <button class="wc-btn is-xs" data-act="list_backups">Restore backup\u2026</button>
                 </div>
                 <button class="wc-btn is-xs is-danger" data-act="reset_chat">Reset Chat</button>
               </div>
             </div>` : ""}
    `;
  }
  function captureViewState(root) {
    if (!root) return null;
    const active = root.contains(document.activeElement) ? document.activeElement : null;
    const focusKey = active ? active.dataset?.act ? `act:${active.dataset.act}` : active.dataset?.cfg ? `cfg:${active.dataset.cfg}` : active.dataset?.subtab ? `subtab:${active.dataset.subtab}` : active.id ? `id:${active.id}` : null : null;
    return { scrollTop: root.scrollTop, focusKey };
  }
  function restoreViewState(root, vs) {
    if (!root || !vs) return;
    if (typeof vs.scrollTop === "number") root.scrollTop = vs.scrollTop;
    if (vs.focusKey) {
      const [kind, val] = vs.focusKey.split(":", 2);
      const sel = kind === "act" ? `[data-act="${CSS.escape(val)}"]` : kind === "cfg" ? `[data-cfg="${CSS.escape(val)}"]` : kind === "subtab" ? `[data-subtab="${CSS.escape(val)}"]` : `#${CSS.escape(val)}`;
      const el = root.querySelector(sel);
      if (el && typeof el.focus === "function") {
        try {
          el.focus({ preventScroll: true });
        } catch {
          el.focus();
        }
      }
    }
  }
  function renderAll() {
    updateChromeState();
    const theme = data && data.themeOverride || settings?.theme || "sakura";
    const settingsViewState = captureViewState(settingsTabHandle?.root || null);
    if (settingsTabHandle && settings) {
      settingsTabHandle.root.innerHTML = `<div class="wc-root" data-wc-theme="${esc(theme)}">${renderSettingsContent(data, settings)}</div>`;
      restoreViewState(settingsTabHandle.root, settingsViewState);
    }
    const drawerViewState = captureViewState(drawerTab.root);
    if (!chatId || !data || !settings) {
      drawerTab.root.innerHTML = `
        <div class="wc-root" data-wc-theme="${esc(theme)}">
          <div class="wc-card">
            <div class="wc-card-title">Weft Chronicle</div>
            <div class="wc-muted">Open any chat in Lumiverse to activate your System Window, Story Tracker, and Fair d20 Dice Roller.</div>
            <button class="wc-btn is-primary" data-act="refresh">Refresh Active Chat</button>
          </div>
          ${settings ? renderSettingsContent(null, settings) : ""}
        </div>
      `;
      restoreViewState(drawerTab.root, drawerViewState);
      scheduleInlineSync(60);
      return;
    }
    const pendingRolls = data.modules.dice ? data.rolls.filter((r) => !r.consumed).length : 0;
    const latestChoices = findLatestChoices(data);
    const unclaimedChoices = latestChoices ? Math.max(0, latestChoices.snap.choices.options.length - (latestChoices.snap.choices.claimed?.length || 0)) : 0;
    const viewCfg = data?.themeOverride ? { ...settings, theme: data.themeOverride } : settings;
    const body = activeSubTab === "system" ? renderSystemTab(data, viewCfg) : activeSubTab === "gear" ? renderGearTab(data, viewCfg) : activeSubTab === "tracker" ? renderTrackerTab(data, viewCfg) : activeSubTab === "dice" ? renderDiceTab(data, viewCfg) : activeSubTab === "choices" ? renderChoicesTab(data, viewCfg) : renderSettingsContent(data, settings);
    const syncLog = Array.isArray(data.syncLog) ? data.syncLog : [];
    const lastSync = syncLog.length > 0 ? syncLog[syncLog.length - 1] : null;
    const syncErr = typeof data.lastSyncError === "string" && data.lastSyncError ? data.lastSyncError : null;
    const syncTime = lastSync ? new Date(lastSync.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    const subLine = syncing ? esc(statusNote || "Syncing\u2026") : syncErr ? `Sync failed \u2014 ${esc(syncErr)}` : lastSync ? `Synced ${esc(syncTime)}${lastSync.ok ? "" : " (with warnings)"}` : data.enabled ? esc(statusNote || "Active in this chat") : "Paused for this chat";
    drawerTab.root.innerHTML = `
      <div class="wc-root" data-wc-theme="${esc(theme)}">
        <div class="wc-topbar">
          <div class="wc-brand">
            <span class="wc-brand-dot" style="opacity:${data.enabled ? "1" : "0.3"}"></span>
            <div>
              <div class="wc-brand-title">Weft Chronicle</div>
              <div class="wc-brand-sub${syncErr ? " is-bad" : ""}">${subLine}</div>
            </div>
          </div>
          <div class="wc-actions-row">
            <button class="wc-btn is-xs" data-act="toggle_chat" title="Pause or resume all modules for this chat">${data.enabled ? "On" : "Off"}</button>
            <button class="wc-btn is-xs ${syncErr ? "is-danger" : "is-primary"}" data-act="sync_now" ${syncing || !data.enabled ? "disabled" : ""} title="${syncErr ? "Retry the failed sync" : "Sync state from the latest reply"}">${syncing ? "\u2026" : syncErr ? "Retry" : "Sync"}</button>
            ${data.modules.dice ? `<button class="wc-btn is-xs" data-act="quick_roll" title="Roll Fair d20" aria-label="Roll Fair d20">${icon("d20", 15)}</button>` : ""}
          </div>
        </div>

        <div class="wc-tabs" aria-label="Weft Chronicle sections">
          <button class="wc-tab ${activeSubTab === "system" ? "is-active" : ""} ${!data.modules.system ? "is-off" : ""}" data-subtab="system"system"}">${icon("system", 14)}<span>System</span>${data.modules.system && data.sheet.pts > 0 ? ` <span class="wc-pill">+${data.sheet.pts}</span>` : ""}</button>
          <button class="wc-tab ${activeSubTab === "gear" ? "is-active" : ""} ${!data.modules.system ? "is-off" : ""}" data-subtab="gear"gear"}">${icon("shield", 14)}<span>Gear</span></button>
          <button class="wc-tab ${activeSubTab === "tracker" ? "is-active" : ""} ${!data.modules.tracker ? "is-off" : ""}" data-subtab="tracker"tracker"}">${icon("map", 14)}<span>Tracker</span></button>
          <button class="wc-tab ${activeSubTab === "dice" ? "is-active" : ""} ${!data.modules.dice ? "is-off" : ""}" data-subtab="dice"dice"}">${icon("d20", 14)}<span>Dice</span>${pendingRolls > 0 ? ` <span class="wc-pill">${pendingRolls}</span>` : ""}</button>
          <button class="wc-tab ${activeSubTab === "choices" ? "is-active" : ""} ${!data.modules.choices ? "is-off" : ""}" data-subtab="choices"choices"}" title="What Now? \u2014 choices from the latest reply">${icon("chat", 14)}<span>Pick</span>${unclaimedChoices > 0 ? ` <span class="wc-pill">${unclaimedChoices}</span>` : ""}</button>
          <button class="wc-tab wc-tab-icon ${activeSubTab === "settings" ? "is-active" : ""}" data-subtab="settings"settings"}" title="Settings" aria-label="Settings">${icon("cog", 16)}</button>
        </div>

        ${body}
      </div>
    `;
    restoreViewState(drawerTab.root, drawerViewState);
    scheduleInlineSync(80);
  }
  const handleClick = async (ev) => {
    const target = ev.target?.closest("[data-act], [data-subtab]");
    if (!target) return;
    const sub = target.dataset.subtab;
    if (sub) {
      activeSubTab = sub;
      renderAll();
      return;
    }
    const act = target.dataset.act;
    switch (act) {
      case "refresh": {
        chatId = ctx.getActiveChat().chatId;
        send("bootstrap");
        return;
      }
      case "toggle_chat": {
        if (!data) return;
        send("toggle_chat_enabled", { enabled: !data.enabled });
        return;
      }
      case "enable_mod": {
        send("toggle_module", { module: target.dataset.mod, enabled: true });
        return;
      }
      case "sync_now": {
        send("sync_now");
        return;
      }
      case "list_backups": {
        send("list_backups");
        return;
      }
      case "init_ai": {
        send("init_from_ai");
        return;
      }
      case "quick_roll": {
        openQuickRollModal();
        return;
      }
      case "edit_identity": {
        openEditIdentityModal();
        return;
      }
      case "pool": {
        send("adjust_pool", { pool: target.dataset.pool, delta: Number(target.dataset.delta || 0) });
        return;
      }
      case "add_xp": {
        send("add_xp", { amount: Number(target.dataset.xp || 0) });
        return;
      }
      case "clear_notices": {
        send("clear_notices");
        return;
      }
      case "rest": {
        send("rest", { kind: target.dataset.kind || "short" });
        return;
      }
      case "alloc": {
        send("allocate_stat", { stat: target.dataset.stat, amount: 1 });
        return;
      }
      case "auto_alloc": {
        send("auto_allocate");
        return;
      }
      case "notice_filter": {
        noticeFilter = target.dataset.filter || "all";
        renderAll();
        return;
      }
      case "dismiss_notice": {
        send("dismiss_notice", { ids: target.dataset.ids || target.dataset.id || "" });
        return;
      }
      case "edge": {
        rollDraft.mode = target.dataset.mode === "adv" || target.dataset.mode === "dis" ? target.dataset.mode : "normal";
        renderAll();
        return;
      }
      case "choice_pick": {
        void pickChoice(target.dataset.key, Number(target.dataset.idx), target);
        return;
      }
      case "rm_effect": {
        send("remove_effect", { id: target.dataset.id });
        return;
      }
      case "rm_skill": {
        send("remove_skill", { id: target.dataset.id });
        return;
      }
      case "add_item": {
        openItemModal();
        return;
      }
      case "edit_item": {
        const it = data?.sheet.bag.find((x) => x.id === target.dataset.id);
        if (it) openItemModal(it);
        return;
      }
      case "equip": {
        send("equip_item", { id: target.dataset.id });
        return;
      }
      case "unequip": {
        send("unequip_slot", { slot: target.dataset.slot });
        return;
      }
      case "rm_item": {
        send("remove_item", { id: target.dataset.id, qty: 1 });
        return;
      }
      case "add_quest": {
        openQuestModal();
        return;
      }
      case "toggle_obj_btn": {
        send("toggle_objective", { questId: target.dataset.qid, objectiveId: target.dataset.oid });
        return;
      }
      case "cycle_quest_status": {
        const q = data?.sheet.quests.find((x) => x.id === target.dataset.id);
        if (!q) return;
        const nextStatus = q.status === "available" ? "active" : q.status === "active" ? "done" : "active";
        send("upsert_quest", { quest: { ...q, status: nextStatus } });
        return;
      }
      case "edit_quest": {
        const q = data?.sheet.quests.find((x) => x.id === target.dataset.id);
        if (q) openQuestModal(q);
        return;
      }
      case "rm_quest": {
        send("remove_quest", { id: target.dataset.id });
        return;
      }
      case "edit_world": {
        openWorldModal();
        return;
      }
      case "add_npc": {
        openNpcModal();
        return;
      }
      case "edit_npc": {
        const npc = data?.world.npcs.find((n) => n.id === target.dataset.id);
        if (npc) openNpcModal(npc);
        return;
      }
      case "rm_npc": {
        send("remove_npc", { id: target.dataset.id });
        return;
      }
      case "npc_bond": {
        const npc = data?.world.npcs.find((n) => n.id === target.dataset.id);
        if (!npc) return;
        send("upsert_npc", {
          npc: { ...npc, bond: npc.bond + Number(target.dataset.delta || 0) }
        });
        return;
      }
      case "cycle_thread": {
        const th = data?.world.threads.find((t) => t.id === target.dataset.id);
        if (!th) return;
        const order = ["active", "seed", "resolved"];
        const next = order[(order.indexOf(th.status) + 1) % order.length];
        send("upsert_thread", { thread: { ...th, status: next } });
        return;
      }
      case "rm_thread": {
        send("remove_thread", { id: target.dataset.id });
        return;
      }
      case "modal_add": {
        const kind = target.dataset.kind;
        openSimpleAddModal(kind);
        return;
      }
      case "set_dc": {
        rollDraft.dc = Number(target.dataset.dc || 15);
        const inp = drawerTab.root.querySelector("#wc-d-dc");
        if (inp) inp.value = String(rollDraft.dc);
        return;
      }
      case "inline_roll":
      case "inline_contest": {
        const action = drawerTab.root.querySelector("#wc-d-action")?.value.trim() || "Attempt check";
        const stat = drawerTab.root.querySelector("#wc-d-stat")?.value || "none";
        const dc = Number(drawerTab.root.querySelector("#wc-d-dc")?.value || 15);
        const gearBonus = Number(drawerTab.root.querySelector("#wc-d-gear")?.value || 0);
        const skillId = drawerTab.root.querySelector("#wc-d-skill")?.value || "";
        const skill = (data?.sheet?.skills || []).find((sk) => sk.id === skillId);
        const skillBonus = skill ? Number(skill.bonus) || 0 : 0;
        rollDraft.action = action;
        rollDraft.stat = stat;
        rollDraft.dc = dc;
        rollDraft.gearBonus = gearBonus;
        const payload = { action, stat, dc, gearBonus, skillBonus, skillLabel: skill ? skill.name : "", mode: rollDraft.mode };
        if (target.dataset.act === "inline_contest") {
          const opponent = drawerTab.root.querySelector("#wc-d-opp")?.value || "";
          if (!opponent) return;
          const foeBonus = Number(drawerTab.root.querySelector("#wc-d-foebonus")?.value || 3);
          send("contest_roll", { ...payload, opponent, foeBonus });
          return;
        }
        send("roll_dice", payload);
        return;
      }
      case "scavenge_roll": {
        send("scavenge_roll");
        return;
      }
      case "encounter_roll": {
        send("encounter_roll");
        return;
      }
      case "chat_log_report": {
        send("chat_log_report");
        return;
      }
      case "clear_pending": {
        send("clear_pending_rolls");
        return;
      }
      case "clear_rolls": {
        send("clear_roll_history");
        return;
      }
      case "copy_last_roll": {
        const latest = data && Array.isArray(data.rolls) && data.rolls.length > 0 ? data.rolls[data.rolls.length - 1] : null;
        if (latest) {
          try {
            navigator.clipboard?.writeText(formatRollForChat(latest));
          } catch {
          }
        }
        return;
      }
      case "req_perms": {
        const missing = ["interceptor", "generation", "chats", "chat_mutation", "characters", "personas"].filter(
          (p) => !permissions[p]
        );
        try {
          await ctx.permissions.request([...missing], {
            reason: "Weft Chronicle uses these permissions to inject RPG/Tracker state, sync turns with your sidecar LLM, and read cards/personas."
          });
          send("bootstrap");
        } catch {
        }
        return;
      }
      case "reset_chat": {
        const res = await ctx.ui.showConfirm({
          title: "Reset Weft Chronicle for this Chat?",
          message: "This clears the System sheet, inventory, Story Tracker, NPCs, and roll history for this chat.",
          variant: "danger",
          confirmLabel: "Reset"
        });
        if (res.confirmed) send("reset_chat");
        return;
      }
    }
  };
  const handleChange = (ev) => {
    const el = ev.target;
    if (!el) return;
    if (el.dataset.act === "toggle_obj") {
      send("toggle_objective", { questId: el.dataset.qid, objectiveId: el.dataset.oid });
      return;
    }
    if (el.dataset.modToggle) {
      send("toggle_module", { module: el.dataset.modToggle, enabled: el.checked });
      return;
    }
    if (el.dataset.cfg) {
      send("update_settings", { patch: { [el.dataset.cfg]: el.checked } });
      return;
    }
    if (el.id === "wc-cfg-conn") {
      send("update_settings", { patch: { sidecarConnectionId: el.value } });
      return;
    }
    if (el.id === "wc-cfg-theme") {
      send("update_settings", { patch: { theme: el.value } });
      return;
    }
    if (el.id === "wc-cfg-chattheme") {
      send("set_chat_theme", { theme: el.value || null });
      return;
    }
    if (el.id === "wc-cfg-systheme") {
      send("update_settings", { patch: { systemTheme: el.value } });
      return;
    }
    if (el.id === "wc-cfg-alloc") {
      send("update_settings", { patch: { allocMode: el.value } });
      return;
    }
    if (el.id === "wc-cfg-allocpriority") {
      send("update_settings", { patch: { allocPriority: el.value } });
      return;
    }
    if (el.id === "wc-cfg-placement") {
      send("update_settings", { patch: { inlinePlacement: el.value } });
      return;
    }
    if (el.id === "wc-cfg-syncmode") {
      send("update_settings", { patch: { syncMode: el.value } });
      return;
    }
    if (el.id === "wc-cfg-budget") {
      send("update_settings", { patch: { promptBudget: el.value } });
      return;
    }
    if (el.id === "wc-cfg-xpcurve") {
      send("update_settings", { patch: { xpCurve: el.value } });
      return;
    }
    if (el.id === "wc-cfg-heatdisplay") {
      send("update_settings", { patch: { heatDisplay: el.value } });
      return;
    }
    if (el.id === "wc-cfg-survivaldc") {
      send("update_settings", { patch: { survivalDc: Number(el.value || 15) } });
      return;
    }
    if (el.id === "wc-cfg-survtable") {
      send("update_settings", { patch: { survivalTable: el.value } });
      return;
    }
    if (el.id === "wc-cfg-survcustom") {
      send("update_settings", { patch: { survivalCustomTable: el.value } });
      return;
    }
    if (el.id === "wc-cfg-clockstep") {
      send("update_settings", { patch: { clockStepMinutes: Number(el.value || 45) } });
      return;
    }
    if (el.id === "wc-cfg-weatherchance") {
      send("update_settings", { patch: { weatherDriftChance: Number(el.value || 0) } });
      return;
    }
    if (el.id === "wc-cfg-weatherladder") {
      send("update_settings", { patch: { weatherLadder: el.value } });
      return;
    }
    if (el.id === "wc-d-action") rollDraft.action = el.value;
    if (el.id === "wc-d-stat") rollDraft.stat = el.value;
    if (el.id === "wc-d-dc") rollDraft.dc = Number(el.value || 15);
    if (el.id === "wc-d-gear") rollDraft.gearBonus = Number(el.value || 0);
  };
  const bindContainer = (el) => {
    el.addEventListener("click", handleClick);
    el.addEventListener("change", handleChange);
    cleanups.push(() => {
      el.removeEventListener("click", handleClick);
      el.removeEventListener("change", handleChange);
    });
  };
  bindContainer(drawerTab.root);
  if (settingsTabHandle) bindContainer(settingsTabHandle.root);
  cleanups.push(rollAction.onClick(() => openQuickRollModal()));
  cleanups.push(
    drawerTab.onActivate(() => {
      const active = ctx.getActiveChat().chatId;
      if (active && active !== chatId) {
        clearAllInlineCards();
        chatId = active;
      }
      send("bootstrap");
    })
  );
  cleanups.push(
    ctx.onBackendMessage((raw) => {
      if (!raw || typeof raw !== "object") return;
      const msg = raw;
      if (msg.type === "state_update") {
        if (msg.chatId !== chatId) {
          clearAllInlineCards();
        }
        chatId = msg.chatId;
        data = msg.data;
        settings = msg.settings;
        if (Array.isArray(msg.connections) && msg.connections.length > 0) {
          connections = msg.connections;
        }
        permissions = msg.permissions;
        syncing = msg.syncing;
        statusNote = msg.statusNote || "";
        promptEstimate = msg.promptEstimate && typeof msg.promptEstimate === "object" ? msg.promptEstimate : null;
        renderAll();
        if (Array.isArray(msg.backupList)) openBackupModal(msg.backupList);
        if (msg.chatLogReport && typeof msg.chatLogReport === "object") openChatLogModal(msg.chatLogReport);
        void hydrateFrontendConnections();
      }
    })
  );
  for (const evName of ["CHAT_SWITCHED", "CHARACTER_MESSAGE_RENDERED", "MESSAGE_SWIPED", "MESSAGE_DELETED"]) {
    cleanups.push(
      ctx.events.on(evName, (payload) => {
        if (evName === "CHAT_SWITCHED") {
          const obj = payload || {};
          const nextId = typeof obj.chatId === "string" ? obj.chatId : typeof obj.id === "string" ? obj.id : ctx.getActiveChat().chatId;
          if (nextId && nextId !== chatId) {
            clearAllInlineCards();
            chatId = nextId;
            send("bootstrap");
          }
          return;
        }
        scheduleInlineSync(160);
      })
    );
  }
  renderAll();
  send("bootstrap");
  void hydrateFrontendConnections();
  return () => {
    for (const fn of cleanups) {
      try {
        fn();
      } catch {
      }
    }
  };
}
export {
  setup
};
