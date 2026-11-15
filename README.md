# Weft Chronicle v2.2.0

**Weft Chronicle** is a full-stack **Lumiverse Spindle** extension designed specifically for **Weft** presets (such as `Weft_v4_4.json`), bringing **authentic Weft UI** and **100% deterministic RPG + Story Tracker + Fair Dice mechanics** natively into Lumiverse.

---

## ✨ What's New in v2.2.0

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
