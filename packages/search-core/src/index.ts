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
export { normalize, tokenize } from './text/normalize';
