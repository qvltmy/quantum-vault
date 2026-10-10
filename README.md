# QuantumVault

**Post-quantum smart contract vault secured by WOTS+ one-time signatures and ERC-4337 account abstraction.**

QuantumVault protects digital assets against both classical and quantum computing attacks. Each withdrawal requires a fresh WOTS+ signature — once a key is used, it is cryptographically destroyed. Key rotation is enforced on-chain via a Merkle root commitment, making the vault resilient to long-term quantum threats.

---

## Deployments

All contracts are verified on-chain. The same factory address is used across every supported network.

| Contract | Address |
|---|---|
| `QuantumVaultAccountFactory` | [`0xb473acF11db7F27F59213C7FE07D47d0eC569744`](https://etherscan.io/address/0xb473acF11db7F27F59213C7FE07D47d0eC569744#code) |
| `QuantumVault` | [`0x19e1F8515d51375764cddac83B66dFb299e6898D`](https://etherscan.io/address/0x19e1F8515d51375764cddac83B66dFb299e6898D#code) |
| `QuantumVaultAccount` | [`0x05395A5Ae7B25c70DEBF91c9F461135d184c9FEE`](https://etherscan.io/address/0x05395A5Ae7B25c70DEBF91c9F461135d184c9FEE#code) |

**Supported networks:** Ethereum · BSC · Base · Arbitrum · Polygon · Robinhood Chain

---

## Architecture

```
QuantumVaultAccountFactory
│
└── creates ──▶ QuantumVaultAccount  (ERC-4337 Smart Account)
                        │
                        └── owns ──▶ QuantumVault  (asset vault)
                                            │
                                            └── verifies ──▶ WOTSVerifier
```

### QuantumVault
The core asset container. Accepts ETH and ERC-20 deposits from any address. Withdrawals are gated by WOTS+ signature verification — each signature is single-use and the on-chain Merkle root advances to the next key after every spend.

### QuantumVaultAccount
An ERC-4337 compliant smart account that owns the vault. Supports gasless transactions via standard bundlers. Wallet admins are managed on-chain; the account enforces that only authorized signers can initiate vault operations.

### QuantumVaultAccountFactory
Deterministic CREATE2 factory. Given an owner address and a salt, it always produces the same account and vault addresses — enabling address pre-computation before any funds are deposited.

### WOTSVerifier
Pure on-chain implementation of the Winternitz One-Time Signature scheme. Accepts an optional SP1 zk-proof path for gas-efficient verification of larger signature sets.

---

## Security Model

| Threat | Protection |
|---|---|
| Classical private key theft | WOTS+ — compromising one key reveals nothing about future keys |
| Quantum key derivation (Shor's algorithm) | One-time keys — each key is used exactly once, then discarded |
| Replay attacks | On-chain nonce + Merkle root advancement per spend |
| Admin takeover | Multi-admin quorum, on-chain admin list, no off-chain delegation |
| Front-running | Commitment scheme — signature is bound to a specific calldata hash |

---

## Compiler Settings

```toml
solc       = "0.8.28"
viaIR      = true
optimizer  = true, 200 runs
evmVersion = "cancun"
```

---

## Repository Structure

```
contracts/
  QuantumVault.sol                — vault logic, WOTS+ verification, Merkle key rotation
  QuantumVaultAccount.sol         — ERC-4337 smart account
  QuantumVaultAccountFactory.sol  — CREATE2 factory
  WOTSVerifier.sol                — WOTS+ signature verifier with optional SP1 path

frontend/                         — React + Vite application
  App.tsx                         — root component, wallet + vault state
  components/                     — UI components
  services/                       — WOTS+ key generation workers
  types.ts                        — chain config, ABI types
```

---

## Getting Started

**Contracts** — requires [Foundry](https://getfoundry.sh)

```bash
forge install
forge build
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill in the required values before deploying.

---

## Live App

[quantumvault.my](https://quantumvault.my) — click **Try Demo Vault** to browse a live vault on Ethereum without connecting a wallet.

---

## License

MIT
