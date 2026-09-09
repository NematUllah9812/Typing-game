// Cadence — Achievements (pure rules). Mirrors ARCHITECTURE.md §11.2 / §7.
// Each achievement is a pure predicate over a run result + aggregate context.

/**
 * @typedef {Object} AchievementCtx
 * @property {import('./scoring.js').RunResult & {modeId:string,bestStreak?:number}} run
 * @property {number} totalRuns
 * @property {number} bestWpmEver
 */

export const ACHIEVEMENTS = [
  { id: 'first-run', icon: 'play', title: 'First Steps',
    desc: 'Complete your first run.',
    test: (c) => c.totalRuns >= 1 },
  { id: 'wpm-40', icon: 'timer', title: 'Warmed Up',
    desc: 'Reach 40 net WPM in a run.',
    test: (c) => c.run.netWpm >= 40 },
  { id: 'wpm-60', icon: 'flame', title: 'Fast Fingers',
    desc: 'Reach 60 net WPM in a run.',
    test: (c) => c.run.netWpm >= 60 },
  { id: 'wpm-80', icon: 'flame', title: 'Blazing',
    desc: 'Reach 80 net WPM in a run.',
    test: (c) => c.run.netWpm >= 80 },
  { id: 'wpm-100', icon: 'trophy', title: 'Century',
    desc: 'Reach 100 net WPM in a run.',
    test: (c) => c.run.netWpm >= 100 },
  { id: 'flawless', icon: 'check', title: 'Flawless',
    desc: 'Finish a run at 100% accuracy.',
    test: (c) => c.run.accuracy >= 100 && c.run.charsTyped >= 20 },
  { id: 'steady', icon: 'chart', title: 'Metronome',
    desc: 'Finish with 90+ consistency.',
    test: (c) => c.run.consistency >= 90 },
  { id: 'streak-50', icon: 'flame', title: 'On a Roll',
    desc: 'Hit a 50-character streak.',
    test: (c) => (c.run.bestStreak ?? 0) >= 50 },
  { id: 'streak-100', icon: 'flame', title: 'Unbroken',
    desc: 'Hit a 100-character streak.',
    test: (c) => (c.run.bestStreak ?? 0) >= 100 },
  { id: 'marathon', icon: 'timer', title: 'Marathoner',
    desc: 'Complete a 120-second timed test.',
    test: (c) => c.run.modeId === 'timed' && c.run.durationMs >= 118000 },
  { id: 'dedicated', icon: 'user', title: 'Dedicated',
    desc: 'Complete 25 runs.',
    test: (c) => c.totalRuns >= 25 },
  { id: 'scholar', icon: 'quote', title: 'Scholar',
    desc: 'Finish a long quote.',
    test: (c) => c.run.modeId === 'quote' && c.run.charsTyped >= 200 },
];

/**
 * Given the context and the set of already-unlocked ids, return the newly
 * unlocked achievement objects.
 * @param {AchievementCtx} ctx
 * @param {Set<string>} unlocked
 * @returns {typeof ACHIEVEMENTS}
 */
export function evaluate(ctx, unlocked) {
  const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (unlocked.has(a.id)) continue;
    try {
      if (a.test(ctx)) newly.push(a);
    } catch {
      /* defensive: a bad predicate never breaks a run */
    }
  }
  return newly;
}
