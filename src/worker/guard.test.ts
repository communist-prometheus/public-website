import { describe, expect, it } from 'vitest';
import type { Env } from './env';
import { guardErrors } from './guard';

const env = {} as unknown as Env;
const request = new Request('https://dev.comprom.org/api/reindex', { method: 'POST' });

describe('guardErrors', () => {
  it('passes a successful response straight through', async () => {
    const ok = new Response('{"ok":true}', { status: 200 });
    const guarded = guardErrors(async () => ok);
    expect(await guarded(request, env)).toBe(ok);
  });

  it('turns a thrown Error into a JSON 500 carrying its message', async () => {
    const guarded = guardErrors(async () => {
      throw new Error('VECTORIZE.getByIds failed');
    });
    const res = await guarded(request, env);
    expect(res.status).toBe(500);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    expect(await res.json()).toEqual({ error: 'VECTORIZE.getByIds failed' });
  });

  it('coerces a non-Error throw to a string message', async () => {
    const guarded = guardErrors(async () => {
      throw 'boom';
    });
    const res = await guarded(request, env);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'boom' });
  });
});
