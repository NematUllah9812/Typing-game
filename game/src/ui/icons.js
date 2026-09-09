// Cadence — Vector icon set. Mirrors ARCHITECTURE.md §12. NO EMOJI.
// 24x24 grid, 1.75 stroke, rounded joins, currentColor.

const P = (d) => `<path d="${d}"/>`;

const RAW = {
  play: P('M8 5 L19 12 L8 19 Z'),
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/>' + P('M6 10h0M9 10h0M12 10h0M15 10h0M18 10h0M8 14h8'),
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>',
  chart: P('M4 19V5h4v14M11 19V9h4v10M18 19v-6h3') + P('M2 21h20'),
  trophy: P('M7 4h10v3a5 5 0 0 1-10 0Z') + P('M5 4h2v2a2 2 0 0 1-2 2Zm14 0h-2v2a2 2 0 0 0 2 2Z') + P('M10 12v3M14 12v3M8 20h8M9 20a3 3 0 0 1 6 0'),
  flame: P('M12 3 C13 7 17 8 15 12 C14 15 16 17 12 21 C8 17 10 15 9 12 C7 8 11 7 12 3 Z'),
  timer: '<circle cx="12" cy="13" r="8"/>' + P('M12 13V8.5M12 3v2M9.5 3h5'),
  user: '<circle cx="12" cy="8" r="4"/>' + P('M4 20c0-4 4-6 8-6s8 2 8 6'),
  gear: '<circle cx="12" cy="12" r="3.2"/>' + P('M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2'),
  restart: P('M20 12a8 8 0 1 1-2.3-5.6') + P('M20 4v4h-4'),
  next: P('M5 12h14M13 6l6 6-6 6'),
  check: P('M20 6 L9 17 L4 12'),
  home: P('M4 11l8-7 8 7') + P('M6 10v9h12v-9'),
  quote: P('M7 7h4v6H7z M13 7h4v6h-4z') + P('M7 13c0 2-1 3-3 3M13 13c0 2-1 3-3 3'),
  zen: '<circle cx="12" cy="12" r="8"/>' + P('M4 12c4 3 12 3 16 0'),
  info: '<circle cx="12" cy="12" r="9"/>' + P('M12 11v5M12 8h0'),
  close: P('M6 6l12 12M18 6L6 18'),
  words: P('M4 6h16M4 12h16M4 18h10'),
  volume: P('M4 9v6h4l5 4V5L8 9H4z') + P('M16 9a4 4 0 0 1 0 6'),
  mute: P('M4 9v6h4l5 4V5L8 9H4z') + P('M16 9l4 6M20 9l-4 6'),
};

/** Return an inline SVG string for an icon id. */
export function icon(name, size = 20, extraClass = '') {
  const body = RAW[name];
  if (!body) return '';
  return `<svg class="ico ${extraClass}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

export const ICON_NAMES = Object.keys(RAW);
