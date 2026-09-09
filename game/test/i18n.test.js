// Cadence — i18n tests. Mirrors ARCHITECTURE.md §17.2 / §21.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setLocale, t, availableLocales, currentLocale } from '../src/app/i18n.js';

// minimal document shim so setLocale can touch documentElement
globalThis.document = globalThis.document || { documentElement: {} };

test('default locale returns English strings', () => {
  setLocale('en');
  assert.equal(t('action.start'), 'Start');
  assert.equal(currentLocale(), 'en');
});

test('switching locale returns translated strings', () => {
  setLocale('es');
  assert.equal(t('action.start'), 'Empezar');
});

test('missing key in a locale falls back to English', () => {
  setLocale('es');
  // 'hud.wpm' is only defined in en catalog
  assert.equal(t('hud.wpm'), 'wpm');
});

test('unknown key returns the key itself', () => {
  setLocale('en');
  assert.equal(t('does.not.exist'), 'does.not.exist');
});

test('unknown locale falls back to English', () => {
  setLocale('zz');
  assert.equal(currentLocale(), 'en');
});

test('availableLocales includes en and es', () => {
  const locales = availableLocales();
  assert.ok(locales.includes('en'));
  assert.ok(locales.includes('es'));
});
