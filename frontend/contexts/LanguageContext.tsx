import React, { createContext, useContext, ReactNode } from 'react';

type Language = 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<string, string> = {

    // Generic - Brand & Core Concepts
    "app.name": "Quantum Vault",
    "app.desc": "Quantum Vault — Post-Quantum Secure Asset Vault",
    "app.protocol": "Protocol",
    "btn.confirm": "Confirm",
    "btn.cancel": "Cancel",
    "btn.processing": "Confirming...",
    "btn.connect": "Connect Wallet",
    "btn.connecting": "Connecting...",
    "btn.disconnect": "Disconnect",
    "btn.copy": "Copy",
    "btn.max": "Max",
    "btn.view_explorer": "View Explorer",
    "btn.close": "Close",
    "btn.back": "Back",
    "btn.next": "Next",
    "btn.understand": "I Understand",
    "status.active": "Synced",
    "status.paused": "Unavailable",
    "status.synced": "On-chain synced",
    
    // Permissions & Roles
    "perm.admin": "Admin",
    "perm.viewer": "Gas Payer",
    
    // Navigation
    "nav.home": "Home",
    "nav.vault": "My Quantum Vault",
    "nav.principle": "How it Works",
    "nav.security": "Security",
    "nav.docs": "Docs",
    "nav.connected": "Connected",
    "nav.menu": "Menu",
    
    // Landing Page
    "landing.tag": "WOTS+ Post-Quantum Vault · BNB Chain",
    "landing.title.1": "Your Crypto Vault,",
    "landing.title.2": "Quantum-Proof.",
    "landing.subtitle": "WOTS+ hash-based signatures replace ECDSA entirely — no elliptic-curve math, no Shor's attack surface. Password + authorized wallet dual-factor. Every withdrawal verified on-chain in pure Solidity. No trusted setup. No external verifier.",
    "landing.step1": "Connect Wallet",
    "landing.step2": "Set Vault Password",
    "landing.step3": "Deposit & Protect",
    "landing.tag.opensource": "Open Source",
    "landing.tag.audited": "Solidity-Verified · Not Independently Audited",
    "landing.tag.noncustodial": "Self-Custody",
    
    "landing.card.session": "Vault Session Active",
    "landing.card.session_desc": "Secure channel established. You have full control.",
    "landing.btn.enter": "Open Vault",
    "landing.btn.exit": "Disconnect",
    "landing.tab.load": "Access Vault",
    "landing.tab.create": "Create Vault",
    "landing.load.title": "Access Existing Vault",
    "landing.load.desc": "Enter your Quantum Vault account address",
    "landing.load.placeholder": "0x... (Account Address)",
    "landing.load.recent": "Recent",
    "landing.create.title": "Create New Vault",
    "landing.create.desc": "Deploy your personal Quantum Vault on-chain",
    "landing.create.pw_placeholder": "Set Vault Password",
    "landing.create.pw_confirm": "Confirm Password",
    "landing.create.tip_title": "Important",
    "landing.create.tip_desc": "Your password is used locally to derive the vault's signing keys and password proof; it is not stored by the app or on-chain. If you lose it, there is no password reset or recovery—assets may become inaccessible. Back it up securely.",
    "landing.btn.deploy": "Create Now",
    "landing.btn.deploying": "Creating...",
    "landing.btn.connect_first": "Connect Wallet to Continue",
    "landing.scroll": "Scroll",

    // Core Benefits
    "landing.benefits.title": "Two Converging Threats. One Answer.",
    "landing.benefits.subtitle": "Quantum computers will break ECDSA. AI is accelerating the mathematics that gets us there faster. NIST and the NSA have already started the migration. Quantum Vault is the vault built for after.",
    "landing.benefits.secure.tag": "Hash-Based · Quantum & AI Resistant",
    "landing.benefits.secure.title": "No Elliptic-Curve Math. No Attack Surface.",
    "landing.benefits.secure.desc": "WOTS+ uses one-time hash chains instead of elliptic-curve math. Shor's algorithm has no attack surface here — no discrete-log problem to solve. Post-quantum by design.",
    "landing.benefits.smart.tag": "On-Chain Verification",
    "landing.benefits.smart.title": "Pure Solidity · No Trusted Setup",
    "landing.benefits.smart.desc": "WOTS+ signature verification runs entirely on-chain in Solidity: 67 hash-chain checks plus an 8-level Merkle inclusion proof. This V2 flow does not use ZK proofs or an external verifier. The password and signing keys are derived and used locally; the account stores the Merkle root and a password commitment on-chain.",

    "landing.benefits.dual.tag": "Dual-Factor Auth",
    "landing.benefits.dual.title": "Password + Authorized Wallet",
    "landing.benefits.dual.desc": "Every outgoing operation requires a valid WOTS+ proof derived from your password and an authorized wallet factor. An authorized wallet alone cannot withdraw funds without the password proof. With gas separation, a different wallet may submit and pay fees, but the authorized wallet must sign the operation. Protect both your password and authorized wallets.",

    "landing.benefits.infinite.tag": "Auto Key Rotation",
    "landing.benefits.infinite.title": "One Tree. 256 One-Time Signatures. Ready to Renew.",
    "landing.benefits.infinite.desc": "WOTS+ leaves are one-time use. When fewer than about 5% of leaves remain, the client can attach a fresh key tree to a normal authenticated operation; the account registers it atomically. The previous tree may remain available if it is the primary root. This renews signing capacity—it does not change the password or wallet admins. Keep a secure password backup.",

    // Comparison Table
    "landing.comp.title": "Security Model",
            "landing.comp.subtitle": "Two Active Threats — Understand Your Real Exposure",
            "landing.comp.lead": "Your public key is on-chain the moment you transact. Shor's algorithm turns a public key into a private key [1]. AI is accelerating the mathematics that makes this practical faster than expected. ECDSA has no defense against either. WOTS+ does.",
            "landing.comp.eoa": "Standard Wallet",
            "landing.comp.multisig": "Multi-Sig Wallet",
            "landing.comp.swiftsafe": "Quantum Vault",
            "landing.comp.row.security": "Authorization",
            "landing.comp.row.risk": "Threat Surface",
            "landing.comp.row.ux": "Day-to-day Use",
            "landing.comp.row.recovery": "Recovery",
            "landing.comp.eoa.security": "ECDSA — relies on elliptic-curve discrete log",
            "landing.comp.eoa.risk": "Public key exposed on-chain after first transaction. A quantum computer running Shor's algorithm can recover the private key from it.",
            "landing.comp.eoa.ux": "Fast, familiar, single signer",
            "landing.comp.eoa.recovery": "Wallet-specific; often seed phrase",
            "landing.comp.multisig.security": "Multiple ECDSA signers — all quantum-vulnerable",
            "landing.comp.multisig.risk": "Every signer's public key is permanently on-chain. Each one is a separate quantum attack target. More signers means wider exposure.",
            "landing.comp.multisig.ux": "Requires signer coordination",
            "landing.comp.multisig.recovery": "Depends on signer setup and availability",
            "landing.comp.swiftsafe.security": "WOTS+ hash-based signatures — no elliptic-curve dependency",
            "landing.comp.swiftsafe.risk": "No ECDSA key on-chain. No elliptic-curve assumption to break. Remaining risks: password, device, wallet, contract, chain.",
            "landing.comp.swiftsafe.ux": "Password proof and wallet authorization per operation",
            "landing.comp.swiftsafe.recovery": "No password reset; keep password and wallet access backed up",
            "landing.comp.detail.title": "Why ECDSA Is Losing Ground — Now",
            "landing.comp.detail.1.title": "Your public key is permanently on-chain after the first send",
            "landing.comp.detail.1.desc": "Before your first transaction, only your address is visible. The moment you sign, your full public key is permanently on-chain — and that's enough for a quantum computer to reconstruct your private key.",
            "landing.comp.detail.2.title": "Shor's is proven. AI is accelerating the timeline.",
            "landing.comp.detail.2.desc": "ECDSA security reduces to one hard math problem. Shor's algorithm solves it [1]. AI is accelerating the research that compresses the timeline. The NSA has already mandated the switch [6]. The question is when, not if.",
            "landing.comp.detail.3.title": "WOTS+ is immune to both threats",
            "landing.comp.detail.3.desc": "WOTS+ security rests on hash pre-image resistance — a property Shor's algorithm doesn't threaten. NIST standardized this class of post-quantum cryptography in 2024 [2]. Verified entirely on-chain in Solidity, no ZK, no trusted setup.",
            "landing.comp.detail.4.title": "Quantum and AI threats eliminated. Other risks remain yours.",
            "landing.comp.detail.4.desc": "Quantum and AI threats don't reach WOTS+. What remains is on you: password, device, authorized wallets, the contract, and the chain. No recovery if you lose your password.",
            "landing.comp.disclaimer": "Quantum Vault eliminates the ECDSA attack surface for vault authorization — not every risk. Full references are listed below. Not an audit or guarantee.",

    // Process Flow
    "landing.process.title": "How It Works",
    "landing.process.step1": "Password → WOTS+ Key Tree",
    "landing.process.desc1": "Argon2id derives a 32-byte masterSeed from your password locally. The browser builds the initial 256-leaf WOTS+ Merkle tree and uses the derived material to sign. The raw password and signing material are not intentionally sent to the app backend or stored on-chain; a compromised device, browser, extension, or RPC path can still expose data before signing.",
    "landing.process.step2": "Sign with WOTS+ Leaf",
    "landing.process.desc2": "Each operation signs an operation hash with one WOTS+ leaf (67 hash-chain values plus an 8-sibling Merkle proof). The vault also requires an authorized wallet factor: an authorized sender may submit directly, or a separate gas-paying wallet may relay an operation signed by an authorized wallet.",
    "landing.process.step3": "On-Chain Solidity Verification",
    "landing.process.desc3": "WOTSVerifier.sol completes the 67 hash chains and checks the Merkle inclusion proof on-chain. No ZK proofs, no trusted setup — pure deterministic Solidity.",
    
    // FAQ
    "landing.faq.title": "FAQ",
    "landing.faq.support": "Support",
    "landing.faq.q1": "How do quantum computing and AI advances threaten wallets — right now?",
    "landing.faq.a1": "Two threats. First: Shor's algorithm breaks ECDSA in polynomial time [1] — your public key is already on-chain after your first transaction. Second: AI is advancing fast enough in mathematical research to compress that timeline significantly. The NSA mandated ECDSA replacement in 2022 [6]. Quantum Vault uses WOTS+ hash-based signatures — no elliptic-curve math, no attack surface for either.",
    "landing.faq.q2": "What is Quantum Vault?",
    "landing.faq.a2": "Quantum Vault is a self-custody on-chain asset vault that uses WOTS+ signatures organized into a 256-leaf Merkle tree. Outgoing operations require a valid WOTS+ proof, a matching password commitment, and an authorized wallet factor: either the transaction sender is an authorized wallet or an authorized wallet signs for a separate gas-paying relayer. The app derives password material locally; your password itself is not stored by the app or on-chain, but device and browser security still matter.",
    "landing.faq.q3": "Is this like a centralized exchange (CEX)?",
    "landing.faq.a3": "No. The vault is a self-custody smart contract; the project does not hold the assets or control withdrawals. Outgoing actions require the password-derived WOTS+ proof and an authorized wallet factor. Smart-contract, wallet, device, and blockchain risks still apply.",
    "landing.faq.q5": "Why does each WOTS+ leaf only work once?",
    "landing.faq.a5": "Each WOTS+ leaf is intended for one signature only; reusing it can expose enough hash-chain values to weaken security. The contract marks used leaves as spent. A 256-leaf tree therefore supports up to 256 successful operations using that root; the client can attach a fresh tree during a normal operation when fewer than about 5% of leaves remain. This renewal is not guaranteed if the client or transaction fails, so keep your password available.",
    "landing.faq.q6": "Is it expensive to create a vault?",
    "landing.faq.a6": "Creating a vault charges a one-time protocol fee in the network's native token (amount varies by chain) plus network gas. Each authenticated operation consumes one WOTS+ leaf; gas cost varies by network and operation type.",
    "landing.faq.q7": "Can I transfer my Quantum Vault to someone else?",
    "landing.faq.a7": "Changing the password replaces the vault’s active WOTS+ signing root, but it does not transfer the wallet that pays for or authorizes transactions. To hand over operation, the recipient must have the new password and an authorized wallet. Add their wallet in Settings → Add Admin, have them verify access, then remove your wallet if you no longer want it authorized. Keep the new password private and share it securely; never share your old password.",

    // Dashboard
    "dash.title": "Asset Overview",
    "dash.refresh": "Sync",
    "dash.exit": "Exit",
    "dash.syncing": "Syncing On-Chain Data...",
    "dash.reconnecting": "Reconnecting to Quantum Vault...",
    "dash.stat.assets": "Native Assets",
    "dash.stat.balance_label": "Balance",
    "dash.stat.admins": "Admins",
    "dash.stat.permission": "My Role",
    "dash.stat.tokens": "Tokens",
    "dash.tab.deposit": "Deposit",
    "dash.tab.withdraw": "Withdraw",
    "dash.tab.admin": "Settings",
    
    // Deposit
    "deposit.title": "Deposit Assets",
    "deposit.desc": "Transfer assets into your Quantum Vault.",
    "deposit.vault_addr.title": "Your Vault Address",
    "deposit.vault_addr.desc": "Send supported native currency or ERC-20 tokens directly to this address. No token approval is required for an inbound transfer. Verify the network and token contract first; unsupported assets may not be recoverable through the interface.",
    "deposit.select_asset": "Asset",
    "deposit.custom_input": "Contract Address",
    "deposit.amount": "Amount",
    "deposit.balance": "Account Balance",
    "deposit.principle.title": "No Password for Deposit?",
    "deposit.principle.desc": "Correct. Deposits are inbound transfers and do not require a vault WOTS+ proof. This contract supports native currency and ERC-20 deposits; other token standards may not be supported. Once received, outgoing withdrawals still require the password-derived WOTS+ proof and an authorized wallet factor. Deposits themselves are not reviewed or screened by the vault.",

    // Withdraw
    "withdraw.title": "Withdraw Assets",
    "withdraw.subtitle": "Password Required",
    "withdraw.select_asset": "Asset",
    "withdraw.list": "List",
    "withdraw.manual": "Manual",
    "withdraw.amount": "Amount",
    "withdraw.available": "Vault Balance",
    "withdraw.no_balance": "Empty",
    "withdraw.recipient": "Recipient",
    "withdraw.use_my_addr": "My Address",
    "withdraw.btn": "Initiate Withdraw",
    "withdraw.btn.unauth": "Submit via Gas Separation",
    "withdraw.principle.title": "Security Check",
    "withdraw.principle.desc": "Three-factor security: 1. Is the WOTS+ signature valid for the registered Merkle root? 2. Does the password preimage match the stored commit? 3. Is the transaction submitted by an authorized wallet (or accompanied by an authorized wallet's signature)?",

    // Admin
    "admin.emergency": "Operation Security",
    "admin.emergency.desc": "This V2 account has no pause or freeze function. Outgoing actions remain protected by the password-derived WOTS+ proof and the wallet-admin factor.",
    "admin.pause": "⛔ Freeze unavailable",
    "admin.resume": "✅ No freeze state",
    "admin.add": "Add Admin",
    "admin.add.desc": "Authorize a wallet address for this vault's wallet-admin factor. Its holder may submit operations directly or sign them for a separate gas-paying relayer. This wallet role is distinct from WOTS+ key-tree admin roots; adding a wallet does not reveal the vault password or by itself authorize an operation.",
    "admin.check_remove": "Check / Remove Admin",
    "admin.check_remove.desc": "Check if an address is an admin before removing.",
    "admin.check_btn": "Check Status",
    "admin.status.is_admin": "Is Admin (Active)",
    "admin.status.not_admin": "Not Admin",
    "admin.status.checking": "Checking...",
    "admin.remove": "Remove Admin",
    "admin.remove.desc": "Revoke an address's admin permissions.",
    "admin.add.placeholder": "0x Address...",
    "admin.remove.placeholder": "Enter address to check...",
    "admin.rotate": "Change Password",
    "admin.rotate.desc": "Create a new password-derived signing root. This does not transfer authorized wallet access; manage wallet admins separately.",
    "admin.rotate.new": "New Password",
    "admin.rotate.confirm": "Confirm",
    "admin.rotate.btn": "Confirm Change",
    "admin.danger": "Danger Zone",
    "admin.danger.desc": "Remove this wallet from the authorized wallet-admin list. At least one wallet admin must remain. This does not remove its WOTS+ key-tree root; manage those roots separately. Confirm another authorized wallet and key path work before proceeding.",
    "admin.renounce": "Renounce",
    "admin.cooldown": "Cooldown",
    "admin.ready": "Ready",

    // Modals & States
    "modal.pw.title": "Security Verification",
    "modal.pw.desc": "This is a privileged action. Please enter your vault password to confirm.",
    "modal.pw.input": "Enter Vault Password",
    "modal.pw.verifying": "Verifying...",
    "modal.process.idle": "Ready",
    "modal.process.hashing": "Encrypting Password",
    "modal.process.hashing_desc": "Local encryption in progress, password is not sent online...",
    "modal.process.signing": "Wallet Authorization",
    "modal.process.signing_desc": "Please confirm in your wallet...",
    "modal.process.broadcasting": "Sending Transaction",
    "modal.process.broadcasting_desc": "Broadcasting to the network...",
    "modal.process.confirming": "Block Confirmation",
    "modal.process.confirming_desc": "Waiting for on-chain consensus...",
    "modal.process.success": "Operation Successful",
    "modal.process.success_desc": "On-chain state has been updated",
    "modal.process.failed": "Operation Failed",
    "modal.process.failed_desc": "Request was rejected",
    "modal.process.subtitle": "Secure Transaction Protocol",
    "modal.guide.title": "How It Works",
    "modal.privacy.title": "Privacy & Security",

    // Info Cards
    "info.smart_vs_wallet": "Quantum Vault vs. Standard Wallet",
    "info.smart_desc": "Standard wallets use ECDSA, which a sufficiently capable quantum computer could attack using Shor's algorithm. Quantum Vault uses WOTS+ hash-chain signatures for vault authorization, organized into a 256-leaf Merkle tree and verified in Solidity. The separate wallet factor may still use ECDSA; no system is risk-free.",
    "info.tip_title": "Immutable",
    "info.privacy_intro": "The blockchain's nature ensures that once rules are set, no one can bypass them.",
    "info.privacy_tip": "Disclaimer: We are a non-custodial protocol and cannot recover forgotten passwords.",
    "info.multisig_comp": "vs. Multi-Sig",
    "info.multisig_desc": "Multi-sig still uses ECDSA across all signers. Quantum Vault changes the cryptographic primitive: WOTS+ hash chains are designed for post-quantum use, while verification needs no trusted setup. No cryptographic system should be described as immune to every future attack.",
    
    // Guide Steps
    "guide.wallet_std": "Standard Wallet",
    "guide.tag_failure": "Single Point of Failure",
    "guide.desc_failure": "Lost Key = Lost Funds",
    "guide.vault_name": "Quantum Vault",
    "guide.tag_secure": "Hash-Based · Post-Quantum-Oriented",
    "guide.desc_secure": "WOTS+ Merkle tree · on-chain verification",
    "guide.step_local": "1. Local Encrypt",
    "guide.step_sig": "2. Wallet Sign",
    "guide.step_chain": "3. Contract Verify",
    "guide.multisig.traditional": "ECDSA Wallets",
    "guide.multisig.traditional_desc": "Standard wallets and many multi-signature wallets use ECDSA-based account keys. A sufficiently capable fault-tolerant quantum computer could threaten exposed ECDSA public keys using Shor's algorithm; the timing and practical impact are uncertain. AI-assisted analysis may also accelerate implementation review and exploit discovery. Other wallet, device, contract, and chain risks remain.",
    "guide.multisig.swiftsafe": "Quantum Vault",
    "guide.multisig.swiftsafe_desc": "WOTS+ Merkle-tree signatures for vault authorization are derived locally from your password and verified on-chain in Solidity. This hash-based design avoids relying on elliptic-curve discrete-log hardness for that factor; it does not eliminate the separate wallet factor or device, contract, and chain risks, and is not a guarantee against every future attack.",
    
    // Privacy Architecture
    "privacy.arch_title": "Architecture",
    "privacy.layer_client": "Client-Side (Local)",
    "privacy.tag_zk": "Keys Derived Locally",
    "privacy.desc_client": "Argon2id derives your 32-byte masterSeed from your password locally. The browser builds the 256-leaf WOTS+ tree and constructs signatures and Merkle proofs locally. The app does not intentionally transmit your raw password or store it on-chain; however, compromised devices, browsers, extensions, injected scripts, or malicious frontend code can capture sensitive material.",
    "privacy.layer_proto": "Protocol Layer (Direct)",
    "privacy.tag_agnostic": "Serverless",
    "privacy.desc_proto": "The front end prepares transactions and may communicate with blockchain RPC providers directly. Those providers can observe network metadata such as IP address and requested data; the project does not operate a backend for these requests. The directExecute path submits on-chain without an ERC-4337 bundler, while the separate UserOperation path does use ERC-4337 infrastructure.",
    "privacy.layer_contract": "Contract Layer (On-Chain)",
    "privacy.tag_immutable": "Immutable Logic",
    "privacy.desc_contract": "The deployed contract enforces its programmed checks, including the WOTS+ proof, Merkle inclusion, password commitment, and authorized wallet factor. This does not make the whole system risk-free: contract bugs, wallet or device compromise, incorrect transaction details, and compromised front-end code remain possible. Verify the target contract and transaction details before signing.",

    // Footer
    "footer.about": "A self-custody on-chain asset vault secured by WOTS+ post-quantum signatures and a 256-leaf Merkle key tree, verified entirely in pure Solidity. No ZK proofs, no trusted setup, no oracles.",
    "footer.benefit.1.title": "Local Encryption",
    "footer.benefit.1.desc": "Password never sent.",
    "footer.benefit.2.title": "Transparent Rules",
    "footer.benefit.2.desc": "Code is law.",
    "footer.benefit.3.title": "Permissionless",
    "footer.benefit.3.desc": "Full self-sovereignty.",
    "footer.sys_specs": "System Specs",
    "footer.rights": "Open Source Protocol Software.",
    "footer.system_ok": "Network Active",
    "footer.sys_op": "System Operational",

    // Errors
    "err.user_reject": "Operation cancelled",
    "err.insufficient": "Insufficient Gas",
    "err.insufficient_bal": "Insufficient Balance",
    "err.insufficient_gas": "Insufficient Balance (Need Gas)",
    "err.invalid_otp": "Verification Failed (Wrong Password)",
    "err.expired": "Proof Expired (Please try again)",
    "err.cooldown": "This V2 account has no pause or freeze function",
    "err.paused": "This V2 account has no pause or freeze state",
    "err.unauth": "Unauthorized action",
    "err.last_admin": "Cannot remove the last admin",
    "err.last_admin_renounce": "Cannot Renounce: You are the last Admin",
    "err.timeout": "Request Timeout",
    "err.generic": "Transaction Failed",
    "err.pw_weak": "Password is too weak",
    "err.pw_weak_desc": "For security, password must be at least 6 characters.",
    "err.amount_zero": "Amount must be greater than 0",
    "err.invalid_addr_fmt": "Invalid address format",
    "err.key_derivation": "Key derivation failed",
    "err.wallet_not_found": "Wallet not found",
    "err.vault_creation_log": "Could not find new vault address in logs",
    "err.unknown": "Unknown Error",
    
    // Specific Success Messages
    "process.success.create": "Quantum Vault Created",
    "process.success.deposit": "Assets Deposited",
    "process.success.withdraw": "Withdrawal Executed",
    "process.success.add_admin": "New Admin Added",
    "process.success.remove_admin": "Admin Removed",
    "process.success.rotate": "Password Changed",
    "process.success.pause": "Pause and freeze are not supported by this V2 account",
    "process.success.resume": "Pause and freeze are not supported by this V2 account",
    "process.success.renounce": "Permissions Renounced",

    // Toasts
    "toast.connect_success": "Connected",
    "toast.connect_fail": "Connection Refused",
    "toast.disconnect": "Disconnected",
    "toast.vault_load_fail": "Failed to load Quantum Vault (Check address)",
    "toast.invalid_addr": "Invalid Address",
    "toast.pw_mismatch": "Passwords do not match",
    "toast.op_success": "Operation Successful",
    "toast.op_fail": "Operation Failed",
    "toast.auth_fail": "Authentication Failed",
    "toast.add_chain_first": "Please add this network to your wallet first",

    // Wallet Modal
    "wallet.title": "Connect a Wallet",
    "wallet.subtitle": "Step 1: Connect your on-chain identity",
    "wallet.network": "Network",
    "wallet.new_to": "New to Web3?",
    "wallet.learn": "What is a wallet?",
    "wallet.back": "Back",
    "wallet.intro.title": "Your Digital Key",
    "wallet.intro.desc": "A wallet manages your private keys, which is your passport to the Web3 world.",
    "wallet.bank.title": "A Personal Bank",
    "wallet.bank.desc": "Similar to a bank account, but custody remains with you. The protocol's contracts do not provide a general admin freeze switch.",
    "wallet.login.title": "A Digital Identity",
    "wallet.login.desc": "No registration required. Your wallet address is your unique identity on the blockchain.",
    "wallet.get": "Get a Wallet",
    "wallet.install": "Install",
    "wallet.detected": "Detected",
    "wallet.show_more": "Show More",
    "wallet.show_less": "Show Less",
    "wallet.desc.okx": "The All-in-One Web3 Portal",
    "wallet.desc.bitget": "Asia's leading crypto wallet",
    "wallet.desc.metamask": "The Ethereum standard wallet",
    "wallet.desc.trust": "Recommended by Binance",
    "wallet.desc.tp": "The go-to choice for mobile",
    "wallet.desc.binance": "The official Binance Wallet",
    "wallet.desc.coinbase": "A simple-to-use self-custody wallet",
    "wallet.desc.imtoken": "A feature-rich digital asset wallet",
    "wallet.desc.math": "Multi-chain crypto asset wallet",
    "wallet.desc.coin98": "The all-in-one DeFi gateway",
    "wallet.desc.safepal": "Secure hardware and software wallet",
    "wallet.desc.browser": "Browser extension wallet",
    "wallet.chain_active": "Active",
    "wallet.chain_soon": "Soon",
    "wallet.multichain": "Multi-Chain",
    "wallet.multichain_desc": "The Quantum Vault protocol is designed to be chain-agnostic. Currently deployed on BNB Smart Chain mainnet; other networks require separate factory deployments.",
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const language: Language = 'en';

  const setLanguage = (_lang: Language) => {
    // English only — no-op
  };

  const t = (key: string): string => {
    return translations[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
