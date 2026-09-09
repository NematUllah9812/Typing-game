// Cadence — Emoji lint gate. Mirrors ARCHITECTURE.md §12.2 / §16.5.
// Fails (exit 1) if any emoji code point appears in source, styles, content,
// resources or docs. Plain technical arrows and geometric math symbols are NOT
// emoji and are allowed. Run: node tools/emoji-lint.mjs
//
// This is the enforcement the architecture promises — the no-emoji rule is
// checked automatically, not left to convention.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', '.git', '.vite']);
const EXTS = new Set(['.js', '.mjs', '.css', '.html', '.json', '.md']);

// Emoji & pictographic ranges + emoji modifiers. Deliberately excludes generic
// math/technical arrows (U+2190–U+21FF) and misc symbols that render as text.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0F}\u{200D}\u{1F1E6}-\u{1F1FF}\u{2B00}-\u{2BFF}\u{2190}\u{2934}\u{2935}]/u;
// Note: we intentionally do not flag → ⇒ ↔ (used as flow notation in docs).

let files = 0;
let hits = 0;
const findings = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (EXCLUDE_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (EXTS.has(extname(name))) scan(full);
  }
}

function scan(file) {
  files++;
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    for (const ch of line) {
      if (EMOJI.test(ch)) {
        hits++;
        findings.push(`${file.replace(ROOT, '')}:${i + 1}: U+${ch.codePointAt(0).toString(16).toUpperCase()} ${JSON.stringify(ch)}`);
      }
    }
  });
}

walk(ROOT);

if (hits > 0) {
  console.error('EMOJI LINT FAILED — no-emoji policy violated (ARCHITECTURE.md §12).');
  for (const f of findings) console.error('  ' + f);
  console.error(`\n${hits} emoji code point(s) found across ${files} files.`);
  process.exit(1);
}

console.log(`emoji-lint: clean. Scanned ${files} files, 0 emoji. (No-emoji policy holds.)`);
