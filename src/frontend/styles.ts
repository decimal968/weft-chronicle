// @ts-nocheck — types are being tightened incrementally; bundling and CI tests do not depend on this flag. Remove file-by-file.
/*! src/frontend/styles.ts */
import { clamp } from "./engine";
export var WEFT_CHRONICLE_CSS = `
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
`
