/*! src/frontend/engine.ts */
export var STAT_KEYS = ["str", "dex", "int", "cha", "con", "wis"];
export var DC_PRESETS = [
  { dc: 5, label: "Trivial (5)" },
  { dc: 10, label: "Easy (10)" },
  { dc: 15, label: "Ordinary (15)" },
  { dc: 20, label: "Hard (20)" },
  { dc: 25, label: "Very Hard (25)" },
  { dc: 30, label: "Near-Impossible (30)" }
];
export function clamp(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}
export function statModifier(value) {
  const v = Math.floor(Number.isFinite(value) ? value : 5);
  if (v <= 2) return -2;
  if (v <= 4) return -1;
  if (v <= 6) return 0;
  if (v <= 8) return 1;
  if (v <= 10) return 2;
  if (v <= 12) return 3;
  if (v <= 14) return 4;
  if (v <= 16) return 5;
  return 6;
}
export function statBandName(value) {
  const v = Math.floor(value);
  if (v <= 2) return "Frail";
  if (v <= 4) return "Weak";
  if (v <= 6) return "Average";
  if (v <= 8) return "Trained";
  if (v <= 10) return "Exceptional";
  if (v <= 12) return "Heroic";
  if (v <= 14) return "Master";
  if (v <= 16) return "Mythic";
  return "Transcendent";
}
export function formatMod(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}
export function rarityRollBonus(rarity) {
  switch (rarity) {
    case "uncommon":
    case "rare":
      return 1;
    case "epic":
      return 2;
    case "legendary":
    case "mythic":
      return 3;
    default:
      return 0;
  }
}
export function computeMaxGearBonus(sheet) {
  let best = 0;
  for (const slot of ["weapon", "armor", "accessory"]) {
    const it = sheet.gear[slot];
    if (!it) continue;
    const b = typeof it.rollBonus === "number" ? it.rollBonus : rarityRollBonus(it.rarity);
    if (b > best) best = b;
  }
  return clamp(best, 0, 3);
}
