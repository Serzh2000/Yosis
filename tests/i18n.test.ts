import assert from 'node:assert/strict';
import test from 'node:test';
import { languageFor, registerEnglish, setLanguage, t } from '../shared/i18n';
import { english } from '../src/i18n/en';

test('Russian is the source text; English is looked up and falls back to Russian', () => {
  registerEnglish({ 'Привет, {name}': 'Hello, {name}' });
  setLanguage('ru');
  assert.equal(t('Привет, {name}', { name: 'Аня' }), 'Привет, Аня');
  setLanguage('en');
  assert.equal(t('Привет, {name}', { name: 'Ann' }), 'Hello, Ann');
  assert.equal(t('Нет перевода'), 'Нет перевода');
  setLanguage('ru');
});

test('the browser language picks the interface language', () => {
  assert.equal(languageFor(['ru-RU', 'en']), 'ru');
  assert.equal(languageFor(['en-US']), 'en');
  assert.equal(languageFor(['de']), 'en');
  assert.equal(languageFor(undefined), 'ru');
});

test('the English dictionary is clean: translated, no Cyrillic left, placeholders kept', () => {
  for (const [ru, en] of Object.entries(english)) {
    assert.ok(en.trim(), ru);
    assert.doesNotMatch(en, /[А-Яа-яЁё]/, `${ru} → ${en}`);
    assert.deepEqual(
      [...en.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort(),
      [...ru.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort(),
      ru,
    );
  }
});
