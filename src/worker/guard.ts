import { type Env, json } from './env';

type Handler = (request: Request, env: Env) => Promise<Response>;

/**
 * Wrap an `/api/*` handler so a thrown exception becomes a JSON 500
 * carrying the real message, instead of the Workers runtime's opaque
 * `1101` HTML error page.
 *
 * Without this, a throw inside a handler — e.g. `VECTORIZE.getByIds`
 * rejecting during a reindex plan — reaches the edge uncaught and the
 * caller sees only `<!DOCTYPE html> … error code: 1101`. The reindex CI
 * job then fails with a status it cannot diagnose. A JSON body lets the
 * job (and the logs) name the cause.
 * @param handler The route handler to protect.
 * @returns A handler that never rejects: it answers 500 + `{ error }`.
 */
export const guardErrors =
  (handler: Handler): Handler =>
  async (request, env) => {
    try {
      return await handler(request, env);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return json({ error }, 500);
    }
  };
