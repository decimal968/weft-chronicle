// esbuild entry for unit tests ONLY — never shipped. Re-exports the pure
// internals the tests exercise, straight from source.
export { STAT_KEYS, DEFAULT_STAT_LABELS, clamp, statModifier, computePools, recomputeSheetPools,
  createDefaultSheet, createDefaultWorld, createDefaultModules } from "../src/backend/engine";
export { performDiceRoll, evaluateVerdict, fairD20, normalizeRollStat, normalizeChatData,
  sanitizeImportedState, autoAllocateAllPoints, parseAllocPriority, allocateStatPoint,
  tickEffectsInPlace, applyDelta, createDefaultChatData } from "../src/backend/sanitize";
export { parseJsonDelta, bshStage } from "../src/backend/extractor";
export { parseChoicesBlock } from "../src/backend/choices";
