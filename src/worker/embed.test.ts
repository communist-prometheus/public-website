import { describe, expect, it, vi } from 'vitest';
import { embed } from './embed';
import type { Env } from './env';

/*
 * The model refuses a call over 60 000 tokens — and it refuses the WHOLE
 * call, so one long article took the whole reindex down with it (AiError
 * 3030, on dev, with 90 passages in one request). These tests hold the
 * fix: the batch is what is bounded, not the article.
 */

const fakeEnv = (run: (model: string, input: { text: string[] }) => Promise<unknown>): Env =>
  ({ AI: { run } }) as unknown as Env;

const vectorsFor = (texts: readonly string[]) => ({
  data: texts.map((text) => [text.length]),
});

describe('embed', () => {
  it('splits a long article into calls the model will accept', async () => {
    const sizes: number[] = [];
    const env = fakeEnv(async (_model, input) => {
      sizes.push(input.text.length);
      return vectorsFor(input.text);
    });

    const texts = Array.from({ length: 45 }, (_, at) => `passage ${at}`);
    await embed(env, texts);

    expect(sizes).toEqual([20, 20, 5]);
  });

  it('keeps the vectors in the order the passages were given', async () => {
    const env = fakeEnv(async (_model, input) => vectorsFor(input.text));
    const texts = ['a', 'bb', 'ccc', ...Array.from({ length: 20 }, () => 'dddd')];

    const vectors = await embed(env, texts);

    expect(vectors.map((v) => v[0])).toEqual(texts.map((t) => t.length));
  });

  it('embeds nothing without calling the model', async () => {
    const run = vi.fn();
    expect(await embed(fakeEnv(run), [])).toEqual([]);
    expect(run).not.toHaveBeenCalled();
  });

  it('refuses a short answer rather than misalign passages and vectors', async () => {
    const env = fakeEnv(async () => ({ data: [[1]] }));
    await expect(embed(env, ['a', 'b'])).rejects.toThrow('got 1');
  });
});
