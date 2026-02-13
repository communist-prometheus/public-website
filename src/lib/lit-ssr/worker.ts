/// <reference types="@types/bun" />
/**
 * SSR worker script — runs in a separate Bun subprocess
 * to avoid conflicts between Astro's Vite DOM and @lit-labs/ssr DOM shim.
 *
 * Reads NDJSON (newline-delimited JSON) from stdin.
 * Each line: { id, component, attrs }
 * Writes NDJSON to stdout: { id, html } per line.
 *
 * Renders ONLY the Declarative Shadow DOM (the <template shadowrootmode> block).
 * Slot content is NOT passed through the SSR renderer to avoid double-rendering
 * nested custom elements. The Astro wrapper assembles the final HTML.
 */
import '@lit-labs/ssr/lib/install-global-dom-shim.js';
import { render } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import { html } from 'lit';
import '@communist-prometheus/cp-components';

type RenderResult = ReturnType<typeof render>;

/**
 * Strips Lit SSR comment markers and the legacy shadowroot attribute.
 */
const cleanSsrOutput = (raw: string): string =>
  raw
    .replace(/<!--\/?lit-part.*?-->/g, '')
    .replace(/<!--lit-node \d+-->/g, '')
    .replace(/ shadowroot="open"/g, '')
    .trim();

/**
 * Extracts just the <template shadowrootmode="open">...</template> block
 * from the full SSR output of a custom element.
 */
const extractDsdTemplate = (fullHtml: string): string => {
  const start = fullHtml.indexOf('<template shadowrootmode');
  const end = fullHtml.indexOf('</template>') + '</template>'.length;
  if (start === -1 || end <= start) return '';
  return fullHtml.substring(start, end);
};

interface SsrRequest {
  readonly id: string;
  readonly component: 'cp-button' | 'cp-card';
  readonly attrs: Record<string, unknown>;
}

const renderButton = (attrs: Record<string, unknown>): RenderResult => {
  const variant = (attrs.variant ?? 'primary') as string;
  const size = (attrs.size ?? 'md') as string;
  const disabled = (attrs.disabled ?? false) as boolean;
  const type = (attrs.type ?? 'button') as string;

  return render(
    html`<cp-button
      variant=${variant}
      size=${size}
      ?disabled=${disabled}
      type=${type}
    >placeholder</cp-button>`,
  );
};

const renderCard = (attrs: Record<string, unknown>): RenderResult => {
  const hoverable = (attrs.hoverable ?? false) as boolean;
  const elevated = (attrs.elevated ?? false) as boolean;

  return render(
    html`<cp-card
      ?hoverable=${hoverable}
      ?elevated=${elevated}
    >placeholder</cp-card>`,
  );
};

const processRequest = async (req: SsrRequest): Promise<string> => {
  const renderResult =
    req.component === 'cp-button' ? renderButton(req.attrs) : renderCard(req.attrs);

  const fullOutput = cleanSsrOutput(await collectResult(renderResult));
  return extractDsdTemplate(fullOutput);
};

// biome-ignore lint/correctness/noUndeclaredVariables: Bun global is available at runtime
const input = await Bun.stdin.text();
const lines = input.trim().split('\n');
const results: string[] = [];

for (const line of lines) {
  const req: SsrRequest = JSON.parse(line);
  const dsdTemplate = await processRequest(req);
  results.push(JSON.stringify({ id: req.id, html: dsdTemplate }));
}

process.stdout.write(results.join('\n'));
