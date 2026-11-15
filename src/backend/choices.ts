// @ts-nocheck — types are being tightened incrementally; bundling and CI tests do not depend on this flag. Remove file-by-file.
/*! src/backend/choices.ts */
// Parses the <choices>…</choices> block the Weft preset emits at the end of an
// assistant reply (see "CYOA · Choices" in Weft_v4_4.json). The raw block is
// stored in snapshots so the extension can render its own clickable card inline
// in the chat, with one-shot claim semantics similar to the preset's native
// regex-action buttons.
var MAX_CHOICE_OPTIONS = 6;
var MAX_CHOICE_TEXT = 400;
export function parseChoicesBlock(raw) {
  if (!raw || typeof raw !== "string") return null;
  const blockMatch = raw.match(/<choices\b([^>]*)>([\s\S]*?)<\/choices>/i);
  if (!blockMatch) return null;
  const options = [];
  const optRe = /<c\b([^>]*)>([\s\S]*?)<\/c>/gi;
  let om;
  while ((om = optRe.exec(blockMatch[2])) !== null) {
    if (options.length >= MAX_CHOICE_OPTIONS) break;
    const oAttrs = om[1] || "";
    const body = (om[2] || "").trim();
    if (!body) continue;
    const kind = ((oAttrs.match(/k\s*=\s*"([^"<>]*)"/i) || [])[1] || "").trim().toLowerCase().slice(0, 24);
    const heatRaw = ((oAttrs.match(/h\s*=\s*"([^"<>]*)"/i) || [])[1] || "").trim();
    const heat = heatRaw === "1" || heatRaw === "2" || heatRaw === "3" ? Number(heatRaw) : 0;
    // Option body shape: *action* "optional spoken line" || stakes || requirement
    const segs = body.split("||").map((s) => s.trim());
    const text = (segs[0] || "").trim().slice(0, MAX_CHOICE_TEXT);
    if (!text) continue;
    let stakes = "";
    let req = "";
    if (segs.length === 2) {
      stakes = segs[1].slice(0, 200);
    } else if (segs.length >= 3) {
      stakes = segs[1].slice(0, 200);
      req = segs.slice(2).join(" || ").trim().slice(0, 200);
    }
    options.push({ kind, heat, text, stakes, req });
  }
  if (options.length === 0) return null;
  return { options, claimed: [] };
}
