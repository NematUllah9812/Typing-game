// Cadence — Localization framework. Mirrors ARCHITECTURE.md §17.2.
// Keyed strings, no concatenation. Adding a language = adding a catalog; no code
// changes. English ships at v1.0; the structure supports RTL + more locales.

const CATALOGS = {
  en: {
    'nav.play': 'Play',
    'nav.learn': 'Learn',
    'nav.arcade': 'Arcade',
    'nav.achievements': 'Achievements',
    'nav.stats': 'Stats',
    'nav.settings': 'Settings',
    'action.start': 'Start',
    'action.retry': 'Retry',
    'action.new': 'New run',
    'action.home': 'Home',
    'action.raceGhost': 'Race ghost',
    'action.end': 'End',
    'hud.wpm': 'wpm',
    'hud.acc': 'acc',
    'hud.left': 'left',
    'hud.sec': 'sec',
    'hud.streak': 'streak',
    'results.netWpm': 'wpm net',
    'results.rawWpm': 'raw wpm',
    'results.accuracy': 'accuracy',
    'results.consistency': 'consistency',
    'results.errors': 'errors',
    'results.time': 'time',
    'results.newPb': 'new personal best',
    'settings.title': 'Settings',
    'settings.theme': 'Theme',
    'settings.sound': 'Sound',
    'settings.motion': 'Reduced motion',
    'settings.caret': 'Caret style',
    'settings.language': 'Language',
    'settings.data': 'Data',
    'settings.exportData': 'Export data',
    'settings.clearData': 'Clear all data',
    'stats.title': 'Statistics',
    'common.on': 'On',
    'common.off': 'Off',
  },
  // Example second locale scaffold (partial) to prove the framework works.
  es: {
    'nav.play': 'Jugar',
    'nav.learn': 'Aprender',
    'nav.arcade': 'Arcade',
    'nav.achievements': 'Logros',
    'nav.stats': 'Estadísticas',
    'nav.settings': 'Ajustes',
    'action.start': 'Empezar',
    'action.retry': 'Reintentar',
    'action.new': 'Nueva',
    'action.home': 'Inicio',
    'action.raceGhost': 'Correr fantasma',
    'action.end': 'Terminar',
    'settings.title': 'Ajustes',
    'settings.theme': 'Tema',
    'settings.sound': 'Sonido',
    'settings.motion': 'Movimiento reducido',
    'settings.caret': 'Estilo de cursor',
    'settings.language': 'Idioma',
    'settings.data': 'Datos',
    'stats.title': 'Estadísticas',
    'common.on': 'Sí',
    'common.off': 'No',
  },
};

const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur']);

let current = 'en';

export function setLocale(lang) {
  current = CATALOGS[lang] ? lang : 'en';
  document.documentElement.lang = current;
  document.documentElement.dir = RTL_LANGS.has(current) ? 'rtl' : 'ltr';
}

export function availableLocales() {
  return Object.keys(CATALOGS);
}

/** Translate a key; falls back to English, then to the key itself. */
export function t(key) {
  return CATALOGS[current]?.[key] ?? CATALOGS.en[key] ?? key;
}

export function currentLocale() {
  return current;
}
