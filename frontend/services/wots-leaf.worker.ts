/**
 * Web Worker: compute WOTS+ leaf hashes for a slice [from, to) of the tree.
 * Spawned in parallel (one per CPU core) by buildWOTSTreeAsync.
 */
import { buildLeafRange } from './wotsService';

self.onmessage = (e: MessageEvent<{ seed: Uint8Array; from: number; to: number }>) => {
  const { seed, from, to } = e.data;
  const masterSeed = new Uint8Array(seed);
  const leafHashes = buildLeafRange(masterSeed, from, to);
  // Transfer each Uint8Array buffer (zero-copy) back to the main thread
  const transferables = leafHashes.map(h => h.buffer);
  (self as any).postMessage({ from, leafHashes }, transferables);
};
