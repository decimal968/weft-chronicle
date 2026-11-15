/*! src/frontend/icons.ts — shared inline SVG icon set (stroke-based, currentColor) */
// One visual language for every icon in the extension: 24px grid, 1.7 stroke,
// round caps/joins, no fills except where noted. Replaces ad-hoc emoji glyphs.
var ICON_PATHS = {
  system: '<rect x="3.5" y="4.5" width="17" height="11.5" rx="2"/><path d="M9.5 20h5M12 16v4"/>',
  shield: '<path d="M12 3l7 2.9v5.3c0 4.7-3 9.1-7 10.8-4-1.7-7-6.1-7-10.8V5.9z"/>',
  map: '<path d="M9 4L3 6.3v13.5L9 17.8l6 2 6-2.3V4L15 6.3 9 4z"/><path d="M9 4v13.8M15 6.3v13.5"/>',
  d20: '<path d="M12 2.6l8.1 4.7v9.4L12 21.4l-8.1-4.7V7.3z"/><path d="M12 7.2l4.3 2.5v4.9L12 17.1l-4.3-2.5V9.7z"/>',
  chat: '<path d="M4.5 6.3A2.3 2.3 0 0 1 6.8 4h10.4a2.3 2.3 0 0 1 2.3 2.3v6.9a2.3 2.3 0 0 1-2.3 2.3H9.7l-5.2 4.6z"/>',
  cog: '<circle cx="12" cy="12" r="3.05"/><path d="M12 2.6v3.2M12 18.2v3.2M2.6 12h3.2M18.2 12h3.2M5 5l2.3 2.3M16.7 16.7L19 19M19 5l-2.3 2.3M7.3 16.7L5 19"/>',
  gem: '<path d="M7.2 3.5h9.6l4 6-8.8 11-8.8-11z"/><path d="M3.2 9.5h17.6M12 20.5L8.4 9.5 12 3.5l3.6 6z"/>',
  spark: '<path d="M12 3l1.9 5.2 5.2 1.9-5.2 1.9L12 17.2l-1.9-5.2-5.2-1.9 5.2-1.9z"/>',
  sparkles: '<path d="M10.5 5l1.5 3.9 3.9 1.5-3.9 1.5-1.5 3.9-1.5-3.9L5.1 10.4 9 8.9z"/><path d="M18.5 3l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  star: '<path d="M12 2.8l2.8 5.8 6.3.8-4.7 4.3 1.2 6.2L12 17.4l-5.6 3.5 1.2-6.2-4.7-4.3 6.3-.8z"/>',
  crosshair: '<circle cx="12" cy="12" r="7.2"/><path d="M12 2v4.4M12 17.6V22M2 12h4.4M17.6 12H22"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
  bag: '<path d="M6.2 8h11.6l1.3 11.2a2 2 0 0 1-2 2.3H6.9a2 2 0 0 1-2-2.3z"/><path d="M9.3 10.8V6.7a2.7 2.7 0 0 1 5.4 0v4.1"/>',
  compass: '<circle cx="12" cy="12" r="8.4"/><path d="M15.2 8.8l-1.8 4.6-4.6 1.8 1.8-4.6z"/>',
  clock: '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.2V12l3.2 2.1"/>',
  timer: '<circle cx="12" cy="13.2" r="7.4"/><path d="M12 9.6v3.8l2.4 1.5M9.3 2.6h5.4"/>',
  lock: '<rect x="5" y="10.4" width="14" height="9.4" rx="2.2"/><path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6"/>',
  check: '<path d="M4.5 12.6l5.1 5L19.7 6"/>',
  zap: '<path d="M13 2L5.5 13.5H11L10 22l7.5-11.5H12z"/>',
  arrow: '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
  warn: '<path d="M12 3.6L22 20.5H2z"/><path d="M12 10v4.6M12 17.6h.01"/>',
  eye: '<path d="M2.5 12S6.5 5.8 12 5.8 21.5 12 21.5 12 17.5 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'
};
export function icon(name, size) {
  const px = Math.max(10, Math.min(24, Number(size) || 14));
  const body = ICON_PATHS[name];
  if (!body) return "";
  return `<svg class="wc-ic" width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}
