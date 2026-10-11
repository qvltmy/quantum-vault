# QuantumVault

**Post-quantum smart contract vault secured by WOTS+ one-time signatures and ERC-4337 account abstraction.**

QuantumVault protects digital assets against both classical and quantum computing attacks. Each withdrawal requires a fresh WOTS+ signature — once a key is used, it is cryptographically destroyed. Key rotation is enforced on-chain via a Merkle root commitment, making the vault resilient to long-term quantum threats.

---

## Deployments

All contracts are verified on-chain. The same factory address is used across every supported network.

| Contract | Address |
|---|---|
| `QuantumVaultAccountFactory` | [`0x693671914331B6FaaCEeD66A805D33aa95D8808D`](https://etherscan.io/address/0x693671914331B6FaaCEeD66A805D33aa95D8808D#code) |

**Supported networks:** Ethereum · BSC · Base · Arbitrum · Polygon · Robinhood Chain

| Network | Verification |
|---|---|
| Ethereum | [Etherscan ✓](https://etherscan.io/address/0x693671914331B6FaaCEeD66A805D33aa95D8808D#code) |
| BSC | [BscScan ✓](https://bscscan.com/address/0x693671914331B6FaaCEeD66A805D33aa95D8808D#code) |
| Base | [BaseScan ✓](https://basescan.org/address/0x693671914331B6FaaCEeD66A805D33aa95D8808D#code) |
| Arbitrum | [Arbiscan ✓](https://arbiscan.io/address/0x693671914331B6FaaCEeD66A805D33aa95D8808D#code) |
| Polygon | [PolygonScan ✓](https://polygonscan.com/address/0x693671914331B6FaaCEeD66A805D33aa95D8808D#code) |
| Robinhood Chain | [Sourcify ✓](https://sourcify.dev/#/lookup/0x693671914331B6FaaCEeD66A805D33aa95D8808D) |

---

## Architecture

```
QuantumVaultAccountFactory
│
└── creates ──▶ QuantumVaultAccount  (ERC-4337 Smart Account + Asset Vault)
                        │
                        └── verifies ──▶ WOTSVerifier
```

### QuantumVaultAccount
The core asset container and ERC-4337 smart account in one. Holds ETH and ERC-20 tokens directly. Withdrawals require dual-factor authentication: WOTS+ password proof (Factor 1) + wallet ECDSA signature (Factor 2). Each WOTS+ signature is single-use; the on-chain Merkle root advances after every spend.

### QuantumVaultAccountFactory
Deterministic CREATE2 factory. Given an owner address and an account index, it always produces the same account address — enabling address pre-computation before any funds are deposited.

### WOTSVerifier
Pure on-chain implementation of the Winternitz One-Time Signature scheme. Verifies OTS signatures and Merkle proofs on-chain with no external dependencies.

---

## Security Model

| Threat | Protection |
|---|---|
| Classical private key theft | WOTS+ — compromising one key reveals nothing about future keys |
| Quantum key derivation (Shor's algorithm) | One-time keys — each key is used exactly once, then discarded |
| Replay attacks | On-chain nonce + Merkle root advancement per spend |
| Admin takeover | Multi-admin quorum, on-chain admin list, no off-chain delegation |
| Front-running | Commitment scheme — signature is bound to a specific calldata hash |
| Gas-free signing | Dual-factor: wallet signs off-chain, any address can submit |

---

## Compiler Settings

```toml
solc          = "0.8.28"
viaIR         = true
optimizer     = true, 200 runs
evmVersion    = "cancun"
bytecodeHash  = "none"
```

---

## Repository Structure

```
contracts/
  QuantumVaultAccount.sol         — ERC-4337 smart account + asset vault (WOTS+ dual-factor)
  QuantumVaultAccountFactory.sol  — CREATE2 factory
  WOTSVerifier.sol                — WOTS+ signature verifier

frontend/                         — React + Vite application
  App.tsx                         — root component, wallet + vault state
  components/                     — UI components (Dashboard, modals)
  services/                       — WOTS+ key generation workers, Relay/Blockscout services
  types.ts                        — chain config, ABI types, factory address

script/
  Deploy.s.sol                    — Foundry deploy script (Nick's factory, deterministic)
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
