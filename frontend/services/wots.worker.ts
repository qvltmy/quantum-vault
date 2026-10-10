/**
 * Web Worker for WOTS+ Merkle tree construction.
 * Offloads the ~51k keccak256 calls off the main thread to prevent UI freezing.
 */
import { buildWOTSTree } from './wotsService';

self.onmessage = (e: MessageEvent<Uint8Array>) => {
  // e.data is structured-cloned Uint8Array (masterSeed / genSeed)
  const seed = new Uint8Array(e.data);
  const tree = buildWOTSTree(seed);
  // WOTSTree is fully structured-cloneable (strings + Uint8Array[][])
  self.postMessage(tree);
};
