export type { SearchDoc, SearchIndex, SearchSection } from './model/doc';
export { contentHash } from './model/hash';
export {
  editDistanceWithin,
  maxEditsFor,
  prefixDistanceWithin,
} from './query/distance';
export type {
  Mark,
  PreparedDoc,
  PreparedIndex,
  SearchHit,
  Snippet,
} from './query/search';
export { prepare, search } from './query/search';
export type { Chunk } from './semantic/chunk';
export { chunkBody } from './semantic/chunk';
export { passageSnippet } from './semantic/passage';
export type { PassageMatch } from './semantic/rank';
export { bestPerDoc } from './semantic/rank';
export { normalize, tokenize } from './text/normalize';
