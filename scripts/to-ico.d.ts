/*
 * Ambient typing for `to-ico` — the package ships no `.d.ts` and
 * has no `@types/to-ico` on the registry. The runtime contract is
 * `(buffers: Buffer[]) => Promise<Buffer>`.
 */
declare module 'to-ico' {
  const toIco: (buffers: readonly Buffer[]) => Promise<Buffer>;
  export default toIco;
}
