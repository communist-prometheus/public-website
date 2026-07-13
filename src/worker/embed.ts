import { EMBEDDING_MODEL, type Env } from './env';

/*
 * One place that talks to the model, so the query path and the indexing
 * path can never drift into different vector spaces — a query embedded by
 * a different model than the documents would return confident nonsense.
 */

interface EmbeddingResponse {
  readonly data?: readonly (readonly number[])[];
}

/*
 * The model takes 60 000 tokens per CALL, not per text. The longest
 * article here is 72 000 characters — about 90 passages — and handing all
 * of them over at once asked for 63 054 tokens and was refused outright.
 *
 * 20 passages is roughly 8 000 tokens of Russian prose: comfortably under
 * the ceiling even if an article turns out to be denser than any we have.
 * Indexing is a background job; there is nothing to gain by crowding it.
 */
const BATCH = 20;

const runBatch = async (
  env: Env,
  texts: readonly string[],
): Promise<readonly (readonly number[])[]> => {
  const res = (await env.AI.run(EMBEDDING_MODEL, {
    text: [...texts],
  })) as EmbeddingResponse;
  const vectors = res.data ?? [];
  if (vectors.length !== texts.length) {
    throw new Error(`embedding: asked for ${texts.length} vectors, got ${vectors.length}`);
  }
  return vectors;
};

/**
 * Embed a batch of texts.
 * @param env - Worker bindings.
 * @param texts - Texts to embed; order is preserved in the result.
 * @returns One vector per input.
 * @throws When the model returns fewer vectors than it was given texts.
 */
export const embed = async (
  env: Env,
  texts: readonly string[],
): Promise<readonly (readonly number[])[]> => {
  const out: (readonly number[])[] = [];
  for (let at = 0; at < texts.length; at += BATCH) {
    out.push(...(await runBatch(env, texts.slice(at, at + BATCH))));
  }
  return out;
};
