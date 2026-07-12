import { describe, expect, it } from 'vitest';
import { normalize, tokenize } from './normalize';

describe('normalize', () => {
  it('folds case', () => {
    expect(normalize('Маркс ENGELS')).toBe('маркс engels');
  });

  /*
   * Readers type `е` for `ё` far more often than not — a query for
   * "нейросети" must still reach a body that spells it "нейросётка".
   * The fold is one-way and lossy on purpose.
   */
  it('folds ё to е so the two spellings collide', () => {
    expect(normalize('нейросёть')).toBe(normalize('нейросеть'));
  });

  /*
   * NFD decomposes `й` into `и` + a combining breve, so a blanket
   * diacritic strip silently turns «война» into «воина». It is a letter,
   * not an accent.
   */
  it('keeps й — it is a letter, not an accented и', () => {
    expect(normalize('нейросеть')).toBe('нейросеть');
    expect(normalize('ВОЙНА')).toBe('война');
    expect(normalize('война')).not.toBe(normalize('воина'));
  });

  it('strips diacritics so Italian and Spanish queries survive a plain keyboard', () => {
    expect(normalize('perché')).toBe('perche');
    expect(normalize('revolución')).toBe('revolucion');
  });

  it('collapses punctuation and whitespace into single spaces', () => {
    expect(normalize('  «Капитал»,\n\tтом  I. ')).toBe('капитал том i');
  });

  it('keeps digits — issue numbers and years are searchable', () => {
    expect(normalize('Обзор 2026')).toBe('обзор 2026');
  });

  it('survives an empty string', () => {
    expect(normalize('')).toBe('');
  });
});

describe('tokenize', () => {
  it('splits a normalized string into words', () => {
    expect(tokenize('искусственный интеллект и труд')).toEqual([
      'искусственный',
      'интеллект',
      'и',
      'труд',
    ]);
  });

  it('returns nothing for a blank query', () => {
    expect(tokenize('   ')).toEqual([]);
  });

  it('normalizes before splitting', () => {
    expect(tokenize('Нейросёти, ИИ!')).toEqual(['нейросети', 'ии']);
  });
});
