import { execFile } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * Worker path must point to the original .ts source file,
 * not the Vite-bundled version, because the worker runs in
 * a separate Bun process with its own module resolution.
 */
const workerPath = resolve('src/lib/lit-ssr/worker.ts');

interface PendingRequest {
  readonly id: string;
  readonly component: 'cp-button' | 'cp-card';
  readonly attrs: Record<string, unknown>;
  readonly resolve: (html: string) => void;
  readonly reject: (err: Error) => void;
}

let pending: PendingRequest[] = [];
let flushScheduled = false;
let counter = 0;

/**
 * Flushes all pending SSR requests in a single Bun subprocess.
 * Uses microtask batching: all requests queued in the same tick
 * are sent together, dramatically reducing process spawn overhead.
 */
const flush = (): void => {
  const batch = pending;
  pending = [];
  flushScheduled = false;

  if (batch.length === 0) return;

  const ndjson = batch
    .map((r) =>
      JSON.stringify({
        id: r.id,
        component: r.component,
        attrs: r.attrs,
      }),
    )
    .join('\n');

  const child = execFile(
    'bun',
    ['run', workerPath],
    {
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024 * 4,
    },
    (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        const err = new Error(`Lit SSR worker failed: ${stderr || error.message}`);
        for (const r of batch) r.reject(err);
        return;
      }

      const results = new Map<string, string>();
      for (const line of stdout.trim().split('\n')) {
        const parsed = JSON.parse(line) as { id: string; html: string };
        results.set(parsed.id, parsed.html);
      }

      batch.forEach((r) => {
        const resultHtml = results.get(r.id);
        if (resultHtml !== undefined) {
          r.resolve(resultHtml);
        } else {
          r.reject(new Error(`No SSR result for request ${r.id}`));
        }
      });
    },
  );

  child.stdin?.write(ndjson);
  child.stdin?.end();
};

/**
 * Queues a component render request and returns a Promise for the DSD template.
 * Requests are batched via queueMicrotask and sent in a single subprocess.
 */
const getDsdTemplate = (
  component: 'cp-button' | 'cp-card',
  attrs: Record<string, unknown>,
): Promise<string> =>
  new Promise((resolvePromise, rejectPromise) => {
    pending.push({
      id: String(counter++),
      component,
      attrs,
      resolve: resolvePromise,
      reject: rejectPromise,
    });

    if (!flushScheduled) {
      flushScheduled = true;
      queueMicrotask(flush);
    }
  });

const boolAttr = (name: string, value: boolean | undefined): string => (value ? ` ${name}` : '');

const strAttr = (name: string, value: string | undefined): string =>
  value !== undefined ? ` ${name}="${value}"` : '';

/**
 * Renders a `<cp-button>` with Declarative Shadow DOM at build time.
 * The worker produces only the DSD template; this function assembles
 * the full element HTML with attributes and slot content.
 */
export const renderCpButton = async (
  attrs: {
    readonly variant?: 'primary' | 'secondary' | 'ghost' | undefined;
    readonly size?: 'sm' | 'md' | 'lg' | undefined;
    readonly disabled?: boolean | undefined;
    readonly type?: 'button' | 'submit' | 'reset' | undefined;
    readonly id?: string | undefined;
    readonly ariaLabel?: string | undefined;
  },
  slotContent: string,
): Promise<string> => {
  const dsd = await getDsdTemplate('cp-button', attrs);

  const attrStr = [
    strAttr('id', attrs.id),
    strAttr('aria-label', attrs.ariaLabel),
    strAttr('variant', attrs.variant ?? 'primary'),
    strAttr('size', attrs.size ?? 'md'),
    boolAttr('disabled', attrs.disabled),
    strAttr('type', attrs.type ?? 'button'),
    ' defer-hydration',
  ].join('');

  return `<cp-button${attrStr}>${dsd}${slotContent}</cp-button>`;
};

/**
 * Renders a `<cp-card>` with Declarative Shadow DOM at build time.
 */
export const renderCpCard = async (
  attrs: {
    readonly hoverable?: boolean | undefined;
    readonly elevated?: boolean | undefined;
  },
  slotContent: string,
): Promise<string> => {
  const dsd = await getDsdTemplate('cp-card', attrs);

  const attrStr = [
    boolAttr('hoverable', attrs.hoverable),
    boolAttr('elevated', attrs.elevated),
    ' defer-hydration',
  ].join('');

  return `<cp-card${attrStr}>${dsd}${slotContent}</cp-card>`;
};
