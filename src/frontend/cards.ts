// @ts-nocheck — types are being tightened incrementally; bundling and CI tests do not depend on this flag. Remove file-by-file.
/*! src/frontend/cards.ts */
import { STAT_KEYS, computeMaxGearBonus, formatMod, rarityRollBonus, statBandName, statModifier } from "./engine";
import { icon } from "./icons";
export function escXml(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
export function escXmlAttr(val) {
  return escXml(val).replace(/"/g, "&quot;");
}
export function esc(val) {
  return String(val ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function pct(cur, max) {
  if (!max || max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(cur / max * 100)));
}
export function resolveSystemTheme(settings) {
  if (settings.systemTheme === "blue") return "ocean";
  if (settings.systemTheme === "gold") return "gold";
  return settings.theme;
}
function arcSegments(label) {
  const s = (label || "").toLowerCase().trim();
  // Covers both the extension's extended ladder and the Weft preset's ladder
  // (Setup/Escalation/Complication/Crisis/Resolution and
  //  Early Simmer/Building/Midpoint Tension/Climax/Breather).
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
export function renderNoticeCard(notice, theme) {
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
export function renderDiceCard(r, theme) {
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
        <small>d20 ${r.roll}${r.mode && r.mode !== "normal" ? ` <span class="wc-dice-edge">${r.mode === "adv" ? "ADV" : "DIS"}</span>` : ""} (${esc(statStr)}${esc(gearStr)}${skillStr}) <span class="wc-dice-dc">DC ${r.dc}</span>${r.contestFoe ? ` · vs ${esc(r.contestFoe.name)} ${r.contestFoe.total}` : ""}</small>
        ${r.lootSummary ? `<small class="wc-dice-loot">${icon("bag", 12)} ${esc(r.lootSummary)}</small>` : ""}
      </div>
    </div>
  `;
}
export function renderDiceCardCompact(r, theme) {
  return `
    <div class="wc-dice-compact ${verdictClass(r.verdict)} ${!r.consumed ? "is-pending" : ""}" data-wc-theme="${esc(theme)}" title="${esc(r.action)} — d20 ${r.roll}${r.gearBonus !== 0 ? ` ${formatMod(r.gearBonus)} gear` : ""} vs DC ${r.dc}">
      <span class="wc-dice-compact-n">${r.total}</span>
      <span class="wc-dice-compact-t"><b>${esc(r.who)}</b> \xB7 ${esc(r.action)}${r.mode && r.mode !== "normal" ? (r.mode === "adv" ? " \xB7 ADV" : " \xB7 DIS") : ""}${!r.consumed ? " \xB7 pending" : ""}</span>
      <em class="wc-dice-compact-v">${esc(r.verdict.toUpperCase())}</em>
    </div>
  `;
}
export function formatRollForChat(r) {
  const statStr = r.stat === "none" ? "Flat" : `${r.stat.toUpperCase()} ${formatMod(r.statMod)}`;
  const gearStr = r.gearBonus !== 0 ? ` ${formatMod(r.gearBonus)} gear` : "";
  const skillStr = r.skillLabel ? ` + ${r.skillLabel} ${formatMod(r.skillBonus)}` : "";
  const edgeStr = r.mode === "adv" ? " (advantage)" : r.mode === "dis" ? " (disadvantage)" : "";
  const keptStr = r.advRoll !== null && r.advRoll !== undefined ? ` [kept ${r.roll}, dropped ${r.advRoll}]` : "";
  const contestStr = r.contestFoe ? ` — defeats ${r.contestFoe.name} ${r.contestFoe.total}` : "";
  const lootStr = r.lootSummary ? ` — ${r.lootSummary}` : "";
  return `${r.who} — ${r.action}: d20 ${r.roll}${keptStr}${edgeStr} (${statStr}${gearStr}${skillStr}) vs DC ${r.dc} = ${r.total} — ${String(r.verdict).toUpperCase()}${contestStr}${lootStr}`;
}
function formatChoiceText(text) {
  return esc(text).replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
}
export function renderChoicesCard(choices, theme, opts) {
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
export function renderInventoryWindow(s, settings) {
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
export function renderQuestWindow(s, settings) {
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
export function renderSystemWindow(s, settings, opts) {
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
  // heat
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
      <em>${value} · ${esc(bshStage(kind, value))}</em>
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
export function renderTrackerCard(w, settings, opts) {
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
    return bits.length > 0 ? `<div class="wc-pc-strip" title="What a camera would see">${bits.map((x) => `<span>${x}</span>`).join('<i>\u00B7</i>')}</div>` : "";
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
