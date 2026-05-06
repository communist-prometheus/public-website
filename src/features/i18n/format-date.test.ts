import { describe, expect, it } from 'vitest';
import { formatArticleDate } from './format-date';

const SAMPLE = new Date(Date.UTC(2026, 4, 5, 12, 0, 0));

describe('formatArticleDate', () => {
  it('formats English in long form', () => {
    expect(formatArticleDate(SAMPLE, 'en')).toBe('May 5, 2026');
  });

  it('formats Russian with Cyrillic month', () => {
    const out = formatArticleDate(SAMPLE, 'ru');
    expect(out).toContain('мая');
    expect(out).toContain('2026');
  });

  it('formats Italian with localised month', () => {
    const out = formatArticleDate(SAMPLE, 'it');
    expect(out.toLowerCase()).toContain('maggio');
    expect(out).toContain('2026');
  });

  it('formats Spanish with localised month', () => {
    const out = formatArticleDate(SAMPLE, 'es');
    expect(out.toLowerCase()).toContain('mayo');
    expect(out).toContain('2026');
  });

  it('maps `bl` to Bulgarian (bg-BG)', () => {
    const viaAlias = formatArticleDate(SAMPLE, 'bl');
    const viaBcp47 = new Intl.DateTimeFormat('bg-BG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(SAMPLE);
    expect(viaAlias).toBe(viaBcp47);
    expect(viaAlias.toLowerCase()).toContain('май');
  });

  it('formats Polish with localised month', () => {
    const out = formatArticleDate(SAMPLE, 'pl');
    expect(out.toLowerCase()).toContain('maja');
    expect(out).toContain('2026');
  });

  it('formats Ukrainian with localised month', () => {
    const out = formatArticleDate(SAMPLE, 'uk');
    expect(out.toLowerCase()).toContain('травня');
    expect(out).toContain('2026');
  });

  it('falls back to English for unknown language codes', () => {
    expect(formatArticleDate(SAMPLE, 'zz')).toBe('May 5, 2026');
  });
});
