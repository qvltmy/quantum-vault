# QuantumVault

A post-quantum smart contract vault secured by **WOTS+ one-time signatures** and **ERC-4337 account abstraction**. Deployed and verified on 6 chains.

## Contracts

| Contract | Address | Role |
|---|---|---|
| `QuantumVaultAccountFactory` | `0xb473acF11db7F27F59213C7FE07D47d0eC569744` | Deploys vault accounts |
| `QuantumVault` | `0x19e1F8515d51375764cddac83B66dFb299e6898D` | Vault logic |
| `QuantumVaultAccount` | `0x05395A5Ae7B25c70DEBF91c9F461135d184c9FEE` | ERC-4337 account |

Verified on: Ethereum · BSC · Base · Arbitrum · Polygon · Robinhood Chain

> BSCScan: [Factory](https://bscscan.com/address/0xb473acF11db7F27F59213C7FE07D47d0eC569744#code) · [Vault](https://bscscan.com/address/0x19e1f8515d51375764cddac83b66dfb299e6898d#code) · [Account](https://bscscan.com/address/0x05395a5ae7b25c70debf91c9f461135d184c9fee#code)

## How it works

1. **WOTS+ signatures** — each key is used once; the signing key is destroyed after use, making brute-force and quantum attacks impractical
2. **Merkle root key rotation** — the vault stores a Merkle root of future public keys; spending rotates to the next key
3. **ERC-4337 AA** — gasless UX via bundlers; the `QuantumVaultAccount` is a standard ERC-4337 smart account
4. **SP1 ZK proofs** — optional zk-proof path for WOTS+ verification via SP1 verifier gateway

## Repository structure

```
contracts/
  QuantumVault.sol                 — vault logic, WOTS+ verification, key rotation
  QuantumVaultAccount.sol          — ERC-4337 smart account
  QuantumVaultAccountFactory.sol   — CREATE2 factory
  WOTSVerifier.sol                 — WOTS+ signature verifier
  interfaces/
    IQuantumVaultFactory.sol
    ISP1Verifier.sol

frontend/                          — React + Vite frontend
```

## Build

**Contracts** (requires [Foundry](https://getfoundry.sh)):
```bash
forge install
forge build
```

Compiler: `solc 0.8.28`, `viaIR: true`, `optimizer: 200 runs`, `evmVersion: cancun`

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

## Demo

Visit the live app and click **Try Demo Vault** — no wallet required.  
Loads vault `0x19e1F8515d51375764cddac83B66dFb299e6898D` on BSC in read-only mode.

## License

MIT
