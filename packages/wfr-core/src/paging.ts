/** Immutable cursor over an ordered collection of files in the viewer. */
export interface PagingState {
  /** Current zero-based index. */
  readonly index: number;
  /** Total number of items. */
  readonly count: number;
}

/** Options controlling paging behaviour at the boundaries. */
export interface PagingOptions {
  /** When true, advancing past an edge wraps to the other end. Default false. */
  readonly wrap?: boolean;
}

/** Clamp an index into the valid range for `count` (or -1 when empty). */
export const clampIndex = (index: number, count: number): number => {
  if (count <= 0) return -1;
  return Math.min(count - 1, Math.max(0, Math.trunc(index)));
};

/** Build a paging state, clamping the index into range. */
export const createPaging = (index: number, count: number): PagingState => ({
  index: clampIndex(index, count),
  count: Math.max(0, Math.trunc(count)),
});

/** Whether a previous item exists given wrap behaviour. */
export const canGoPrev = (state: PagingState, options: PagingOptions = {}): boolean =>
  state.count > 0 && (Boolean(options.wrap) ? state.count > 1 : state.index > 0);

/** Whether a next item exists given wrap behaviour. */
export const canGoNext = (state: PagingState, options: PagingOptions = {}): boolean =>
  state.count > 0 && (Boolean(options.wrap) ? state.count > 1 : state.index < state.count - 1);

/** Move to the previous item, honouring wrap. No-op when not possible. */
export const goPrev = (state: PagingState, options: PagingOptions = {}): PagingState => {
  if (!canGoPrev(state, options)) return state;
  const next = state.index - 1;
  return { ...state, index: next < 0 ? state.count - 1 : next };
};

/** Move to the next item, honouring wrap. No-op when not possible. */
export const goNext = (state: PagingState, options: PagingOptions = {}): PagingState => {
  if (!canGoNext(state, options)) return state;
  const next = state.index + 1;
  return { ...state, index: next >= state.count ? 0 : next };
};

/** Jump to an explicit index, clamped into range. */
export const goTo = (state: PagingState, index: number): PagingState => ({
  ...state,
  index: clampIndex(index, state.count),
});
