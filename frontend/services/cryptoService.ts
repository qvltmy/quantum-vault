import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { ethers } from 'ethers';

export const ML_DSA_65_PUBLIC_KEY_BYTES = 1952;
export const ML_DSA_65_SIGNATURE_BYTES = 3309;
export const SEED_BYTES = 32;
/// @deprecated STATIC_SALT is all-zero and vulnerable to rainbow table attacks.
/// New accounts should use deriveQuantumKeyWithSalt(password, accountSalt),
/// passing the account address or first 32 bytes of publicKeyHash as salt.
/// This constant is kept only for compatibility with already-deployed accounts; do not use for new accounts.
export const STATIC_SALT = new Uint8Array(32);

/**
 * Recommended: account-level unique salt to prevent rainbow table attacks.
 * @param accountSalt  Account address (hex string) or publicKeyHash (32 bytes hex) used as salt.
 *                     Same password + different salt → different keys, accounts are fully isolated.
 */
export function makeAccountSalt(accountIdentifier: string): Uint8Array {
  const hex = accountIdentifier.replace(/^0x/, '').padEnd(64, '0').slice(0, 64);
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Recommended: derive keys with account-unique salt (required for new accounts).
 * Usage:
 *   1. Derive once with STATIC_SALT to obtain the ecdsaSigner address
 *   2. Call factory.createAccount to obtain accountAddress
 *   3. Re-derive with makeAccountSalt(accountAddress) and store the final keys
 * Note: the factory stores the final key's publicKeyHash + ecdsaSigner on-chain,
 *       so the front-end must determine the salt before creating the account.
 *       Recommended: accountSalt = first 32 bytes of keccak256(password + "quantum-vault-v1"),
 *             so the salt can be determined without knowing the account address.
 */
export async function deriveQuantumKeyWithSalt(
  password: string,
  salt: Uint8Array
): Promise<QuantumVaultKeys | null> {
  const seed = await deriveArgon2Seed(password, salt);
  if (!seed) return null;

  const seedHex = '0x' + Array.from(seed, b => b.toString(16).padStart(2, '0')).join('');
  let ecdsaWallet: ethers.Wallet;
  try {
    ecdsaWallet = new ethers.Wallet(seedHex);
  } catch (e) {
    console.error('Failed to create ECDSA wallet:', e);
    return null;
  }

  const { publicKey, secretKey } = ml_dsa65.keygen(seed);
  if (publicKey.length !== ML_DSA_65_PUBLIC_KEY_BYTES) {
    console.error('Bad ML-DSA public key length:', publicKey.length);
    return null;
  }

  const publicKeyHashBytes = keccak_256(publicKey);
  const publicKeyHash = '0x' + Array.from(publicKeyHashBytes, b => b.toString(16).padStart(2, '0')).join('');

  return { publicKey, secretKey, publicKeyHash, ecdsaSigner: ecdsaWallet.address, ecdsaWallet };
}

const WORKER_CODE = `
self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/argon2-browser/1.18.0/argon2-bundled.min.js');
self.onmessage = function(e) {
  const { pass, salt, time, mem, parallelism, hashLen } = e.data;
  if (!self.argon2) { self.postMessage({ error: 'argon2 not loaded' }); return; }
  self.argon2.hash({ pass, salt, time, mem, parallelism, hashLen, type: self.argon2.ArgonType.Argon2id })
    .then(res => self.postMessage({ hash: res.hash }))
    .catch(err => self.postMessage({ error: err.message }));
};
`;

let workerUrl: string | null = null;
function getWorkerUrl() {
  if (!workerUrl) {
    workerUrl = URL.createObjectURL(new Blob([WORKER_CODE], { type: 'application/javascript' }));
  }
  return workerUrl;
}

async function deriveArgon2Seed(password: string, salt: Uint8Array): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const worker = new Worker(getWorkerUrl());
    worker.onmessage = (e) => {
      worker.terminate();
      if (e.data.hash) resolve(new Uint8Array(e.data.hash));
      else { console.error("Argon2 error:", e.data.error); resolve(null); }
    };
    worker.onerror = (e) => { worker.terminate(); console.error("Worker error:", e); resolve(null); };
    worker.postMessage({
      pass: password,
      salt,
      time: 3,
      mem: 131072,   // 128 MB — NIST post-quantum hardening level
      parallelism: 4,
      hashLen: SEED_BYTES
    });
  });
}

export interface QuantumVaultKeys {
  publicKey:     Uint8Array;      // 1952 bytes ML-DSA-65
  secretKey:     Uint8Array;      // 4032 bytes
  publicKeyHash: string;          // '0x...' keccak256(publicKey) — on-chain ID in quantum mode
  ecdsaSigner:   string;          // '0x...' ECDSA address — on-chain ID in classic mode
  ecdsaWallet:   ethers.Wallet;   // used for direct signing in classic mode
}

/**
 * Derive both ML-DSA-65 and ECDSA keys from password.
 * 1. Argon2id(password, zeroSalt) → 32-byte seed
 * 2. ethers.Wallet(seed) → ecdsaSigner address
 * 3. ml_dsa65.keygen(seed) → ML-DSA keys
 * 4. publicKeyHash = keccak256(mldsaPublicKey)
 */
export async function deriveQuantumKey(password: string): Promise<QuantumVaultKeys | null> {
  const seed = await deriveArgon2Seed(password, STATIC_SALT);
  if (!seed) return null;

  const seedHex = '0x' + Array.from(seed, b => b.toString(16).padStart(2, '0')).join('');
  let ecdsaWallet: ethers.Wallet;
  try {
    ecdsaWallet = new ethers.Wallet(seedHex);
  } catch (e) {
    console.error('Failed to create ECDSA wallet:', e);
    return null;
  }

  const { publicKey, secretKey } = ml_dsa65.keygen(seed);
  if (publicKey.length !== ML_DSA_65_PUBLIC_KEY_BYTES) {
    console.error('Bad ML-DSA public key length:', publicKey.length);
    return null;
  }

  const publicKeyHashBytes = keccak_256(publicKey);
  const publicKeyHash = '0x' + Array.from(publicKeyHashBytes, b => b.toString(16).padStart(2, '0')).join('');

  return { publicKey, secretKey, publicKeyHash, ecdsaSigner: ecdsaWallet.address, ecdsaWallet };
}

/**
 * Sign a vault operation with the ECDSA key derived from password.
 * Uses ethers signMessage (EIP-191) — contract must use ECDSA.toEthSignedMessageHash.
 */
export async function signECDSAForVault(
  password: string,
  actionHash: string,   // '0x' + 32 bytes hex
  _nonce: bigint,
  expiry: bigint
): Promise<{ sig: string; expiry: bigint } | null> {
  const seed = await deriveArgon2Seed(password, STATIC_SALT);
  if (!seed) return null;

  const seedHex = '0x' + Array.from(seed, b => b.toString(16).padStart(2, '0')).join('');
  let wallet: ethers.Wallet;
  try {
    wallet = new ethers.Wallet(seedHex);
  } catch (e) {
    console.error('Failed to create wallet for signing:', e);
    return null;
  }

  const hashHex = actionHash.startsWith('0x') ? actionHash.slice(2) : actionHash;
  const hashBytes = new Uint8Array(Buffer.from(hashHex, 'hex'));
  if (hashBytes.length !== 32) {
    console.error('actionHash must be 32 bytes, got', hashBytes.length);
    return null;
  }

  try {
    const sig = await wallet.signMessage(hashBytes);
    return { sig, expiry };
  } catch (e) {
    console.error('Failed to sign action:', e);
    return null;
  }
}

/**
 * Derive just the Argon2id seed (legacy export — used by App.tsx password check).
 */
export async function deriveArgon2Key(password: string): Promise<Uint8Array | null> {
  return deriveArgon2Seed(password, STATIC_SALT);
}

/**
 * Sign a 32-byte userOpHash with ML-DSA-65.
 * Used when submitting proofs to the SP1 prover service.
 */
export function signUserOpHash(userOpHash: Uint8Array, secretKey: Uint8Array): Uint8Array {
  if (userOpHash.length !== 32) throw new Error('userOpHash must be 32 bytes');
  const signature = ml_dsa65.sign(userOpHash, secretKey);
  if (signature.length !== ML_DSA_65_SIGNATURE_BYTES) {
    throw new Error('bad ML-DSA signature length');
  }
  return signature;
}

/**
 * Prepare JSON input for the SP1 prover binary (quantum_vault_prover).
 */
export function makeProverInput(
  userOpHash: Uint8Array,
  publicKeyHash: Uint8Array,
  publicKey: Uint8Array,
  signature: Uint8Array
) {
  if (userOpHash.length !== 32) throw new Error('userOpHash must be 32 bytes');
  if (publicKeyHash.length !== 32) throw new Error('publicKeyHash must be 32 bytes');
  if (publicKey.length !== ML_DSA_65_PUBLIC_KEY_BYTES) throw new Error('publicKey must be 1952 bytes');
  if (signature.length !== ML_DSA_65_SIGNATURE_BYTES) throw new Error('signature must be 3309 bytes');

  const hex = (arr: Uint8Array) => '0x' + Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  return {
    user_op_hash: hex(userOpHash),
    public_key_hash: hex(publicKeyHash),
    public_key: hex(publicKey),
    signature: hex(signature),
  };
}

/**
 * Build the 64-byte public values for on-chain SP1 proof verification.
 * Format: userOpHash (32 bytes) || publicKeyHash (32 bytes)
 */
export function buildPublicValues(userOpHash: Uint8Array, publicKeyHash: Uint8Array): Uint8Array {
  if (userOpHash.length !== 32 || publicKeyHash.length !== 32) {
    throw new Error('Invalid public values input');
  }
  const result = new Uint8Array(64);
  result.set(userOpHash, 0);
  result.set(publicKeyHash, 32);
  return result;
}

/**
 * Sign a vault action by building the actionHash and signing it.
 * Called during withdraw, addAuthorizer, removeAuthorizer, updateQuantumKey operations.
 * 
 * The contract expects a signature over:
 * keccak256(domainSeparator, actionType, keccak256(params), nonce, expiry)
 */
export async function signVaultOp(
  password: string,
  domainSeparator: string,      // '0x...'
  actionTypeStr: string,          // 'withdraw(address,uint256)'
  paramsEncoded: string,          // '0x...' ABI-encoded params
  nonce: bigint,
  expiry: bigint
): Promise<{ sig: string; expiry: bigint } | null> {
  try {
    // Parse inputs
    const domainHex = domainSeparator.startsWith('0x') ? domainSeparator.slice(2) : domainSeparator;
    const paramsHex = paramsEncoded.startsWith('0x') ? paramsEncoded.slice(2) : paramsEncoded;

    // Hash actionType string
    const actionTypeHash = keccak_256(Buffer.from(actionTypeStr, 'utf-8'));

    // Hash params
    const paramsHash = keccak_256(Buffer.from(paramsHex, 'hex'));

    // Encode the full struct: (domainSep, actionType, paramsHash, nonce, expiry)
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const structEncoded = abiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'uint256'],
      [domainSeparator, '0x' + Array.from(actionTypeHash).map(b => b.toString(16).padStart(2, '0')).join(''), 
       '0x' + Array.from(paramsHash).map(b => b.toString(16).padStart(2, '0')).join(''), 
       nonce, expiry]
    );

    // Final actionHash
    const actionHash = '0x' + Array.from(keccak_256(Buffer.from(structEncoded.slice(2), 'hex')))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    // Sign it
    return signECDSAForVault(password, actionHash, nonce, expiry);
  } catch (e) {
    console.error('Failed to build and sign vault op:', e);
    return null;
  }
}
