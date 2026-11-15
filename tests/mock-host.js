"use strict";
// Mock of the Lumiverse spindle host bridge, mirroring the integration-test
// pattern used during development. Loading backend.js requires the global
// `spindle` to exist before require().
const path = require("path");

function createMockHost() {
  const store = new Map(); // fake userStorage
  const sentToFrontend = [];
  const toasts = { info: [], warning: [], error: [], success: [] };
  const handlers = {};
  let frontendMessageHandler = null;
  const deepClone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

  const spindle = {
    permissions: { has: () => true },
    userStorage: {
      exists: async (p) => store.has(p),
      getJson: async (p, { fallback } = {}) =>
        store.has(p) ? deepClone(store.get(p)) : fallback !== undefined ? deepClone(fallback) : null,
      setJson: async (p, v) => { store.set(p, deepClone(v)); },
      remove: async (p) => { store.delete(p); },
      list: async (prefix) => [...store.keys()].filter((k) => k.startsWith(prefix)),
    },
    personas: {
      getActive: async () => ({ name: "Player" }),
      getDefault: async () => ({ name: "Player" }),
    },
    chats: {
      get: async () => null,
      getActive: async () => ({ id: "chat1" }),
      create: async () => "newchat",
    },
    characters: { get: async () => null },
    chat: {
      getMessages: async () => [],
    },
    connections: { list: async () => [] },
    generate: {
      quiet: async () => ({ content: "{}" }),
      raw: async () => ({ content: "{}" }),
    },
    host: { capabilities: {} },
    registerInterceptor: () => () => {},
    registerInputBarAction: () => {},
    sendToFrontend: (payload) => { sentToFrontend.push(payload); },
    toast: {
      info: (m) => toasts.info.push(String(m)),
      warning: (m) => toasts.warning.push(String(m)),
      error: (m) => toasts.error.push(String(m)),
      success: (m) => toasts.success.push(String(m)),
    },
    log: { info() {}, warn() {}, error() {} },
    on: (ev, fn) => { handlers[ev] = fn; },
    onFrontendMessage: (fn) => { frontendMessageHandler = fn; },
  };

  return { spindle, store, sentToFrontend, toasts, handlers, getFrontendHandler: () => frontendMessageHandler };
}

function loadBackendWithHost(host) {
  globalThis.spindle = host.spindle;
  const resolved = require.resolve(path.join("..", "backend.js"));
  delete require.cache[resolved];
  process.env.WEFT_TEST = "1";
  return require(resolved);
}

module.exports = { createMockHost, loadBackendWithHost };
