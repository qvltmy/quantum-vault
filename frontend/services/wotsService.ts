/**
 * WOTS+ on-chain verifier — JS counterpart to WOTSVerifier.sol
 * Parameters: w=16, n=32, L1=64, L2=3, L=67, keccak256
 * Must match the contract exactly: same step layout, same Merkle combination.
 */

import { keccak_256 } from '@noble/hashes/sha3.js';

const W  = 16;
const L1 = 64;
const L  = 67;

export const TREE_DEPTH = 8;
export const TREE_SIZE  = 1 << TREE_DEPTH; // 256 leaves

// ── helpers ──────────────────────────────────────────────────────────────────

function u32BE(n: number): [number, number, number, number] {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
}

function toHex32(b: Uint8Array): string {
  return '0x' + Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++)
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

// ── WOTS+ chain step ──────────────────────────────────────────────────────────
// Matches contract _step():
//   input = pubSeed[32] || uint32BE(i)[4] || uint8(j)[1]  → total 37 bytes
//   bitmask = keccak256(input)
//   result  = keccak256(val XOR bitmask)

function step(val: Uint8Array, pubSeed: Uint8Array, i: number, j: number): Uint8Array {
  const input = new Uint8Array(37);
  input.set(pubSeed, 0);
  const [b0, b1, b2, b3] = u32BE(i);
  input[32] = b0; input[33] = b1; input[34] = b2; input[35] = b3;
  input[36] = j & 0xff;
  const bm = keccak_256(input);
  const xored = new Uint8Array(32);
  for (let k = 0; k < 32; k++) xored[k] = val[k] ^ bm[k];
  return keccak_256(xored);
}

function chain(
  start: Uint8Array, pubSeed: Uint8Array,
  chainIdx: number, from: number, numSteps: number
): Uint8Array {
  let val = start;
  for (let s = 0; s < numSteps; s++) val = step(val, pubSeed, chainIdx, from + s);
  return val;
}

// ── Key derivation ────────────────────────────────────────────────────────────

/** pubSeed = keccak256(masterSeed || "QVPS") — deterministic, distinct from leaf seeds. */
export function derivePubSeed(masterSeed: Uint8Array): Uint8Array {
  const input = new Uint8Array(36);
  input.set(masterSeed, 0);
  // tag bytes: 'Q'=81 'V'=86 'P'=80 'S'=83
  input[32] = 81; input[33] = 86; input[34] = 80; input[35] = 83;
  return keccak_256(input);
}

/** leafSeed_j = keccak256(masterSeed || uint32BE(j)) */
function deriveLeafSeed(masterSeed: Uint8Array, j: number): Uint8Array {
  const input = new Uint8Array(36);
  input.set(masterSeed, 0);
  const [b0, b1, b2, b3] = u32BE(j);
  input[32] = b0; input[33] = b1; input[34] = b2; input[35] = b3;
  return keccak_256(input);
}

/** sk_i = keccak256(leafSeed || uint32BE(i)) */
function deriveSK(leafSeed: Uint8Array, i: number): Uint8Array {
  const input = new Uint8Array(36);
  input.set(leafSeed, 0);
  const [b0, b1, b2, b3] = u32BE(i);
  input[32] = b0; input[33] = b1; input[34] = b2; input[35] = b3;
  return keccak_256(input);
}

// ── Single leaf computation ───────────────────────────────────────────────────

function computePKs(leafSeed: Uint8Array, pubSeed: Uint8Array): Uint8Array[] {
  const pks: Uint8Array[] = [];
  for (let i = 0; i < L; i++) {
    const sk = deriveSK(leafSeed, i);
    pks.push(chain(sk, pubSeed, i, 0, W - 1));
  }
  return pks;
}

function leafHashFromPKs(pks: Uint8Array[]): Uint8Array {
  // Matches WOTSVerifier.leafHash(): keccak256(0x00 || 67×32 bytes) = 2145 bytes
  const concat = new Uint8Array(1 + L * 32);
  concat[0] = 0x00; // domain separation prefix
  for (let i = 0; i < L; i++) concat.set(pks[i], 1 + i * 32);
  return keccak_256(concat);
}

// ── WOTS+ signature ───────────────────────────────────────────────────────────

function nibbles(msgHash: Uint8Array): Uint8Array {
  const b = new Uint8Array(L);
  for (let k = 0; k < 32; k++) {
    b[2 * k]     = (msgHash[k] >> 4) & 0xf;
    b[2 * k + 1] =  msgHash[k]       & 0xf;
  }
  let checksum = 0;
  for (let k = 0; k < L1; k++) checksum += (W - 1) - b[k];
  b[64] = (checksum >> 8) & 0xf;
  b[65] = (checksum >> 4) & 0xf;
  b[66] =  checksum       & 0xf;
  return b;
}

export function signWOTSLeaf(
  msgHashHex: string,
  leafSeed: Uint8Array,
  pubSeed: Uint8Array
): { otsSig: string[]; otsPubKey: string[] } {
  const msgHash = hexToBytes(msgHashHex);
  const b = nibbles(msgHash);

  const otsSig: string[]    = [];
  const otsPubKey: string[] = [];

  for (let i = 0; i < L; i++) {
    const sk = deriveSK(leafSeed, i);
    otsSig.push(toHex32(chain(sk, pubSeed, i, 0, b[i])));
    otsPubKey.push(toHex32(chain(sk, pubSeed, i, 0, W - 1)));
  }

  return { otsSig, otsPubKey };
}

// ── Merkle tree ───────────────────────────────────────────────────────────────

export interface WOTSTree {
  merkleRoot: string;      // bytes32 hex
  pubSeed: string;         // bytes32 hex
  // levels[0] = [root], levels[TREE_DEPTH] = 256 leaf hashes
  levels: Uint8Array[][];
}

/**
 * Build a full WOTS+ Merkle tree from masterSeed — async, runs in a Web Worker
 * so the main thread / UI stays responsive during the ~51k keccak256 calls.
 */
export function buildWOTSTreeAsync(seed: Uint8Array): Promise<WOTSTree> {
  return new Promise((resolve, reject) => {
    // Vite's ?worker&inline syntax bundles the worker into the main chunk
    // so there is no separate file to serve and no cross-origin issues.
    const worker = new Worker(
      new URL('./wots.worker.ts', import.meta.url),
      { type: 'module' }
    );
    worker.onmessage = (e: MessageEvent<WOTSTree>) => {
      worker.terminate();
      resolve(e.data);
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error('WOTS worker error: ' + e.message));
    };
    // structured-clone transfers the buffer (zero-copy)
    const copy = seed.slice();
    worker.postMessage(copy, [copy.buffer]);
  });
}

/**
 * Build a full WOTS+ Merkle tree from masterSeed.
 * ~0.1-0.3s in browser for 256 leaves.
 */
export function buildWOTSTree(masterSeed: Uint8Array): WOTSTree {
  const pubSeedBytes = derivePubSeed(masterSeed);

  // leaf hashes
  const leafHashes: Uint8Array[] = [];
  for (let j = 0; j < TREE_SIZE; j++) {
    const leafSeed = deriveLeafSeed(masterSeed, j);
    const pks = computePKs(leafSeed, pubSeedBytes);
    leafHashes.push(leafHashFromPKs(pks));
  }

  // build tree bottom-up
  const levels: Uint8Array[][] = new Array(TREE_DEPTH + 1);
  levels[TREE_DEPTH] = leafHashes;
  for (let d = TREE_DEPTH - 1; d >= 0; d--) {
    const prev = levels[d + 1];
    const curr: Uint8Array[] = [];
    for (let i = 0; i < prev.length; i += 2) {
      // Matches WOTSVerifier.verifyMerkle(): keccak256(0x01 || left || right)
      const combined = new Uint8Array(65);
      combined[0] = 0x01; // domain separation prefix
      combined.set(prev[i], 1);
      combined.set(prev[i + 1], 33);
      curr.push(keccak_256(combined));
    }
    levels[d] = curr;
  }

  return {
    merkleRoot: toHex32(levels[0][0]),
    pubSeed:    toHex32(pubSeedBytes),
    levels,
  };
}

/**
 * Merkle inclusion proof for leaf at `leafIndex`.
 * Returns sibling hashes bottom-up (leaf level → root level).
 * Matches the contract's verifyMerkle() direction.
 */
export function getMerkleProof(tree: WOTSTree, leafIndex: number): string[] {
  const proof: string[] = [];
  let idx = leafIndex;
  for (let d = TREE_DEPTH; d > 0; d--) {
    const siblingIdx = (idx % 2 === 0) ? idx + 1 : idx - 1;
    proof.push(toHex32(tree.levels[d][siblingIdx]));
    idx = Math.floor(idx / 2);
  }
  return proof;
}

/**
 * Derive password preimage: keccak256(masterSeed || "QVPW")
 * Must match the bytes32 passed to directExecute as passwordPreimage.
 * Contract checks: keccak256(passwordPreimage, passwordDomain) == passwordCommit
 */
export function derivePasswordPreimage(masterSeed: Uint8Array): string {
  const input = new Uint8Array(36);
  input.set(masterSeed, 0);
  // tag: 'Q'=81 'V'=86 'P'=80 'W'=87
  input[32] = 81; input[33] = 86; input[34] = 80; input[35] = 87;
  return toHex32(keccak_256(input));
}

/**
 * Compute passwordDomain (matches contract constructor):
 *   keccak256(abi.encode(primaryMerkleRoot, primaryPubSeed))
 *
 * Note: chainId intentionally excluded — passwordDomain is chain-agnostic so
 * the same passwordCommit produces the same CREATE2 address on every chain.
 * Replay protection is handled by opHash / userOpHash which already bind chainId.
 */
export function derivePasswordDomain(
  merkleRoot: string,
  pubSeed: string,
): string {
  // abi.encode(bytes32, bytes32) = 2×32 bytes
  const buf = new Uint8Array(64);
  buf.set(hexToBytes(merkleRoot), 0);
  buf.set(hexToBytes(pubSeed), 32);
  return toHex32(keccak_256(buf));
}

/**
 * Compute passwordCommit:
 *   keccak256(abi.encode(passwordPreimage, passwordDomain))
 */
export function computePasswordCommit(
  passwordPreimage: string,
  merkleRoot: string,
  pubSeed: string,
): string {
  const domain = derivePasswordDomain(merkleRoot, pubSeed);
  // abi.encode(bytes32, bytes32) = 64 bytes
  const buf = new Uint8Array(64);
  buf.set(hexToBytes(passwordPreimage), 0);
  buf.set(hexToBytes(domain), 32);
  return toHex32(keccak_256(buf));
}

/**
 * Derive the signing-key seed for generation N.
 * Gen 0 = masterSeed itself (original tree used at vault creation).
 * Gen N = keccak256(masterSeed || "QVGEN" || uint32BE(N))
 *
 * IMPORTANT: passwordPreimage is ALWAYS derived from masterSeed (gen 0),
 * never from genSeed. The signing tree changes each generation but the
 * password proof never changes.
 */
export function deriveGenerationSeed(masterSeed: Uint8Array, generation: number): Uint8Array {
  if (generation === 0) return masterSeed;
  const input = new Uint8Array(41);
  input.set(masterSeed, 0);
  // tag: 'Q'=81 'V'=86 'G'=71 'E'=69 'N'=78
  input[32] = 81; input[33] = 86; input[34] = 71; input[35] = 69; input[36] = 78;
  const g = generation;
  input[37] = (g >>> 24) & 0xff;
  input[38] = (g >>> 16) & 0xff;
  input[39] = (g >>>  8) & 0xff;
  input[40] =  g          & 0xff;
  return keccak_256(input);
}

export function prepareDirectExecSig(
  masterSeed: Uint8Array,
  tree: WOTSTree,
  leafIndex: number,
  opHashHex: string
): { otsPubKey: string[]; otsSig: string[]; merkleProof: string[] } {
  const pubSeedBytes = derivePubSeed(masterSeed);
  const leafSeed     = deriveLeafSeed(masterSeed, leafIndex);
  const { otsSig, otsPubKey } = signWOTSLeaf(opHashHex, leafSeed, pubSeedBytes);
  return { otsSig, otsPubKey, merkleProof: getMerkleProof(tree, leafIndex) };
}
