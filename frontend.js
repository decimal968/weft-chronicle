// src/engine.ts
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

// src/cards.ts
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
  const s = (label || "").toLowerCase();
  if (/opening|setup|calm|arrival/.test(s)) return 1;
  if (/rising|build|tension|invest/.test(s)) return 2;
  if (/turning|escal|crisis|twist/.test(s)) return 3;
  if (/climax|confront|peak|combat|intim/.test(s)) return 4;
  if (/fallout|aftermath|resol|epilog/.test(s)) return 5;
  return 2;
}
function noticeIcon(kind) {
  switch (kind) {
    case "levelup":
      return "\u2605";
    case "quest":
      return "\u2726";
    case "item":
      return "\u25C6";
    case "skill":
      return "\u2727";
    case "change":
      return "\u25B2";
    default:
      return "!";
  }
}
function verdictClass(verdict) {
  if (verdict === "nat 20") return "is-crit";
  if (verdict === "success") return "is-good";
  if (verdict === "success, at a cost") return "is-warn";
  return "is-bad";
}
function renderNoticeCard(notice, theme) {
  return `
    <div class="wc-msn" data-wc-theme="${esc(theme)}" data-k="${esc(notice.kind)}">
      <div class="wc-msn-h">
        <div class="wc-msn-i"><i>${noticeIcon(notice.kind)}</i></div>
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
  return `
    <div class="wc-mg-dice ${verdictClass(r.verdict)} ${!r.consumed ? "is-pending" : ""}" data-wc-theme="${esc(theme)}">
      <div class="wc-dice-ring">${r.total}</div>
      <div class="wc-dice-dt">
        <b>${esc(r.action)}</b>
        <span>${esc(r.who)}${!r.consumed ? " \xB7 Queued for next reply" : ""}</span>
      </div>
      <div class="wc-dice-dm">
        <em class="wc-dice-vd">${esc(r.verdict.toUpperCase())}</em>
        <small>d20 ${r.roll} (${esc(statStr)}${esc(gearStr)}) <span class="wc-dice-dc">DC ${r.dc}</span></small>
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
               <div class="wc-ms-shd"><span>GEAR & BAG</span><span class="wc-ms-sublbl">Bonus +${computeMaxGearBonus(s)}${s.cash ? ` \xB7 ${esc(s.cash)}` : ""}</span></div>
               <div class="wc-ms-chips">
                 ${["weapon", "armor", "accessory"].map((slot) => {
    const it = s.gear[slot];
    if (!it) return "";
    const rb = typeof it.rollBonus === "number" ? it.rollBonus : rarityRollBonus(it.rarity);
    return `<span class="wc-ms-chip wc-rarity-${esc(it.rarity)}">${slot[0].toUpperCase()}: ${esc(it.name)}${rb > 0 ? ` +${rb}` : ""}</span>`;
  }).join("")}
                 ${s.bag.slice(0, 6).map(
    (it) => `<span class="wc-ms-chip">${esc(it.name)}${it.qty > 1 ? ` \xD7${it.qty}` : ""}</span>`
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
               <div class="wc-ms-qlist">
                 ${s.quests.filter((q) => q.status === "active" || q.status === "available").slice(0, 3).map(
    (q) => `<div class="wc-ms-qrow">
                          <strong>${esc(q.title)}</strong>
                          ${q.objectives.map((o) => `<div class="wc-ms-qobj ${o.done ? "is-done" : ""}">${o.done ? "\u2611" : "\u2610"} ${esc(o.text)}</div>`).join("")}
                        </div>`
  ).join("")}
               </div>
             </div>` : ""}
    </div>
  `;
  if (isDrawer) {
    return `
      <div class="wc-ms is-open-panel" data-wc-theme="${esc(sysTh)}">
        <div class="wc-ms-headbar">
          <span class="wc-ms-gem">\u2694</span>
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
        <span class="wc-ms-gem">\u2694</span>
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
function renderTrackerBar(kind, label, value) {
  return `
    <div class="wc-mg-bar k-${kind}">
      <b>${label}</b>
      <span class="wc-mg-track"><u style="width:${pct(value, 100)}%"></u></span>
      <em>${value}</em>
    </div>
  `;
}
function renderTrackerNpcCard(n, settings, isDrawer) {
  const initial = (n.name || "?").trim().charAt(0).toUpperCase();
  const bars = [
    settings.trackerShowBond ? renderTrackerBar("bond", "Bond", n.bond) : "",
    settings.trackerShowSpark ? renderTrackerBar("spark", "Spark", n.spark) : "",
    settings.trackerShowHeat ? renderTrackerBar("heat", "Heat", n.heat) : ""
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
    return `
                       <div class="wc-mg-trow">
                         <div class="wc-mg-tmain">
                           <button class="wc-pill ${cls}" ${isDrawer ? `data-act="cycle_thread" data-id="${esc(t.id)}" style="cursor:pointer"` : ""}>${esc(t.status)}</button>
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
          <span class="wc-mg-gem">\u2726</span>
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
        <span class="wc-mg-gem">\u2726</span>
        <span class="wc-mg-hd">
          <span class="wc-mg-lab">TRACKER</span>
          <span class="wc-mg-sum">${esc(w.location || "Scene")} \xB7 ${esc(w.time || `Day ${w.dayCount}`)} \xB7 ${presentNpcs.length} in scene</span>
        </span>
      </summary>
      ${innerBody}
    </details>
  `;
}

// src/styles.ts
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
.wc-actions-row { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }

.wc-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 38px;
  gap: 4px;
  padding: 4px;
  border-radius: var(--wc-radius);
  background: var(--wc-card);
  border: 1px solid var(--wc-border);
}
.wc-tab {
  appearance: none;
  border: 1px solid transparent;
  background: transparent;
  color: var(--wc-muted);
  font-size: 11.5px;
  font-weight: 700;
  padding: 6px 3px;
  border-radius: calc(var(--wc-radius) - 3px);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
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
  font-size: 14px;
  text-shadow: 0 0 8px var(--a);
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
[data-theme-mode="light"] .wc-msn {
  --tx: color-mix(in srgb, rgb(var(--vr)) 45%, #18141c);
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(var(--pr), 0.2), rgba(var(--vr), 0.06) 50%, transparent 72%),
    linear-gradient(170deg, color-mix(in srgb, rgb(var(--pr)) 8%, #ffffff), #f7f6fa);
}
.wc-msn-h { display: flex; gap: 6px; margin-bottom: 8px; }
.wc-msn-i {
  flex: none; width: 34px; height: 34px; display: grid; place-items: center;
  border: 1px solid var(--ln); background: rgba(var(--pr), 0.1);
}
.wc-msn-i i {
  width: 22px; height: 22px; display: grid; place-items: center;
  border: 1.8px solid var(--tx); border-radius: 50%;
  font: 700 12px/1 system-ui; font-style: normal;
  text-shadow: 0 0 8px var(--a); box-shadow: 0 0 8px rgba(var(--pr), 0.55);
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
  background: var(--grad); color: #fff; font-size: 15px;
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
.wc-dice-dc { padding-left: 6px; margin-left: 4px; border-left: 1px solid rgba(127,127,127,0.35); }

/* ---- Inline Chat Bubble Container ---- */
.wc-inline-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
  max-width: 660px;
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

.wc-modal { padding: 12px; display: flex; flex-direction: column; gap: 10px; font-size: 13px; color: var(--lumiverse-text, inherit); }
.wc-modal-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
`;

// src/frontend.ts
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
  { id: "lumiverse", label: "Lumiverse Native" }
];
var CREST_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 21 7 21 17 12 22 3 17 3 7 12 2"/><polyline points="3.3 7 12 12 20.7 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>`;
var DICE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z"/><path d="M12 22V12"/><path d="M12 12 3 7"/><path d="M12 12l9-5"/><circle cx="12" cy="7.5" r="0.8" fill="currentColor"/></svg>`;
function setup(ctx) {
  const cleanups = [];
  ctx.dom.addStyle(WEFT_CHRONICLE_CSS);
  cleanups.push(() => ctx.dom.cleanup());
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
  const injectedWrappers = /* @__PURE__ */ new Map();
  const rollDraft = {
    action: "",
    stat: "dex",
    dc: 15,
    gearBonus: 0
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
    keywords: ["weft", "rpg", "status", "system", "tracker", "dice", "d20", "npc", "quests", "settings"],
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
        keywords: ["weft", "system", "tracker", "dice", "rpg", "sidecar", "theme"]
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
  function updateChromeState() {
    const diceOn = Boolean(data?.enabled && data?.modules?.dice);
    rollAction.setEnabled(diceOn);
    if (!data || !data.enabled) {
      drawerTab.setBadge(null);
      return;
    }
    const pendingRolls = data.modules.dice ? data.rolls.filter((r) => !r.consumed).length : 0;
    if (pendingRolls > 0) {
      drawerTab.setBadge(`\u{1F3B2}${pendingRolls}`);
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
    for (const el of injectedWrappers.values()) {
      try {
        ctx.dom.uninject(el);
      } catch {
      }
    }
    injectedWrappers.clear();
  }
  function findSnapshotForMessage(d, messageId) {
    const matching = Object.values(d.snapshots || {}).filter((s) => s.messageId === messageId).sort((a, b) => b.timestamp - a.timestamp);
    if (matching.length > 0) return matching[0];
    return null;
  }
  function buildInlineHtml(d, cfg, snap) {
    const parts = [];
    const sysTh = resolveSystemTheme(cfg);
    if (d.modules.dice && cfg.showInlineDice && Array.isArray(snap.rolls) && snap.rolls.length > 0) {
      for (const r of snap.rolls) {
        parts.push(renderDiceCard(r, cfg.theme));
      }
    }
    if (d.modules.system && cfg.showInlineNotices && Array.isArray(snap.notices) && snap.notices.length > 0) {
      for (const n of snap.notices) {
        parts.push(renderNoticeCard(n, sysTh));
      }
    }
    if (d.modules.system && cfg.showInlineSystem) {
      parts.push(renderSystemWindow(snap.sheet, cfg, { mode: "inline", open: cfg.inlineStartsOpen }));
    }
    if (d.modules.tracker && cfg.showInlineTracker) {
      parts.push(renderTrackerCard(snap.world, cfg, { mode: "inline", open: cfg.inlineStartsOpen }));
    }
    if (parts.length === 0) return "";
    return `<div class="wc-inline-wrap" data-wc-theme="${esc(cfg.theme)}">${parts.join("")}</div>`;
  }
  function syncInlineChatCards() {
    if (!data || !settings || !data.enabled || !data.initialized) {
      clearAllInlineCards();
      return;
    }
    const wantAny = data.modules.system && (settings.showInlineSystem || settings.showInlineNotices) || data.modules.tracker && settings.showInlineTracker || data.modules.dice && settings.showInlineDice;
    if (!wantAny) {
      clearAllInlineCards();
      return;
    }
    const activeIds = /* @__PURE__ */ new Set();
    const latestSnapKey = data.lastSyncedKey;
    const latestSnap = latestSnapKey ? data.snapshots[latestSnapKey] : null;
    let mounted = [];
    try {
      mounted = ctx.dom.listMessageElements();
    } catch {
      mounted = [];
    }
    for (const item of mounted) {
      const snap = findSnapshotForMessage(data, item.messageId);
      if (!snap) continue;
      const effectiveSnap = latestSnap && snap.messageId === latestSnap.messageId ? { ...snap, sheet: data.sheet, world: data.world } : snap;
      const html = buildInlineHtml(data, settings, effectiveSnap);
      if (!html) continue;
      activeIds.add(item.messageId);
      const existing = injectedWrappers.get(item.messageId);
      if (existing) {
        const prevOpenStates = Array.from(existing.querySelectorAll("details")).map((el) => el.open);
        existing.innerHTML = html;
        const nextDetails = Array.from(existing.querySelectorAll("details"));
        nextDetails.forEach((el, idx) => {
          if (typeof prevOpenStates[idx] === "boolean") el.open = prevOpenStates[idx];
        });
      } else {
        try {
          const wrapper = ctx.dom.inject(item.element, html, "beforeend");
          wrapper.addEventListener("click", (ev) => {
            const btn = ev.target?.closest("[data-act]");
            if (!btn) return;
            ev.stopPropagation();
            if (btn.dataset.act === "alloc" && btn.dataset.stat) {
              send("allocate_stat", { stat: btn.dataset.stat, amount: 1 });
            } else if (btn.dataset.act === "auto_alloc") {
              send("auto_allocate");
            }
          });
          injectedWrappers.set(item.messageId, wrapper);
        } catch {
        }
      }
    }
    for (const [mid, el] of injectedWrappers.entries()) {
      if (!activeIds.has(mid) && !findSnapshotForMessage(data, mid)) {
        try {
          ctx.dom.uninject(el);
        } catch {
        }
        injectedWrappers.delete(mid);
      }
    }
  }
  let inlineTimer = null;
  function scheduleInlineSync(delay = 120) {
    if (inlineTimer) clearTimeout(inlineTimer);
    inlineTimer = setTimeout(() => {
      inlineTimer = null;
      syncInlineChatCards();
    }, delay);
  }
  cleanups.push(() => {
    if (inlineTimer) clearTimeout(inlineTimer);
    clearAllInlineCards();
  });
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
        <div class="wc-dim">Rolled with unbiased crypto RNG. Automatically binds the AI's next reply.</div>
        <div class="wc-modal-foot">
          <button class="wc-btn" id="wc-m-cancel">Cancel</button>
          <button class="wc-btn is-primary" id="wc-m-roll">\u{1F3B2} Roll Fair d20</button>
        </div>
      </div>
    `;
    const presetSel = modal.root.querySelector("#wc-m-dc-preset");
    const dcInp = modal.root.querySelector("#wc-m-dc");
    presetSel?.addEventListener("change", () => {
      if (dcInp && presetSel) dcInp.value = presetSel.value;
    });
    modal.root.querySelector("#wc-m-cancel")?.addEventListener("click", () => modal.dismiss());
    modal.root.querySelector("#wc-m-roll")?.addEventListener("click", () => {
      const action = modal.root.querySelector("#wc-m-action")?.value.trim() || "Attempt check";
      const stat = modal.root.querySelector("#wc-m-stat")?.value || "none";
      const dc = Number(dcInp?.value || 15);
      const gearBonus = Number(modal.root.querySelector("#wc-m-gear")?.value || 0);
      rollDraft.action = action;
      rollDraft.stat = stat;
      rollDraft.dc = dc;
      rollDraft.gearBonus = gearBonus;
      send("roll_dice", { action, stat, dc, gearBonus });
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
          mpLabel: val("wc-id-mplbl")
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
  function openAddItemModal() {
    const modal = ctx.ui.showModal({ title: "Add Item to Inventory", width: 400 });
    modal.root.innerHTML = `
      <div class="wc-modal">
        <div class="wc-field"><label>Item Name</label><input class="wc-input" id="wc-it-name" placeholder="e.g., Crowbar, First-Aid Kit, Iron Sword" /></div>
        <div class="wc-row-2">
          <div class="wc-field">
            <label>Category</label>
            <select class="wc-select" id="wc-it-cat">
              <option value="misc">Misc</option>
              <option value="weapon">Weapon</option>
              <option value="armor">Armor</option>
              <option value="accessory">Accessory</option>
              <option value="potion">Potion / Meds</option>
              <option value="material">Material / Ammo</option>
              <option value="key">Key Item</option>
              <option value="book">Book / Note</option>
              <option value="valuable">Valuable</option>
            </select>
          </div>
          <div class="wc-field">
            <label>Rarity</label>
            <select class="wc-select" id="wc-it-rar">
              <option value="ordinary">Ordinary (+0)</option>
              <option value="common">Common (+0)</option>
              <option value="uncommon">Uncommon (+1)</option>
              <option value="rare">Rare (+1)</option>
              <option value="epic">Epic (+2)</option>
              <option value="legendary">Legendary (+3)</option>
              <option value="mythic">Mythic (+3)</option>
            </select>
          </div>
        </div>
        <div class="wc-row-2">
          <div class="wc-field"><label>Quantity</label><input class="wc-input" id="wc-it-qty" type="number" min="1" value="1" /></div>
          <label class="wc-toggle-row" style="align-self:end"><span>Equip immediately</span><input type="checkbox" id="wc-it-eq" /></label>
        </div>
        <div class="wc-field"><label>Note (optional)</label><input class="wc-input" id="wc-it-note" placeholder="Short effect or condition" /></div>
        <div class="wc-modal-foot">
          <button class="wc-btn" id="wc-it-cancel">Cancel</button>
          <button class="wc-btn is-primary" id="wc-it-save">Add Item</button>
        </div>
      </div>
    `;
    modal.root.querySelector("#wc-it-cancel")?.addEventListener("click", () => modal.dismiss());
    modal.root.querySelector("#wc-it-save")?.addEventListener("click", () => {
      const name = modal.root.querySelector("#wc-it-name")?.value.trim();
      if (!name) return;
      send("add_item", {
        item: {
          name,
          category: modal.root.querySelector("#wc-it-cat")?.value,
          rarity: modal.root.querySelector("#wc-it-rar")?.value,
          qty: Number(modal.root.querySelector("#wc-it-qty")?.value || 1),
          note: modal.root.querySelector("#wc-it-note")?.value.trim() || "",
          equip: modal.root.querySelector("#wc-it-eq")?.checked ?? false
        }
      });
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
          <div class="wc-field"><label>Type</label><select class="wc-select" id="wc-q-kind"><option value="main" ${existing?.kind === "main" ? "selected" : ""}>Main</option><option value="side" ${existing?.kind !== "main" ? "selected" : ""}>Side</option></select></div>
          <div class="wc-field"><label>Status</label><select class="wc-select" id="wc-q-status"><option value="active" ${!existing || existing.status === "active" ? "selected" : ""}>Active</option><option value="available" ${existing?.status === "available" ? "selected" : ""}>Available</option><option value="done" ${existing?.status === "done" ? "selected" : ""}>Done</option><option value="failed" ${existing?.status === "failed" ? "selected" : ""}>Failed</option></select></div>
        </div>
        <div class="wc-field"><label>Objectives (one per line; prefix "[x] " if done)</label><textarea class="wc-textarea" id="wc-q-obs" rows="3">${esc(obsText)}</textarea></div>
        <div class="wc-field"><label>Reward (optional)</label><input class="wc-input" id="wc-q-rew" value="${esc(existing?.reward || "")}" /></div>
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
          reward: modal.root.querySelector("#wc-q-rew")?.value.trim() || ""
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
          <div class="wc-field"><label>Time / Timeline</label><input class="wc-input" id="wc-w-time" value="${esc(w.time)}" /></div>
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
        <div class="wc-modal-foot"><button class="wc-btn" id="wc-w-cancel">Cancel</button><button class="wc-btn is-primary" id="wc-w-save">Save</button></div>
      </div>
    `;
    modal.root.querySelector("#wc-w-cancel")?.addEventListener("click", () => modal.dismiss());
    modal.root.querySelector("#wc-w-save")?.addEventListener("click", () => {
      send("update_world", {
        patch: {
          location: modal.root.querySelector("#wc-w-loc")?.value || "",
          time: modal.root.querySelector("#wc-w-time")?.value || "",
          dayCount: Number(modal.root.querySelector("#wc-w-day")?.value || 1),
          arc: modal.root.querySelector("#wc-w-arc")?.value || "",
          phase: modal.root.querySelector("#wc-w-phase")?.value || "",
          weather: modal.root.querySelector("#wc-w-weather")?.value || "",
          mood: modal.root.querySelector("#wc-w-mood")?.value || "",
          notes: modal.root.querySelector("#wc-w-notes")?.value || ""
        }
      });
      modal.dismiss();
    });
  }
  function openNpcModal(existing) {
    const modal = ctx.ui.showModal({ title: existing ? `Edit NPC \xB7 ${existing.name}` : "Add NPC", width: 430, maxHeight: 580 });
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
  function openSimpleAddModal(kind) {
    if (kind === "export" && data) {
      const modal = ctx.ui.showModal({ title: "Export Weft Chronicle JSON", width: 460 });
      const json = JSON.stringify({ sheet: data.sheet, world: data.world, rolls: data.rolls }, null, 2);
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
          <div class="wc-modal-foot"><button class="wc-btn" id="wc-sk-c">Cancel</button><button class="wc-btn is-primary" id="wc-sk-s">Add</button></div>
        </div>
      `;
      modal.root.querySelector("#wc-sk-c")?.addEventListener("click", () => modal.dismiss());
      modal.root.querySelector("#wc-sk-s")?.addEventListener("click", () => {
        const name = modal.root.querySelector("#wc-sk-name")?.value.trim();
        if (!name) return;
        send("add_skill", {
          skill: {
            name,
            cost: modal.root.querySelector("#wc-sk-cost")?.value.trim() || "",
            note: modal.root.querySelector("#wc-sk-note")?.value.trim() || ""
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
          <div class="wc-field"><label>Kind</label><select class="wc-select" id="wc-th-st"><option value="active">Open Thread</option><option value="seed">Seed / Timer</option><option value="resolved">Resolved</option></select></div>
          <div class="wc-field"><label>Detail</label><textarea class="wc-textarea" id="wc-th-d" rows="2"></textarea></div>
          <div class="wc-modal-foot"><button class="wc-btn" id="wc-th-c">Cancel</button><button class="wc-btn is-primary" id="wc-th-s">Add</button></div>
        </div>
      `;
      modal.root.querySelector("#wc-th-c")?.addEventListener("click", () => modal.dismiss());
      modal.root.querySelector("#wc-th-s")?.addEventListener("click", () => {
        const title = modal.root.querySelector("#wc-th-t")?.value.trim();
        if (!title) return;
        send("upsert_thread", {
          thread: {
            title,
            status: modal.root.querySelector("#wc-th-st")?.value,
            detail: modal.root.querySelector("#wc-th-d")?.value.trim() || ""
          }
        });
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
  function renderSystemTab(d, cfg) {
    if (!d.modules.system) {
      return renderModuleDisabledCard(
        "system",
        "System Window",
        "System stats, HP/SP/XP, inventory, quests, and System Notifications are paused for this chat (0 prompt tokens used)."
      );
    }
    const sysTh = resolveSystemTheme(cfg);
    const initBanner = !d.initialized ? `<div class="wc-banner">
           <span>Not initialized for this chat yet.</span>
           <button class="wc-btn is-primary is-xs" data-act="init_ai" ${syncing ? "disabled" : ""}>\u2728 Initialize with AI</button>
         </div>` : "";
    const latestNotices = d.notices.length > 0 ? `<div>
             ${renderNoticeCard(d.notices[0], sysTh)}
             <div class="wc-actions-row" style="justify-content:flex-end; margin-top:2px;">
               <button class="wc-btn is-xs" data-act="clear_notices">Clear Notices (${d.notices.length})</button>
             </div>
           </div>` : "";
    return `
      ${initBanner}
      ${latestNotices}
      ${renderSystemWindow(d.sheet, cfg, { mode: "drawer" })}
    `;
  }
  function renderGearTab(d) {
    if (!d.modules.system) {
      return renderModuleDisabledCard(
        "system",
        "System Window (Gear & Quests)",
        "Turn the System module ON to manage equipped gear, bag items, and quests."
      );
    }
    const s = d.sheet;
    const slots = [
      { key: "weapon", label: "Weapon" },
      { key: "armor", label: "Armor" },
      { key: "accessory", label: "Accessory" }
    ];
    const maxBonus = computeMaxGearBonus(s);
    return `
      <div class="wc-card">
        <div class="wc-card-head">
          <span class="wc-card-title">Equipped Gear</span>
          <span class="wc-pill">Max Roll Bonus +${maxBonus}</span>
        </div>
        <div class="wc-list">
          ${slots.map(({ key, label }) => {
      const it = s.gear[key];
      if (!it) {
        return `<div class="wc-item-row"><div class="wc-item-main"><span class="wc-dim">${label}: Empty</span></div></div>`;
      }
      const rb = typeof it.rollBonus === "number" ? it.rollBonus : rarityRollBonus(it.rarity);
      return `
                <div class="wc-item-row">
                  <div class="wc-item-main">
                    <div class="wc-item-name">
                      <span class="wc-dim">${label}:</span>
                      <span class="wc-rarity-${esc(it.rarity)}">${esc(it.name)}</span>
                      ${rb > 0 ? `<span class="wc-pill">+${rb}</span>` : ""}
                    </div>
                    ${it.note ? `<div class="wc-item-sub">${esc(it.note)}</div>` : ""}
                  </div>
                  <button class="wc-btn is-xs" data-act="unequip" data-slot="${key}">Unequip</button>
                </div>
              `;
    }).join("")}
        </div>
      </div>

      <div class="wc-card">
        <div class="wc-card-head">
          <span class="wc-card-title">Bag (${s.bag.length}/24)${s.cash ? ` \xB7 ${esc(s.cash)}` : ""}</span>
          <button class="wc-btn is-xs is-primary" data-act="add_item">+ Item</button>
        </div>
        ${s.bag.length > 0 ? `<div class="wc-list">${s.bag.map((it) => {
      const canEquip = it.category === "weapon" || it.category === "armor" || it.category === "accessory";
      return `
                    <div class="wc-item-row">
                      <div class="wc-item-main">
                        <div class="wc-item-name">
                          <span class="wc-rarity-${esc(it.rarity)}">${esc(it.name)}</span>
                          ${it.qty > 1 ? `<span class="wc-pill is-muted">\xD7${it.qty}</span>` : ""}
                          ${it.rarity !== "ordinary" ? `<span class="wc-dim">${esc(it.rarity)}</span>` : ""}
                        </div>
                        ${it.note ? `<div class="wc-item-sub">${esc(it.note)}</div>` : ""}
                      </div>
                      <div class="wc-actions-row">
                        ${canEquip ? `<button class="wc-btn is-xs" data-act="equip" data-id="${esc(it.id)}">Equip</button>` : ""}
                        <button class="wc-btn is-xs" data-act="rm_item" data-id="${esc(it.id)}">-1</button>
                      </div>
                    </div>
                  `;
    }).join("")}</div>` : `<div class="wc-dim">Bag is empty.</div>`}
      </div>

      <div class="wc-card">
        <div class="wc-card-head">
          <span class="wc-card-title">Quests (${s.quests.length}/8)</span>
          <button class="wc-btn is-xs is-primary" data-act="add_quest">+ Quest</button>
        </div>
        ${s.quests.length > 0 ? `<div class="wc-list">${s.quests.map((q) => {
      const statusCls = q.status === "done" ? "is-good" : q.status === "failed" ? "is-bad" : q.status === "active" ? "" : "is-muted";
      return `
                    <div class="wc-item-row" style="flex-direction:column; align-items:stretch; gap:5px;">
                      <div class="wc-card-head">
                        <div class="wc-item-name">
                          <span class="wc-pill ${statusCls}">${esc(q.status)}</span>
                          <span>${esc(q.title)}</span>
                        </div>
                        <div class="wc-actions-row">
                          <button class="wc-btn is-xs" data-act="edit_quest" data-id="${esc(q.id)}">Edit</button>
                          <button class="wc-btn is-xs" data-act="rm_quest" data-id="${esc(q.id)}">\xD7</button>
                        </div>
                      </div>
                      ${q.objectives.map(
        (o) => `
                            <label class="wc-obj ${o.done ? "is-done" : ""}">
                              <input type="checkbox" data-act="toggle_obj" data-qid="${esc(q.id)}" data-oid="${esc(o.id)}" ${o.done ? "checked" : ""} />
                              <span>${esc(o.text)}</span>
                            </label>
                          `
      ).join("")}
                      ${q.reward ? `<div class="wc-dim">Reward: ${esc(q.reward)}</div>` : ""}
                    </div>
                  `;
    }).join("")}</div>` : `<div class="wc-dim">No active quests tracked.</div>`}
      </div>
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
           <button class="wc-btn is-primary is-xs" data-act="init_ai" ${syncing ? "disabled" : ""}>\u2728 Initialize with AI</button>
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
        <div class="wc-actions-row">
          ${DC_PRESETS.slice(1, 5).map((p) => `<button class="wc-btn is-xs" data-act="set_dc" data-dc="${p.dc}">DC ${p.dc}</button>`).join("")}
          <button class="wc-btn is-primary" style="margin-left:auto" data-act="inline_roll">\u{1F3B2} Roll d20</button>
        </div>
      </div>

      ${d.rolls.length > 0 ? `<div class="wc-list">
               ${d.rolls.slice(0, 10).map((r) => renderDiceCard(r, cfg.theme)).join("")}
               <div class="wc-actions-row" style="justify-content:flex-end;">
                 <button class="wc-btn is-xs" data-act="clear_rolls">Clear Roll History</button>
               </div>
             </div>` : `<div class="wc-card"><div class="wc-dim">Rolls use unbiased crypto RNG and automatically bind the AI's next reply.</div></div>`}
    `;
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
             </div>` : ""}

      <div class="wc-card">
        <div class="wc-card-head">
          <span class="wc-card-title">Inline Cards Inside Chat</span>
          <span class="wc-dim">Show below AI replies</span>
        </div>
        <label class="wc-toggle-row"><span>Show System Window card in chat</span><input type="checkbox" data-cfg="showInlineSystem" ${cfg.showInlineSystem ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Show System Notifications in chat</span><input type="checkbox" data-cfg="showInlineNotices" ${cfg.showInlineNotices ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Show Story Tracker card in chat</span><input type="checkbox" data-cfg="showInlineTracker" ${cfg.showInlineTracker ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Show Dice Result cards in chat</span><input type="checkbox" data-cfg="showInlineDice" ${cfg.showInlineDice ? "checked" : ""} /></label>
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
        <label class="wc-toggle-row"><span>Auto-sync state after every AI reply</span><input type="checkbox" data-cfg="autoSync" ${cfg.autoSync ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Inject live state into AI prompt</span><input type="checkbox" data-cfg="injectPrompt" ${cfg.injectPrompt ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Track XP & automatic level-ups</span><input type="checkbox" data-cfg="trackXp" ${cfg.trackXp ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Enable automatically in new chats</span><input type="checkbox" data-cfg="enabledByDefault" ${cfg.enabledByDefault ? "checked" : ""} /></label>
      </div>

      ${d ? `<div class="wc-card">
               <div class="wc-card-head"><span class="wc-card-title">Backup & Reset (This Chat)</span></div>
               <div class="wc-actions-row" style="justify-content:space-between;">
                 <div class="wc-actions-row">
                   <button class="wc-btn is-xs" data-act="modal_add" data-kind="export">Export JSON</button>
                   <button class="wc-btn is-xs" data-act="modal_add" data-kind="import">Import JSON</button>
                 </div>
                 <button class="wc-btn is-xs is-danger" data-act="reset_chat">Reset Chat</button>
               </div>
             </div>` : ""}
    `;
  }
  function renderAll() {
    updateChromeState();
    const theme = settings?.theme || "sakura";
    if (settingsTabHandle && settings) {
      settingsTabHandle.root.innerHTML = `<div class="wc-root" data-wc-theme="${esc(theme)}">${renderSettingsContent(data, settings)}</div>`;
    }
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
      scheduleInlineSync(60);
      return;
    }
    const pendingRolls = data.modules.dice ? data.rolls.filter((r) => !r.consumed).length : 0;
    const body = activeSubTab === "system" ? renderSystemTab(data, settings) : activeSubTab === "gear" ? renderGearTab(data) : activeSubTab === "tracker" ? renderTrackerTab(data, settings) : activeSubTab === "dice" ? renderDiceTab(data, settings) : renderSettingsContent(data, settings);
    drawerTab.root.innerHTML = `
      <div class="wc-root" data-wc-theme="${esc(theme)}">
        <div class="wc-topbar">
          <div class="wc-brand">
            <span class="wc-brand-dot" style="opacity:${data.enabled ? "1" : "0.3"}"></span>
            <div>
              <div class="wc-brand-title">Weft Chronicle</div>
              <div class="wc-brand-sub">${syncing ? esc(statusNote || "Syncing\u2026") : data.enabled ? esc(statusNote || "Active in this chat") : "Paused for this chat"}</div>
            </div>
          </div>
          <div class="wc-actions-row">
            <button class="wc-btn is-xs" data-act="toggle_chat" title="Pause or resume all modules for this chat">${data.enabled ? "On" : "Off"}</button>
            <button class="wc-btn is-xs is-primary" data-act="sync_now" ${syncing || !data.enabled ? "disabled" : ""}>${syncing ? "\u2026" : "Sync"}</button>
            ${data.modules.dice ? `<button class="wc-btn is-xs" data-act="quick_roll" title="Roll Fair d20">\u{1F3B2}</button>` : ""}
          </div>
        </div>

        <div class="wc-tabs">
          <button class="wc-tab ${activeSubTab === "system" ? "is-active" : ""} ${!data.modules.system ? "is-off" : ""}" data-subtab="system">System${data.modules.system && data.sheet.pts > 0 ? ` <span class="wc-pill">+${data.sheet.pts}</span>` : ""}</button>
          <button class="wc-tab ${activeSubTab === "gear" ? "is-active" : ""} ${!data.modules.system ? "is-off" : ""}" data-subtab="gear">Gear</button>
          <button class="wc-tab ${activeSubTab === "tracker" ? "is-active" : ""} ${!data.modules.tracker ? "is-off" : ""}" data-subtab="tracker">Tracker</button>
          <button class="wc-tab ${activeSubTab === "dice" ? "is-active" : ""} ${!data.modules.dice ? "is-off" : ""}" data-subtab="dice">Dice${pendingRolls > 0 ? ` <span class="wc-pill">${pendingRolls}</span>` : ""}</button>
          <button class="wc-tab ${activeSubTab === "settings" ? "is-active" : ""}" data-subtab="settings" title="Settings">\u2699\uFE0F</button>
        </div>

        ${body}
      </div>
    `;
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
      case "rm_effect": {
        send("remove_effect", { id: target.dataset.id });
        return;
      }
      case "rm_skill": {
        send("remove_skill", { id: target.dataset.id });
        return;
      }
      case "add_item": {
        openAddItemModal();
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
      case "inline_roll": {
        const action = drawerTab.root.querySelector("#wc-d-action")?.value.trim() || "Attempt check";
        const stat = drawerTab.root.querySelector("#wc-d-stat")?.value || "none";
        const dc = Number(drawerTab.root.querySelector("#wc-d-dc")?.value || 15);
        const gearBonus = Number(drawerTab.root.querySelector("#wc-d-gear")?.value || 0);
        rollDraft.action = action;
        rollDraft.stat = stat;
        rollDraft.dc = dc;
        rollDraft.gearBonus = gearBonus;
        send("roll_dice", { action, stat, dc, gearBonus });
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
    if (el.id === "wc-cfg-systheme") {
      send("update_settings", { patch: { systemTheme: el.value } });
      return;
    }
    if (el.id === "wc-cfg-alloc") {
      send("update_settings", { patch: { allocMode: el.value } });
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
        renderAll();
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
