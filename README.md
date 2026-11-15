# Weft Chronicle v2.0.0

**Weft Chronicle** is a full-stack **Lumiverse Spindle** extension designed specifically for **Weft** presets (such as `Weft_v4_4.json`), bringing **authentic Weft UI** and **100% deterministic RPG + Story Tracker + Fair Dice mechanics** natively into Lumiverse.

---

## ✨ What's New in v2.0.0

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

> Why? Turning them Off in the preset stops the main storytelling AI from burning ~1,500–2,500 prompt/output tokens trying to draw HTML cards and fake math — while Weft Chronicle silently feeds the AI a tiny ~120-token ground-truth snapshot and displays authentic cards in the Drawer and/or inline in chat!

---

## 📦 Installation (GitHub)

1. Push the root files (`spindle.json`, `backend.js`, `frontend.js`, `README.md`) to your GitHub repository.
2. In **Lumiverse → Extensions → Install from GitHub**, enter your repository URL.
3. Grant the requested permissions (`interceptor`, `generation`, `chats`, `chat_mutation`, `characters`, `personas`).
4. Open the **Weft** drawer tab (or `⚙️` Settings tab), optionally choose a fast/cheap **Sidecar LLM Connection**, and tap **✨ Initialize with AI**.
