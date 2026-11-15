# Pairing Weft Chronicle with the `Weft_v4_4.json` preset

Weft Chronicle is the **single source of truth** for RPG state: it renders the
System Window, Story Tracker, dice results and CYOA choices itself, tracks
everything in chat storage, and injects a compact `<weft_chronicle_state>` block
into the prompt so the model narrates around the truth. The preset should not
also render its own cards, or you get duplicates.

## What to turn OFF in the preset's Prompt Variables

| Weft preset variable | Set to | Why |
|---|---|---|
| `System window` | **Off** | Extension renders the System Window (stats, pools, XP, notices). |
| `Tracker` | **Off** | Extension renders the Story Tracker (Arc/Phase, NPC Bond/Spark/Heat, thoughts, secrets, threads, timers). |
| `Dice` (`dice_mode: off`) | **Off** | Extension rolls with crypto RNG and binds results into the prompt. |

## What to keep ON in the preset

| Weft preset variable | Why |
|---|---|
| `cyoa: 1` (and `cyoa_count`, etc.) | Only needed if the extension's **Ask the model for a <choices> block** toggle is off (Settings → Inline Cards) — that toggle is ON by default since v2.4.3 and makes Weft request the block itself. If both are on, the model is instructed twice but emits a single block; harmless. |

Display-only preset scripts are optional: the preset's `CYOA · choices`,
`CYOA · auto-asterisk` and `CYOA · action italics` regex scripts duplicate the
extension card. Keep them if you like the inline rendering inside the reply, or
disable them and let the extension's below-reply card be the only one.

NPC Inner Chatter (`chatter_mode`) is independent — keep it as you like it.
Weft Chronicle does not render `<NPC_Inner_Chatter>` blocks.

## The extension-side equivalents

| Preset concept | Extension equivalent |
|---|---|
| `System window` on/off | Settings → Modules → **System Window** (per chat) |
| `Tracker` on/off | Settings → Modules → **Story Tracker** (per chat) |
| `Dice` mode | Settings → Modules → **Fair d20 Dice Roller** (per chat) |
| CYOA display | Settings → Modules → **CYOA Choices** (per chat) |
| `tracker_style` | The tracker card *is* the style; "One card, everyone at once" vs compact rows via **Tracker bars** display settings |
| `system_theme` / `card_theme` | Settings → Themes (10 palettes + Lumiverse Native + per-card System Window color) |
| Bond/Spark/Heat ladders | Identical thresholds (`Stranger…Bonded`, `None…Consumed`, `Calm…Past thinking`) |
| `<timer>` countdowns | Threads with `kind: "timer"` — chips turn red under 2 turns |

## Migrating an existing Weft chat into the extension

1. Install/enable Weft Chronicle; open the chat.
2. Settings → Backup & Reset → **Import JSON…** and paste either:
   - a previous `weft-chronicle` export (`{ format: "weft-chronicle", … }`), or
   - a hand-built object with `{ sheet: {…}, world: {…} }` — everything is
     sanitized and clamped on import, so partial data is fine.
3. Or use **Import from Chat Log…** (Settings → Backup & Reset): the extension
   scans this chat for the last `<Status>`/`<World_State>` blocks — stats and
   their `l=` renames, pools, gear, skills, effects, inventory, cash, quests,
   arc/phase (Weft ladder auto-mapped), PC line, NPCs (on- and off-screen),
   threads, seeds and timers — and seeds the sheet/tracker directly. **No LLM
   call, no tokens**, and it works without turning the preset features off
   first. A forced backup is taken before anything is replaced. The same scan
   doubles as a **Health Check**: it reports how many preset tags are in the
   log and warns you if both renderers are likely active (with the exact
   `System window` / `Tracker` / `Dice` variables to flip).
4. **Export Weft Block** goes the other way: copy the live state as a
   `<Status>`/`<World_State>` block to paste into a preset-driven chat or
   another tool.

## Troubleshooting

- **Duplicate System Windows** — the preset's `System window` variable is still
  ON. Turn it OFF; the extension card is the only one you want.
- **Dice rolled twice** — same for the preset's `Dice` variable.
- **Choices card never appears** — the model did not emit a `<choices>` block:
  the preset's `cyoa` is off AND the extension's **Ask the model for a
  <choices> block** toggle is off (Settings → Inline Cards), or the reply was
  too short and the model skipped it. Note the CYOA instruction exists only
  when the injected state block is active (Settings → AI Connection → Prompt
  injection / lean budget still applies). The ◆ Pick tab tells you when
  there's nothing to show.
- **NPC ignores your stats** — working as intended; the injected block states
  meters are the player's private knowledge. If the model still metagames,
  reinforce in the preset's card/character sheet.
