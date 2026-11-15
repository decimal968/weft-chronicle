// @ts-nocheck — types are being tightened incrementally; bundling and CI tests do not depend on this flag. Remove file-by-file.
/*! src/frontend/frontend.ts */
import { bshStage, esc, escXml, escXmlAttr, formatRollForChat, renderChoicesCard, renderDiceCard, renderDiceCardCompact, renderInventoryWindow, renderNoticeCard, renderQuestWindow, renderSystemWindow, renderTrackerCard, resolveSystemTheme } from "./cards";
import { DC_PRESETS, STAT_KEYS, computeMaxGearBonus, formatMod, statModifier } from "./engine";
import { WEFT_CHRONICLE_CSS } from "./styles";
import { icon } from "./icons";
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
  { id: "lumiverse", label: "Lumiverse Native" },
  { id: "contrast", label: "High Contrast (black / #FFF)" }
];
var CREST_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 21 7 21 17 12 22 3 17 3 7 12 2"/><polyline points="3.3 7 12 12 20.7 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>`;
var DICE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z"/><path d="M12 22V12"/><path d="M12 12 3 7"/><path d="M12 12l9-5"/><circle cx="12" cy="7.5" r="0.8" fill="currentColor"/></svg>`;
export function setup(ctx) {
  const cleanups = [];
  ctx.dom.addStyle(WEFT_CHRONICLE_CSS);
  cleanups.push(() => ctx.dom.cleanup());
  // "Pause sidecar while editing": every modal opened through ctx.ui.showModal
  // holds a lease (now + 90s) that suppresses the sidecar auto-sync for this
  // chat. The lease expires on its own, so even if the host's close button
  // bypasses our dismiss wrapper, syncing resumes within a minute and a half.
  let openModalCount = 0;
  const rawShowModal = ctx.ui.showModal ? ctx.ui.showModal.bind(ctx.ui) : null;
  if (rawShowModal) {
    ctx.ui.showModal = (...args) => {
      openModalCount += 1;
      try {
        send("set_editing", { editing: true, until: Date.now() + 90000 });
      } catch {
      }
      const modal = rawShowModal(...args);
      const rawDismiss = modal && typeof modal.dismiss === "function" ? modal.dismiss.bind(modal) : null;
      if (rawDismiss) {
        modal.dismiss = () => {
          openModalCount = Math.max(0, openModalCount - 1);
          try {
            if (openModalCount === 0) send("set_editing", { editing: false });
            else send("set_editing", { editing: true, until: Date.now() + 90000 });
          } catch {
          }
          return rawDismiss();
        };
      }
      return modal;
    };
    cleanups.push(() => {
      ctx.ui.showModal = rawShowModal;
      try {
        send("set_editing", { editing: false });
      } catch {
      }
    });
  }
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
  let promptEstimate = null; // { chars, tokens } — cost of the injected <weft_chronicle_state> block
  const injectedWrappers = /* @__PURE__ */ new Map();
  const rollDraft = {
    action: "",
    stat: "dex",
    dc: 15,
    gearBonus: 0,
    mode: "normal"
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
    keywords: ["weft", "rpg", "status", "system", "tracker", "dice", "d20", "npc", "quests", "settings", "cyoa", "choices"],
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
        keywords: ["weft", "system", "tracker", "dice", "rpg", "sidecar", "theme", "cyoa", "choices"]
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
  async function pickChoice(key, index, sourceBtn) {
    if (!key || !Number.isFinite(index)) return;
    const snap = data?.snapshots?.[key];
    const opt = snap?.choices?.options?.[index];
    if (!opt) return;
    if (Array.isArray(snap.choices.claimed) && snap.choices.claimed.includes(index)) return;
    const text = String(opt.text || "").trim().slice(0, 600);
    if (!text) return;
    const restoreBtn = () => {
      if (sourceBtn) {
        sourceBtn.disabled = false;
        sourceBtn.classList.remove("is-busy");
      }
    };
    if (sourceBtn) {
      sourceBtn.disabled = true;
      sourceBtn.classList.add("is-busy");
    }
    // Preferred path: the composer bridge (composer-v1) — set the option as
    // the draft and hit Send, exactly like the preset's native Send action.
    let outcome = "error";
    try {
      const composer = ctx.composer;
      if (composer && typeof composer.setText === "function" && typeof composer.send === "function") {
        let mounted = true;
        try {
          const state = typeof composer.getState === "function" ? composer.getState() : null;
          if (state && state.mounted === false) mounted = false;
        } catch {
          mounted = true;
        }
        if (mounted) {
          composer.setText(text);
          await composer.send();
          outcome = "sent";
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || "");
      outcome = /busy/i.test(msg) ? "busy" : "error";
    }
    if (outcome === "sent") {
      send("choice_claim", { key, index });
      return;
    }
    if (outcome === "busy") {
      restoreBtn();
      send("choice_feedback", { kind: "busy" });
      return;
    }
    // Fallback (older host without composer-v1, or send failed): copy to the
    // clipboard so the user can paste and press Send themselves.
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        send("choice_claim", { key, index });
        send("choice_feedback", { kind: "copied" });
        restoreBtn();
        return;
      }
    } catch {
    }
    restoreBtn();
    send("choice_feedback", { kind: "error" });
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
      drawerTab.setBadge(String(pendingRolls));
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
    for (const entry of injectedWrappers.values()) {
      try {
        ctx.dom.uninject(entry.wrapper);
      } catch {
      }
    }
    injectedWrappers.clear();
  }
  function findSnapshotForMessage(d, messageId) {
    if (d.lastSyncedKey && d.lastSyncedKey.startsWith(`${messageId}:`)) {
      const activeSnap = d.snapshots[d.lastSyncedKey];
      if (activeSnap) return { snap: activeSnap, key: d.lastSyncedKey };
    }
    const matching = Object.entries(d.snapshots || {}).filter(([, s]) => s && s.messageId === messageId).sort((a, b) => (b[1]?.timestamp || 0) - (a[1]?.timestamp || 0));
    if (matching.length > 0) {
      return { snap: matching[0][1], key: matching[0][0] };
    }
    return null;
  }
  function findLatestChoices(d) {
    if (!d) return null;
    const entries = Object.entries(d.snapshots || {}).filter(([, s]) => s && s.choices && Array.isArray(s.choices.options) && s.choices.options.length > 0);
    if (entries.length === 0) return null;
    entries.sort((a, b) => (b[1]?.timestamp || 0) - (a[1]?.timestamp || 0));
    return { snap: entries[0][1], key: entries[0][0] };
  }
  function isInsideOurInjection(el) {
    return Boolean(el.closest(".wc-inline-wrap"));
  }
  // Hosts keep hidden swipe siblings in the DOM (parked off-canvas or
  // display:none). Injecting into those is what produced the duplicate
  // half-visible cards bleeding off the screen edge.
  function isDisplayedElement(el) {
    if (!el || !el.isConnected) return false;
    try {
      const cs = window.getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.contentVisibility === "hidden") return false;
    } catch {
      return false;
    }
    const rects = el.getClientRects();
    if (!rects || rects.length === 0) return false;
    try {
      const r = rects[0];
      if (r.width === 0 && r.height === 0) return false;
      // Parked off-viewport (swipe tracks translate hidden swipes sideways).
      if (r.right < 0 || r.left > (window.innerWidth || 0)) return false;
    } catch {
    }
    return !el.hasAttribute("hidden") && el.getAttribute("aria-hidden") !== "true";
  }
  // Best-effort read of the host's swipe indicator ("2 / 3") inside the
  // message row. Returns 0-based swipe index, or null when undeterminable.
  function readSwipeIndex(el) {
    if (!el) return null;
    try {
      const candidates = el.querySelectorAll('[class*="swipe" i], [class*="pager" i], [data-swipe-id], [data-swipe]');
      for (const node of candidates) {
        const attr = node.getAttribute("data-swipe-id") || node.getAttribute("data-swipe");
        if (attr !== null && attr !== "") {
          const n = parseInt(attr, 10);
          if (Number.isFinite(n)) return n;
        }
        const t = (node.textContent || "").trim();
        const m = t.match(/^(\d+)\s*\/\s*(\d+)$/);
        if (m) return Math.max(0, parseInt(m[1], 10) - 1);
      }
    } catch {
    }
    return null;
  }
  function readHorizontalPadding(el) {
    if (!el) return null;
    try {
      const cs = window.getComputedStyle(el);
      const pl = parseFloat(cs.paddingLeft) || 0;
      const pr = parseFloat(cs.paddingRight) || 0;
      if (pl >= 6 || pr >= 6) {
        return { left: cs.paddingLeft, right: cs.paddingRight };
      }
    } catch {
    }
    return null;
  }
  function isHorizontalFlex(el) {
    if (!el) return false;
    try {
      const cs = window.getComputedStyle(el);
      return (cs.display === "flex" || cs.display === "inline-flex") && cs.flexDirection.startsWith("row");
    } catch {
      return false;
    }
  }
  function resolveInlineTarget(bubbleEl, placement) {
    if (placement === "below") {
      // Sibling after the message row — full width, outside the bubble's
      // padding/flex internals (inside-injection broke layouts on hosts).
      return { target: bubbleEl, position: "afterend", padX: null, afterIsland: false };
    }
    if (placement === "footer") {
      const bodyAfter2 = bubbleEl.querySelector('[data-spindle-mount="message_body_after"]');
      if (bodyAfter2) {
        const ownPad = readHorizontalPadding(bodyAfter2);
        const sibPad = !ownPad ? readHorizontalPadding(bodyAfter2.previousElementSibling) : null;
        return { target: bodyAfter2, position: "beforeend", padX: sibPad, afterIsland: false };
      }
      const footer = bubbleEl.querySelector(
        '[data-spindle-mount="message_footer"], [data-spindle-mount="message_swipe_indicators"]'
      );
      if (footer && footer.parentElement && bubbleEl.contains(footer.parentElement)) {
        return {
          target: footer,
          position: "beforebegin",
          padX: readHorizontalPadding(footer),
          afterIsland: false
        };
      }
      return { target: bubbleEl, position: "beforeend", padX: null, afterIsland: false };
    }
    const nonInjectedChildrenCount = (parent) => Array.from(parent.children).filter(
      (c) => !c.hasAttribute("data-spindle-injected") && !c.querySelector(".wc-inline-wrap")
    ).length;
    const allDescendants = Array.from(bubbleEl.querySelectorAll("*"));
    const cardsOrIslands = allDescendants.filter(
      (el) => !isInsideOurInjection(el) && !el.closest('[data-spindle-mount="message_footer"], [data-spindle-mount="message_body_after"]') && (Boolean(el.shadowRoot) || el.matches("details.mg"))
    );
    const paragraphs = Array.from(bubbleEl.querySelectorAll("p")).filter(
      (p) => !isInsideOurInjection(p) && !p.closest("details, blockquote, [data-spindle-mount]")
    );
    const lastCard = cardsOrIslands[cardsOrIslands.length - 1] || null;
    const lastP = paragraphs[paragraphs.length - 1] || null;
    if (lastCard && (!lastP || Boolean(lastP.compareDocumentPosition(lastCard) & Node.DOCUMENT_POSITION_FOLLOWING))) {
      let anchor = lastCard;
      while (anchor.parentElement && anchor.parentElement !== bubbleEl && nonInjectedChildrenCount(anchor.parentElement) === 1) {
        try {
          const pcs = window.getComputedStyle(anchor.parentElement);
          if (parseFloat(pcs.borderBottomWidth) > 0) break;
        } catch {
        }
        anchor = anchor.parentElement;
      }
      if (!isHorizontalFlex(anchor.parentElement)) {
        return {
          target: anchor,
          position: "afterend",
          padX: null,
          afterIsland: Boolean(lastCard.shadowRoot)
        };
      }
    }
    const contentSelectors = [
      "[data-message-content]",
      '[data-testid="message-content"]',
      '[data-testid*="message-body"]',
      ".lumiverse-message-content",
      ".message-content",
      ".markdown-body",
      ".prose"
    ];
    for (const sel of contentSelectors) {
      const match = Array.from(bubbleEl.querySelectorAll(sel)).find((el) => !isInsideOurInjection(el));
      if (match && match !== bubbleEl) {
        return { target: match, position: "beforeend", padX: null, afterIsland: false };
      }
    }
    if (lastP && lastP.parentElement && bubbleEl.contains(lastP.parentElement)) {
      const pParent = lastP.parentElement;
      if (pParent !== bubbleEl) {
        return { target: pParent, position: "beforeend", padX: null, afterIsland: false };
      }
      return { target: lastP, position: "afterend", padX: null, afterIsland: false };
    }
    const bodyAfter = bubbleEl.querySelector('[data-spindle-mount="message_body_after"]');
    if (bodyAfter) {
      const ownPad = readHorizontalPadding(bodyAfter);
      const sibPad = !ownPad ? readHorizontalPadding(bodyAfter.previousElementSibling) : null;
      return { target: bodyAfter, position: "beforeend", padX: sibPad, afterIsland: false };
    }
    return { target: bubbleEl, position: "beforeend", padX: null, afterIsland: false };
  }
  function buildInlineHtml(d, cfg, snap, padX, afterIsland, snapKey) {
    const parts = [];
    const sysTh = resolveSystemTheme(cfg);
    if (d.initialized && d.modules.dice && cfg.showInlineDice && Array.isArray(snap.rolls) && snap.rolls.length > 0) {
      for (const r of snap.rolls) {
        parts.push(cfg.inlineDiceCompact ? renderDiceCardCompact(r, cfg.theme) : renderDiceCard(r, cfg.theme));
      }
    }
    if (d.initialized && d.modules.system && cfg.showInlineNotices && Array.isArray(snap.notices) && snap.notices.length > 0) {
      for (const n of snap.notices) {
        parts.push(renderNoticeCard(n, sysTh));
      }
    }
    if (d.initialized && d.modules.system && cfg.showInlineSystem) {
      parts.push(renderSystemWindow(snap.sheet, cfg, { mode: "inline", open: cfg.inlineStartsOpen }));
    }
    if (d.initialized && d.modules.tracker && cfg.showInlineTracker) {
      parts.push(renderTrackerCard(snap.world, cfg, { mode: "inline", open: cfg.inlineStartsOpen }));
    }
    if (d.modules.choices && cfg.showInlineChoices && snap.choices && Array.isArray(snap.choices.options) && snap.choices.options.length > 0) {
      parts.push(renderChoicesCard(snap.choices, cfg.theme, { open: cfg.inlineStartsOpen, snapKey }));
    }
    if (parts.length === 0) return "";
    const extraCls = [
      cfg.inlinePlacement === "below" ? "is-below" : "",
      afterIsland ? "is-after-island" : ""
    ].filter(Boolean).join(" ");
    const padStyle = padX ? ` style="padding-left:${esc(padX.left)};padding-right:${esc(padX.right)};"` : "";
    return `<div class="wc-inline-wrap${extraCls ? " " + extraCls : ""}" data-wc-theme="${esc(cfg.theme)}"${padStyle}>${parts.join("")}</div>`;
  }
  function syncInlineChatCards() {
    const choicesReady = Boolean(
      data && settings && data.enabled && data.modules && data.modules.choices && settings.showInlineChoices &&
        Object.values(data.snapshots || {}).some((s) => s && s.choices && Array.isArray(s.choices.options) && s.choices.options.length > 0)
    );
    if (!data || !settings || !data.enabled || (!data.initialized && !choicesReady)) {
      clearAllInlineCards();
      return;
    }
    const wantAny =
      (data.modules.system && (settings.showInlineSystem || settings.showInlineNotices)) ||
      (data.modules.tracker && settings.showInlineTracker) ||
      (data.modules.dice && settings.showInlineDice) ||
      (data.modules.choices && settings.showInlineChoices);
    if (!wantAny) {
      clearAllInlineCards();
      return;
    }
    const activeIds = /* @__PURE__ */ new Set();
    const placement = settings.inlinePlacement === "below" || settings.inlinePlacement === "footer" ? settings.inlinePlacement : "inside";
    let mounted = [];
    try {
      mounted = ctx.dom.listMessageElements();
    } catch {
      mounted = [];
    }
    // Keep one VISIBLE element per messageId — hidden swipe siblings must not
    // collect their own copy of the cards.
    const visibleById = new Map();
    for (const item of mounted || []) {
      if (!item || !item.element || typeof item.messageId !== "string" || !item.messageId) continue;
      if (!isDisplayedElement(item.element)) continue;
      if (!visibleById.has(item.messageId)) visibleById.set(item.messageId, item);
    }
    mounted = Array.from(visibleById.values());
    // When the visible element exposes its swipe index (pager "2 / 3"), only
    // paint cards for the snapshot recorded for THAT swipe. A regenerated or
    // swiped-to turn keeps the old swipe's id, so the stale cards hiding
    // behind the streaming reply never flash in.
    const dropWrapper = (mid) => {
      const existing = injectedWrappers.get(mid);
      if (existing) {
        try {
          ctx.dom.uninject(existing.wrapper);
        } catch {
        }
        injectedWrappers.delete(mid);
      }
    };
    for (const item of mounted) {
      const found = findSnapshotForMessage(data, item.messageId);
      if (!found) continue;
      const currentSwipe = readSwipeIndex(item.element);
      if (currentSwipe !== null && typeof found.snap?.swipeId === "number" && found.snap.swipeId !== currentSwipe) {
        dropWrapper(item.messageId);
        continue;
      }
      const snap = found.snap;
      const snapKey = found.key;
      // Inline cards show as-of-that-turn state (snapshots are refreshed on
      // every sync and manual edit), so scrolling up never shows future HP.
      const effectiveSnap = snap;
      const resolved = resolveInlineTarget(item.element, placement);
      const inlineCfg = data.themeOverride ? { ...settings, theme: data.themeOverride } : settings;
      const html = buildInlineHtml(data, inlineCfg, effectiveSnap, resolved.padX, resolved.afterIsland, snapKey);
      if (!html) continue;
      activeIds.add(item.messageId);
      const existing = injectedWrappers.get(item.messageId);
      const needsReinject = !existing || !existing.wrapper.isConnected || existing.target !== resolved.target || existing.position !== resolved.position;
      if (existing && !needsReinject) {
        const prevOpenStates = Array.from(existing.wrapper.querySelectorAll("details")).map((el) => el.open);
        existing.wrapper.innerHTML = html;
        const nextDetails = Array.from(existing.wrapper.querySelectorAll("details"));
        nextDetails.forEach((el, idx) => {
          if (typeof prevOpenStates[idx] === "boolean") el.open = prevOpenStates[idx];
        });
      } else {
        if (existing) {
          try {
            ctx.dom.uninject(existing.wrapper);
          } catch {
          }
          injectedWrappers.delete(item.messageId);
        }
        try {
          const wrapper = ctx.dom.inject(resolved.target, html, resolved.position);
          wrapper.addEventListener("click", (ev) => {
            const btn = ev.target?.closest("[data-act]");
            if (!btn) return;
            ev.stopPropagation();
            if (btn.dataset.act === "alloc" && btn.dataset.stat) {
              send("allocate_stat", { stat: btn.dataset.stat, amount: 1 });
            } else if (btn.dataset.act === "auto_alloc") {
              send("auto_allocate");
            } else if (btn.dataset.act === "choice_pick") {
              void pickChoice(btn.dataset.key, Number(btn.dataset.idx), btn);
            }
          });
          injectedWrappers.set(item.messageId, {
            wrapper,
            target: resolved.target,
            position: resolved.position
          });
        } catch {
        }
      }
    }
    for (const [mid] of injectedWrappers.entries()) {
      if (!activeIds.has(mid) && !findSnapshotForMessage(data, mid)) {
        dropWrapper(mid);
      }
    }
  }
  let inlineTimer = null;
  let inlineSettleTimer = null;
  function scheduleInlineSync(delay = 120) {
    if (inlineTimer) clearTimeout(inlineTimer);
    if (inlineSettleTimer) clearTimeout(inlineSettleTimer);
    inlineTimer = setTimeout(() => {
      inlineTimer = null;
      syncInlineChatCards();
      inlineSettleTimer = setTimeout(() => {
        inlineSettleTimer = null;
        syncInlineChatCards();
      }, 420);
    }, delay);
  }
  cleanups.push(() => {
    if (inlineTimer) clearTimeout(inlineTimer);
    if (inlineSettleTimer) clearTimeout(inlineSettleTimer);
    clearAllInlineCards();
  });
  function edgeSegHtml(idPrefix, mode) {
    const attr = (m) => `data-edge="${m}"`;
    const cls = (m) => `wc-seg-btn${mode === m ? " is-active" : ""}`;
    if (idPrefix === "wc-m-edge") {
      return `<div class="wc-seg" id="${idPrefix}">
        <button type="button" class="${cls("normal")}" ${attr("normal")}>Normal</button>
        <button type="button" class="${cls("adv")}" ${attr("adv")}>Advantage</button>
        <button type="button" class="${cls("dis")}" ${attr("dis")}>Disadvantage</button>
      </div>`;
    }
    return `<div class="wc-seg" id="${idPrefix}">
      <button type="button" class="${cls("normal")}" data-act="edge" data-mode="normal">Normal</button>
      <button type="button" class="${cls("adv")}" data-act="edge" data-mode="adv">Advantage</button>
      <button type="button" class="${cls("dis")}" data-act="edge" data-mode="dis">Disadvantage</button>
    </div>`;
  }
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
        ${(sheet?.skills || []).length > 0 ? `<div class="wc-field"><label>Skill (adds its dice bonus)</label><select class="wc-select" id="wc-m-skill"><option value="">— no skill —</option>${(sheet.skills || []).map((sk) => { const b = Number(sk.bonus) || 0; return `<option value="${esc(sk.id)}">${esc(sk.name)} (${b >= 0 ? "+" : ""}${b})</option>`; }).join("")}</select></div>` : ""}
        <div class="wc-field"><label>Edge</label>${edgeSegHtml("wc-m-edge", rollDraft.mode)}</div>
        ${((data?.world?.npcs || []).some((n) => n.present)) ? `<div class="wc-row-2">
          <div class="wc-field"><label>Opponent (contested)</label><select class="wc-select" id="wc-m-opp"><option value="">— none —</option>${(data.world.npcs || []).filter((n) => n.present).map((n) => `<option value="${esc(n.name)}">${esc(n.name)}</option>`).join("")}</select></div>
          <div class="wc-field"><label>Foe Bonus</label><input class="wc-input" id="wc-m-foebonus" type="number" min="-5" max="10" value="3" /></div>
        </div>` : ""}
        ${settings?.survivalEnabled ? `<div class="wc-actions-row" style="margin-top:4px">
          <button class="wc-btn" id="wc-m-scavenge" title="WIS check vs your survival DC — finds go into the bag">${icon("compass", 14)} Scavenge</button>
          <button class="wc-btn" id="wc-m-encounter" title="d20 scan — who's out there?">${icon("eye", 14)} Encounter</button>
        </div>` : ""}
        <div class="wc-dim">Rolled with unbiased crypto RNG. Automatically binds the AI's next reply.</div>
        <div class="wc-modal-foot">
          <button class="wc-btn" id="wc-m-cancel">Cancel</button>
          <button class="wc-btn" id="wc-m-contest" title="Roll you vs the selected NPC (higher total wins)">Contest!</button>
          <button class="wc-btn is-primary" id="wc-m-roll">${icon("d20", 15)} Roll Fair d20</button>
        </div>
      </div>
    `;
    const presetSel = modal.root.querySelector("#wc-m-dc-preset");
    const dcInp = modal.root.querySelector("#wc-m-dc");
    presetSel?.addEventListener("change", () => {
      if (dcInp && presetSel) dcInp.value = presetSel.value;
    });
    modal.root.querySelectorAll("#wc-m-edge [data-edge]").forEach((btn) => {
      btn.addEventListener("click", () => {
        rollDraft.mode = btn.getAttribute("data-edge") || "normal";
        modal.root.querySelectorAll("#wc-m-edge [data-edge]").forEach((b) => b.classList.toggle("is-active", b === btn));
      });
    });
    modal.root.querySelector("#wc-m-cancel")?.addEventListener("click", () => modal.dismiss());
    modal.root.querySelector("#wc-m-scavenge")?.addEventListener("click", () => { send("scavenge_roll"); modal.dismiss(); });
    modal.root.querySelector("#wc-m-encounter")?.addEventListener("click", () => { send("encounter_roll"); modal.dismiss(); });
    const buildPayload = () => {
      const action = modal.root.querySelector("#wc-m-action")?.value.trim() || "Attempt check";
      const stat = modal.root.querySelector("#wc-m-stat")?.value || "none";
      const dc = Number(dcInp?.value || 15);
      const gearBonus = Number(modal.root.querySelector("#wc-m-gear")?.value || 0);
      const skillId = modal.root.querySelector("#wc-m-skill")?.value || "";
      const skill = (sheet?.skills || []).find((sk) => sk.id === skillId);
      const skillBonus = skill ? Number(skill.bonus) || 0 : 0;
      rollDraft.action = action;
      rollDraft.stat = stat;
      rollDraft.dc = dc;
      rollDraft.gearBonus = gearBonus;
      return { action, stat, dc, gearBonus, skillBonus, skillLabel: skill ? skill.name : "", mode: rollDraft.mode };
    };
    modal.root.querySelector("#wc-m-roll")?.addEventListener("click", () => {
      send("roll_dice", buildPayload());
      modal.dismiss();
    });
    modal.root.querySelector("#wc-m-contest")?.addEventListener("click", () => {
      const opponent = modal.root.querySelector("#wc-m-opp")?.value || "";
      if (!opponent) return; // no foe selected — stay open
      const foeBonus = Number(modal.root.querySelector("#wc-m-foebonus")?.value || 3);
      send("contest_roll", { ...buildPayload(), opponent, foeBonus });
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
        <div class="wc-card-title">Stat Names (setting labels)</div>
        <div class="wc-row-3">
          ${STAT_KEYS.map(
      (k) => `<div class="wc-field"><label>${esc(k.toUpperCase())}</label><input class="wc-input" id="wc-lb-${k}" maxlength="24" value="${esc(s.statLabels[k])}" /></div>`
    ).join("")}
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
          mpLabel: val("wc-id-mplbl"),
          statLabels: Object.fromEntries(STAT_KEYS.map((k) => [k, (modal.root.querySelector(`#wc-lb-${k}`)?.value || "").trim().slice(0, 24) || k.toUpperCase()]))
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
  function openItemModal(existing) {
    const modal = ctx.ui.showModal({
      title: existing ? `Inspect / Edit Item` : "Add Item to Inventory",
      width: 400
    });
    const cats = [
      ["misc", "Misc"],
      ["weapon", "Weapon"],
      ["armor", "Armor"],
      ["accessory", "Accessory"],
      ["potion", "Potion / Meds"],
      ["material", "Material / Ammo"],
      ["key", "Key Item"],
      ["book", "Book / Note"],
      ["valuable", "Valuable"]
    ];
    const rars = [
      ["ordinary", "Ordinary (+0)"],
      ["common", "Common (+0)"],
      ["uncommon", "Uncommon (+1)"],
      ["rare", "Rare (+1)"],
      ["epic", "Epic (+2)"],
      ["legendary", "Legendary (+3)"],
      ["mythic", "Mythic (+3)"]
    ];
    const curCat = existing?.category || "misc";
    const curRar = existing?.rarity || "ordinary";
    const canEquip = curCat === "weapon" || curCat === "armor" || curCat === "accessory";
    modal.root.innerHTML = `
      <div class="wc-modal">
        <div class="wc-field"><label>Item Name</label><input class="wc-input" id="wc-it-name" placeholder="e.g., Crowbar, First-Aid Kit, Iron Sword" value="${esc(existing?.name || "")}" /></div>
        <div class="wc-row-2">
          <div class="wc-field">
            <label>Category</label>
            <select class="wc-select" id="wc-it-cat">
              ${cats.map(([v, lbl]) => `<option value="${v}" ${curCat === v ? "selected" : ""}>${lbl}</option>`).join("")}
            </select>
          </div>
          <div class="wc-field">
            <label>Rarity</label>
            <select class="wc-select" id="wc-it-rar">
              ${rars.map(([v, lbl]) => `<option value="${v}" ${curRar === v ? "selected" : ""}>${lbl}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="wc-row-2">
          <div class="wc-field"><label>Quantity</label><input class="wc-input" id="wc-it-qty" type="number" min="1" value="${existing?.qty ?? 1}" /></div>
          <label class="wc-toggle-row" style="align-self:end"><span>${existing ? "Equip now" : "Equip immediately"}</span><input type="checkbox" id="wc-it-eq" ${existing && !canEquip ? "disabled" : ""} /></label>
        </div>
        <div class="wc-field"><label>Note / Effect</label><textarea class="wc-textarea" id="wc-it-note" rows="2" placeholder="Short effect, lore, or condition">${esc(existing?.note || "")}</textarea></div>
        <div class="wc-modal-foot">
          ${existing ? `<button class="wc-btn is-danger" id="wc-it-del" style="margin-right:auto">Remove All</button>` : ""}
          <button class="wc-btn" id="wc-it-cancel">Cancel</button>
          <button class="wc-btn is-primary" id="wc-it-save">${existing ? "Save Item" : "Add Item"}</button>
        </div>
      </div>
    `;
    const catSel = modal.root.querySelector("#wc-it-cat");
    const eqCb = modal.root.querySelector("#wc-it-eq");
    catSel?.addEventListener("change", () => {
      if (!eqCb) return;
      const v = catSel.value;
      const eq = v === "weapon" || v === "armor" || v === "accessory";
      eqCb.disabled = !eq;
      if (!eq) eqCb.checked = false;
    });
    modal.root.querySelector("#wc-it-del")?.addEventListener("click", () => {
      if (existing) send("remove_item", { id: existing.id, qty: existing.qty });
      modal.dismiss();
    });
    modal.root.querySelector("#wc-it-cancel")?.addEventListener("click", () => modal.dismiss());
    modal.root.querySelector("#wc-it-save")?.addEventListener("click", () => {
      const name = modal.root.querySelector("#wc-it-name")?.value.trim();
      if (!name) return;
      const payload = {
        id: existing?.id,
        name,
        category: modal.root.querySelector("#wc-it-cat")?.value,
        rarity: modal.root.querySelector("#wc-it-rar")?.value,
        qty: Number(modal.root.querySelector("#wc-it-qty")?.value || 1),
        note: modal.root.querySelector("#wc-it-note")?.value.trim() || "",
        equip: modal.root.querySelector("#wc-it-eq")?.checked ?? false
      };
      send(existing ? "update_item" : "add_item", { item: payload });
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
          <div class="wc-field"><label>Type</label><select class="wc-select" id="wc-q-kind"><option value="main" ${existing?.kind === "main" ? "selected" : ""}>Main</option><option value="side" ${existing?.kind === "side" || !existing ? "selected" : ""}>Side</option><option value="daily" ${existing?.kind === "daily" ? "selected" : ""}>Daily</option></select></div>
          <div class="wc-field"><label>Status</label><select class="wc-select" id="wc-q-status"><option value="active" ${!existing || existing.status === "active" ? "selected" : ""}>Active</option><option value="available" ${existing?.status === "available" ? "selected" : ""}>Available</option><option value="done" ${existing?.status === "done" ? "selected" : ""}>Done</option><option value="failed" ${existing?.status === "failed" ? "selected" : ""}>Failed</option></select></div>
        </div>
        <div class="wc-field"><label>Objectives (one per line; prefix "[x] " if done)</label><textarea class="wc-textarea" id="wc-q-obs" rows="3">${esc(obsText)}</textarea></div>
        <div class="wc-row-2">
          <div class="wc-field"><label>Reward (optional)</label><input class="wc-input" id="wc-q-rew" value="${esc(existing?.reward || "")}" /></div>
          <div class="wc-field"><label>Warning / Penalty</label><input class="wc-input" id="wc-q-pen" value="${esc(existing?.penalty || "")}" /></div>
        </div>
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
          reward: modal.root.querySelector("#wc-q-rew")?.value.trim() || "",
          penalty: modal.root.querySelector("#wc-q-pen")?.value.trim() || ""
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
          ${settings?.clockEnabled
            ? `<div class="wc-field"><label>Time (managed by Scene Clock)</label><input class="wc-input" id="wc-w-time" value="${esc(w.time)}" disabled title="Disable Scene Clock in Settings to edit time freely." /></div>`
            : `<div class="wc-field"><label>Time / Timeline</label><input class="wc-input" id="wc-w-time" value="${esc(w.time)}" /></div>`}
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
        <div class="wc-row-2">
          <div class="wc-field"><label>PC Outfit</label><input class="wc-input" id="wc-w-pc-outfit" value="${esc(w.pc?.outfit || "")}" placeholder="Rain-soaked coat" /></div>
          <div class="wc-field"><label>PC Position</label><input class="wc-input" id="wc-w-pc-pos" value="${esc(w.pc?.pos || "")}" placeholder="On the rail, hand on the brass key" /></div>
        </div>
        <div class="wc-row-2">
          <div class="wc-field"><label>PC Condition</label><input class="wc-input" id="wc-w-pc-cond" value="${esc(w.pc?.cond || "")}" placeholder="Exhausted, left side numb" /></div>
          <div class="wc-field"><label>PC Carrying</label><input class="wc-input" id="wc-w-pc-carry" value="${esc(w.pc?.carry || "")}" placeholder="Brass key, revolver, locket" /></div>
        </div>
        <div class="wc-modal-foot"><button class="wc-btn" id="wc-w-cancel">Cancel</button><button class="wc-btn is-primary" id="wc-w-save">Save</button></div>
      </div>
    `;
    modal.root.querySelector("#wc-w-cancel")?.addEventListener("click", () => modal.dismiss());
    modal.root.querySelector("#wc-w-save")?.addEventListener("click", () => {
      send("update_world", {
        patch: {
          location: modal.root.querySelector("#wc-w-loc")?.value || "",
          ...(settings?.clockEnabled ? {} : { time: modal.root.querySelector("#wc-w-time")?.value || "" }),
          dayCount: Number(modal.root.querySelector("#wc-w-day")?.value || 1),
          arc: modal.root.querySelector("#wc-w-arc")?.value || "",
          phase: modal.root.querySelector("#wc-w-phase")?.value || "",
          weather: modal.root.querySelector("#wc-w-weather")?.value || "",
          mood: modal.root.querySelector("#wc-w-mood")?.value || "",
          notes: modal.root.querySelector("#wc-w-notes")?.value || "",
          pc: {
            outfit: modal.root.querySelector("#wc-w-pc-outfit")?.value || "",
            pos: modal.root.querySelector("#wc-w-pc-pos")?.value || "",
            cond: modal.root.querySelector("#wc-w-pc-cond")?.value || "",
            carry: modal.root.querySelector("#wc-w-pc-carry")?.value || ""
          }
        }
      });
      modal.dismiss();
    });
  }
  function openBackupModal(list) {
    const modal = ctx.ui.showModal({ title: "Automatic Backups (This Chat)", width: 460 });
    const rows = (Array.isArray(list) ? list : []).map((b) => {
      const ts = b && Number.isFinite(b.ts) ? b.ts : 0;
      const label = ts ? new Date(ts).toLocaleString() : "Unknown backup";
      return `
        <div class="wc-synclog-row is-ok" style="justify-content:space-between;gap:12px">
          <span>${esc(label)}</span>
          <button class="wc-btn is-xs" data-act="restore_backup" data-path="${esc(b.path)}">Restore</button>
        </div>`;
    }).join("");
    modal.root.innerHTML = `
      <div class="wc-modal">
        <div class="wc-muted" style="margin-bottom:6px">Last ${list?.length || 0} automatic backups (one per minute, newest first). Restoring replaces this chat's sheet, tracker and dice history.</div>
        <div class="wc-synclog">${rows || '<div class="wc-dim">No backups yet — they are written as state syncs.</div>'}</div>
        <div class="wc-modal-foot"><button class="wc-btn" id="wc-bk-close">Close</button></div>
      </div>
    `;
    modal.root.querySelector("#wc-bk-close")?.addEventListener("click", () => modal.dismiss());
    modal.root.addEventListener("click", (ev) => {
      const btn = ev.target.closest('[data-act="restore_backup"]');
      if (!btn) return;
      const path = btn.getAttribute("data-path") || "";
      if (!path) return;
      send("restore_backup", { path });
      modal.dismiss();
    });
  }
  function openNpcModal(existing) {
    const modal = ctx.ui.showModal({ title: "Edit NPC", width: 430, maxHeight: 580 });
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
  function openChatLogModal(report) {
    const counts = [
      ["<Status>", report.status],
      ["<World_State>", report.world],
      ["<Dice>", report.dice],
      ["<choices>", report.choices]
    ].filter(([, n]) => n > 0);
    const warnings = Array.isArray(report.warnings) ? report.warnings : [];
    const modal = ctx.ui.showModal({ title: "Import from Chat Log", width: 480 });
    modal.root.innerHTML = `
      <div class="wc-modal">
        ${counts.length > 0 ? `<div class="wc-field"><label>Found in this chat's history</label>
          <div class="wc-actions-row" style="flex-wrap:wrap">${counts.map(([tag, n]) => `<span class="wc-chip is-active">${esc(tag)} × ${n}</span>`).join("")}</div>
        </div>` : `<div class="wc-dim">No preset state blocks found in this chat's history.</div>`}
        ${report.latestName || report.latestLevel ? `<div class="wc-dim">Latest snapshot: ${report.latestName ? esc(report.latestName) : "?"}${report.latestLevel ? ` · Lv ${report.latestLevel}` : ""}</div>` : ""}
        ${warnings.length > 0 ? `<div class="wc-field"><label>Health check</label>${warnings.map((w) => `<div class="wc-banner" style="margin-bottom:6px"><span>${esc(w)}</span></div>`).join("")}</div>` : `<div class="wc-dim">No double-rendering detected — the preset appears to be configured cleanly.</div>`}
        <div class="wc-dim">Importing replaces the extension's current sheet/world for this chat with the last <code>&lt;Status&gt;</code> / <code>&lt;World_State&gt;</code> in the log. A forced backup is taken first. Rolls and notices are kept.</div>
        <div class="wc-modal-foot">
          <button class="wc-btn" id="wc-clr-cancel">Close</button>
          ${report.canImport ? `<button class="wc-btn is-primary" id="wc-clr-import">Import &amp; Replace Chat State</button>` : ""}
        </div>
      </div>
    `;
    modal.root.querySelector("#wc-clr-cancel")?.addEventListener("click", () => modal.dismiss());
    modal.root.querySelector("#wc-clr-import")?.addEventListener("click", () => {
      send("import_chatlog");
      modal.dismiss();
    });
  }
  function openSimpleAddModal(kind) {
    if (kind === "export" && data) {
      const modal = ctx.ui.showModal({ title: "Export Weft Chronicle JSON", width: 460 });
      const json = JSON.stringify({ format: "weft-chronicle", version: 3, exportedAt: new Date().toISOString(), sheet: data.sheet, world: data.world, rolls: data.rolls }, null, 2);
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
    if (kind === "export_rolls" && data) {
      const modal = ctx.ui.showModal({ title: "Export Roll History", width: 520 });
      const rolls = Array.isArray(data.rolls) ? data.rolls : [];
      const mdCell = (v) => String(v ?? "").replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim();
      const toMarkdown = () => [
        "| When | Who | Action | d20 | Mods | DC | Total | Verdict |",
        "|---|---|---|---|---|---|---|---|",
        ...rolls.map((r) => {
          const mods = [r.stat === "none" ? "flat" : `${String(r.stat).toUpperCase()} ${formatMod(r.statMod)}`,
            r.gearBonus !== 0 ? `gear ${formatMod(r.gearBonus)}` : null,
            r.skillLabel ? `${r.skillLabel} ${formatMod(r.skillBonus)}` : null].filter(Boolean).join(" ");
          const edge = r.mode === "adv" ? " ADV" : r.mode === "dis" ? " DIS" : "";
          const when = new Date(r.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
          return ["", when, r.who, r.action, `${r.roll}${edge}`, mods, r.dc, r.total, String(r.verdict).toUpperCase(), ""].map(mdCell).join("|");
        })
      ].join("\n");
      const toJson = () => JSON.stringify({ format: "weft-chronicle-rolls", version: 1, exportedAt: new Date().toISOString(), rolls }, null, 2);
      modal.root.innerHTML = `
        <div class="wc-modal">
          <div class="wc-field"><label>Format</label>
            <div class="wc-actions-row">
              <button class="wc-btn is-xs" data-fmt="md">Markdown</button>
              <button class="wc-btn is-xs" data-fmt="json">JSON</button>
            </div>
          </div>
          <textarea class="wc-textarea" id="wc-expr" rows="12" readonly></textarea>
          <div class="wc-modal-foot">
            <button class="wc-btn is-primary" id="wc-expr-copy">Copy</button>
            <button class="wc-btn" id="wc-expr-close">Close</button>
          </div>
        </div>
      `;
      const area = modal.root.querySelector("#wc-expr");
      const setFmt = (fmt) => { area.value = fmt === "json" ? toJson() : toMarkdown(); };
      modal.root.querySelectorAll("[data-fmt]").forEach((btn) => btn.addEventListener("click", () => setFmt(btn.dataset.fmt)));
      setFmt("md");
      modal.root.querySelector("#wc-expr-copy")?.addEventListener("click", () => {
        area.select();
        navigator.clipboard?.writeText(area.value).catch(() => {
        });
      });
      modal.root.querySelector("#wc-expr-close")?.addEventListener("click", () => modal.dismiss());
      return;
    }
    if (kind === "export_settings" && settings) {
      const modal = ctx.ui.showModal({ title: "Export Settings", width: 460 });
      const json = JSON.stringify({ format: "weft-chronicle-settings", version: 1, exportedAt: new Date().toISOString(), settings }, null, 2);
      modal.root.innerHTML = `
        <div class="wc-modal">
          <textarea class="wc-textarea" id="wc-exs" rows="12" readonly>${esc(json)}</textarea>
          <div class="wc-modal-foot">
            <button class="wc-btn is-primary" id="wc-exs-copy">Copy JSON</button>
            <button class="wc-btn" id="wc-exs-close">Close</button>
          </div>
        </div>
      `;
      modal.root.querySelector("#wc-exs-copy")?.addEventListener("click", () => {
        const ta = modal.root.querySelector("#wc-exs");
        ta?.select();
        navigator.clipboard?.writeText(json).catch(() => {
        });
      });
      modal.root.querySelector("#wc-exs-close")?.addEventListener("click", () => modal.dismiss());
      return;
    }
    if (kind === "import_settings") {
      const modal = ctx.ui.showModal({ title: "Import Settings", width: 460 });
      modal.root.innerHTML = `
        <div class="wc-modal">
          <div class="wc-field"><label>Paste an exported settings JSON</label><textarea class="wc-textarea" id="wc-ims" rows="10" placeholder='{"format":"weft-chronicle-settings","settings":{...}}'></textarea></div>
          <div class="wc-modal-foot"><button class="wc-btn" id="wc-ims-cancel">Cancel</button><button class="wc-btn is-primary" id="wc-ims-go">Import</button></div>
        </div>
      `;
      modal.root.querySelector("#wc-ims-cancel")?.addEventListener("click", () => modal.dismiss());
      modal.root.querySelector("#wc-ims-go")?.addEventListener("click", () => {
        const raw = modal.root.querySelector("#wc-ims")?.value || "";
        try {
          const parsed = JSON.parse(raw);
          const patch = parsed && typeof parsed === "object" && parsed.settings && typeof parsed.settings === "object" ? parsed.settings : parsed;
          if (patch && typeof patch === "object" && !Array.isArray(patch)) send("update_settings", { patch });
        } catch {
        }
        modal.dismiss();
      });
      return;
    }
    if (kind === "export_weft" && data) {
      const modal = ctx.ui.showModal({ title: "Export Weft <Status>/<World_State>", width: 520 });
      const block = renderWeftBlock(data);
      modal.root.innerHTML = `
        <div class="wc-modal">
          <div class="wc-field"><label>Paste into chat as a user message, or into a preset for hand-editing</label>
            <textarea class="wc-textarea" id="wc-expw" rows="12" readonly>${esc(block)}</textarea>
          </div>
          <div class="wc-modal-foot">
            <button class="wc-btn is-primary" id="wc-expw-copy">Copy Block</button>
            <button class="wc-btn" id="wc-expw-close">Close</button>
          </div>
        </div>
      `;
      modal.root.querySelector("#wc-expw-copy")?.addEventListener("click", () => {
        modal.root.querySelector("#wc-expw")?.select();
        navigator.clipboard?.writeText(block).catch(() => {
        });
      });
      modal.root.querySelector("#wc-expw-close")?.addEventListener("click", () => modal.dismiss());
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
          <div class="wc-field"><label>Dice Bonus (optional)</label><input class="wc-input" id="wc-sk-bonus" type="number" min="-2" max="10" placeholder="e.g., 2 — applies when rolling a relevant check" /></div>
          <div class="wc-modal-foot"><button class="wc-btn" id="wc-sk-c">Cancel</button><button class="wc-btn is-primary" id="wc-sk-s">Add</button></div>
        </div>
      `;
      modal.root.querySelector("#wc-sk-c")?.addEventListener("click", () => modal.dismiss());
      modal.root.querySelector("#wc-sk-s")?.addEventListener("click", () => {
        const name = modal.root.querySelector("#wc-sk-name")?.value.trim();
        if (!name) return;
        const bonus = Number(modal.root.querySelector("#wc-sk-bonus")?.value || 0);
        send("add_skill", {
          skill: {
            name,
            cost: modal.root.querySelector("#wc-sk-cost")?.value.trim() || "",
            note: modal.root.querySelector("#wc-sk-note")?.value.trim() || "",
            bonus: Number.isFinite(bonus) ? Math.min(10, Math.max(-2, Math.floor(bonus))) : 0
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
          <div class="wc-field"><label>Kind</label><select class="wc-select" id="wc-th-st"><option value="active">Open Thread</option><option value="seed">Seed</option><option value="timer">Countdown Timer</option><option value="resolved">Resolved</option></select></div>
          <div class="wc-field" id="wc-th-turns-wrap" style="display:none"><label>Turns until it lands</label><input class="wc-input" id="wc-th-turns" type="number" min="1" max="99" value="3" /></div>
          <div class="wc-field"><label>Detail</label><textarea class="wc-textarea" id="wc-th-d" rows="2"></textarea></div>
          <div class="wc-modal-foot"><button class="wc-btn" id="wc-th-c">Cancel</button><button class="wc-btn is-primary" id="wc-th-s">Add</button></div>
        </div>
      `;
      const kindSel = modal.root.querySelector("#wc-th-st");
      const turnsWrap = modal.root.querySelector("#wc-th-turns-wrap");
      kindSel?.addEventListener("change", () => {
        if (turnsWrap) turnsWrap.style.display = kindSel.value === "timer" ? "" : "none";
      });
      modal.root.querySelector("#wc-th-c")?.addEventListener("click", () => modal.dismiss());
      modal.root.querySelector("#wc-th-s")?.addEventListener("click", () => {
        const title = modal.root.querySelector("#wc-th-t")?.value.trim();
        if (!title) return;
        const kindVal = modal.root.querySelector("#wc-th-st")?.value;
        const turns = Math.floor(Number(modal.root.querySelector("#wc-th-turns")?.value || 3));
        const thread = kindVal === "timer"
          ? { title, status: "active", kind: "timer", turnsLeft: Math.min(99, Math.max(1, Number.isFinite(turns) ? turns : 3)), detail: modal.root.querySelector("#wc-th-d")?.value.trim() || "" }
          : { title, status: kindVal, detail: modal.root.querySelector("#wc-th-d")?.value.trim() || "" };
        send("upsert_thread", { thread });
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
// Settings-section accordion state (numeric ids, survives re-renders).
// 1 = Modules stays open by default; everything else starts collapsed.
var settingsAccCollapsed = new Set([2, 3, 4, 5, 6, 7, 8]);
function accHead(id, title, hintRight) {
  const collapsed = settingsAccCollapsed.has(id);
  return `<button type="button" class="wc-card-head wc-acc-h${collapsed ? " is-collapsed" : ""}" data-acc="${id}" aria-expanded="${!collapsed}"><span class="wc-card-title">${title}</span><span class="wc-acc-r">${hintRight ? `<span class="wc-dim">${hintRight}</span>` : ""}${icon("chev", 15)}</span></button>`;
}
var noticeFilter = "all";
var NOTICE_FILTERS = [
  ["all", "All"],
  ["levelup", "Level"],
  ["quest", "Quests"],
  ["item", "Items"],
  ["skill", "Skills"],
  ["warn", "Warnings"],
  ["change", "Changes"]
];
var ARC_TO_WEFT = { opening: "Setup", rising: "Escalation", turning: "Complication", climax: "Crisis", fallout: "Resolution" };
var PHASE_TO_WEFT = { setup: "Early Simmer", tension: "Building", confrontation: "Midpoint Tension", intimacy: "Climax", aftermath: "Breather" };
var WEFT_ARC_WORDS = new Set(["setup", "escalation", "complication", "crisis", "resolution"]);
var WEFT_PHASE_WORDS = new Set(["early simmer", "building", "midpoint tension", "climax", "breather"]);
function weftLadder(value, toWeft, known) {
  const s = String(value || "").trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (known.has(lower)) return s;
  return toWeft[lower] || s;
}
function renderWeftBlock(d) {
  const s = d.sheet;
  const w = d.world;
  const th = escXmlAttr("sakura");
  const tag = (name, content, attrs) => {
    const attrStr = attrs ? ` ${attrs}` : "";
    return `<${name}${attrStr}>${content}</${name}>`;
  };
  const optTag = (name, value, attrs) => {
    const v = String(value ?? "").trim();
    return v ? `<${name}${attrs ? ` ${attrs}` : ""}>${escXml(v)}</${name}>` : "";
  };
  const lines = [];
  // ---- <Status> ----
  const status = [];
  status.push(`<Status th="${th}">`);
  status.push(`${optTag("nm", s.name)}${optTag("lv", s.level)}${optTag("race", s.race)}${optTag("rank", s.rank)}`);
  status.push(`${optTag("cls", s.cls)}${optTag("subcls", s.subcls)}${optTag("guild", s.guild)}${optTag("ttl", s.title)}`);
  status.push(`${optTag("hp", `${s.hp}/${s.hpMax}`)}${s.useMp ? optTag("mp", `${s.mp}/${s.mpMax}`, s.mpLabel && s.mpLabel !== "MP" ? `l="${escXmlAttr(s.mpLabel)}"` : "") : ""}${optTag("sp", `${s.sp}/${s.spMax}`)}`);
  status.push(optTag("xp", `${s.xp}/${s.xpNext}`));
  const statTag = (k) => {
    const label = s.statLabels?.[k] || k.toUpperCase();
    const renamed = label && label.toUpperCase() !== k.toUpperCase();
    return `<${k}${renamed ? ` l="${escXmlAttr(label)}"` : ""}>${s.stats[k]}</${k}>`;
  };
  status.push(STAT_KEYS.map(statTag).join(""));
  if (s.pts > 0) status.push(optTag("pts", s.pts));
  const gearLine = (tag, key) => {
    const it = s.gear?.[key];
    if (!it) return "";
    const r = it.rarity && it.rarity !== "ordinary" ? ` (${it.rarity})` : "";
    const q = it.qty > 1 ? ` x${it.qty}` : "";
    return `<${tag}><it>${escXml(it.name)}${escXml(r)}${escXml(q)}</it></${tag}>`;
  };
  status.push(`${gearLine("wpn", "weapon")}${gearLine("arm", "armor")}${gearLine("acc", "accessory")}`);
  const skl = (s.skills || []).map((k) => `<it>${escXml(k.name)}${Number(k.bonus) ? ` +${Number(k.bonus)}` : ""}</it>`).join("");
  if (skl) status.push(`<skl>${skl}</skl>`);
  const fx = (s.effects || []).map((e) => `<it>${escXml(e.name)}: ${e.duration === null ? "ongoing" : `${e.duration}t`}</it>`).join("");
  if (fx) status.push(`<fx>${fx}</fx>`);
  status.push(`<log>Exported from Weft Chronicle</log>`);
  const bag = (s.bag || []).map((it) => `<itm t="${escXmlAttr(it.category)}" r="${escXmlAttr(it.rarity)}" n="${it.qty}">${escXml(it.name)}</itm>`).join("\n");
  if (bag) status.push(`<bag>\n${bag}\n</bag>`);
  if (s.cash) status.push(optTag("cash", s.cash));
  const quests = (s.quests || []).map((q) => {
    const obs = (q.objectives || []).map((o) => `<ob x="${o.done ? 1 : 0}">${escXml(o.text)}${o.progress ? ` (${escXml(o.progress)})` : ""}</ob>`).join("");
    return `<quest s="${escXmlAttr(q.status)}" k="${escXmlAttr(q.kind || "side")}"><qt>${escXml(q.title)}</qt>${obs}${q.reward ? `<rw>${escXml(q.reward)}</rw>` : ""}${q.penalty ? `<pn>${escXml(q.penalty)}</pn>` : ""}</quest>`;
  }).join("\n");
  if (quests) status.push(`<quests>\n${quests}\n</quests>`);
  status.push(`</Status>`);
  // ---- <World_State> ----
  const world = [];
  world.push(`<World_State th="${th}" st="strip">`);
  {
    const raw = String(w.time || "");
    const cleaned = raw.replace(new RegExp(`^Day ${Number(w.dayCount) || 1}\\s*[·,—-]\\s*`), "").trim();
    world.push(optTag("clock", [`Day ${w.dayCount}`, cleaned].filter(Boolean).join(", ")));
  }
  world.push(optTag("place", w.location));
  if (w.weather) world.push(`<weather>${escXml(w.weather)}</weather>`);
  const pc = w.pc || {};
  const pcLines = [
    ["name", s.name],
    ["outfit", pc.outfit],
    ["pos", pc.pos],
    ["cond", pc.cond],
    ["carry", pc.carry]
  ].filter(([, v]) => String(v || "").trim());
  if (pcLines.length > 1 || (pcLines.length === 1 && pcLines[0][0] !== "name")) {
    world.push(`<pc>\n${pcLines.map(([k, v]) => `${k}: ${escXml(v)}`).join("\n")}\n</pc>`);
  }
  for (const n of (w.npcs || []).filter((x) => x.present)) {
    const npc = [];
    npc.push(`<npc>`);
    npc.push(`name: ${escXml(n.name)}`);
    npc.push(`mood: ${escXml(n.mood || n.attitude || "Guarded")}`);
    if (n.lastThought) npc.push(`think: ${escXml(n.lastThought)}`);
    npc.push(`pos: ${escXml(n.location || "In scene")}`);
    if (n.goal) npc.push(`want: ${escXml(n.goal)}`);
    npc.push(`bond: ${n.bond} | ${bshStage("bond", n.bond)}`);
    npc.push(`spark: ${n.spark} | ${bshStage("spark", n.spark)}`);
    if (n.heat >= 25) npc.push(`heat: ${n.heat} | ${bshStage("heat", n.heat)}`);
    if (n.secret) npc.push(`secret: ${escXml(n.secret)}`);
    npc.push(`</npc>`);
    world.push(npc.join("\n"));
  }
  for (const n of (w.npcs || []).filter((x) => !x.present)) {
    world.push(`<off>${escXml(n.name)}: ${escXml(n.location || "elsewhere")}</off>`);
  }
  const threads = (w.threads || []).filter((t) => t.status === "active" && t.kind !== "timer");
  const seeds = (w.threads || []).filter((t) => t.status === "seed" && t.kind !== "timer");
  const timers = (w.threads || []).filter((t) => t.kind === "timer" && t.status !== "resolved");
  for (const t of threads) world.push(`<thread>${escXml(t.title)}${t.detail ? ` — ${escXml(t.detail)}` : ""}</thread>`);
  for (const t of seeds) world.push(`<seed>${escXml(t.title)}${t.detail ? ` — ${escXml(t.detail)}` : ""}</seed>`);
  for (const t of timers) world.push(`<timer>${escXml(t.title)}${t.detail ? `: ${escXml(t.detail)}` : ""}: ${t.turnsLeft} turns left</timer>`);
  const arc = weftLadder(w.arc, ARC_TO_WEFT, WEFT_ARC_WORDS);
  const phase = weftLadder(w.phase, PHASE_TO_WEFT, WEFT_PHASE_WORDS);
  if (arc) world.push(`<arc>${escXml(arc)}</arc>`);
  if (phase) world.push(`<phase>${escXml(phase)}</phase>`);
  world.push(`</World_State>`);
  lines.push(status.filter(Boolean).join("\n"));
  lines.push(world.filter(Boolean).join("\n"));
  return lines.join("\n");
}
function groupNotices(list) {
  // Fold same kind+title+lines bursts ("HP −4 ×3") into one row with a counter.
  const out = [];
  for (const n of list) {
    const linesKey = JSON.stringify(Array.isArray(n.lines) ? n.lines : []);
    const prev = out.length > 0 ? out[out.length - 1] : null;
    if (prev && prev.kind === n.kind && prev.title === n.title && prev.linesKey === linesKey) {
      prev.count += 1;
      prev.ids.push(n.id);
    } else {
      out.push({ kind: n.kind, title: n.title, linesKey, count: 1, notice: n, ids: [n.id] });
    }
  }
  return out;
}
function renderNoticeFeed(d) {
  const list = Array.isArray(d.notices) ? d.notices : [];
  if (list.length === 0) return "";
  const filtered = list.filter((n) => noticeFilter === "all" || n.kind === noticeFilter);
  const grouped = groupNotices(filtered.slice(0, 12));
  const chips = NOTICE_FILTERS.map(([k, label]) => `<button class="wc-chip ${noticeFilter === k ? "is-active" : ""}" data-act="notice_filter" data-filter="${k}">${label}</button>`).join("");
  return `
    <div class="wc-card">
      <div class="wc-card-head"><span class="wc-card-title">Notifications</span><span class="wc-dim">${filtered.length} of ${list.length}</span></div>
      <div class="wc-chip-row">${chips}</div>
      <div class="wc-notif-list">
        ${grouped.length === 0 ? `<div class="wc-dim">Nothing in this filter.</div>` : grouped.map((g) => `
          <div class="wc-notif-row" data-k="${esc(g.notice.kind || "")}">
            <div class="wc-notif-main">
              <b>${esc(g.notice.title)}${g.count > 1 ? ` <span class="wc-pill">×${g.count}</span>` : ""}</b>
              <span>${esc((g.notice.lines || []).join(" · "))}</span>
            </div>
            <button class="wc-btn is-xs" data-act="dismiss_notice" data-ids="${esc(g.ids.join(","))}" title="Dismiss" aria-label="Dismiss notification">×</button>
          </div>`).join("")}
      </div>
      <div class="wc-actions-row" style="justify-content:flex-end"><button class="wc-btn is-xs" data-act="clear_notices">Clear All</button></div>
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
    const initBanner = !d.initialized ? `<div class="wc-banner">
           <span>Not initialized for this chat yet.</span>
           <button class="wc-btn is-primary is-xs" data-act="init_ai" ${syncing ? "disabled" : ""}>${icon("sparkles", 13)} Initialize with AI</button>
         </div>` : "";
    const latestNotices = renderNoticeFeed(d);
    return `
      ${initBanner}
      ${latestNotices}
      ${renderSystemWindow(d.sheet, cfg, { mode: "drawer" })}
    `;
  }
  function renderGearTab(d, cfg) {
    if (!d.modules.system) {
      return renderModuleDisabledCard(
        "system",
        "System Window (Inventory & Quests)",
        "Turn the System module ON to manage equipped gear, pack items, and quests."
      );
    }
    return `
      ${renderInventoryWindow(d.sheet, cfg)}
      ${renderQuestWindow(d.sheet, cfg)}
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
           <button class="wc-btn is-primary is-xs" data-act="init_ai" ${syncing ? "disabled" : ""}>${icon("sparkles", 13)} Initialize with AI</button>
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
        ${(d.sheet.skills || []).length > 0 ? `<div class="wc-field"><label>Skill (adds its dice bonus)</label><select class="wc-select" id="wc-d-skill"><option value="">— no skill —</option>${d.sheet.skills.map((sk) => { const b = Number(sk.bonus) || 0; return `<option value="${esc(sk.id)}">${esc(sk.name)} (${b >= 0 ? "+" : ""}${b})</option>`; }).join("")}</select></div>` : ""}
        <div class="wc-field"><label>Edge</label>${edgeSegHtml("wc-d-edge", rollDraft.mode)}</div>
        ${(d.world?.npcs || []).some((n) => n.present) ? `<div class="wc-row-2">
          <div class="wc-field"><label>Opponent (contested)</label><select class="wc-select" id="wc-d-opp"><option value="">— none —</option>${(d.world.npcs || []).filter((n) => n.present).map((n) => `<option value="${esc(n.name)}">${esc(n.name)}</option>`).join("")}</select></div>
          <div class="wc-field"><label>Foe Bonus</label><input class="wc-input" id="wc-d-foebonus" type="number" min="-5" max="10" value="3" /></div>
        </div>` : ""}
        <div class="wc-actions-row">
          ${DC_PRESETS.slice(1, 5).map((p) => `<button class="wc-btn is-xs" data-act="set_dc" data-dc="${p.dc}">DC ${p.dc}</button>`).join("")}
          <button class="wc-btn is-primary" style="margin-left:auto" data-act="inline_contest" title="Roll you vs the selected NPC (higher total wins)">Contest!</button>
          <button class="wc-btn is-primary" data-act="inline_roll">${icon("d20", 14)} Roll d20</button>
        </div>
      </div>

      ${cfg.survivalEnabled ? `<div class="wc-card">
        <div class="wc-card-head">
          <span class="wc-card-title">${icon("compass", 13)} Survival</span>
          <span class="wc-dim">seeded by chat + date</span>
        </div>
        <div class="wc-dim" style="margin-bottom:8px">Scavenge: WIS check vs DC ${Number(cfg.survivalDc) || 15} — finds go straight into your bag. Encounter: who's out there? Both bind the AI's next reply.</div>
        <div class="wc-actions-row">
          <button class="wc-btn" data-act="scavenge_roll" title="Roll d20 + WIS vs your survival DC — seeded by chat, date and attempt #${(d.scavengeCount || 0) + 1}">${icon("compass", 13)} Scavenge</button>
          <button class="wc-btn" data-act="encounter_roll" title="Roll d20 — scans for signs of threats (attempt #${(d.encounterCount || 0) + 1})">${icon("eye", 13)} Encounter</button>
        </div>
      </div>` : ""}

      ${d.rolls.length > 0 ? `<div class="wc-list">
               ${d.rolls.slice(0, 10).map((r) => renderDiceCard(r, cfg.theme)).join("")}
               <div class="wc-actions-row" style="justify-content:flex-end;">
                 <button class="wc-btn is-xs" data-act="copy_last_roll" title="Copy the latest roll as plain text for the chat">Copy Last Roll</button>
                 <button class="wc-btn is-xs" data-act="modal_add" data-kind="export_rolls" title="Download/copy the full roll history as JSON or Markdown">Export History</button>
                 <button class="wc-btn is-xs" data-act="clear_rolls">Clear Roll History</button>
               </div>
             </div>` : `<div class="wc-card"><div class="wc-dim">Rolls use unbiased crypto RNG and automatically bind the AI's next reply.</div></div>`}
    `;
  }
  function renderChoicesTab(d, cfg) {
    if (!d.modules.choices) {
      return renderModuleDisabledCard(
        "choices",
        "CYOA Choices",
        "The What Now? choices card is turned OFF for this chat."
      );
    }
    const latest = findLatestChoices(d);
    if (!latest) {
      return `<div class="wc-card">
        <div class="wc-card-title">What Now?</div>
        <div class="wc-dim">No choices in the tracked replies yet. When the story ends with a <code>&lt;choices&gt;</code> block (Weft's CYOA), the options appear here and inline under the reply in chat.</div>
      </div>`;
    }
    return `<div class="wc-card">
      <div class="wc-card-head"><span class="wc-card-title">What Now? · Latest Reply</span><span class="wc-dim">one-shot</span></div>
      ${renderChoicesCard(latest.snap.choices, cfg.theme, { open: true, snapKey: latest.key })}
      <div class="wc-dim" style="margin-top:8px">Tapping a choice sends it as your next message. Picked paths are marked and can't be sent twice.</div>
    </div>`;
  }
  function nearestOption(value, options) {
    const v = Number(value);
    if (!Number.isFinite(v)) return options[0];
    return options.reduce((best, o) => (Math.abs(o - v) < Math.abs(best - v) ? o : best), options[0]);
  }
  function renderSettingsContent(d, cfg) {
    const missingPerms = ["interceptor", "generation", "chats", "chat_mutation", "characters", "personas"].filter(
      (p) => !permissions[p]
    );
    const snapCount = d ? Object.keys(d.snapshots || {}).length : 0;
    const TC_OPTS = [1500, 3000, 5000, 8000, 12000, 20000];
    const MT_OPTS = [600, 1000, 1400, 2200, 4000, 6000];
    const tcVal = nearestOption(cfg.transcriptCap || 8000, TC_OPTS);
    const mtVal = nearestOption(cfg.sidecarMaxTokens || 2200, MT_OPTS);
    const activeConnId = getActiveConnectionId();
    const activeConnObj = connections.find((c) => c.id === activeConnId) || connections.find((c) => c.isDefault);
    const activeConnLabel = activeConnObj ? `Use Active Connection (${activeConnObj.name})` : "Use Active Default Connection";
    return `
      ${missingPerms.length > 0 ? `<div class="wc-banner">
               <span>Missing permissions: ${esc(missingPerms.join(", "))}</span>
               <button class="wc-btn is-primary is-xs" data-act="req_perms">Grant</button>
             </div>` : ""}

      ${d ? `<div class="wc-card${settingsAccCollapsed.has(1) ? " is-collapsed" : ""}">
               ${accHead(1, "Modules (This Chat)", "Toggle any module off independently")}
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
               <label class="wc-toggle-row">
                 <span><strong>CYOA Choices</strong><small>Tappable What Now? card from &lt;choices&gt; blocks — tap sends your next message</small></span>
                 <input type="checkbox" data-mod-toggle="choices" ${d.modules.choices ? "checked" : ""} />
               </label>
             </div>` : ""}

      <div class="wc-card${settingsAccCollapsed.has(2) ? " is-collapsed" : ""}">
        ${accHead(2, "Inline Cards Inside Chat", "Rendered with AI replies")}
        <div class="wc-field">
          <label>Card Placement</label>
          <select class="wc-select" id="wc-cfg-placement">
            <option value="below" ${cfg.inlinePlacement === "below" || (cfg.inlinePlacement !== "inside" && cfg.inlinePlacement !== "footer") ? "selected" : ""}>Below message card (recommended)</option>
            <option value="footer" ${cfg.inlinePlacement === "footer" ? "selected" : ""}>Message footer (above swipe pager)</option>
            <option value="inside" ${cfg.inlinePlacement === "inside" ? "selected" : ""}>Inside message body</option>
          </select>
        </div>
        <label class="wc-toggle-row"><span>Show System Window card in chat</span><input type="checkbox" data-cfg="showInlineSystem" ${cfg.showInlineSystem ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Show System Notifications in chat</span><input type="checkbox" data-cfg="showInlineNotices" ${cfg.showInlineNotices ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Show Story Tracker card in chat</span><input type="checkbox" data-cfg="showInlineTracker" ${cfg.showInlineTracker ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Show Dice Result cards in chat</span><input type="checkbox" data-cfg="showInlineDice" ${cfg.showInlineDice ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Compact dice cards (one line)</span><input type="checkbox" data-cfg="inlineDiceCompact" ${cfg.inlineDiceCompact ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Show CYOA Choice cards in chat</span><input type="checkbox" data-cfg="showInlineChoices" ${cfg.showInlineChoices ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Ask the model for a &lt;choices&gt; block (CYOA even with the preset's CYOA off)</span><input type="checkbox" data-cfg="injectChoicePrompt" ${cfg.injectChoicePrompt !== false ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Inline cards start expanded</span><input type="checkbox" data-cfg="inlineStartsOpen" ${cfg.inlineStartsOpen ? "checked" : ""} /></label>
      </div>

      <div class="wc-card${settingsAccCollapsed.has(3) ? " is-collapsed" : ""}">
        ${accHead(3, "Theme & Appearance")}
        <div class="wc-row-2">
          <div class="wc-field">
            <label>Card & Panel Theme</label>
            <select class="wc-select" id="wc-cfg-theme">
              ${WEFT_THEMES.map((t) => `<option value="${t.id}" ${cfg.theme === t.id ? "selected" : ""}>${esc(t.label)}</option>`).join("")}
            </select>
          </div>
          <div class="wc-field">
            <label>This Chat's Theme Override</label>
            <select class="wc-select" id="wc-cfg-chattheme">
              <option value="">Follow global theme</option>
              ${WEFT_THEMES.map((t) => `<option value="${t.id}" ${d && d.themeOverride === t.id ? "selected" : ""}>${esc(t.label)}</option>`).join("")}
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

      <div class="wc-card${settingsAccCollapsed.has(4) ? " is-collapsed" : ""}">
        ${accHead(4, "AI Connection & Sync", `${snapCount} swipe snap${snapCount === 1 ? "" : "s"}`)}
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
        <div class="wc-field">
          <label>Auto-Alloc Priority (optional)</label>
          <input class="wc-input" id="wc-cfg-allocpriority" value="${esc(cfg.allocPriority || "")}" placeholder="e.g., dex, con, str — empty = best stats first" />
        </div>
        <div class="wc-field">
          <label>Sync Pacing</label>
          <select class="wc-select" id="wc-cfg-syncmode">
            <option value="every" ${cfg.syncMode === "every" ? "selected" : ""}>After every AI reply</option>
            <option value="every2" ${cfg.syncMode === "every2" ? "selected" : ""}>Every 2nd AI reply</option>
            <option value="manual" ${cfg.syncMode === "manual" ? "selected" : ""}>Manual only (use Sync Now)</option>
          </select>
        </div>
        <div class="wc-field">
          <label>Prompt Budget</label>
          <select class="wc-select" id="wc-cfg-budget">
            <option value="standard" ${cfg.promptBudget === "standard" ? "selected" : ""}>Standard (full state block)</option>
            <option value="lean" ${cfg.promptBudget === "lean" ? "selected" : ""}>Lean (~half the tokens)</option>
          </select>
        </div>
        <div class="wc-row-2">
          <div class="wc-field">
            <label>Sidecar Context (per sync)</label>
            <select class="wc-select" id="wc-cfg-transcriptcap" title="How much of the recent chat the state-sync call reads. Lower = cheaper and faster, but the sync sees fewer past turns.">
              ${TC_OPTS.map((v) => `<option value="${v}" ${tcVal === v ? "selected" : ""}>${v === 1500 ? "Tight" : v === 3000 ? "Lean" : v === 5000 ? "Medium" : v === 8000 ? "Standard" : v === 12000 ? "Long" : "Max"} (~${(v / 1000).toFixed(1)}k chars)</option>`).join("")}
            </select>
          </div>
          <div class="wc-field">
            <label>Max Sidecar Output</label>
            <select class="wc-select" id="wc-cfg-sidecarmaxtok" title="Token cap for the state-sync reply. Tightening this saves output tokens; 600 is enough for a small delta.">
              ${MT_OPTS.map((v) => `<option value="${v}" ${mtVal === v ? "selected" : ""}>${v.toLocaleString()} tok${v === 2200 ? " (default)" : ""}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="wc-dim" style="margin:-6px 0 8px">Sidecar = the small non-streaming call after each reply that updates HP/stats/tracker (never the story). Pick a small, fast Connection above — that matters more than these caps.</div>
        <div class="wc-dim" style="margin:-6px 0 8px">
          ${promptEstimate ? (promptEstimate.tokens > 0
            ? `Live prompt block: ≈<b>${promptEstimate.tokens}</b> tokens (${promptEstimate.chars} chars ÷ 4), injected once per generation.`
            : `Live prompt block: empty right now — nothing gets injected for this chat's current settings.`) : "Live prompt cost appears after the next state refresh."}
        </div>
        <div class="wc-field">
          <label>XP Curve</label>
          <select class="wc-select" id="wc-cfg-xpcurve">
            <option value="flat" ${cfg.xpCurve === "flat" ? "selected" : ""}>Flat (100 × level)</option>
            <option value="lifted" ${cfg.xpCurve === "lifted" ? "selected" : ""}>Lifted (100 × level^1.35)</option>
          </select>
        </div>
        <div class="wc-field">
          <label>Heat Bar Display</label>
          <select class="wc-select" id="wc-cfg-heatdisplay">
            <option value="always" ${cfg.heatDisplay === "always" ? "selected" : ""}>Always</option>
            <option value="charged" ${cfg.heatDisplay === "charged" ? "selected" : ""}>Only when charged (≥25)</option>
          </select>
        </div>
        <label class="wc-toggle-row"><span>Auto-sync state after every AI reply</span><input type="checkbox" data-cfg="autoSync" ${cfg.autoSync ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Inject live state into AI prompt</span><input type="checkbox" data-cfg="injectPrompt" ${cfg.injectPrompt ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Track XP & automatic level-ups</span><input type="checkbox" data-cfg="trackXp" ${cfg.trackXp ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Automatic backups of chat state (keep last 5)</span><input type="checkbox" data-cfg="autoBackup" ${cfg.autoBackup !== false ? "checked" : ""} /></label>
        <label class="wc-toggle-row"><span>Enable automatically in new chats</span><input type="checkbox" data-cfg="enabledByDefault" ${cfg.enabledByDefault ? "checked" : ""} /></label>
      </div>

      <div class="wc-card${settingsAccCollapsed.has(5) ? " is-collapsed" : ""}">
        ${accHead(5, "Survival & Scene Clock", "off by default")}

        <div class="wc-card-title" style="margin-top:2px;">${icon("compass", 13)} Survival (Loot & Encounters)</div>
        <label class="wc-toggle-row"><span>Enable survival rolls in this profile <small>Dice tab buttons + roll quick actions; seeded by chat + date</small></span><input type="checkbox" data-cfg="survivalEnabled" ${cfg.survivalEnabled ? "checked" : ""} /></label>
        <div class="wc-row-2">
          <div class="wc-field"><label>Scavenge / Encounter DC</label><input class="wc-input" id="wc-cfg-survivaldc" type="number" min="1" max="40" value="${Number(cfg.survivalDc) || 15}" /></div>
          <div class="wc-field"><label>Loot Table</label><select class="wc-select" id="wc-cfg-survtable">
            <option value="wasteland" ${(cfg.survivalTable || "wasteland") === "wasteland" ? "selected" : ""}>Wasteland Salvage</option>
            <option value="urban" ${cfg.survivalTable === "urban" ? "selected" : ""}>Urban Remnants</option>
            <option value="wilderness" ${cfg.survivalTable === "wilderness" ? "selected" : ""}>Wilderness Forage</option>
            <option value="custom" ${cfg.survivalTable === "custom" ? "selected" : ""}>My Table (pasted below)</option>
          </select></div>
        </div>
        <div class="wc-field"><label>Custom Loot Lines</label>
          <textarea class="wc-textarea" id="wc-cfg-survcustom" rows="4" placeholder="weight | name | qty | category | rarity&#10;8 | Fine-cut cigars | 1 | valuable | uncommon&#10;# lines starting with # are comments">${esc(cfg.survivalCustomTable || "")}</textarea>
        </div>
        <div class="wc-dim" style="margin:-4px 0 10px">${(() => {
          const lines = String(cfg.survivalCustomTable || "").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
          const ok = lines.filter((l) => { const p = l.split("|").map((x) => x.trim()); const w = Number(p[0]); return Number.isFinite(w) && w >= 1 && Boolean(p[1]); }).length;
          return ok > 0 ? `${ok} custom line(s) in play — appended to the built-in table (or used alone with “My Table”).` + (lines.length - ok > 0 ? ` <span style="color:var(--wc-bad)">${lines.length - ok} line(s) rejected — see format above.</span>` : "") : 'Format: <code>weight | name | qty | category | rarity</code> — custom lines extend the built-in table, or pick “My Table” to use only yours.';
        })()}</div>

        <div class="wc-card-title" style="margin-top:4px;">${icon("clock", 13)} Scene Clock & Weather</div>
        <label class="wc-toggle-row"><span>Advance the scene clock every synced turn <small>phase words only — “Day 12 · Evening” in the tracker and prompt</small></span><input type="checkbox" data-cfg="clockEnabled" ${cfg.clockEnabled ? "checked" : ""} /></label>
        <div class="wc-row-2">
          <div class="wc-field"><label>Minutes per reply</label><input class="wc-input" id="wc-cfg-clockstep" type="number" min="15" max="180" step="5" value="${Number(cfg.clockStepMinutes) || 45}" /></div>
          <div class="wc-field"><label>Weather drift chance (%)</label><input class="wc-input" id="wc-cfg-weatherchance" type="number" min="0" max="100" value="${Number.isFinite(Number(cfg.weatherDriftChance)) ? Number(cfg.weatherDriftChance) : 20}" /></div>
        </div>
        <label class="wc-toggle-row"><span>Let weather drift one rung per turn</span><input type="checkbox" data-cfg="weatherDrift" ${cfg.weatherDrift !== false ? "checked" : ""} /></label>
        <div class="wc-field"><label>Weather ladder (comma-separated, calm → severe)</label><input class="wc-input" id="wc-cfg-weatherladder" value="${esc(cfg.weatherLadder || "Clear, Windy, Overcast, Fog, Rain, Storm, Snow")}" /></div>
        <div class="wc-dim" style="margin:-4px 0 6px">Phase words only — day rolls over at midnight. Off-ladder (custom) weather text is never touched. Time advances only on synced turns; nothing moves while you edit or read.</div>
      </div>

      ${d && Array.isArray(d.syncLog) && d.syncLog.length > 0 ? `<div class="wc-card${settingsAccCollapsed.has(6) ? " is-collapsed" : ""}">
               ${accHead(6, "Recent Syncs", `last ${Math.min(8, d.syncLog.length)}`)}
               ${d.spend && d.spend.calls > 0 ? `<div class="wc-dim" style="margin-bottom:6px">Sidecar spend (this chat): <b>${d.spend.calls}</b> call${d.spend.calls === 1 ? "" : "s"} · ≈<b>${d.spend.totalTokens}</b> tokens (est. chars÷4 — ${d.spend.promptTokens} prompt / ${d.spend.completionTokens} completion)</div>` : ""}
               <div class="wc-synclog">
                 ${d.syncLog.slice(-8).reverse().map((e) => `
                   <div class="wc-synclog-row ${e.ok ? "is-ok" : "is-fail"}">
                     <span>${new Date(e.ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                     <em>${e.ok ? "synced" : esc(e.error || "failed")}${Number.isFinite(e.tokens) ? ` · ≈${e.tokens} tok` : ""}</em>
                   </div>`).join("")}
               </div>
             </div>` : ""}

      <div class="wc-card${settingsAccCollapsed.has(7) ? " is-collapsed" : ""}">
        ${accHead(7, "Settings (This Profile)", "share a tuned config")}
        <div class="wc-actions-row">
          <button class="wc-btn is-xs" data-act="modal_add" data-kind="export_settings">Export Settings</button>
          <button class="wc-btn is-xs" data-act="modal_add" data-kind="import_settings">Import Settings…</button>
        </div>
      </div>

      ${d ? `<div class="wc-card${settingsAccCollapsed.has(8) ? " is-collapsed" : ""}">
               ${accHead(8, "Backup & Reset (This Chat)")}
               <div class="wc-actions-row" style="justify-content:space-between;">
                 <div class="wc-actions-row">
                   <button class="wc-btn is-xs" data-act="modal_add" data-kind="export">Export JSON</button>
                   <button class="wc-btn is-xs" data-act="modal_add" data-kind="export_weft" title="Copy the state as a Weft preset &lt;Status&gt;/&lt;World_State&gt; block for hand-off">Export Weft Block</button>
                   <button class="wc-btn is-xs" data-act="modal_add" data-kind="import">Import JSON</button>
                   <button class="wc-btn is-xs" data-act="chat_log_report" title="Scan this chat's history for preset &lt;Status&gt;/&lt;World_State&gt; blocks and migrate them into the extension (no LLM, no tokens)">Import from Chat Log…</button>
                   <button class="wc-btn is-xs" data-act="list_backups">Restore backup…</button>
                 </div>
                 <button class="wc-btn is-xs is-danger" data-act="reset_chat">Reset Chat</button>
               </div>
             </div>` : ""}
    `;
  }
  function captureViewState(root) {
    if (!root) return null;
    const active = root.contains(document.activeElement) ? document.activeElement : null;
    const focusKey = active
      ? (active.dataset?.act ? `act:${active.dataset.act}` :
         active.dataset?.cfg ? `cfg:${active.dataset.cfg}` :
         active.dataset?.subtab ? `subtab:${active.dataset.subtab}` :
         active.id ? `id:${active.id}` : null)
      : null;
    return { scrollTop: root.scrollTop, focusKey };
  }
  function restoreViewState(root, vs) {
    if (!root || !vs) return;
    if (typeof vs.scrollTop === "number") root.scrollTop = vs.scrollTop;
    if (vs.focusKey) {
      const [kind, val] = vs.focusKey.split(":", 2);
      const sel = kind === "act" ? `[data-act="${CSS.escape(val)}"]`
        : kind === "cfg" ? `[data-cfg="${CSS.escape(val)}"]`
        : kind === "subtab" ? `[data-subtab="${CSS.escape(val)}"]`
        : `#${CSS.escape(val)}`;
      const el = root.querySelector(sel);
      if (el && typeof el.focus === "function") {
        try {
          el.focus({ preventScroll: true });
        } catch {
          el.focus();
        }
      }
    }
  }
  function renderAll() {
    updateChromeState();
    const theme = (data && data.themeOverride) || settings?.theme || "sakura";
    const settingsViewState = captureViewState(settingsTabHandle?.root || null);
    if (settingsTabHandle && settings) {
      settingsTabHandle.root.innerHTML = `<div class="wc-root" data-wc-theme="${esc(theme)}">${renderSettingsContent(data, settings)}</div>`;
      restoreViewState(settingsTabHandle.root, settingsViewState);
    }
    const drawerViewState = captureViewState(drawerTab.root);
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
      restoreViewState(drawerTab.root, drawerViewState);
      scheduleInlineSync(60);
      return;
    }
    const pendingRolls = data.modules.dice ? data.rolls.filter((r) => !r.consumed).length : 0;
    const latestChoices = findLatestChoices(data);
    const unclaimedChoices = latestChoices ? Math.max(0, latestChoices.snap.choices.options.length - (latestChoices.snap.choices.claimed?.length || 0)) : 0;
    const viewCfg = data?.themeOverride ? { ...settings, theme: data.themeOverride } : settings;
    const body = activeSubTab === "system" ? renderSystemTab(data, viewCfg) : activeSubTab === "gear" ? renderGearTab(data, viewCfg) : activeSubTab === "tracker" ? renderTrackerTab(data, viewCfg) : activeSubTab === "dice" ? renderDiceTab(data, viewCfg) : activeSubTab === "choices" ? renderChoicesTab(data, viewCfg) : renderSettingsContent(data, settings);
    const syncLog = Array.isArray(data.syncLog) ? data.syncLog : [];
    const lastSync = syncLog.length > 0 ? syncLog[syncLog.length - 1] : null;
    const syncErr = typeof data.lastSyncError === "string" && data.lastSyncError ? data.lastSyncError : null;
    const syncTime = lastSync ? new Date(lastSync.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    const subLine = syncing
      ? esc(statusNote || "Syncing\u2026")
      : syncErr
        ? `Sync failed \u2014 ${esc(syncErr)}`
        : lastSync
          ? `Synced ${esc(syncTime)}${lastSync.ok ? "" : " (with warnings)"}`
          : data.enabled
            ? esc(statusNote || "Active in this chat")
            : "Paused for this chat";
    drawerTab.root.innerHTML = `
      <div class="wc-root" data-wc-theme="${esc(theme)}">
        <div class="wc-topbar">
          <div class="wc-brand">
            <span class="wc-brand-dot" style="opacity:${data.enabled ? "1" : "0.3"}"></span>
            <div>
              <div class="wc-brand-title">Weft Chronicle</div>
              <div class="wc-brand-sub${syncErr ? " is-bad" : ""}">${subLine}</div>
            </div>
          </div>
          <div class="wc-actions-row">
            <button class="wc-btn is-xs" data-act="toggle_chat" title="Pause or resume all modules for this chat">${data.enabled ? "On" : "Off"}</button>
            <button class="wc-btn is-xs ${syncErr ? "is-danger" : "is-primary"}" data-act="sync_now" ${syncing || !data.enabled ? "disabled" : ""} title="${syncErr ? "Retry the failed sync" : "Sync state from the latest reply"}">${syncing ? "\u2026" : syncErr ? "Retry" : "Sync"}</button>
          </div>
        </div>

        <div class="wc-tabs" aria-label="Weft Chronicle sections">
          <button class="wc-tab ${activeSubTab === "system" ? "is-active" : ""} ${!data.modules.system ? "is-off" : ""}" data-subtab="system">${icon("system", 14)}<span>System</span>${data.modules.system && data.sheet.pts > 0 ? ` <span class="wc-pill">+${data.sheet.pts}</span>` : ""}</button>
          <button class="wc-tab ${activeSubTab === "gear" ? "is-active" : ""} ${!data.modules.system ? "is-off" : ""}" data-subtab="gear">${icon("shield", 14)}<span>Gear</span></button>
          <button class="wc-tab ${activeSubTab === "tracker" ? "is-active" : ""} ${!data.modules.tracker ? "is-off" : ""}" data-subtab="tracker">${icon("map", 14)}<span>Tracker</span></button>
          <button class="wc-tab ${activeSubTab === "dice" ? "is-active" : ""} ${!data.modules.dice ? "is-off" : ""}" data-subtab="dice">${icon("d20", 14)}<span>Dice</span>${pendingRolls > 0 ? ` <span class="wc-pill">${pendingRolls}</span>` : ""}</button>
          <button class="wc-tab ${activeSubTab === "choices" ? "is-active" : ""} ${!data.modules.choices ? "is-off" : ""}" data-subtab="choices" title="What Now? — choices from the latest reply">${icon("chat", 14)}<span>Pick</span>${unclaimedChoices > 0 ? ` <span class="wc-pill">${unclaimedChoices}</span>` : ""}</button>
          <button class="wc-tab wc-tab-icon ${activeSubTab === "settings" ? "is-active" : ""}" data-subtab="settings" title="Settings" aria-label="Settings">${icon("sliders", 15)}</button>
        </div>

        ${body}
      </div>
    `;
    restoreViewState(drawerTab.root, drawerViewState);
    scheduleInlineSync(80);
  }
  const handleClick = async (ev) => {
    // Settings-section accordion toggles share this delegate.
    const acc = ev.target?.closest("[data-acc]");
    if (acc) {
      const id = Number(acc.dataset.acc);
      if (settingsAccCollapsed.has(id)) settingsAccCollapsed.delete(id);
      else settingsAccCollapsed.add(id);
      const collapsed = settingsAccCollapsed.has(id);
      acc.classList.toggle("is-collapsed", collapsed);
      acc.setAttribute("aria-expanded", String(!collapsed));
      const card = acc.closest(".wc-card");
      if (card) card.classList.toggle("is-collapsed", collapsed);
      return;
    }
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
      case "list_backups": {
        send("list_backups");
        return;
      }
      case "init_ai": {
        send("init_from_ai");
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
      case "notice_filter": {
        noticeFilter = target.dataset.filter || "all";
        renderAll();
        return;
      }
      case "dismiss_notice": {
        send("dismiss_notice", { ids: target.dataset.ids || target.dataset.id || "" });
        return;
      }
      case "edge": {
        rollDraft.mode = target.dataset.mode === "adv" || target.dataset.mode === "dis" ? target.dataset.mode : "normal";
        renderAll();
        return;
      }
      case "choice_pick": {
        void pickChoice(target.dataset.key, Number(target.dataset.idx), target);
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
        openItemModal();
        return;
      }
      case "edit_item": {
        const it = data?.sheet.bag.find((x) => x.id === target.dataset.id);
        if (it) openItemModal(it);
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
      case "toggle_obj_btn": {
        send("toggle_objective", { questId: target.dataset.qid, objectiveId: target.dataset.oid });
        return;
      }
      case "cycle_quest_status": {
        const q = data?.sheet.quests.find((x) => x.id === target.dataset.id);
        if (!q) return;
        const nextStatus = q.status === "available" ? "active" : q.status === "active" ? "done" : "active";
        send("upsert_quest", { quest: { ...q, status: nextStatus } });
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
      case "inline_roll":
      case "inline_contest": {
        const action = drawerTab.root.querySelector("#wc-d-action")?.value.trim() || "Attempt check";
        const stat = drawerTab.root.querySelector("#wc-d-stat")?.value || "none";
        const dc = Number(drawerTab.root.querySelector("#wc-d-dc")?.value || 15);
        const gearBonus = Number(drawerTab.root.querySelector("#wc-d-gear")?.value || 0);
        const skillId = drawerTab.root.querySelector("#wc-d-skill")?.value || "";
        const skill = (data?.sheet?.skills || []).find((sk) => sk.id === skillId);
        const skillBonus = skill ? Number(skill.bonus) || 0 : 0;
        rollDraft.action = action;
        rollDraft.stat = stat;
        rollDraft.dc = dc;
        rollDraft.gearBonus = gearBonus;
        const payload = { action, stat, dc, gearBonus, skillBonus, skillLabel: skill ? skill.name : "", mode: rollDraft.mode };
        if (target.dataset.act === "inline_contest") {
          const opponent = drawerTab.root.querySelector("#wc-d-opp")?.value || "";
          if (!opponent) return; // no foe selected — stay put
          const foeBonus = Number(drawerTab.root.querySelector("#wc-d-foebonus")?.value || 3);
          send("contest_roll", { ...payload, opponent, foeBonus });
          return;
        }
        send("roll_dice", payload);
        return;
      }
      case "scavenge_roll": {
        send("scavenge_roll");
        return;
      }
      case "encounter_roll": {
        send("encounter_roll");
        return;
      }
      case "chat_log_report": {
        send("chat_log_report");
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
      case "copy_last_roll": {
        const latest = data && Array.isArray(data.rolls) && data.rolls.length > 0 ? data.rolls[data.rolls.length - 1] : null;
        if (latest) {
          try {
            navigator.clipboard?.writeText(formatRollForChat(latest));
          } catch {
          }
        }
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
    if (el.id === "wc-cfg-chattheme") {
      send("set_chat_theme", { theme: el.value || null });
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
    if (el.id === "wc-cfg-allocpriority") {
      send("update_settings", { patch: { allocPriority: el.value } });
      return;
    }
    if (el.id === "wc-cfg-placement") {
      send("update_settings", { patch: { inlinePlacement: el.value } });
      return;
    }
    if (el.id === "wc-cfg-syncmode") {
      send("update_settings", { patch: { syncMode: el.value } });
      return;
    }
    if (el.id === "wc-cfg-budget") {
      send("update_settings", { patch: { promptBudget: el.value } });
      return;
    }
    if (el.id === "wc-cfg-transcriptcap") {
      send("update_settings", { patch: { transcriptCap: Number(el.value) } });
      return;
    }
    if (el.id === "wc-cfg-sidecarmaxtok") {
      send("update_settings", { patch: { sidecarMaxTokens: Number(el.value) } });
      return;
    }
    if (el.id === "wc-cfg-xpcurve") {
      send("update_settings", { patch: { xpCurve: el.value } });
      return;
    }
    if (el.id === "wc-cfg-heatdisplay") {
      send("update_settings", { patch: { heatDisplay: el.value } });
      return;
    }
    if (el.id === "wc-cfg-survivaldc") {
      send("update_settings", { patch: { survivalDc: Number(el.value || 15) } });
      return;
    }
    if (el.id === "wc-cfg-survtable") {
      send("update_settings", { patch: { survivalTable: el.value } });
      return;
    }
    if (el.id === "wc-cfg-survcustom") {
      send("update_settings", { patch: { survivalCustomTable: el.value } });
      return;
    }
    if (el.id === "wc-cfg-clockstep") {
      send("update_settings", { patch: { clockStepMinutes: Number(el.value || 45) } });
      return;
    }
    if (el.id === "wc-cfg-weatherchance") {
      send("update_settings", { patch: { weatherDriftChance: Number(el.value || 0) } });
      return;
    }
    if (el.id === "wc-cfg-weatherladder") {
      send("update_settings", { patch: { weatherLadder: el.value } });
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
        promptEstimate = msg.promptEstimate && typeof msg.promptEstimate === "object" ? msg.promptEstimate : null;
        renderAll();
        if (Array.isArray(msg.backupList)) openBackupModal(msg.backupList);
        if (msg.chatLogReport && typeof msg.chatLogReport === "object") openChatLogModal(msg.chatLogReport);
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
