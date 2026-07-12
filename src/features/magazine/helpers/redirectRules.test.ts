import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseRedirectRules, splatCount } from './redirectRules';

const RULES = parseRedirectRules(readFileSync(resolve('public/_redirects'), 'utf8'));

const sourceOf = (source: string) => RULES.find((rule) => rule.source === source);

describe('parseRedirectRules', () => {
  it('skips comments and blank lines', () => {
    const parsed = parseRedirectRules('# comment\n\n/from /to 301\n');
    expect(parsed).toEqual([{ source: '/from', destination: '/to', status: 301 }]);
  });

  it('defaults an omitted status to CF-s implicit 302 so the guard below can catch it', () => {
    expect(parseRedirectRules('/from /to\n').at(0)?.status).toBe(302);
  });
});

describe('public/_redirects', () => {
  /*
   * CF Workers Static Assets allows only ONE `*` per URL pattern and
   * silently ignores rules that break the limit — the exact way the
   * sibling `_headers` file regressed before (see its header comment).
   * A silently-dropped rule means every old /newspaper URL 404s.
   */
  it('never uses more than one splat per rule', () => {
    for (const rule of RULES) {
      expect(splatCount(rule.source), `source: ${rule.source}`).toBeLessThanOrEqual(1);
    }
  });

  it('only references :splat in destinations whose source has one', () => {
    for (const rule of RULES) {
      expect(rule.destination.includes(':splat'), `destination: ${rule.destination}`).toBe(
        splatCount(rule.source) === 1,
      );
    }
  });

  it('redirects permanently — a 302 would keep the old URL in the index', () => {
    for (const rule of RULES) {
      expect(rule.status, `source: ${rule.source}`).toBe(301);
    }
  });

  it('maps the localised listing, detail pages and RSS feed to /magazine', () => {
    expect(sourceOf('/:lang/newspaper')?.destination).toBe('/:lang/magazine');
    expect(sourceOf('/:lang/newspaper/*')?.destination).toBe('/:lang/magazine/:splat');
    expect(sourceOf('/:lang/newspaper.xml')?.destination).toBe('/:lang/magazine.xml');
  });

  it('maps the language-less asset paths the download links used to point at', () => {
    expect(sourceOf('/newspaper/*')?.destination).toBe('/magazine/:splat');
  });
});
