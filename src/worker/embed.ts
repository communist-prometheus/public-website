import { EMBEDDING_MODEL, type Env } from './env';

/*
 * One place that talks to the model, so the query path and the indexing
 * path can never drift into different vector spaces — a query embedded by
 * a different model than the documents would return confident nonsense.
 */

interface EmbeddingResponse {
  readonly data?: readonly (readonly number[])[];
}

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
  if (texts.length === 0) return [];
  const res = (await env.AI.run(EMBEDDING_MODEL, {
    text: [...texts],
  })) as EmbeddingResponse;
  const vectors = res.data ?? [];
  if (vectors.length !== texts.length) {
    throw new Error(`embedding: asked for ${texts.length} vectors, got ${vectors.length}`);
  }
  return vectors;
};
