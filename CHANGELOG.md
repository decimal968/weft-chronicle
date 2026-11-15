# Changelog

All notable changes to Weft Chronicle are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). `spindle.json` is the version source
of truth; `package.json` and this file are kept in lockstep by CI.

## [2.4.1] - 2026-11-15

Hotfix: the host's backend capability scanner rejected v2.4.0 on load
("dangerous process API usage"). Root cause: a test-only `module.exports`
block guarded by `process.env.WEFT_TEST` lived in the shipped bundle so the
node-based test runner could reach the internals. The bundle now contains no
`process` / `module.exports` / CommonJS references at all; unit tests load
the pure internals straight from source via esbuild instead. No behavior
change; identical API surface.

## [2.4.0] - 2026-11-15

The "survival & scene clock" release: two opt-in modules for long-running
stories, plus a handful of correctness fixes. Both modules are off by default;
no existing settings or chat data change unless you turn them on.

### Added

- **Survival module** (opt-in, Settings → Survival & Scene Clock): a **Scavenge**
  d20+WIS roll (vs configurable DC) that finds weighted loot from three built-in
  tables (**Wasteland Salvage**, **Urban Remnants**, **Wilderness Forage**, ~18
  entries each) — or paste your own lines (`weight | name | qty | category |
  rarity`, `#` comments) to extend them or run a fully custom table. An
  **Encounter** button rolls the "who's out there" ladder (nothing → distant
  signs → fresh tracks → ambiguous follower → hard evidence → direct threat →
  ambush). Both rolls are **seeded by chat + IRL date + attempt counter** —
  reproducible, auditable, and bound to the AI's next reply like any check;
  nat 1 scavenges cut you, nat 20 find double. Survival actions live in the
  Dice tab and as quick actions in the roll (⚡) modal.
- **Scene Clock & weather drift** (opt-in): the scene time advances every
  synced turn by a configurable step (default 45 min) and rolls the day count
  at midnight — displayed as **phase words only** ("Day 12 · Evening") in the
  tracker and the prompt block. Optionally, weather drifts one rung per turn
  on a configurable ladder (default Clear→Windy→Overcast→Fog→Rain→Storm→Snow,
  20% chance; off-ladder custom weather text is never touched).

### Changed

- **UI visual pass**: the drawer sub-tab bar no longer wraps — the Settings
  cog sat alone on a full-width row. All tabs are now equal icon+label pills
  on a single scrollable row. Every emoji glyph in the UI was replaced with
  one stroke-based inline-SVG icon set (`icons.ts`): monitor (System), shield
  (Gear), map (Tracker), d20 (Dice), chat bubble (Pick), cog (Settings), gem,
  sparkles, star, crosshair, bag, clock, timer, lock, warning triangle.
  Inline chat cards got the same treatment (notice icons, ${''}lock on
  requirement lines, loot bag, choice arrows). Notice icon tiles are now clean
  tinted circles.
- Thin themed scrollbars inside the drawer/inline cards and tinted text
  selection; previously the host scrollbar rendered as a wide accent bar.
- Drawer dice badge shows the plain pending-roll count (no emoji).

### Fixed

- **Settings enums rejected two values the UI offers** — `systemTheme: blue`
  (Classic System Blue) and `inlinePlacement: footer` (message footer cards)
  were silently dropped on save; the backend now whitelists what the UI emits.
- `normalizeChatData` no longer strips per-row token estimates from the sync
  log on load (spend tracking stays accurate across restarts).
- A garbage number in a settings patch (e.g. `survivalDc: "abc"`) persisted as
  `NaN`; non-finite values are now dropped, keeping stored settings clean.
- `weatherLadder` setting raised to a 320-char cap so a full 12-rung ladder
  survives the trim.
- NPC edit modal no longer interpolates the raw NPC name into the host's
  modal title (angle brackets could leak markup into hosts that render titles
  as HTML); the name stays in the modal body where it is escaped.
- Sync-log token estimates, weather-ladder ladder edges (park in place
  instead of bouncing inward), and the `styles.ts` template-literal crash.

## [2.3.0] - 2026-11-15

The "hardening & hand-off" release: correctness fixes, sidecar reliability,
data safety, and everything needed to migrate off (or export back to) the Weft
preset. No settings or chat data formats were broken; older exports import cleanly.

### Added

- **Weft interop export** (Settings → Backup & Reset → "Export Weft Block"):
  copies the live state as a `<Status>`/`<World_State>` block matching the
  `Weft_v4_4` preset format, with `l="…"` renames for stat labels and MP,
  arc/phase ladder mapping, and thread/seed/timer splitting. Paste anywhere;
  useful for hand-off, preset debugging, or leaving the extension.
- **Notifications UX**: filter chips (All / Level / Quests / Items / Skills /
  Warnings / Changes), grouped duplicate notices with a ×N count badge,
  per-notice dismiss, and Clear All (new `dismiss_notice` RPC).
- **Skills carry a dice bonus** (−2…+10): set at creation, honored by
  quick-roll and the Dice tab, shown on dice cards and the prompt block.
- **Advantage / disadvantage** (2d20, keep high/low) in both roll surfaces.
- **Stat renaming**: the six stats can now be renamed per setting
  (`STR → Grit` style) in the identity editor; flows everywhere including
  quick-roll and the prompt block.
- **Auto-allocate priority**: optional `DEX>CON>STR`-style preference list
  for automatic stat allocation on level-up (`allocPriority` setting).
- **Settings import/export** ("weft-chronicle-settings" JSON) for sharing a
  tuned config between chats or machines.
- **Dice history export** (Markdown table or JSON) and a **Copy Last Roll**
  button that formats the latest roll as plain text for the chat.
- **"Pause sidecar while editing"**: opening any drawer modal holds a 90-second
  edit lease that suppresses the auto-sync sidecar call (manual Sync still
  works; the lease expires on its own, so a host close-button can't wedge it).
- **Import from Chat Log** (Settings → Backup & Reset): deterministic, zero-token
  migration of the last `<Status>`/`<World_State>` in the chat history into the
  extension's sheet/tracker — full parse of stats (with `l=` renames), pools,
  gear, skills, effects, bag, cash, quests/objectives, arc/phase (Weft ladder
  auto-mapped), PC line, NPCs (incl. offscreen), threads/seeds/timers. Includes a
  **Health Check** report (counts of preset tags found + double-render warnings
  with the exact preset variables to flip). A forced backup is taken first.
- **Contested rolls vs NPCs** (quick-roll ⚡ and Dice tab): you vs a present
  NPC, higher total wins (nat 20 always wins, nat 1 always loses; ties go to
  the defender). The foe roll is stored for history but only your roll binds
  the AI's next reply.
- **Real source tree** — bundles are now built from TypeScript sources in
  `src/` (esbuild, version banner stamped from `spindle.json`): `npm run build`
  / `npm run typecheck`; CI rebuilds and fails on any bundle diff. `engine.ts`
  (pools, modifiers, RNG, deltas) is fully typed; other modules carry
  `@ts-nocheck` while types are tightened file-by-file. No runtime behavior
  change — verified by the unchanged 30-test suite + integration harnesses.
- **Sidecar spend tracking** — every auto-sync records an estimated token cost
  (chars ÷ 4, no API cooperation needed): per-chat cumulative counters in
  Recent Syncs, per-row token cost, and a live "prompt block ≈ N tokens"
  readout under Prompt Budget so you can tune Standard vs Lean.
- **Per-chat theme override** (Settings → Theme & Appearance → "This Chat's
  Theme Override") — grimdark survival chats can stay ember while everything
  else stays sakura — plus a new high-contrast theme (pure black cards, #FFF
  text, hard borders, yellow accents) for light-mode and accessibility.
- **Daily quest kind** (`main|side|daily`, matching the preset schema).
- **`daily` timers UX**: countdown chips pulse red under 2 turns; long rests
  now also burn a turn of timed effects.
- **In-repo test suite** (`node --test`, zero dependencies, mock Lumiverse
  host) covering the stat/pool math, verdicts, JSON-delta parsing, import
  sanitizing, and the RPC surface — plus **GitHub Actions CI** (syntax check,
  tests, manifest/README/changelog version consistency).
- `CHANGELOG.md`, MIT `LICENSE`, `docs/preset-pairing.md`.

### Fixed (from the IMPROVEMENTS.md audit)

- **NPC secrets & private thoughts now reach the AI and the sidecar** —
  previously the injected state omitted them entirely, breaking NPC continuity.
- **Import schema validation**: `import_json` now clamps/coerces every field,
  caps arrays, rejects non-objects, strips control chars, and prevents
  stored-XSS via crafted backups. Imported exports (v3 envelope) are validated
  the same way.
- **Swipe undo on the dice-only path**: snapshots now key off the real
  `swipe_id` (looked up from the message) instead of hardcoded 0.
- **`roll_dice` stat is whitelisted** (`STAT_KEYS ∪ {none}`); `who`/`action`/`dc`
  are clamped — a non-string `stat` could previously crash the interceptor.
- Operator-precedence parenthesisation; `makeId` uses `crypto` RNG.
- **Sidecar reliability**: one automatic retry with a corrective prompt,
  `parseJsonDelta` tolerates mid-object fences, trailing commas and raw
  newlines in strings; `syncLog` + `lastSyncError` surfaced in Settings with
  a failure banner and per-entry retry visibility.
- **Sync pacing** (`syncMode: every|every2|manual`), configurable
  `transcriptCap`/`sidecarMaxTokens`, and a lean `promptBudget` mode that
  caps present NPCs, drops the bag and hides zero-heat Spark/Heat lines.
- **HP 0 crossing fires a DOWNED warning + `[CRITICAL]` prompt line**.
- Inline cards now render **as-of-that-turn** snapshots (they no longer show
  future state), and drawer scroll/focus survive re-renders.
- Accessibility: `aria-live` notices, `:focus-visible` rings,
  `prefers-reduced-motion` clamps, icon-only buttons labeled, modal rows
  collapse on narrow screens.
- Advantage/disadvantage now records the **dropped** die honestly
  (`advRoll` semantics) so "kept X, dropped Y" displays truthfully.
### Changed

- XP curve is selectable (`flat` = 100×level, `lifted` = 100×level^1.35).
- Heat bar can be `always` or `charged`-only (≥25) in Settings.
- Inline dice cards can render compact (one line).
- The injected prompt now reminds the narrator that unspent attribute points
  can open training/development beats (no forced agency).

## [2.2.0] - 2026-11-15

- **Tappable CYOA Choices**: the `<choices>` block the Weft preset emits is
  rendered as a Weft-styled "What now?" card — inline in chat and in a ◆ Pick
  drawer tab. Tapping an option sends it as your next reply through the
  composer bridge (`composer-v1`), with one-shot claim semantics that survive
  swipe/delete/fork undo. Clipboard fallback on hosts without the bridge.
- Per-chat Choices module toggle, inline display setting, unclaimed badge.

## [2.0.0] - 2026-11-15

- Initial public release: authentic Weft System Window UI (stat bands, HP/SP/
  MP/XP bars, level-up notices), Story Tracker (Bond/Spark/Heat with the
  preset's stage ladders, Arc/Phase meters, NPC thoughts/secrets/threads),
  Quests, Inventory with roll bonuses, fair crypto-RNG d20 with gear bonuses,
  inline chat cards, sidecar auto-sync with snapshot undo, ten themes.
