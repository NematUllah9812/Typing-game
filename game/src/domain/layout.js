// Cadence — Keyboard layout + finger map. Mirrors ARCHITECTURE.md §6.4 / §8.1.
// Used by the heatmap and (later) per-finger analytics. QWERTY-US for v0.x.

export const QWERTY_ROWS = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['z','x','c','v','b','n','m'],
];

// Which finger "owns" each key in touch-typing (l/r + finger index).
// 0=pinky 1=ring 2=middle 3=index 4=thumb
const FINGER = {
  q:'L1',w:'L2',e:'L3',r:'L4',t:'L4', y:'R4',u:'R4',i:'R3',o:'R2',p:'R1',
  a:'L1',s:'L2',d:'L3',f:'L4',g:'L4', h:'R4',j:'R4',k:'R3',l:'R2',
  z:'L1',x:'L2',c:'L3',v:'L4',b:'L4', n:'R4',m:'R4',
  ' ':'TH',
};

export function fingerFor(key) {
  return FINGER[key.toLowerCase()] || '?';
}

/** Build a per-key lookup {accuracy, latency} from perKeyStats output. */
export function indexKeyStats(perKey) {
  const map = new Map();
  for (const k of perKey) map.set(k.key, k);
  return map;
}
