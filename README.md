# Weft Chronicle — Lumiverse Spindle Extension

**Weft Chronicle** (`weft_chronicle`) is a full-stack **Lumiverse Spindle** extension that moves Weft's RPG System Sheet, Inventory, Quests, World/NPC State, and Fair d20 Dice Roller out of fragile prompt XML and into a deterministic, swipe-safe native Lumiverse engine.

---

## What It Replaces & Saves

When paired with **`Weft_v4_4.json`** (with Weft's built-in `system_window` and `dice_mode` switched **OFF**):

| Metric | Prompt-Only Weft System | Weft Chronicle Extension |
|---|---|---|
| Per-turn prompt overhead | ~3,500–3,650 tokens | **~250–380 tokens** (injected cleanly via Prompt Interceptor) |
| Stat / HP / SP / XP math | LLM-estimated (can drift) | **100% deterministic TypeScript** (exact Weft formulas) |
| d20 Dice Rolls | LLM-imagined numbers | **Cryptographically unbiased real RNG** (`crypto.getRandomValues`) |
| Swipes, Regens, Deletes, Forks | Risk of double-applying deltas | **Per-`${messageId}:${swipeId}` snapshots** + `CHAT_FORKED` inheritance |
| Editing stats / items / NPCs | Requires OOC prompts | **Instant native Drawer UI** (Sheet, Gear, World, Dice & Config) |
| Model thinking cost on sync | Paid on main RP model | Runs on any **sidecar connection** with `reasoning: off` |

---

## Modules Included

1. **System Sheet + Inventory + Quests**
   - Exact Weft attribute bands (`1–2: -2`, `3–4: -1`, `5–6: 0`, `7–8: +1`, `9–10: +2`, `11–12: +3`, `13–14: +4`, `15–16: +5`, `17+: +6`).
   - Exact Weft pool formulas (`HP = 40 + 3×CON + 4×(lv−1)`, `SP = 14 + 2×CON + (lv−1)`, optional `MP = 14 + 2×INT` with custom label such as `Sanity`).
   - Exact Weft XP curve (`100 × level`), multi-level carry-over, `+2` stat pts/level (player-allocated or auto-assigned), and `+25%` pool recovery on level-up.
   - Equipped Gear slots (`Weapon`, `Armor`, `Accessory`) with rarity roll bonuses (`uncommon/rare +1`, `epic +2`, `legendary/mythic +3`, capped at `+3`), 24-slot Bag, Active Effects with turn countdowns, Skills, and up to 8 Quests with clickable objectives.

2. **World State + NPC Tracker**
   - Tracks current Location, Time, Day #, Weather, Scene Mood, and World Notes.
   - Tracks NPCs (Present vs Offscreen), `-100..+100` visual relationship bar, Attitude, Current Goal, and Hidden Secrets.
   - Tracks Plot Threads (`Active`, `Seed`, `Resolved`) with one-click status cycling.

3. **Fair Real-RNG d20 Dice Roller**
   - Accessible from the **Input Bar Action (`Roll d20`)** or the **Dice & Config** tab.
   - Uses rejection-sampled `crypto.getRandomValues` (zero modulo bias) + your live stat modifier + equipped gear bonus.
   - Exact Weft verdicts: `NAT 20`, `SUCCESS`, `SUCCESS, AT A COST` (`DC − 2 .. DC − 1`), `FAIL`, `NAT 1`.
   - Queued rolls are injected as **binding outcomes** into the very next AI reply and automatically marked resolved once the reply finishes.

---

## Installation in Lumiverse

### Option A — Install Ready-Made `.zip`
1. Download **`weft-chronicle-v1.0.0.zip`** (or zip the `weft-chronicle/` directory containing `spindle.json` and `dist/`).
2. In Lumiverse, go to **Settings → Extensions (Spindle) → Install from Archive / Local**.
3. Upload `weft-chronicle-v1.0.0.zip` and enable **Weft Chronicle**.
4. Grant the requested permissions when prompted (or later via the **Grant** button in the extension's **Dice & Config** tab):
   - `interceptor` — injects the compact `<weft_chronicle_state>` block before generation (visible in Prompt Breakdown).
   - `generation` — runs lightweight sidecar JSON delta extraction (`reasoning: off`) after each reply and lists your Connection Profiles.
   - `chats` / `chat_mutation` — reads recent turns for syncing and handles swipe/delete rewinds.
   - `characters` / `personas` — reads your active character card and persona during one-click **Initialize with AI**.

### Option B — Build from Source
```bash
npm install
npm run typecheck
npm run build
npm test
```

---

## Recommended Setup with `Weft_v4_4.json`

1. In your `Weft_v4_4.json` preset Prompt Variables, turn **`system_window` → `off`** and **`dice_mode` → `off`** (Weft Chronicle handles both deterministically, saving ~3,500 tokens per turn!).
2. Open the **Weft** drawer tab → **Dice & Config**:
   - Pick a fast, inexpensive **Sidecar LLM Connection** (e.g., Gemini Flash, GPT-4o-mini, Claude Haiku, or DeepSeek Chat) — or leave it on **Use Active Default Connection**.
   - Pick your favorite **Panel Theme** (matches all 9 Weft themes + Lumiverse Native in both Dark & Light mode).
3. Start or open a chat and click **✨ Initialize with AI** on the **Sheet** tab (or let it initialize automatically on the first AI reply).

---

## Architecture

```
weft-chronicle/
├── spindle.json          # Spindle manifest & permission declarations
├── dist/
│   ├── backend.js        # Bundled Spindle worker (0 scanner-flagged APIs)
│   └── frontend.js       # Bundled ESM frontend UI module
├── src/
│   ├── types.ts          # Shared TypeScript data & RPC contracts
│   ├── engine.ts         # Pure deterministic Weft math, RNG & prompt builder
│   ├── extractor.ts      # Sidecar init/delta prompts & resilient JSON parser
│   ├── backend.ts        # Spindle worker: storage, snapshots, interceptor, RPC
│   ├── styles.ts         # Scoped CSS (9 Weft themes + Lumiverse, Dark & Light)
│   └── frontend.ts       # Drawer tab UI, Input Bar action & native modals
└── tests/
    └── engine.test.mjs   # Automated unit, integration & scanner verification suite
```
