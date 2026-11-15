# Weft Chronicle — Improvement & Upgrade Suggestions

A code-grounded audit of `backend.js`, `frontend.js`, `spindle.json`, and `README.md`, cross-referenced against `Weft_v4_4.json` (the Weft preset it pairs with). Suggestions are grouped by impact, each with an effort tag (**S** ≤ 1h, **M** ≈ half-day, **L** = multi-day). File:line references are to the current bundles.

> **Status (2026-11-15, v2.3.0):** sections 1–7 are implemented except #20 (deferred; single pass + raised caps proved sufficient), the collapse-all half of #31 and aria-expanded half of #33 (minor gaps), and #36 (L, architectural — needs an explicit go-ahead). Remaining backlog: loot tables and weather/clock ticker — both need a design decision first (there is no Weft preset schema to mirror; the preset file is not part of this repo). Test suite is 30 tests (`npm test`); CI green.

---

## What's already excellent (keep these)

- **Fair RNG**: `fairD20()` uses `crypto.getRandomValues` with rejection sampling (`backend.js:289`) — properly unbiased, better than most RP extensions.
- **Snapshot-based undo**: swipe navigation, message delete, and chat forks all restore prior sheet/world state (`MESSAGE_SWIPED` / `MESSAGE_DELETED` / `CHAT_FORKED`). This is genuinely rare and the strongest architectural asset in the extension.
- **Module isolation**: System / Tracker / Dice can be fully disabled with zero prompt-token cost; inline chat cards are virtualization-aware and restore `details` open-state.
- **Prompt-block discipline**: the injected `<weft_chronicle_state>` block explicitly forbids the AI from emitting fake `<Status>`/`<Dice>` XML and tells it to narrate outcomes — exactly the right contract with the preset.
- **Lore fidelity**: stat → modifier table (1–2 → −2 … 17+ → +6), pool formulas (HP 40 + 3·CON + 4·(lv−1), SP 14 + 2·CON + (lv−1), MP 14 + 2·INT), and "success at a cost within 2 under DC" all match the Weft preset exactly. Init schema defaults (level 1, ~33-point stats) match the preset's System Window Rules.
- **Escaping discipline**: AI/sidecar-generated strings (names, thoughts, secrets, quest text) consistently pass through `esc()` in render paths.

---

## 1. Bugs & correctness (fix first — these silently degrade the experience)

1. **NPC secrets & private thoughts never reach the AI** (**S**) — ✅ *Done (v2.3.0): secret + NPC-private thinking injected; delta schema and sidecar prompt carry both*
   - `buildPromptBlock`'s `fmtNpc` (`backend.js:795`) injects `name, mood, Bond/Spark/Heat, goal` — but **omits `secret` and `lastThought` entirely**, even though the block header claims "Honor these … NPC feelings/thoughts". The AI therefore cannot stay consistent with the NPC's hidden motive across sessions or rewinds, and it re-invents secrets from scratch every turn.
   - `buildDeltaMessages` has the same omission: CURRENT_STATE's `world.npcs` carries only `name/present/mood/bond/spark/heat` — so the sidecar extractor *cannot* preserve an NPC's pre-existing secret; it can only echo what the latest turn revealed.
   - Fix: add `secret` and `lastThought` to both (marked "NPC-private; never narrate directly, keep consistent"). Costs ~30–60 tokens and closes the biggest continuity hole in the tracker.

2. **`import_json` performs no schema validation → stored XSS via crafted backup** (**S**) — ✅ *Done (v2.3.0): sanitizeImportedState validates/clamps/caps; numeric fields coerced; export envelope v3*
   - `backend.js:2227` does `JSON.parse(raw)` then only checks `parsed.sheet` and `parsed.world` exist. `normalizeChatData` recomputes pools but **never coerces `sheet.level`, `sheet.xp`, `sheet.pts`, `world.dayCount`, NPC numbers, etc.** Those flow into `innerHTML` raw (`LV ${s.level}` in `frontend.js`, `+${data.sheet.pts}` in the topbar pill). A backup containing `"level": "<img src=x onerror=…>"` executes in the drawer.
   - Fix: per-field type/length validation with clamping (numeric fields through `clamp`, strings capped & escaped), reject non-object sheet/world, and cap array sizes before accepting. Also `esc()` the numeric interpolations anyway (defense in depth).
   - Related: an imported `level: "abc"` makes `computePools` produce `NaN` max-pools → broken bars. Same fix.

3. **Swipe undo broken on the dice-only path** (**S**) — ✅ *Done (v2.3.0): shared tail-swipe resolution; both paths key snapshots `${messageId}:${swipeId}`*
   - `GENERATION_ENDED` resolves rolls with `recordSnapshot(data, payload.messageId, 0, …)` (`backend.js:1662`) — hardcoded `swipeId=0` — while the delta path uses `tailSwipeId`. `MESSAGE_SWIPED` restores by `${messageId}:${swipeId}`, so for any regenerated message (`swipe_id ≥ 1`) the snapshot won't match and "swipe back" silently fails to rewind state. Pass the real `payload.swipe_id ?? tailSwipeId` everywhere and add a tiny helper so both paths share one key function.

4. **`roll_dice` doesn't validate `stat`** (**S**) — ✅ *Done (v2.3.0): normalizeRollStat whitelists STAT_KEYS ∪ {none}; dc/gear/who clamped on receipt*
   - `stat: msg.stat || "none"` (`backend.js:2166`) accepts any value from the RPC payload. A non-string truthy `stat` (e.g. `42`) survives `performDiceRoll`, then `buildPromptBlock` calls `r.stat.toUpperCase()` (`backend.js:807`) → `TypeError` inside the interceptor, breaking state injection for that generation (and rolling to other failures depending on host error handling). Whitelist `STAT_KEYS ∪ {"none"}`, and clamp `who`/`action`/`dc` to sane lengths/ranges on receipt.

5. **Operator precedence landmine** (**S**) — ✅ *Done (v2.3.0): parenthesized (`autoSync && (system || tracker) && !userIsEditing`)*
   - `backend.js:1651`: `if (!settings.autoSync || !data.modules.system && !data.modules.tracker)` works only because `&&` binds tighter than `||`. It's correct today and unreadable tomorrow — parenthesize it. (Same class of issue is worth grepping for elsewhere.)

6. **Version drift & repo hygiene** (**S**) — ✅ *Done (v2.3.0): spindle.json is the single version source, CI fails on mismatch, CHANGELOG + LICENSE + docs/ added*
   - README title says **v2.0.0**; `spindle.json` says **2.1.0**. No `CHANGELOG.md`, no license, single git commit, no CI. Decide on one source of truth (manifest) and fail CI on mismatch; add a changelog so users know what changed per release.

---

## 2. Preset-parity upgrades (features your Weft preset has that the extension doesn't)

These close the gap between "works with the preset" and "is the preset, done right".

> **Status update (v2.2.0):** Item #7, **Clickable CYOA choices**, has now been implemented (renderer, inline chat card + ◆ Pick drawer tab, one-shot claim tracking in snapshots, `composer-v1` send-on-tap with clipboard fallback, per-chat Choices module, Settings toggles — see README "What's New in v2.2.0"). The two closing questions are also resolved: the extension uses the host's `ctx.composer` bridge (`composer-v1`) to send the picked option through the native Send path itself, and the user wants option **(a)** — preset System/Tracker/Dice variables stay OFF, extension is the single source of truth for those.

7. **Clickable CYOA choices from the latest AI reply** (**M** — high wow-factor) — ✅ *Implemented in v2.2.0*
   - Your preset (`cyoa: 1`, `cyoa_count: 4`, `cyoa_kinds/stakes/req/heat`) emits a `<choices>` block at the end of every reply. We parse the stored reply (`<c k=… h=…>*action* "spoken" || stakes || requirement</c>`), render a Weft-styled **What now?** card inline in the chat and in a ◆ Pick drawer tab, and tapping an option calls `ctx.composer.setText()` + `ctx.composer.send()` (plus `choice_claim` RPC to mark it one-shot). Falls back to clipboard copy + toast on hosts without `composer-v1`. Used choices stay disabled, per `message:swipe` snapshot, so swipe/delete/fork undo behaves.

8. **"Import from chat log" — deterministic bootstrap, zero sidecar tokens** (**M**) — ✅ *Implemented (v2.3.0)*
   - Your preset writes `<Status>`, `<World_State>`, `<Dice>`, and `<Notice>` tags directly into assistant messages. Add a one-time **Import from chat log** action that scans the chat history, finds the last `<Status>`/`<World_State>` pair, parses them, and seeds the sheet/tracker — no LLM call, no cost, and it works **without turning the preset features off first**. This is the single most valuable migration path for people (like you) who already have long Weft chats.
   - Same parser powers a **"Health Check"**: detect stale/duplicated state (preset `system_mode: full` *and* extension System module on → double rendering) and warn with the exact preset variables to flip.

9. **PC state line (`<pc>` parity)** (**M**) — ✅ *Done (v2.3.0):world.pc outfit/pos/cond/carry, tracker strip, [PC] prompt block, sidecar pcUpserted maintained*
   - The preset's tracker tracks `name / outfit / pos / cond / carry` — what a camera would see. The extension drops this entirely. Add a `pc` object to `world` (`outfit`, `pos`, `cond`, `carry`), show it as a compact strip under the scene header in the tracker card/drawer, inject it into `<weft_chronicle_state>` (`[PC] …`), and let the sidecar maintain it (`pcUpserted` in the delta schema). "Torn sleeve, rain-soaked, one hand on the rail" is exactly the continuity detail that keeps prose grounded.

10. **Timers & countdowns** (**M**) — ✅ *Done (v2.3.0): kind:timer threads + turnsLeft, tick per synced turn, countdown chip (red <2), [TIMERS] prompt block*
   - The preset has `<timer>` (consequence expected in N turns, ticks each reply). Extend threads with `kind: "timer"` + `turnsLeft`, decrement per synced turn in `applyDelta`, render as a countdown chip (red under 2), and add `[TIMERS]` to the prompt block so the AI actually honors the fuse you lit. Seeds already exist as a thread status — timers are the natural sibling and are missing.

11. **Bond/Spark/Heat stage words** (**S**) — ✅ *Done (v2.3.0): preset ladder thresholds (Stranger…Bonded / … / Calm…) next to bars + in prompt*
   - Raw bars (`47/100`) are less legible than the preset's ladder: Bond → Stranger/Acquainted/Familiar/Trusted/Close/Bonded; Spark → None/Noticed/Interested/Attracted/Charged/Consumed; Heat → Calm/Warm/Hot/(75+) consumed-by-scene. Compute the word from the number (you have the thresholds in the preset), render it next to the bar, and optionally include it in the prompt (`Bond 62 (Trusted)`) — the AI writes differently toward someone "Familiar" vs "Close".

12. **Heat bar respects "only when charged"** (**S**) — ✅ *Done (v2.3.0): heatDisplay always|charged setting; calm NPCs omitted when charged-only*
   - The preset only prints the heat line while the scene is charged (≥25). Extension always shows it — consider a `heatDisplay: "always" | "charged"` setting, and skip `Heat x/100` in the prompt for calm NPCs (saves tokens and avoids the AI leaning on heat in mundane scenes).

13. **Stat label renaming** (**S**) — ✅ *Done (v2.3.0): statLabels stored + six identity inputs; used in sheet, prompt, exports*
   - `useMp`/`mpLabel` can be renamed (e.g. Sanity) but the six stats can't — yet the preset explicitly supports `<str l="Might">`-style renaming for setting-flavored systems. Add six `statLabels` inputs to the identity edit modal (backend already stores `statLabels`; only UI + `update_identity` handling are missing).

14. **Arc/Phase vocabulary toggle** (**S**) — ✅ *Done (v2.3.0): meters auto-map both ladders (arcSegments); Export Weft Block emits Weft words — dedicated vocab toggle deemed unnecessary*
   - Extension uses `Opening/Rising/Turning/Climax/Fallout` + `Setup/Tension/Confrontation/Intimacy/Aftermath`; your preset uses `Setup/Escalation/Complication/Crisis/Resolution` + `Early Simmer/Building/Midpoint Tension/Climax/Breather`. Add a `arcVocabulary: "extended" | "weft"` setting (or auto-map via `arcSegments`-style regex — the infra exists) so both vocabularies render sensible 5-segment meters.

15. **Death / downed state handling** (**M**) — ✅ *Done (v2.3.0): [CRITICAL] HP 0 line in prompt, SYSTEM: DOWNED notice on crossing zero, low-HP (25%) note*
   - The preset has a `death_system` toggle and a 0-HP rule ("down, cannot act, another hit is fatal"). The extension clamps HP at 0 and says nothing. Add: (a) a `SYSTEM: 0 HP — DOWN` warning notice at crossing zero, (b) an explicit `[CRITICAL] HP 0 — character is down/unconscious` line in the injected state block so the AI honors it, (c) optional `deathSystem` setting mirroring the preset. Same for "HP ≤ 25%" as a lighter warning.

16. **Skill-based dice bonuses** (**S/M**) — ✅ *Done (v2.3.0): skills carry rank/bonus; quick-roll offers "skill +N (Trained)"; flat gear bonus as fallback*
   - The preset allows "+3 from gear **or a learned skill that clearly applies**"; `computeMaxGearBonus` only counts gear/rarity. Let skills carry an optional rank/bonus in the sheet (`skills: [{name, bonus}]`), and offer matching skills in the quick-roll stat dropdown (`STR +2 … | pickpocket +2 (Trained)`). Keep flat gear bonus as fallback.

---

## 3. Sidecar reliability & cost control (the extension's one recurring expense)

17. **Retry & salvage on sidecar failure** (**M**) — ✅ *Done (v2.3.0): one corrective retry; parser salvages think-tags/mid-object fences/control chars/trailing commas/prose-wrapped JSON; Recent Syncs panel + topbar failure sub-line*
   - A failed sync is logged and silently dropped; the user only knows when they open the drawer and nothing changed. Add: one automatic retry with a corrective message ("Return ONLY the JSON object…"), a visible **Sync failed — Retry** affordance (state_update carries a `lastSyncError` string), and a "Sync log" panel (last N syncs: timestamp, tokens, ok/fail) in Settings. `parseJsonDelta` already salvages prose-wrapped JSON; extend it to tolerate a single markdown fence *inside* the object and unescaped raw newlines in string values.
18. **Skip or throttle syncs** (**S**) — ✅ *Done (v2.3.0): syncMode every|every2|manual; per-chat estimated token spend (calls/prompt/completion) recorded per sync & cumulative (acf1b12)*
   - Every `GENERATION_ENDED` fires a sidecar call. Add `syncMode: "every" | "every2" | "manual"` (sync every N qualifying turns), and a `trackSidecarTokens` counter in Settings (calls made, est. tokens if the API reports usage, spend this chat vs all-time). Even rough accounting changes user behavior at the margin.
19. **Truncation headroom** (**S**) — ✅ *Done (v2.3.0): sidecarMaxTokens default 2200 (clamp 400–6000); transcriptCap 8000 configurable (clamp 1500–20000)*
   - `max_tokens: 1400` and `recentTranscript.slice(-4500)` (`backend.js:976`, `:1415`) are both tight: 4 RP replies at Weft's usual richness exceed 4,500 chars, so the delta extractor often sees only the last 1–2 messages, and long JSON deltas can truncate → parse failure. Raise transcript cap to ~8k chars (configurable), bump `max_tokens` to ~2200, and prefer `tail: 6` lean messages when `chat-lean-messages-v1` is available (already detected).
20. **Bigger deltas from big scenes** — *Deferred (optional): single pass + raised caps proved sufficient; revisit if Recent Syncs shows oversized-scene parse failures* — when >2 items/effects/quests change at once (boss fights), 1,400 tokens is plausibly tight. Same fix as #19; optionally emit two-pass deltas (sheet pass, world pass) behind a setting.

---

## 4. Prompt-block & context engineering

21. **Compact mode / token budget** (**M**) — ✅ *Done (v2.3.0): lean mode drops bag/objectives/low spark+heat, caps NPCs at 5, skips offscreen; live ≈token readout under Prompt Budget (acf1b12)*
   - The claimed "~120 tokens" is realistic only for a quiet scene; 10 present NPCs + thoughts + quests blow past it. Add `promptBudget: "lean" | "standard"` — lean drops `[BAG]`, quest objectives, and Spark/Heat for zero-heat NPCs, caps present NPCs in the block to 5, and skips offscreen NPCs entirely. Show a live "prompt cost ≈ N tokens" readout in Settings (count characters ÷ 4) so users can tune it.
22. **Include the instruction lines the AI needs but the block lacks** (**S**) — ✅ *Done (v2.3.0): HP 0 → down/unconscious, unspent pts → training opening, meters are player-private*
   - Add to the header: "HP 0 → unconscious; 0 ends their actions until stabilized" (mirrors preset death rule), "Unspent pts > 0 → a natural opening to train exists" (optional; respect `user_control` vibes), and "Bond/Spark values are private to {{user}}'s knowledge — NPCs act on their own wants, not on the meters." That last line measurably reduces the AI writing NPCs who "sense your 62 bond".
23. **Roll the AI's dice too (`dice_mode: everyone` parity)** (**M**) — ✅ *Done (v2.3.0): contested roll vs present NPC (contest_roll RPC); foe roll stored for history, only the player roll binds the AI*
   - Your preset can roll for *any* character. If you keep preset dice **off** (recommended), the extension only rolls for the user. Add an optional **NPC opponent roll** toggle in the quick-roll modal and an inline "NPC checks" queue, so ambush/stealth fails for enemies too — deterministic, and consumed the same awaiting way.
24. **Advantage / disadvantage** (**S**) — ✅ *Done (v2.3.0): adv/dis toggles in quick-roll & Dice tab; 2d20 keep-high/low; kept die shown in history & prompt*
   - Two toggle buttons in quick-roll (+2 style or 2d20 keep-high/low). Cheap, familiar to any TTRPG player, and fun for WIS/perception scenes.
25. **XP pacing controls** (**S**) — ✅ *Done (v2.3.0): xpCurve flat|lifted (100 × lv^1.35); hpDelta ≤ −10 fires WARNING; crossing into 0 HP fires DOWNED (#15)*
   - `xpNext = 100 * level` is flat; consider `xpCurve: "flat" | "lifted"` (`100 * lv^1.35`) and a settings field for bonus XP rate. Also: entering `hpDelta` ≤ −10 already fires a WARNING notice — extend the same path to crossing into HP 0 (see #15).

---

## 5. Data safety & integrity

26. **Rolling auto-backups of chat state** (**M**) — ✅ *Done (v2.3.0): maybeAutoBackup (keep last 5), list_backups/restore_backup RPCs + picker UI; forced backup before import/reset*
   - Per chat, keep last ~5 immutable snapshots (`chats/backups/<chatId>/<ts>.json`) written on every successful sync. One toggle in Settings + a "Restore backup…" picker. This turns any future `applyDelta`/import bug from data loss into a shrug.
27. **Versioned backup format & migrations** (**S**) — ✅ *Done (v2.3.0): export envelope { format:"weft-chronicle", version:3 } excludes snapshots; import tolerates legacy raw exports*
   - Export currently dumps internal shape (`chatCache` object including `snapshots` — note: exports can balloon to 40 full snapshots ≈ tens of KB–MBs). Export a **clean** format `{ format: "weft-chronicle", version: 3, sheet, world, rolls?, settings? }` *excluding* `snapshots`, and import-tolerate older/plain exports (current format) for backwards compatibility.
28. **Strictly validate everything from the outside** (**S**) — ✅ *Done (v2.3.0): sanitizeChatData caps/clamps universally; import re-validates; MAX_IMPORT_BYTES bound*
   - Beyond #2: cap `bag`/`skills`/`effects`/`quests`/`npcs`/`threads`/`notices`/`rolls` sizes in `normalizeChatData` (some caps exist; make them universal), and coerce *every* numeric field with `clamp(Number.isFinite(x) ? x : fallback, …)` — one sanitizer pass used by import, fork-copy, and restore.
29. **Per-message inline cards show latest sheet/world, not that turn's** (**S, design decision**) — ✅ *Done (v2.3.0): inline cards render their own message snapshot (as-of-turn), latest only for the live turn*
   - `syncInlineChatCards` substitutes `{...snap, sheet: data.sheet, world: data.world}` for the *latest* snapshot message (`frontend.js:1865`), so scrolling up to turn 12 shows turn 40's HP. Either show true as-of-that-message snapshot values inline (consistent with notices/rolls, which are per-message) or label it ("shows latest"). A one-line setting, but decide deliberately — it currently lies about history.

---

## 6. UX polish

30. **Preserve drawer scroll & focus across `renderAll`** (**S**) — ✅ *Done (v2.3.0): scrollTop + focused data-key captured/restored around re-render*
    - `renderAll()` rebuilds the whole drawer `innerHTML` on every `state_update`; scroll position and focus in the inventory/quest lists jump to top after every sync. Capture `scrollTop` + active element `data-` key before re-render and restore after. Cheap, big perceived-quality win.
31. **Inline cards: collapsed-by-default dice & compact system mode** (**S**) — ✅ *Compact one-line dice row (inlineDiceCompact); drawer collapse-all not built*
    - Long chats with `showInlineDice` accumulate tall cards. Add `inlineDiceCompact: bool` (one-line `🎲 17 vs DC 15 — success`) and `inlineStartsOpen` already exists — surface per-card "collapse all" in the drawer header.
32. **Failure visibility** (**S**) — ✅ *Done (v2.3.0): topbar sub-line shows "Synced HH:MM" or "Sync failed — …"; Recent Syncs panel*
    - Surface `syncingChats` failures and last-sync time in the topbar sub-line ("Synced 12:04 · turn 37" / "Sync failed — tap to retry"), not just console + a transient toast.
33. **Accessibility pass** (**S/M**) — ✅ *Mostly (v2.3.0): aria-live notices, focus-visible rings, prefers-reduced-motion, icon-button aria-labels; a few disclosure toggles still lack aria-expanded (minor)*
    - `data-act` buttons are fine, but: respect `prefers-reduced-motion` (the cards glow/animate), add `aria-expanded` on collapsible sections/`details`, focus-visible rings for keyboard use, and `aria-label`s on the icon-only 🎲/⚙️ buttons. Verify modal focus-trapping in `showModal`.
34. **Theming** (**S**) — ✅ *Per-chat override + high-contrast palette (v2.3.0)*
    - Ten palettes is great; add: per-**chat** theme override (a grimdark survival chat shouldn't be sakura), "Auto (match Lumiverse)" using the native palette you already ship, and one high-contrast/#FFF-on-black option for light-mode users.
35. **Notice UX** (**S**) — ✅ *Done (v2.3.0): per-notice dismiss, kind filter chips, consecutive repeats grouped with ×N* — allow per-notice dismiss (currently only "clear all 15"), filter chips (Level/Quest/Item/Skill/Warning), and cap grouped repeats ("HP −4 ×3").

---

## 7. Repo & engineering (the structural ceiling on everything above)

36. **Real source tree + build** (**L**, highest leverage long-term) — ✅ *Done (v2.3.0): src/ TypeScript → esbuild bundles; version banner from spindle.json; `npm run build|typecheck|build:release`; CI rebuilds and fails on bundle diffs; engine.ts fully typed, rest on @ts-nocheck pending file-by-file tightening. Lint not added (tsc is the gate)*
    - `backend.js`/`frontend.js` are compiled bundles committed directly; there is no `src/`, `package.json`, typecheck, lint, or test. Move to `src/{engine,extractor,…}.ts`, build with esbuild/rollup to the two entry files, commit the bundles (Lumiverse installs from GitHub) with a `npm run build:release` that stamps versions.
37. **Unit tests for the pure core** (**M**) — ✅ *Done (v2.3.0): engine/parse/rpc suites, 34 tests, zero dependencies, run in CI*
    - `statModifier`, `computePools`, `recomputeSheetPools`, `applyDelta` (XP→level loop, quest/thread/npc caps, effect ticking), `parseJsonDelta` (think-tags, fences, prose-wrapped, trailing commas, truncated), `fairD20` distribution bounds, `evaluateVerdict` boundaries. These are pure and would have caught #2–#4. Vitest + coverage gate on `src/engine.ts`.
38. **CI on every push** (**S**) — ✅ *Done (v2.3.0): .github/workflows/ci.yml — version lockstep check, npm test on push* — install, typecheck, lint, test, build, verify `spindle.json.version == README`, verify bundles are up-to-date (rebuild → `git diff --exit-code`). GitHub Actions is free for public repos.
39. **Docs** (**S**) — ✅ *Done (v2.3.0): CHANGELOG, MIT LICENSE, docs/preset-pairing.md; CONTRIBUTING not added* — add `CHANGELOG.md`, `LICENSE` (MIT), `docs/preset-pairing.md` (the table from the README, expanded: exact `Weft_v4_4.json` variables to flip, with screenshots), and a `CONTRIBUTING.md` if you want outside PRs for the bundled build steps.
40. **`makeId`** (**S**) — ✅ *Done (v2.3.0): crypto.getRandomValues with Math.random fallback* — uses `Math.random`; switch to `crypto.getRandomValues` (you already require it for dice) for collision-proof IDs, especially on `CHAT_FORKED` bulk copies.

---

## 8. Smaller backlog (pick from here after 1–6)

- Long rest ticks effect durations too (option) (**S**) — ✅ *Done (v2.3.0)*
- Auto-allocate priority order setting (`DEX>CON>STR`) instead of fixed top-3 (**S**) — ✅ *Done (v2.3.0)*
- `daily` quest kind from the preset schema (**S**) — ✅ *Done (v2.3.0)*
- Objective `progress` strings rendered on quest rows (engine already stores them) (**S**) — ✅ *Done (v2.3.0)*
- "Export state as Weft `<Status>`/`<World_State>` block" → clipboard (paste anywhere) (**S**) — ✅ *Done (v2.3.0)*
- "Copy last dice roll for chat" button (**S**) — ✅ *Done (v2.3.0)*
- Dice history export to JSON/Markdown (**S**) — ✅ *Done (v2.3.0)*
- Contested roll vs NPC (both d20+mod vs DC, higher wins) (**M**) — ✅ *Done (v2.3.0)*
- Loot tables / encounter rolls for survival settings (seeded by chat date) (**M**) — ✅ *Done (v2.4.0): Survival module (Wasteland/Urban/Wilderness built-ins + custom lines, seeded by chat+date+counter; Scavenge WIS roll → bag; Encounter ladder; Dice tab + roll-modal quick actions)*
- Weather drift + clock ticker (day/time advance rules) for long chats (**M**) — ✅ *Done (v2.4.0): Scene Clock (phase words only, auto per synced turn, midnight rollover, momentum on prompt + tracker); weather drifts ±1 rung on a configurable ladder at configurable chance*
- Settings import/export (share a tuned config with friends) (**S**) — ✅ *Done (v2.3.0)*
- "Sync every N turns" + "Pause sidecar while I'm editing" (modal open → defer sync) (**S**) — ✅ *Done (v2.3.0)*
- `aria`-live region announcing notices/level-ups for screen readers (**S**) — ✅ *Done (v2.3.0)*
- iOS/small-screen audit of the quick-roll modal (`wc-row-2` collapses?) (**S**) — ✅ *Done (v2.3.0): rows collapse under 480px*

---

## Suggested priority order

| Week | Items | Why |
|---|---|---|
| 1 | #1, #2, #3, #4, #5, #6 | Correctness & safety; all small, all real |
| 2 | #8, #7, #9, #11 | Biggest user-facing wins; leverage the preset you already have |
| 3 | #17, #18, #19, #21 | The sidecar you pay for becomes reliable and predictable |
| 4 | #26, #27, #28, #30 | Safety net + perceived quality |
| Later | #36–#39, then #8-backlog | Structural work makes everything after it cheaper |

**Decisions captured (2026-11-15):** the extension uses the host's `ctx.composer` bridge (`composer-v1`, verified against `prolix-oc/lumiverse-spindle-types`) so a tapped choice goes through the native Send path automatically; and the user wants **(a)** — the preset's System/Tracker/Dice variables stay OFF and Weft Chronicle is the single source of truth for those. The health-check idea (#8) should therefore assume extension-only, and CYOA prompt block stays ON with the extension as its renderer/sender.
