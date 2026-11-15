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

// src/styles.ts
var WEFT_CHRONICLE_CSS = `
.wc-root {
  --wc-accent: #f4a4c0;
  --wc-accent-strong: #e37ba4;
  --wc-accent-soft: rgba(244, 164, 192, 0.14);
  --wc-accent-border: rgba(244, 164, 192, 0.34);
  --wc-accent-ink: #ffdbe8;
  --wc-bg: var(--lumiverse-fill-subtle, rgba(255, 255, 255, 0.03));
  --wc-card: var(--lumiverse-fill, rgba(255, 255, 255, 0.05));
  --wc-card-hover: rgba(255, 255, 255, 0.08);
  --wc-border: var(--lumiverse-border, rgba(255, 255, 255, 0.12));
  --wc-text: var(--lumiverse-text, #f2eef1);
  --wc-muted: var(--lumiverse-text-muted, rgba(242, 238, 241, 0.68));
  --wc-dim: var(--lumiverse-text-dim, rgba(242, 238, 241, 0.45));
  --wc-hp: #e25d6c;
  --wc-sp: #e5a94c;
  --wc-mp: #5e9cf0;
  --wc-xp: #52c287;
  --wc-good: #4ec483;
  --wc-warn: #e9a944;
  --wc-bad: #e35d6a;
  --wc-radius: var(--lumiverse-radius, 10px);
  color: var(--wc-text);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.45;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 10px 18px;
  box-sizing: border-box;
}

.wc-root *, .wc-modal * { box-sizing: border-box; }

/* ---- Theme Palettes (matches Weft_v4_4 card_theme + Lumiverse Native, Dark defaults) ---- */
.wc-root[data-wc-theme="sakura"]    { --wc-accent: #f4a4c0; --wc-accent-strong: #e57fa6; --wc-accent-soft: rgba(244,164,192,0.14); --wc-accent-border: rgba(244,164,192,0.34); --wc-accent-ink: #ffdce9; }
.wc-root[data-wc-theme="ocean"]     { --wc-accent: #7ab8f5; --wc-accent-strong: #4f96e3; --wc-accent-soft: rgba(122,184,245,0.14); --wc-accent-border: rgba(122,184,245,0.34); --wc-accent-ink: #d9ecff; }
.wc-root[data-wc-theme="ember"]     { --wc-accent: #e89b55; --wc-accent-strong: #d97e32; --wc-accent-soft: rgba(232,155,85,0.14);  --wc-accent-border: rgba(232,155,85,0.34);  --wc-accent-ink: #ffe1c2; }
.wc-root[data-wc-theme="forest"]    { --wc-accent: #7fc79b; --wc-accent-strong: #5db07e; --wc-accent-soft: rgba(127,199,155,0.14); --wc-accent-border: rgba(127,199,155,0.34); --wc-accent-ink: #d6f5e1; }
.wc-root[data-wc-theme="violet"]    { --wc-accent: #b79df5; --wc-accent-strong: #9b7de8; --wc-accent-soft: rgba(183,157,245,0.14); --wc-accent-border: rgba(183,157,245,0.34); --wc-accent-ink: #e8deff; }
.wc-root[data-wc-theme="gold"]      { --wc-accent: #e2be68; --wc-accent-strong: #c9a145; --wc-accent-soft: rgba(226,190,104,0.14); --wc-accent-border: rgba(226,190,104,0.34); --wc-accent-ink: #fff0c7; }
.wc-root[data-wc-theme="teal"]      { --wc-accent: #63cfc4; --wc-accent-strong: #3fb3a7; --wc-accent-soft: rgba(99,207,196,0.14);  --wc-accent-border: rgba(99,207,196,0.34);  --wc-accent-ink: #d1faf5; }
.wc-root[data-wc-theme="crimson"]   { --wc-accent: #e56b7a; --wc-accent-strong: #cc4a5b; --wc-accent-soft: rgba(229,107,122,0.14); --wc-accent-border: rgba(229,107,122,0.34); --wc-accent-ink: #ffd6dc; }
.wc-root[data-wc-theme="mono"]      { --wc-accent: #c8cdd8; --wc-accent-strong: #a7b0c0; --wc-accent-soft: rgba(200,205,216,0.12); --wc-accent-border: rgba(200,205,216,0.28); --wc-accent-ink: #eef1f7; }
.wc-root[data-wc-theme="lumiverse"] { --wc-accent: var(--lumiverse-accent, #9b8cf5); --wc-accent-strong: var(--lumiverse-accent, #8171e5); --wc-accent-soft: var(--lumiverse-fill, rgba(155,140,245,0.14)); --wc-accent-border: var(--lumiverse-border, rgba(155,140,245,0.32)); --wc-accent-ink: var(--lumiverse-text, #f2eef1); }

/* ---- Light Mode Overrides (Lumiverse sets data-theme-mode="light" on <html>) ---- */
[data-theme-mode="light"] .wc-root {
  --wc-card: rgba(0, 0, 0, 0.035);
  --wc-card-hover: rgba(0, 0, 0, 0.06);
  --wc-border: rgba(0, 0, 0, 0.11);
  --wc-text: var(--lumiverse-text, #1d1a21);
  --wc-muted: var(--lumiverse-text-muted, rgba(29, 26, 33, 0.68));
  --wc-dim: var(--lumiverse-text-dim, rgba(29, 26, 33, 0.48));
  --wc-good: #1f8a52;
  --wc-warn: #b46d0a;
  --wc-bad: #c5303f;
}
[data-theme-mode="light"] .wc-root[data-wc-theme="sakura"]  { --wc-accent: #b8426f; --wc-accent-strong: #9f305c; --wc-accent-soft: rgba(184,66,111,0.10); --wc-accent-border: rgba(184,66,111,0.28); --wc-accent-ink: #7d2146; }
[data-theme-mode="light"] .wc-root[data-wc-theme="ocean"]   { --wc-accent: #2564b3; --wc-accent-strong: #1b4f91; --wc-accent-soft: rgba(37,100,179,0.10); --wc-accent-border: rgba(37,100,179,0.28); --wc-accent-ink: #173f75; }
[data-theme-mode="light"] .wc-root[data-wc-theme="ember"]   { --wc-accent: #b85d19; --wc-accent-strong: #9b4a0d; --wc-accent-soft: rgba(184,93,25,0.10);  --wc-accent-border: rgba(184,93,25,0.28);  --wc-accent-ink: #7a3808; }
[data-theme-mode="light"] .wc-root[data-wc-theme="forest"]  { --wc-accent: #2c7a4f; --wc-accent-strong: #1f633e; --wc-accent-soft: rgba(44,122,79,0.10);  --wc-accent-border: rgba(44,122,79,0.28);  --wc-accent-ink: #1a5434; }
[data-theme-mode="light"] .wc-root[data-wc-theme="violet"]  { --wc-accent: #6846c4; --wc-accent-strong: #5333ad; --wc-accent-soft: rgba(104,70,196,0.10); --wc-accent-border: rgba(104,70,196,0.28); --wc-accent-ink: #462896; }
[data-theme-mode="light"] .wc-root[data-wc-theme="gold"]    { --wc-accent: #9a7014; --wc-accent-strong: #7d590a; --wc-accent-soft: rgba(154,112,20,0.10); --wc-accent-border: rgba(154,112,20,0.28); --wc-accent-ink: #664706; }
[data-theme-mode="light"] .wc-root[data-wc-theme="teal"]    { --wc-accent: #187a70; --wc-accent-strong: #106159; --wc-accent-soft: rgba(24,122,112,0.10); --wc-accent-border: rgba(24,122,112,0.28); --wc-accent-ink: #0d4f48; }
[data-theme-mode="light"] .wc-root[data-wc-theme="crimson"] { --wc-accent: #b02e3e; --wc-accent-strong: #911f2d; --wc-accent-soft: rgba(176,46,62,0.10);  --wc-accent-border: rgba(176,46,62,0.28);  --wc-accent-ink: #7a1723; }
[data-theme-mode="light"] .wc-root[data-wc-theme="mono"]    { --wc-accent: #3d4554; --wc-accent-strong: #2a303c; --wc-accent-soft: rgba(61,69,84,0.10);   --wc-accent-border: rgba(61,69,84,0.26);   --wc-accent-ink: #222730; }

/* ---- Top Bar & Sub-Tab Nav ---- */
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
.wc-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.wc-brand-dot {
  width: 9px;
  height: 9px;
  border-radius: 99px;
  background: var(--wc-accent);
  box-shadow: 0 0 8px var(--wc-accent);
  flex-shrink: 0;
}
.wc-brand-title {
  font-weight: 700;
  font-size: 13.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wc-brand-sub {
  font-size: 11px;
  color: var(--wc-muted);
}
.wc-actions-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.wc-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
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
  font-weight: 600;
  padding: 6px 4px;
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
.wc-pill {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 99px;
  font-size: 10px;
  font-weight: 700;
  background: var(--wc-accent-soft);
  color: var(--wc-accent-ink);
  border: 1px solid var(--wc-accent-border);
}
.wc-pill.is-good { background: rgba(78,196,131,0.16); color: var(--wc-good); border-color: rgba(78,196,131,0.35); }
.wc-pill.is-warn { background: rgba(233,169,68,0.16); color: var(--wc-warn); border-color: rgba(233,169,68,0.35); }
.wc-pill.is-bad  { background: rgba(227,93,106,0.16); color: var(--wc-bad);  border-color: rgba(227,93,106,0.35); }
.wc-pill.is-muted { background: transparent; color: var(--wc-muted); border-color: var(--wc-border); }

/* ---- Cards & Sections ---- */
.wc-card {
  border-radius: var(--wc-radius);
  background: var(--wc-card);
  border: 1px solid var(--wc-border);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.wc-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.wc-card-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--wc-accent-ink);
}
.wc-muted { color: var(--wc-muted); font-size: 12px; }
.wc-dim { color: var(--wc-dim); font-size: 11px; }

/* ---- Buttons & Inputs ---- */
.wc-btn {
  appearance: none;
  border: 1px solid var(--wc-border);
  background: var(--wc-card);
  color: var(--wc-text);
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
  transition: background 0.14s, border-color 0.14s, transform 0.08s;
}
.wc-btn:hover:not(:disabled) { background: var(--wc-card-hover); border-color: var(--wc-accent-border); }
.wc-btn:active:not(:disabled) { transform: translateY(1px); }
.wc-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.wc-btn.is-primary {
  background: var(--wc-accent-soft);
  border-color: var(--wc-accent-border);
  color: var(--wc-accent-ink);
}
.wc-btn.is-primary:hover:not(:disabled) {
  background: var(--wc-accent);
  color: #140d11;
}
[data-theme-mode="light"] .wc-btn.is-primary:hover:not(:disabled) {
  color: #ffffff;
}
.wc-btn.is-danger { border-color: rgba(227,93,106,0.4); color: var(--wc-bad); }
.wc-btn.is-xs { padding: 2px 6px; font-size: 11px; border-radius: 5px; }

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
.wc-input:focus, .wc-select:focus, .wc-textarea:focus {
  border-color: var(--wc-accent);
}
.wc-field { display: flex; flex-direction: column; gap: 4px; }
.wc-field label { font-size: 11px; font-weight: 600; color: var(--wc-muted); }
.wc-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.wc-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }

/* ---- Identity & Pools ---- */
.wc-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.wc-hero-name { font-size: 16px; font-weight: 700; line-height: 1.2; }
.wc-hero-meta { font-size: 11.5px; color: var(--wc-muted); margin-top: 2px; }
.wc-lv-badge {
  padding: 3px 9px;
  border-radius: 99px;
  background: var(--wc-accent-soft);
  border: 1px solid var(--wc-accent-border);
  color: var(--wc-accent-ink);
  font-weight: 800;
  font-size: 12px;
  white-space: nowrap;
}

.wc-pool { display: flex; flex-direction: column; gap: 4px; }
.wc-pool-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 11.5px;
}
.wc-pool-label { font-weight: 700; }
.wc-pool-val { font-variant-numeric: tabular-nums; color: var(--wc-muted); }
.wc-bar {
  height: 7px;
  width: 100%;
  border-radius: 99px;
  background: rgba(128,128,128,0.18);
  overflow: hidden;
}
.wc-bar-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.25s ease;
}
.wc-bar-fill.is-hp { background: var(--wc-hp); }
.wc-bar-fill.is-sp { background: var(--wc-sp); }
.wc-bar-fill.is-mp { background: var(--wc-mp); }
.wc-bar-fill.is-xp { background: var(--wc-xp); }

/* ---- 6-Stat Grid ---- */
.wc-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.wc-stat-tile {
  border-radius: 8px;
  border: 1px solid var(--wc-border);
  background: var(--wc-bg);
  padding: 7px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  position: relative;
}
.wc-stat-lbl { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: var(--wc-muted); }
.wc-stat-num { font-size: 17px; font-weight: 800; line-height: 1.1; font-variant-numeric: tabular-nums; }
.wc-stat-mod { font-size: 11px; font-weight: 700; color: var(--wc-accent-ink); }
.wc-stat-band { font-size: 9.5px; color: var(--wc-dim); }
.wc-stat-plus {
  margin-top: 3px;
  width: 100%;
  padding: 2px 4px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 5px;
  border: 1px solid var(--wc-accent-border);
  background: var(--wc-accent-soft);
  color: var(--wc-accent-ink);
  cursor: pointer;
}
.wc-stat-plus:hover { background: var(--wc-accent); color: #140d11; }
[data-theme-mode="light"] .wc-stat-plus:hover { color: #ffffff; }

/* ---- Chips, Lists, Gear, Quests, NPCs ---- */
.wc-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.wc-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 99px;
  font-size: 11.5px;
  border: 1px solid var(--wc-border);
  background: var(--wc-bg);
}
.wc-chip.is-buff { border-color: rgba(78,196,131,0.4); color: var(--wc-good); }
.wc-chip.is-debuff { border-color: rgba(227,93,106,0.4); color: var(--wc-bad); }
.wc-chip-x {
  appearance: none;
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.65;
  cursor: pointer;
  padding: 0 2px;
  font-size: 12px;
  line-height: 1;
}
.wc-chip-x:hover { opacity: 1; }

.wc-list { display: flex; flex-direction: column; gap: 6px; }
.wc-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 8px;
  border: 1px solid var(--wc-border);
  background: var(--wc-bg);
}
.wc-item-main { min-width: 0; flex: 1; }
.wc-item-name { font-weight: 600; font-size: 12.5px; display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
.wc-item-sub { font-size: 11px; color: var(--wc-muted); margin-top: 1px; }

.wc-rarity-uncommon { color: #52c287; }
.wc-rarity-rare     { color: #5e9cf0; }
.wc-rarity-epic     { color: #b784f5; }
.wc-rarity-legendary{ color: #e8a848; }
.wc-rarity-mythic   { color: #f06e8c; }

.wc-obj {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 0;
}
.wc-obj.is-done { text-decoration: line-through; color: var(--wc-dim); }

.wc-rel-track {
  position: relative;
  height: 6px;
  border-radius: 99px;
  background: rgba(128,128,128,0.2);
  overflow: hidden;
  margin-top: 4px;
}
.wc-rel-mid {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--wc-border);
}
.wc-rel-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 99px;
}

/* ---- Dice Result Card ---- */
.wc-roll-card {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--wc-border);
  background: var(--wc-bg);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.wc-roll-card.is-pending {
  border-color: var(--wc-accent-border);
  background: var(--wc-accent-soft);
}
.wc-roll-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.wc-roll-math {
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  color: var(--wc-muted);
}

/* ---- Toggle Row ---- */
.wc-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 0;
}
.wc-toggle-row span { font-size: 12.5px; }
.wc-toggle-row input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--wc-accent);
  cursor: pointer;
}

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
.wc-modal {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 13px;
  color: var(--lumiverse-text, inherit);
}
.wc-modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
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
  { id: "mono", label: "Mono (ink)" },
  { id: "lumiverse", label: "Lumiverse Native" }
];
var CREST_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 21 7 21 17 12 22 3 17 3 7 12 2"/><polyline points="3.3 7 12 12 20.7 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>`;
var DICE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z"/><path d="M12 22V12"/><path d="M12 12 3 7"/><path d="M12 12l9-5"/><circle cx="12" cy="7.5" r="0.8" fill="currentColor"/></svg>`;
function esc(val) {
  return String(val ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function pct(cur, max) {
  if (!max || max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(cur / max * 100)));
}
function verdictPillClass(verdict) {
  if (verdict === "nat 20" || verdict === "success") return "is-good";
  if (verdict === "success, at a cost") return "is-warn";
  return "is-bad";
}
function setup(ctx) {
  const cleanups = [];
  ctx.dom.addStyle(WEFT_CHRONICLE_CSS);
  cleanups.push(() => ctx.dom.cleanup());
  let activeSubTab = "sheet";
  let chatId = ctx.getActiveChat().chatId;
  let data = null;
  let settings = null;
  let connections = [];
  let permissions = {
    interceptor: false,
    generation: false,
    chats: false,
    characters: false,
    personas: false
  };
  let syncing = false;
  let statusNote = "";
  const rollDraft = {
    action: "",
    stat: "dex",
    dc: 15,
    gearBonus: 0
  };
  const drawerTab = ctx.ui.registerDrawerTab({
    id: "weft_chronicle_tab",
    title: "Weft Chronicle",
    shortName: "Weft",
    headerTitle: "Weft Chronicle",
    description: "Deterministic RPG sheet, inventory, quests, world/NPC tracker & fair d20 dice roller.",
    keywords: ["weft", "rpg", "status", "sheet", "dice", "d20", "npc", "world", "quests", "inventory"],
    iconSvg: CREST_SVG
  });
  cleanups.push(() => drawerTab.destroy());
  const rollAction = ctx.ui.registerInputBarAction({
    id: "weft_quick_roll",
    label: "Roll d20",
    subtitle: "Fair RNG check (Weft Chronicle)",
    iconSvg: DICE_SVG,
    enabled: true
  });
  cleanups.push(() => rollAction.destroy());
  function send(type, extra = {}) {
    ctx.sendToBackend({ type, chatId, ...extra });
  }
  function updateBadge() {
    if (!data || !data.enabled) {
      drawerTab.setBadge(null);
      return;
    }
    const pendingRolls = data.rolls.filter((r) => !r.consumed).length;
    if (pendingRolls > 0) {
      drawerTab.setBadge(`\u{1F3B2}${pendingRolls}`);
    } else if (data.sheet.pts > 0) {
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
        render();
      }
    } catch {
    }
  }
  function openQuickRollModal() {
    if (!chatId) {
      return;
    }
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
          <div class="wc-field">
            <label>Stat</label>
            <select class="wc-select" id="wc-m-stat">${statOpts}</select>
          </div>
          <div class="wc-field">
            <label>Difficulty (DC)</label>
            <select class="wc-select" id="wc-m-dc-preset">${dcOpts}</select>
          </div>
        </div>
        <div class="wc-row-2">
          <div class="wc-field">
            <label>Custom DC</label>
            <input class="wc-input" id="wc-m-dc" type="number" min="1" max="40" value="${rollDraft.dc}" />
          </div>
          <div class="wc-field">
            <label>Gear Bonus (-3 to +3)</label>
            <input class="wc-input" id="wc-m-gear" type="number" min="-3" max="3" value="${autoGear}" />
          </div>
        </div>
        <div class="wc-dim">Rolled using cryptographically unbiased RNG. The exact outcome is automatically injected as a binding result into your next AI reply.</div>
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
    const modal = ctx.ui.showModal({ title: "Edit Character Sheet", width: 440, maxHeight: 580 });
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
        <div class="wc-field"><label>Quest Title</label><input class="wc-input" id="wc-q-title" value="${esc(existing?.title || "")}" placeholder="e.g., Reach the pharmacy before dusk" /></div>
        <div class="wc-row-2">
          <div class="wc-field">
            <label>Type</label>
            <select class="wc-select" id="wc-q-kind">
              <option value="main" ${existing?.kind === "main" ? "selected" : ""}>Main</option>
              <option value="side" ${existing?.kind !== "main" ? "selected" : ""}>Side</option>
            </select>
          </div>
          <div class="wc-field">
            <label>Status</label>
            <select class="wc-select" id="wc-q-status">
              <option value="active" ${!existing || existing.status === "active" ? "selected" : ""}>Active</option>
              <option value="available" ${existing?.status === "available" ? "selected" : ""}>Available</option>
              <option value="done" ${existing?.status === "done" ? "selected" : ""}>Done</option>
              <option value="failed" ${existing?.status === "failed" ? "selected" : ""}>Failed</option>
            </select>
          </div>
        </div>
        <div class="wc-field">
          <label>Objectives (one per line; prefix "[x] " if done)</label>
          <textarea class="wc-textarea" id="wc-q-obs" rows="3" placeholder="Check the side alley
Find antibiotics">${esc(obsText)}</textarea>
        </div>
        <div class="wc-field"><label>Reward (optional)</label><input class="wc-input" id="wc-q-rew" value="${esc(existing?.reward || "")}" placeholder="e.g., +40 XP, Elena's trust" /></div>
        <div class="wc-modal-foot">
          <button class="wc-btn" id="wc-q-cancel">Cancel</button>
          <button class="wc-btn is-primary" id="wc-q-save">Save Quest</button>
        </div>
      </div>
    `;
    modal.root.querySelector("#wc-q-cancel")?.addEventListener("click", () => modal.dismiss());
    modal.root.querySelector("#wc-q-save")?.addEventListener("click", () => {
      const title = modal.root.querySelector("#wc-q-title")?.value.trim();
      if (!title) return;
      const lines = (modal.root.querySelector("#wc-q-obs")?.value || "").split("\n").map((l) => l.trim()).filter(Boolean);
      const objectives = lines.map((line, i) => {
        const done = /^\[x\]\s*/i.test(line);
        return {
          id: existing?.objectives[i]?.id || `ob_${Date.now()}_${i}`,
          text: line.replace(/^\[[x ]\]\s*/i, ""),
          done
        };
      });
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
    const modal = ctx.ui.showModal({ title: "Edit Scene & World State", width: 420 });
    modal.root.innerHTML = `
      <div class="wc-modal">
        <div class="wc-field"><label>Current Location</label><input class="wc-input" id="wc-w-loc" value="${esc(w.location)}" /></div>
        <div class="wc-row-2">
          <div class="wc-field"><label>Time / Timeline</label><input class="wc-input" id="wc-w-time" value="${esc(w.time)}" /></div>
          <div class="wc-field"><label>Day #</label><input class="wc-input" id="wc-w-day" type="number" min="1" value="${w.dayCount}" /></div>
        </div>
        <div class="wc-row-2">
          <div class="wc-field"><label>Weather</label><input class="wc-input" id="wc-w-weather" value="${esc(w.weather)}" /></div>
          <div class="wc-field"><label>Scene Mood</label><input class="wc-input" id="wc-w-mood" value="${esc(w.mood)}" /></div>
        </div>
        <div class="wc-field"><label>World Notes</label><textarea class="wc-textarea" id="wc-w-notes" rows="2">${esc(w.notes)}</textarea></div>
        <div class="wc-modal-foot">
          <button class="wc-btn" id="wc-w-cancel">Cancel</button>
          <button class="wc-btn is-primary" id="wc-w-save">Save World</button>
        </div>
      </div>
    `;
    modal.root.querySelector("#wc-w-cancel")?.addEventListener("click", () => modal.dismiss());
    modal.root.querySelector("#wc-w-save")?.addEventListener("click", () => {
      send("update_world", {
        patch: {
          location: modal.root.querySelector("#wc-w-loc")?.value || "",
          time: modal.root.querySelector("#wc-w-time")?.value || "",
          dayCount: Number(modal.root.querySelector("#wc-w-day")?.value || 1),
          weather: modal.root.querySelector("#wc-w-weather")?.value || "",
          mood: modal.root.querySelector("#wc-w-mood")?.value || "",
          notes: modal.root.querySelector("#wc-w-notes")?.value || ""
        }
      });
      modal.dismiss();
    });
  }
  function openNpcModal(existing) {
    const modal = ctx.ui.showModal({ title: existing ? `Edit NPC \xB7 ${existing.name}` : "Add NPC", width: 420 });
    modal.root.innerHTML = `
      <div class="wc-modal">
        <div class="wc-row-2">
          <div class="wc-field"><label>Name</label><input class="wc-input" id="wc-n-name" value="${esc(existing?.name || "")}" /></div>
          <div class="wc-field"><label>Role</label><input class="wc-input" id="wc-n-role" value="${esc(existing?.role || "")}" placeholder="e.g., Sister, Rival" /></div>
        </div>
        <div class="wc-row-2">
          <div class="wc-field"><label>Attitude</label><input class="wc-input" id="wc-n-att" value="${esc(existing?.attitude || "Wary")}" /></div>
          <div class="wc-field"><label>Relationship (-100..+100)</label><input class="wc-input" id="wc-n-rel" type="number" min="-100" max="100" value="${existing?.relationship ?? 0}" /></div>
        </div>
        <div class="wc-row-2">
          <div class="wc-field"><label>Location</label><input class="wc-input" id="wc-n-loc" value="${esc(existing?.location || data?.world.location || "")}" /></div>
          <label class="wc-toggle-row" style="align-self:end"><span>Present in scene</span><input type="checkbox" id="wc-n-pres" ${existing ? existing.present ? "checked" : "" : "checked"} /></label>
        </div>
        <div class="wc-field"><label>Current Goal</label><input class="wc-input" id="wc-n-goal" value="${esc(existing?.goal || "")}" /></div>
        <div class="wc-field"><label>Hidden Secret (optional)</label><input class="wc-input" id="wc-n-sec" value="${esc(existing?.secret || "")}" /></div>
        <div class="wc-modal-foot">
          <button class="wc-btn" id="wc-n-cancel">Cancel</button>
          <button class="wc-btn is-primary" id="wc-n-save">Save NPC</button>
        </div>
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
          attitude: modal.root.querySelector("#wc-n-att")?.value.trim() || "Wary",
          relationship: Number(modal.root.querySelector("#wc-n-rel")?.value || 0),
          location: modal.root.querySelector("#wc-n-loc")?.value.trim() || "",
          present: modal.root.querySelector("#wc-n-pres")?.checked ?? true,
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
          <div class="wc-modal-foot">
            <button class="wc-btn" id="wc-imp-cancel">Cancel</button>
            <button class="wc-btn is-primary" id="wc-imp-go">Import</button>
          </div>
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
      const modal = ctx.ui.showModal({ title: "Add Plot Thread", width: 380 });
      modal.root.innerHTML = `
        <div class="wc-modal">
          <div class="wc-field"><label>Thread Title</label><input class="wc-input" id="wc-th-t" placeholder="e.g., Radio broadcast from Highway 111" /></div>
          <div class="wc-field"><label>Status</label><select class="wc-select" id="wc-th-st"><option value="active">Active</option><option value="seed">Seed / Rumor</option><option value="resolved">Resolved</option></select></div>
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
  function renderSheetTab(d, cfg) {
    const s = d.sheet;
    const metaBits = [s.race, s.cls, s.subcls, s.rank ? `Rank ${s.rank}` : "", s.title].filter(Boolean).join(" \xB7 ");
    const hpPct = pct(s.hp, s.hpMax);
    const spPct = pct(s.sp, s.spMax);
    const mpPct = pct(s.mp, s.mpMax);
    const xpPct = pct(s.xp, s.xpNext);
    const initBanner = !d.initialized ? `<div class="wc-banner">
           <span>Sheet not initialized for this chat yet.</span>
           <button class="wc-btn is-primary is-xs" data-act="init_ai" ${syncing ? "disabled" : ""}>\u2728 Initialize with AI</button>
         </div>` : "";
    return `
      ${initBanner}
      <div class="wc-card">
        <div class="wc-hero">
          <div>
            <div class="wc-hero-name">${esc(s.name)}</div>
            <div class="wc-hero-meta">${esc(metaBits || "Unclassed \xB7 Tap Edit or Initialize")}</div>
          </div>
          <div class="wc-actions-row">
            <span class="wc-lv-badge">LV ${s.level}</span>
            <button class="wc-btn is-xs" data-act="edit_identity">Edit</button>
          </div>
        </div>

        <div class="wc-pool">
          <div class="wc-pool-top">
            <span class="wc-pool-label">HP</span>
            <div class="wc-actions-row">
              <span class="wc-pool-val">${s.hp} / ${s.hpMax}</span>
              <button class="wc-btn is-xs" data-act="pool" data-pool="hp" data-delta="-5">-5</button>
              <button class="wc-btn is-xs" data-act="pool" data-pool="hp" data-delta="-1">-1</button>
              <button class="wc-btn is-xs" data-act="pool" data-pool="hp" data-delta="1">+1</button>
              <button class="wc-btn is-xs" data-act="pool" data-pool="hp" data-delta="5">+5</button>
            </div>
          </div>
          <div class="wc-bar"><div class="wc-bar-fill is-hp" style="width:${hpPct}%"></div></div>
        </div>

        <div class="wc-pool">
          <div class="wc-pool-top">
            <span class="wc-pool-label">SP</span>
            <div class="wc-actions-row">
              <span class="wc-pool-val">${s.sp} / ${s.spMax}</span>
              <button class="wc-btn is-xs" data-act="pool" data-pool="sp" data-delta="-3">-3</button>
              <button class="wc-btn is-xs" data-act="pool" data-pool="sp" data-delta="3">+3</button>
            </div>
          </div>
          <div class="wc-bar"><div class="wc-bar-fill is-sp" style="width:${spPct}%"></div></div>
        </div>

        ${s.useMp ? `<div class="wc-pool">
                <div class="wc-pool-top">
                  <span class="wc-pool-label">${esc(s.mpLabel)}</span>
                  <div class="wc-actions-row">
                    <span class="wc-pool-val">${s.mp} / ${s.mpMax}</span>
                    <button class="wc-btn is-xs" data-act="pool" data-pool="mp" data-delta="-3">-3</button>
                    <button class="wc-btn is-xs" data-act="pool" data-pool="mp" data-delta="3">+3</button>
                  </div>
                </div>
                <div class="wc-bar"><div class="wc-bar-fill is-mp" style="width:${mpPct}%"></div></div>
              </div>` : ""}

        ${cfg.trackXp ? `<div class="wc-pool">
                <div class="wc-pool-top">
                  <span class="wc-pool-label">XP</span>
                  <div class="wc-actions-row">
                    <span class="wc-pool-val">${s.xp} / ${s.xpNext}</span>
                    <button class="wc-btn is-xs" data-act="add_xp" data-xp="15">+15</button>
                    <button class="wc-btn is-xs" data-act="add_xp" data-xp="50">+50</button>
                  </div>
                </div>
                <div class="wc-bar"><div class="wc-bar-fill is-xp" style="width:${xpPct}%"></div></div>
              </div>` : ""}

        <div class="wc-actions-row" style="justify-content:space-between; padding-top:2px;">
          <div class="wc-actions-row">
            <button class="wc-btn is-xs" data-act="rest" data-kind="short">Short Rest</button>
            <button class="wc-btn is-xs" data-act="rest" data-kind="long">Long Rest</button>
          </div>
          <span class="wc-dim">${esc(s.lastLog || "")}</span>
        </div>
      </div>

      <div class="wc-card">
        <div class="wc-card-head">
          <span class="wc-card-title">Attributes</span>
          ${s.pts > 0 ? `<div class="wc-actions-row">
                   <span class="wc-pill">${s.pts} pt${s.pts === 1 ? "" : "s"} to spend</span>
                   <button class="wc-btn is-primary is-xs" data-act="auto_alloc">Auto</button>
                 </div>` : `<span class="wc-dim">Weft bands (-2..+6)</span>`}
        </div>
        <div class="wc-stats-grid">
          ${STAT_KEYS.map((k) => {
      const v = s.stats[k];
      const mod = statModifier(v);
      return `
              <div class="wc-stat-tile">
                <span class="wc-stat-lbl">${esc(s.statLabels[k])}</span>
                <span class="wc-stat-num">${v}</span>
                <span class="wc-stat-mod">${formatMod(mod)}</span>
                <span class="wc-stat-band">${esc(statBandName(v))}</span>
                ${s.pts > 0 ? `<button class="wc-stat-plus" data-act="alloc" data-stat="${k}">+1</button>` : ""}
              </div>
            `;
    }).join("")}
        </div>
      </div>

      <div class="wc-card">
        <div class="wc-card-head">
          <span class="wc-card-title">Active Effects</span>
          <button class="wc-btn is-xs" data-act="modal_add" data-kind="effect">+ Effect</button>
        </div>
        ${s.effects.length > 0 ? `<div class="wc-chips">${s.effects.map(
      (e) => `<span class="wc-chip ${e.kind === "buff" ? "is-buff" : e.kind === "debuff" ? "is-debuff" : ""}" title="${esc(e.note)}">
                      ${esc(e.name)}${e.duration !== null ? ` (${e.duration}t)` : ""}
                      <button class="wc-chip-x" data-act="rm_effect" data-id="${esc(e.id)}" aria-label="Remove">\xD7</button>
                    </span>`
    ).join("")}</div>` : `<div class="wc-dim">No active conditions or buffs.</div>`}
      </div>

      <div class="wc-card">
        <div class="wc-card-head">
          <span class="wc-card-title">Skills & Traits</span>
          <button class="wc-btn is-xs" data-act="modal_add" data-kind="skill">+ Skill</button>
        </div>
        ${s.skills.length > 0 ? `<div class="wc-chips">${s.skills.map(
      (sk) => `<span class="wc-chip" title="${esc(sk.note)}">
                      ${esc(sk.name)}${sk.cost ? ` \xB7 ${esc(sk.cost)}` : ""}
                      <button class="wc-chip-x" data-act="rm_skill" data-id="${esc(sk.id)}" aria-label="Remove">\xD7</button>
                    </span>`
    ).join("")}</div>` : `<div class="wc-dim">No recorded skills yet.</div>`}
      </div>
    `;
  }
  function renderGearTab(d) {
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
    }).join("")}</div>` : `<div class="wc-dim">No active quests or objectives tracked.</div>`}
      </div>
    `;
  }
  function renderWorldTab(d) {
    const w = d.world;
    return `
      <div class="wc-card">
        <div class="wc-card-head">
          <span class="wc-card-title">Current Scene \xB7 Day ${w.dayCount}</span>
          <button class="wc-btn is-xs" data-act="edit_world">Edit</button>
        </div>
        <div class="wc-item-name">${esc(w.location || "Unknown Location")}</div>
        <div class="wc-muted">${esc([w.time, w.weather, w.mood].filter(Boolean).join(" \xB7 ") || "No scene metadata yet.")}</div>
        ${w.notes ? `<div class="wc-dim">${esc(w.notes)}</div>` : ""}
      </div>

      <div class="wc-card">
        <div class="wc-card-head">
          <span class="wc-card-title">NPCs (${w.npcs.length})</span>
          <button class="wc-btn is-xs is-primary" data-act="add_npc">+ NPC</button>
        </div>
        ${w.npcs.length > 0 ? `<div class="wc-list">${w.npcs.map((n) => {
      const rel = n.relationship;
      const relLeft = rel >= 0 ? 50 : 50 + rel / 2;
      const relWidth = Math.abs(rel) / 2;
      const relColor = rel >= 20 ? "var(--wc-good)" : rel <= -20 ? "var(--wc-bad)" : "var(--wc-warn)";
      return `
                    <div class="wc-item-row" style="flex-direction:column; align-items:stretch; gap:4px;">
                      <div class="wc-card-head">
                        <div class="wc-item-name">
                          <span>${esc(n.name)}</span>
                          <span class="wc-pill ${n.present ? "is-good" : "is-muted"}">${n.present ? "Here" : "Away"}</span>
                          <span class="wc-dim">${esc(n.attitude)} (${rel >= 0 ? "+" : ""}${rel})</span>
                        </div>
                        <div class="wc-actions-row">
                          <button class="wc-btn is-xs" data-act="npc_rel" data-id="${esc(n.id)}" data-delta="-5">-5</button>
                          <button class="wc-btn is-xs" data-act="npc_rel" data-id="${esc(n.id)}" data-delta="5">+5</button>
                          <button class="wc-btn is-xs" data-act="edit_npc" data-id="${esc(n.id)}">Edit</button>
                          <button class="wc-btn is-xs" data-act="rm_npc" data-id="${esc(n.id)}">\xD7</button>
                        </div>
                      </div>
                      <div class="wc-rel-track">
                        <div class="wc-rel-mid"></div>
                        <div class="wc-rel-fill" style="left:${relLeft}%; width:${relWidth}%; background:${relColor};"></div>
                      </div>
                      ${n.role || n.location ? `<div class="wc-dim">${esc([n.role, !n.present ? `@ ${n.location}` : ""].filter(Boolean).join(" \xB7 "))}</div>` : ""}
                      ${n.goal ? `<div class="wc-item-sub">Wants: ${esc(n.goal)}</div>` : ""}
                      ${n.secret ? `<div class="wc-dim">Secret: ${esc(n.secret)}</div>` : ""}
                    </div>
                  `;
    }).join("")}</div>` : `<div class="wc-dim">No NPCs tracked yet. Initialize or sync a turn to detect NPCs automatically.</div>`}
      </div>

      <div class="wc-card">
        <div class="wc-card-head">
          <span class="wc-card-title">Plot Threads</span>
          <button class="wc-btn is-xs is-primary" data-act="modal_add" data-kind="thread">+ Thread</button>
        </div>
        ${w.threads.length > 0 ? `<div class="wc-list">${w.threads.map((t) => {
      const cls = t.status === "resolved" ? "is-good" : t.status === "active" ? "" : "is-muted";
      return `
                    <div class="wc-item-row">
                      <div class="wc-item-main">
                        <div class="wc-item-name">
                          <button class="wc-pill ${cls}" style="cursor:pointer" data-act="cycle_thread" data-id="${esc(t.id)}" title="Click to cycle status">${esc(t.status)}</button>
                          <span>${esc(t.title)}</span>
                        </div>
                        ${t.detail ? `<div class="wc-item-sub">${esc(t.detail)}</div>` : ""}
                      </div>
                      <button class="wc-btn is-xs" data-act="rm_thread" data-id="${esc(t.id)}">\xD7</button>
                    </div>
                  `;
    }).join("")}</div>` : `<div class="wc-dim">No active hooks or mysteries logged.</div>`}
      </div>
    `;
  }
  function renderDiceConfigTab(d, cfg) {
    const pending = d.rolls.filter((r) => !r.consumed);
    const autoGear = computeMaxGearBonus(d.sheet);
    const missingPerms = ["interceptor", "generation", "chats", "characters", "personas"].filter(
      (p) => !permissions[p]
    );
    const snapCount = Object.keys(d.snapshots || {}).length;
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
          <div class="wc-field">
            <label>DC</label>
            <input class="wc-input" id="wc-d-dc" type="number" min="1" max="40" value="${rollDraft.dc}" />
          </div>
          <div class="wc-field">
            <label>Gear</label>
            <input class="wc-input" id="wc-d-gear" type="number" min="-3" max="3" value="${autoGear}" />
          </div>
        </div>
        <div class="wc-actions-row">
          ${DC_PRESETS.slice(1, 5).map((p) => `<button class="wc-btn is-xs" data-act="set_dc" data-dc="${p.dc}">DC ${p.dc}</button>`).join("")}
          <button class="wc-btn is-primary" style="margin-left:auto" data-act="inline_roll">\u{1F3B2} Roll d20</button>
        </div>

        ${d.rolls.length > 0 ? `<div class="wc-list" style="margin-top:4px;">
                ${d.rolls.slice(0, 8).map((r) => {
      const statStr = r.stat === "none" ? "Flat" : `${r.stat.toUpperCase()} ${formatMod(r.statMod)}`;
      const gearStr = r.gearBonus !== 0 ? ` ${formatMod(r.gearBonus)} gear` : "";
      return `
                      <div class="wc-roll-card ${!r.consumed ? "is-pending" : ""}">
                        <div class="wc-roll-top">
                          <strong>${esc(r.action)}</strong>
                          <span class="wc-pill ${verdictPillClass(r.verdict)}">${esc(r.verdict.toUpperCase())}</span>
                        </div>
                        <div class="wc-roll-top wc-roll-math">
                          <span>d20=${r.roll} (${statStr}${gearStr}) = <strong>${r.total}</strong> vs DC ${r.dc}</span>
                          <span>${!r.consumed ? "Queued for next reply" : "Resolved"}</span>
                        </div>
                      </div>
                    `;
    }).join("")}
               </div>
               <div class="wc-actions-row" style="justify-content:flex-end;">
                 <button class="wc-btn is-xs" data-act="clear_rolls">Clear History</button>
               </div>` : `<div class="wc-dim">Rolls use unbiased crypto RNG and automatically bind the AI's next reply.</div>`}
      </div>

      <div class="wc-card">
        <div class="wc-card-head">
          <span class="wc-card-title">Configuration & Sidecar LLM</span>
          <span class="wc-dim">${snapCount} swipe snap${snapCount === 1 ? "" : "s"}</span>
        </div>

        ${missingPerms.length > 0 ? `<div class="wc-banner">
                 <span>Missing permissions: ${esc(missingPerms.join(", "))}</span>
                 <button class="wc-btn is-primary is-xs" data-act="req_perms">Grant</button>
               </div>` : ""}

        <div class="wc-field">
          <label>Sidecar LLM Connection (for Auto-Sync & Init)</label>
          <select class="wc-select" id="wc-cfg-conn">
            <option value="" ${!cfg.sidecarConnectionId ? "selected" : ""}>Use Active Default Connection</option>
            ${connections.map(
      (c) => `<option value="${esc(c.id)}" ${cfg.sidecarConnectionId === c.id ? "selected" : ""}>${esc(c.name)} (${esc(c.provider)} \xB7 ${esc(c.model)})</option>`
    ).join("")}
          </select>
        </div>

        <div class="wc-row-2">
          <div class="wc-field">
            <label>Panel Theme</label>
            <select class="wc-select" id="wc-cfg-theme">
              ${WEFT_THEMES.map(
      (t) => `<option value="${t.id}" ${cfg.theme === t.id ? "selected" : ""}>${esc(t.label)}</option>`
    ).join("")}
            </select>
          </div>
          <div class="wc-field">
            <label>Stat Allocation</label>
            <select class="wc-select" id="wc-cfg-alloc">
              <option value="player" ${cfg.allocMode === "player" ? "selected" : ""}>Player Chooses (+2/lv)</option>
              <option value="auto" ${cfg.allocMode === "auto" ? "selected" : ""}>Auto-Assign</option>
            </select>
          </div>
        </div>

        <label class="wc-toggle-row"><span>Auto-sync state after every AI reply</span><input type="checkbox" data-cfg="autoSync" ${cfg.autoSync ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Inject state into AI prompt</span><input type="checkbox" data-cfg="injectPrompt" ${cfg.injectPrompt ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Include Character Sheet in prompt</span><input type="checkbox" data-cfg="includeSheetInPrompt" ${cfg.includeSheetInPrompt ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Include World & NPCs in prompt</span><input type="checkbox" data-cfg="includeWorldInPrompt" ${cfg.includeWorldInPrompt ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Include Fair Dice Rolls in prompt</span><input type="checkbox" data-cfg="includeRollsInPrompt" ${cfg.includeRollsInPrompt ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Track XP & automatic level-ups</span><input type="checkbox" data-cfg="trackXp" ${cfg.trackXp ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Enable automatically in new chats</span><input type="checkbox" data-cfg="enabledByDefault" ${cfg.enabledByDefault ? "checked" : ""} /></label>

        <div class="wc-actions-row" style="padding-top:4px; justify-content:space-between;">
          <div class="wc-actions-row">
            <button class="wc-btn is-xs" data-act="modal_add" data-kind="export">Export JSON</button>
            <button class="wc-btn is-xs" data-act="modal_add" data-kind="import">Import JSON</button>
          </div>
          <button class="wc-btn is-xs is-danger" data-act="reset_chat">Reset Chat</button>
        </div>
      </div>
    `;
  }
  function render() {
    updateBadge();
    const theme = settings?.theme || "sakura";
    if (!chatId || !data || !settings) {
      drawerTab.root.innerHTML = `
        <div class="wc-root" data-wc-theme="${esc(theme)}">
          <div class="wc-card">
            <div class="wc-card-title">Weft Chronicle</div>
            <div class="wc-muted">Open any chat in Lumiverse to activate your deterministic RPG sheet, world/NPC tracker, and fair d20 roller.</div>
            <button class="wc-btn is-primary" data-act="refresh">Refresh Active Chat</button>
          </div>
        </div>
      `;
      return;
    }
    const pendingRolls = data.rolls.filter((r) => !r.consumed).length;
    const body = activeSubTab === "sheet" ? renderSheetTab(data, settings) : activeSubTab === "gear" ? renderGearTab(data) : activeSubTab === "world" ? renderWorldTab(data) : renderDiceConfigTab(data, settings);
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
            <button class="wc-btn is-xs" data-act="toggle_chat" title="Enable/Pause for this chat">${data.enabled ? "On" : "Off"}</button>
            <button class="wc-btn is-xs is-primary" data-act="sync_now" ${syncing || !data.enabled ? "disabled" : ""}>${syncing ? "\u2026" : "Sync"}</button>
            <button class="wc-btn is-xs" data-act="quick_roll">\u{1F3B2}</button>
          </div>
        </div>

        <div class="wc-tabs">
          <button class="wc-tab ${activeSubTab === "sheet" ? "is-active" : ""}" data-subtab="sheet">Sheet${data.sheet.pts > 0 ? ` <span class="wc-pill">+${data.sheet.pts}</span>` : ""}</button>
          <button class="wc-tab ${activeSubTab === "gear" ? "is-active" : ""}" data-subtab="gear">Gear</button>
          <button class="wc-tab ${activeSubTab === "world" ? "is-active" : ""}" data-subtab="world">World</button>
          <button class="wc-tab ${activeSubTab === "dice" ? "is-active" : ""}" data-subtab="dice">Dice${pendingRolls > 0 ? ` <span class="wc-pill">${pendingRolls}</span>` : ""}</button>
        </div>

        ${body}
      </div>
    `;
  }
  const onClick = async (ev) => {
    const target = ev.target?.closest("[data-act], [data-subtab]");
    if (!target) return;
    const sub = target.dataset.subtab;
    if (sub) {
      activeSubTab = sub;
      render();
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
      case "npc_rel": {
        const npc = data?.world.npcs.find((n) => n.id === target.dataset.id);
        if (!npc) return;
        send("upsert_npc", {
          npc: { ...npc, relationship: npc.relationship + Number(target.dataset.delta || 0) }
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
          (p) => p === "chat_mutation" || !permissions[p]
        );
        try {
          await ctx.permissions.request([...missing], {
            reason: "Weft Chronicle uses these permissions to inject RPG state, sync turns with your sidecar LLM, and read character cards/personas."
          });
          send("bootstrap");
        } catch {
        }
        return;
      }
      case "reset_chat": {
        const res = await ctx.ui.showConfirm({
          title: "Reset Weft Chronicle for this Chat?",
          message: "This clears the character sheet, inventory, NPCs, world state, and roll history for the current chat.",
          variant: "danger",
          confirmLabel: "Reset"
        });
        if (res.confirmed) send("reset_chat");
        return;
      }
    }
  };
  const onChange = (ev) => {
    const el = ev.target;
    if (!el) return;
    if (el.dataset.act === "toggle_obj") {
      send("toggle_objective", { questId: el.dataset.qid, objectiveId: el.dataset.oid });
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
    if (el.id === "wc-cfg-alloc") {
      send("update_settings", { patch: { allocMode: el.value } });
      return;
    }
    if (el.id === "wc-d-action") rollDraft.action = el.value;
    if (el.id === "wc-d-stat") rollDraft.stat = el.value;
    if (el.id === "wc-d-dc") rollDraft.dc = Number(el.value || 15);
    if (el.id === "wc-d-gear") rollDraft.gearBonus = Number(el.value || 0);
  };
  drawerTab.root.addEventListener("click", onClick);
  drawerTab.root.addEventListener("change", onChange);
  cleanups.push(() => {
    drawerTab.root.removeEventListener("click", onClick);
    drawerTab.root.removeEventListener("change", onChange);
  });
  cleanups.push(rollAction.onClick(() => openQuickRollModal()));
  cleanups.push(
    drawerTab.onActivate(() => {
      const active = ctx.getActiveChat().chatId;
      if (active && active !== chatId) {
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
        chatId = msg.chatId;
        data = msg.data;
        settings = msg.settings;
        if (Array.isArray(msg.connections) && msg.connections.length > 0) {
          connections = msg.connections;
        }
        permissions = msg.permissions;
        syncing = msg.syncing;
        statusNote = msg.statusNote || "";
        render();
        void hydrateFrontendConnections();
      }
    })
  );
  cleanups.push(
    ctx.events.on("CHAT_SWITCHED", (payload) => {
      const obj = payload || {};
      const nextId = typeof obj.chatId === "string" ? obj.chatId : typeof obj.id === "string" ? obj.id : ctx.getActiveChat().chatId;
      if (nextId && nextId !== chatId) {
        chatId = nextId;
        send("bootstrap");
      }
    })
  );
  render();
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
