# Weft Chronicle v2.4.2

**Weft Chronicle** is a full-stack **Lumiverse Spindle** extension designed specifically for **Weft** presets (such as `Weft_v4_4.json`), bringing **authentic Weft UI** and **100% deterministic RPG + Story Tracker + Fair Dice mechanics** natively into Lumiverse.

## ✨ What's New in v2.4.2

- **UI polish after on-device review**: one quick-roll entry point (topbar d20 removed; composer Roll d20 remains), the Settings icon is now a sliders glyph (no longer reads as a sun), and the **Settings tab is collapsible** — sections fold into accordions with only Modules open by default. Tab-button markup cleaned up.

## ✨ Hotfix in v2.4.1

- The host's backend capability scanner rejected v2.4.0 ("dangerous process API usage") — a test-only `process.env.WEFT_TEST` export shim lived in the shipped bundle. Removed; the bundle is now 100% clean of `process`/`module.exports`/CommonJS references. No behavior change.

## ✨ What's New in v2.4.0

- **Survival module** (opt-in, Settings → Survival & Scene Clock) — a **Scavenge** d20+WIS roll (vs your DC) that finds weighted loot from three built-in tables (**Wasteland Salvage**, **Urban Remnants**, **Wilderness Forage**) or your own pasted `weight | name | qty | category | rarity` lines (extend the built-in or run a fully custom table). An **Encounter** button answers "who's out there?" (nothing → ambush). Both quick actions live in the Dice tab **and** in the ⚡ roll modal.
- **Seeded rolls** — survival rolls are derived from `hash(chat + IRL date + attempt#)` with a mulberry32 PRNG, so they're reproducible, auditable, and bind the AI's next reply like any other check. Nat 1 cuts you; nat 20 finds double.
- **Scene Clock & weather drift** (opt-in) — scene time auto-advances per synced turn (configurable, default 45 min) and rolls the day at midnight, shown as **phase words only** ("Day 12 · Evening") in the tracker and prompt block. Optionally, weather drifts one rung per turn on your own configurable ladder (default Clear→Windy→Overcast→Fog→Rain→Storm→Snow, 20% chance); off-ladder custom weather text is never touched.
- **UI pass** — one stroke-based SVG icon set everywhere (no more emoji in the drawer, cards, or notices), a single scrollable icon+label tab bar (the Settings cog no longer wraps onto its own row), thin themed scrollbars, and tinted selection.
- **Fixes**: `systemTheme: blue` and `inlinePlacement: footer` were silently dropped on settings save; sync-log token estimates were stripped on reload; garbage numeric settings persisted `NaN`; NPC name no longer leaks into the modal title.

See [CHANGELOG.md](./CHANGELOG.md) for the full list and [docs/preset-pairing.md](./docs/preset-pairing.md) for migrating an existing Weft chat.

## ✨ What was new in v2.3.0

- **Hardening & hand-off release.** Full audit fixes: import schema validation (no more stored-XSS via crafted backups), swipe undo on the dice-only path, `roll_dice` stat whitelisting, and NPC secrets/thoughts finally reaching the model.
- **Weft interop export** — copy the live state as a `<Status>`/`<World_State>` block (Weft_v4_4 format, `l="…"` renames) to clipboard.
- **Notifications feed** — filter chips, grouped duplicates with ×N badges, per-row dismiss.
- **Skills carry dice bonuses**, **advantage/disadvantage** (2d20 keep-high/low), **renamed stats**, **auto-allocate priority** (`DEX>CON>STR`), **daily quests**, **dice history export** and **Copy Last Roll**, **settings import/export**, and **"pause sidecar while editing"** (opening a modal holds a short lease that suspends auto-sync).
- **Sidecar reliability**: one automatic retry, JSON-salvage parsing, sync pacing (`every`/`every2`/`manual`), lean prompt mode, sync log with failure banner.
- **Import from Chat Log** — scan the history for the preset's `<Status>`/`<World_State>` and migrate them into the extension deterministically (no LLM, no cost), with a **Health Check** that flags double-rendering and tells you which preset variables to flip.
- **Contested rolls vs NPCs** (⚡ and Dice tab) — you vs a present NPC, higher total wins; only your roll binds the AI.
- **Per-chat theme override** + a new **high-contrast** theme (black/#FFF) for light-mode and accessibility.
- **Sidecar spend at a glance** — estimated tokens per sync and per chat, plus a live "prompt block ≈ N tokens" readout next to Prompt Budget.
- **Repo hygiene**: `CHANGELOG.md`, MIT `LICENSE`, `docs/preset-pairing.md`, zero-dependency test suite (`npm test`) and GitHub Actions CI.


---

## ✨ What was new in v2.2.0

- **Tappable CYOA Choices, sent by the extension**: Weft Chronicle now parses the `<choices>` block your preset emits at the end of a reply and renders its own Weft-styled **"What now?"** card — inline in the chat (below the reply, like the System/Tracker/Dice cards) and in a new **◆ Pick** drawer tab. **Tapping an option sends it as your next reply** through Lumiverse's native Send path (composer bridge, `composer-v1`), exactly like the preset's built-in regex buttons. Options carry their kind chip (`DIRECT`, `SOCIAL`, `CAREFUL`, `INVESTIGATE`, `ACTION`, `INTIMATE`, `WILD`), heat dots (`●`/`●●`/`●●●`), stakes line and 🔒 requirement line straight from the AI's attributes.
- **One-shot semantics, done right**: picked options are marked ✓ and cannot be sent twice. Claims are stored per `message:swipe` inside the same snapshots the dice and notifications use — so **swipe/delete/fork undo restores each swipe's claimed state**, and claims survive refresh and chat forks.
- **Never blocks on the sidecar**: the choices card works even with Auto-Sync off, before the first AI init, or if the sidecar call fails — it's parsed deterministically from the message, not by an LLM.
- **Safe fallback**: on hosts without the `composer-v1` bridge, tapping a choice copies it to the clipboard instead of sending (with a toast explaining), so the card is useful everywhere.
- New per-chat **Choices module toggle** (independent, like System/Tracker/Dice), a **Show CYOA Choice cards in chat** setting, drawer badge with unclaimed count, and `◆ Pick` tab with empty states.
- **Choice sending requires the `generation` permission** (already requested) plus the host's `composer-v1` capability. On older hosts the card degrades to copy-to-clipboard.

### Notes vs. the preset's native CYOA rendering

The preset ships its own display regex (`CYOA · choices`) that replaces `<choices>` with a clickable card in the message body. Keeping it ON means both renderers appear (preset card inside the reply, extension card below it). Recommended: **keep the preset prompt block and its "strip from AI context" regex as-is** (the model must keep emitting `<choices>`; don't disable those), and optionally disable the preset's display-only scripts (`CYOA · choices`, `CYOA · auto-asterisk`, `CYOA · action italics`) if you want the extension card to be the only one. All behaviors — send-on-tap, one-shot claims, kinds, heat, stakes, requirement, auto-asterisked actions — are reproduced by the extension card.

---

## ✨ What was new in v2.0.0

- **Authentic Weft System Window UI**: Glowing 8-corner HUD brackets, holographic frame, Level & Rank badges, HP / SP / MP / XP bars, 6 Weft stat bands (`-2` to `+6`), `+1` stat point allocation, and glowing **System Notification** banners (`LEVEL UP`, `ITEM ACQUIRED`, `QUEST UPDATED`, `SKILL UNLOCKED`).
- **Authentic Weft Story Tracker UI**: Dual-accent luminous gradient card, 5-segment **Arc** & **Phase** meters, NPC cards with **Bond / Spark / Heat** bars, Mood pills, italic **Private Thought**, Wants, collapsible **Secret**, Offscreen NPCs, and Open Threads & Seeds.
- **Authentic Circular d20 Dice Cards**: Unbiased `crypto.getRandomValues` rejection-sampled d20 rolls with Weft's glowing circular total ring and automatic binding injection into the AI's next reply.
- **Independent Module Toggles (Per-Chat)**: Turn **System**, **Tracker**, and **Dice** ON or OFF completely independently — disabled modules consume **zero** prompt tokens and skip sidecar work.
- **Optional Inline Cards Inside Chat**: Optionally render collapsible Weft **System Window**, **Story Tracker**, **System Notifications**, and **Dice Result** cards right below AI replies inside the chat stream (toggled independently in Settings, virtualization-safe).
- **Dedicated Settings Tab (`⚙️`) + Native Lumiverse Settings**: Configure themes (all 9 Weft palettes + Lumiverse Native), System Window color (`Follow Theme` / `Classic Blue` / `Gold`), Sidecar LLM connection, modules, inline chat cards, tracker bars, permissions, and JSON backup/reset in one clean place.

---

## 🎛️ Recommended Pairing with `Weft_v4_4.json`

In Lumiverse's **Prompt Variables** for `Weft_v4_4.json`, turn OFF the preset cards that Weft Chronicle handles:

| Weft Preset Variable | Recommended Setting with Weft Chronicle |
|---|---|
| `System window` | **Off** (handled deterministically by Weft Chronicle!) |
| `Tracker` | **Off** (handled by Weft Chronicle Story Tracker!) |
| `Dice` | **Off** (handled by Weft Chronicle real-RNG Dice Roller!) |
| `CYOA` | **ON** (the preset still instructs the model to emit `<choices>` — Weft Chronicle renders and sends the picked option) |

> If you prefer the extension to be the only choice-card renderer, you may also disable the preset's **display-only** regex scripts `CYOA · choices`, `CYOA · auto-asterisk` and `CYOA · action italics`. Do **not** disable the CYOA prompt block or the "Choices (strip from AI context)" prompt regex — the model must keep emitting the block.

> Why? Turning them Off in the preset stops the main storytelling AI from burning ~1,500–2,500 prompt/output tokens trying to draw HTML cards and fake math — while Weft Chronicle silently feeds the AI a tiny ~120-token ground-truth snapshot and displays authentic cards in the Drawer and/or inline in chat!

---

## 📦 Installation (GitHub)

1. Push the root files (`spindle.json`, `backend.js`, `frontend.js`, `README.md`) to your GitHub repository.
2. In **Lumiverse → Extensions → Install from GitHub**, enter your repository URL.
3. Grant the requested permissions (`interceptor`, `generation`, `chats`, `chat_mutation`, `characters`, `personas`).
4. Open the **Weft** drawer tab (or `⚙️` Settings tab), optionally choose a fast/cheap **Sidecar LLM Connection**, and tap **✨ Initialize with AI**.

## 🛠️ Development

The runtime artifacts are bundles built from a real TypeScript source tree — never hand-edit `backend.js` or `frontend.js`:

```
src/
  backend/   engine.ts → sanitize.ts → extractor.ts → choices.ts → backend.ts
  frontend/  engine.ts → cards.ts → styles.ts → frontend.ts
scripts/build.mjs   esbuild bundle + version banner (from spindle.json)
```

| Command | Purpose |
|---|---|
| `npm run build` | Bundle `src/` → `backend.js` (CJS) + `frontend.js` (ESM) |
| `npm run typecheck` | `tsc --noEmit` over `src/` (engine.ts is fully typed; other files carry `@ts-nocheck` while types are tightened file-by-file) |
| `npm test` | Zero-dependency test suite (engine / parse / RPC mock-host, 30 tests) |
| `npm run verify` | Typecheck + build + tests — run before committing |
| `npm run build:release` | Verify everything (banner stamps the version into the bundles) |

CI rebuilds the bundles and fails on any diff, plus: version lockstep (`spindle.json` ↔ `package.json` ↔ README ↔ CHANGELOG) and the test suite on every push. Root-cause a bug in `src/`, rebuild, commit source **and** bundles together.
