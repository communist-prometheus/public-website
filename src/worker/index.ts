import type { Env } from './env';
import { handleReindex } from './reindex';
import { handleSemantic } from './semantic';

/*
 * The site is static. This Worker exists only for the two things a static
 * file cannot do: embed a query, and re-embed an article. Everything else
 * falls straight through to the assets, byte for byte as before —
 * `run_worker_first` in wrangler.jsonc limits us to `/api/*`, so no reader
 * pays for this on any other request.
 */

const ROUTES: Record<string, (request: Request, env: Env) => Promise<Response>> = {
  '/api/semantic': handleSemantic,
  '/api/reindex': handleReindex,
};

export default {
  /**
   * @param request Incoming request.
   * @param env Worker bindings.
   * @returns The API answer, or the static asset.
   */
  fetch: async (request: Request, env: Env): Promise<Response> => {
    const route = ROUTES[new URL(request.url).pathname];
    return route ? route(request, env) : env.ASSETS.fetch(request);
  },
};
