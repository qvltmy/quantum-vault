
import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { flushSync } from 'react-dom';
import { getFactoryAddress, chainHasFactory, getChainTokens, UserState, VaultState, TokenInfo, CHAINS } from './types';
import { deriveArgon2Key } from './services/cryptoService';
import { buildWOTSTreeAsync, prepareDirectExecSig, hexToBytes } from './services/wotsService';
import { X, ShieldCheck, AlertTriangle, Info } from './components/Icons';
import { useLanguage } from './contexts/LanguageContext';

import Header from './components/Header';
import Footer from './components/Footer';
import Landing from './components/Landing';
import Docs from './components/Docs';
import Dashboard from './components/Dashboard';
import PasswordModal from './components/PasswordModal';
import WalletModal from './components/WalletModal';
import GasSeparationModal from './components/GasSeparationModal';
import ProcessModal, { ProcessStep } from './components/ProcessModal';
import { GuideModal, PrivacyModal } from './components/InfoModals';
import { DepositConfirmModal, WithdrawConfirmModal } from './components/ActionModals';

// Unified helper function to get the correct wallet provider object
const getProviderObject = (type: string | null): any => {
  if (typeof window === 'undefined') return null;
  const eth = window.ethereum;

  switch (type) {
    case 'okx':
      return window.okxwallet || (eth?.isOkxWallet ? eth : undefined);
    case 'bitget':
      return window.bitkeep?.ethereum || (eth?.isBitKeep ? eth : undefined);
    case 'trust':
      return window.trustwallet || (eth?.isTrust ? eth : undefined);
    case 'binance':
      // Priority Change: Always prefer EIP-1193 "window.ethereum" if it identifies as Binance.
      // Legacy "window.BinanceChain" is known to cause 'invalid BigNumberish' errors with ethers v6 due to non-standard chainId returns.
      if (eth?.isBinance || eth?.isBinanceWallet) return eth;
      if (window.BinanceChain) return window.BinanceChain;
      return eth; 
    case 'coinbase':
      return window.coinbaseWallet || (eth?.isCoinbaseWallet ? eth : undefined);
    case 'imtoken':
      return window.imToken?.ethereum || (eth?.isImToken ? eth : undefined);
    case 'coin98':
      return window.coin98?.provider || (eth?.isCoin98 ? eth : undefined);
    case 'walletconnect':
      return _wcProvider || null;
    case 'metamask':
      // Just return eth, WalletModal checks verify if it is truly MetaMask or we just accept the "injected" one
      return eth;
    case 'tokenpocket':
    case 'mathwallet':
    case 'safepal':
    case 'injected':
    default:
      return eth;
  }
};

// ── WalletConnect v2 provider singleton ───────────────────────────────────────
// Stored at module level so getProviderObject() can return it after connect.
let _wcProvider: any = null;

const VAULT_ABI = [
  "function authorizedAccount() view returns (address)",
  "function withdrawNative(address payable recipient, uint256 amount) external",
  "function withdrawERC20(address token, address recipient, uint256 amount) external"
];

const ACCOUNT_ABI = [
  "function vault() view returns (address)",
  "function entryPoint() view returns (address)",
  "function primaryMerkleRoot() view returns (bytes32)",
  "function passwordDomain() view returns (bytes32)",
  "function passwordCommit() view returns (bytes32)",
  "function isAdmin(bytes32) view returns (bool)",
  "function pubSeedOf(bytes32) view returns (bytes32)",
  "function directNonce(bytes32) view returns (uint64)",
  "function adminCount() view returns (uint256)",
  "function getAdmins() view returns (bytes32[])",
  "function isLeafSpent(bytes32, uint32) view returns (bool)",
  // Wallet admin (second factor) — address list
  "function isWalletAdmin(address) view returns (bool)",
  "function walletAdminCount() view returns (uint256)",
  "function getWalletAdmins() view returns (address[])",
  "function addWalletAdmin(address wallet) external",
  "function removeWalletAdmin(address wallet) external",
  "function buildDirectOpHash(bytes32 signerMerkleRoot, bytes32 inbandNewRoot, bytes32 inbandNewPubSeed, bytes32 passwordPreimage, bytes actionCalldata) view returns (bytes32)",
  // walletSig is the last param — authorized wallet signs opHash via personal_sign
  "function directExecute(bytes32 signerMerkleRoot, uint32 leafIndex, bytes32[67] otsPubKey, bytes32[67] otsSig, bytes32[] merkleProof, bytes32 inbandNewRoot, bytes32 inbandNewPubSeed, bytes32 passwordPreimage, bytes actionCalldata, bytes walletSig) external",
  "function executeNativeWithdrawal(address payable recipient, uint256 amount) external",
  "function executeERC20Withdrawal(address token, address recipient, uint256 amount) external",
  "function rotateMerkleRoot(bytes32 oldRoot, bytes32 newRoot, bytes32 newPubSeed) external",
  "function addAdmin(bytes32 newMerkleRoot, bytes32 newPubSeed) external",
  "function removeAdmin(bytes32 merkleRoot) external",
  "function setPasswordCommit(bytes32 newCommit) external",
];

const FACTORY_ABI = [
  "function createAccount(bytes32 merkleRoot, bytes32 pubSeed, bytes32 passwordCommit) external payable returns (address account, address vault_, uint32 vaultIndex)",
  "function getAddress(address creator, uint32 vaultIndex) public view returns (address)",
  "function nextVaultIndex(address user) view returns (uint32)",
  "function isAccount(address) view returns (bool)",
  "function accountToVault(address) view returns (address)",
  "function vaultToAccount(address) view returns (address)",
  "function getUserAccounts(address user) external view returns (address[])",
  "function getUserAccountCount(address user) external view returns (uint256)",
  "function getCreateFee() view returns (uint256)",
  "event AccountCreated(address indexed account, address indexed vault, bytes32 indexed merkleRoot)"
];

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

const STORAGE_AUTH_KEY = 'quantumvault_auth_sig';
const STORAGE_VAULT_KEY = 'quantum_vault_addr';
const STORAGE_HISTORY_KEY = 'quantum_vault_history';
const STORAGE_WALLET_TYPE = 'quantum_wallet_type';
const STORAGE_LAST_VIEW = 'quantum_last_view';
const STORAGE_CUSTOM_TOKENS = 'quantum_custom_tokens';
const STORAGE_VAULTS_KEY    = 'quantum_vault_list';   // JSON array of account addresses
const STORAGE_KEYGEN_PREFIX = 'quantum_keygen_';      // per-vault WOTS+ generation counter
const STORAGE_DEMO_KEY      = 'quantum_demo_mode';    // persists demo mode across refresh

// ── Demo vault (view-only, no wallet required) ────────────────────────────────
const DEMO_VAULT_ADDR   = '0xC7c0eE115e37BD1626590196776F61D00e71772b';
const DEMO_ACCOUNT_ADDR = '0xb2a05c3603e3b8bc478987656aaa3c703b752d50';
const DEMO_RPC          = 'https://rpc.mainnet.chain.robinhood.com';
const DEMO_CHAIN_ID     = 4663n;

// ── WOTS+ generation helpers ─────────────────────────────────────────────────
// Each vault tracks which generation of the WOTS+ tree is currently active.
// Gen 0 = original tree derived from masterSeed.
// Gen N = deriveGenerationSeed(masterSeed, N) tree.
// When the active tree crosses the 95% leaf threshold, the next operation
// automatically passes inbandNewRoot to rotate in-flight — no extra UI needed.
const getKeyGeneration = (accAddr: string): number => {
  try {
    const v = localStorage.getItem(STORAGE_KEYGEN_PREFIX + accAddr.toLowerCase());
    return v ? parseInt(v, 10) : 0;
  } catch { return 0; }
};
const setKeyGeneration = (accAddr: string, gen: number) => {
  try { localStorage.setItem(STORAGE_KEYGEN_PREFIX + accAddr.toLowerCase(), String(gen)); } catch {}
};

function App() {
  const [user, setUser] = useState<UserState>({ address: null, nativeBalance: null, isConnected: false, chainId: 0n });
  const isConnectingRef = React.useRef(false);
  const isRestoringRef = React.useRef(true); // true during initial auto-connect, suppresses spurious accountsChanged disconnect
  const [accountAddress, setAccountAddress] = useState<string | null>(localStorage.getItem(STORAGE_VAULT_KEY) || null);
  const [vaultAddress, setVaultAddress] = useState<string | null>(() => {
    // Restore demo vault address on refresh
    if (localStorage.getItem(STORAGE_DEMO_KEY) === '1') return DEMO_VAULT_ADDR;
    return null;
  });
  const [vaultState, setVaultState] = useState<VaultState | null>(null);
  
  // Multi-vault: list of all account addresses for connected wallet + chain-fetched list
  const [myVaults, setMyVaults] = useState<{ account: string; vault: string; label?: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_VAULTS_KEY) || '[]'); } catch { return []; }
  });
  const [isFetchingVaults, setIsFetchingVaults] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(() => localStorage.getItem(STORAGE_DEMO_KEY) === '1');
  
  // Load vault address from account — re-runs when wallet connects or chain changes.
  // user.chainId MUST be in deps; without it this is a stale closure that runs
  // once at mount when chainId = 0n and never again when the wallet connects.
  useEffect(() => {
    const loadVaultAddress = async () => {
      if (!accountAddress) return;
      // Skip in demo mode — vault address already set from known constant
      if (isDemoMode) return;
      // Don't query until wallet is connected (chainId = 0n means not yet connected)
      if (!user.isConnected || user.chainId === 0n) return;
      try {
        const eth = getProviderObject(localStorage.getItem(STORAGE_WALLET_TYPE));
        if (!eth) return;
        const provider = new ethers.BrowserProvider(eth);
        const factory = new ethers.Contract(getFactoryAddress(user.chainId), [
          "function accountToVault(address) view returns (address)"
        ], provider);
        const vault = await factory.accountToVault(accountAddress);
        if (vault && vault !== ethers.ZeroAddress) {
          setVaultAddress(vault);
        }
      } catch (err) {
        console.error('Failed to load vault address:', err);
      }
    };
    loadVaultAddress();
  }, [accountAddress, user.chainId, user.isConnected]);
  
  // Fetch all vaults created by connected wallet from chain
  const fetchUserVaults = async (userAddr: string) => {
    if (!userAddr) return;
    setIsFetchingVaults(true);
    try {
      const eth = getProviderObject(localStorage.getItem(STORAGE_WALLET_TYPE));
      if (!eth) return;
      const provider = new ethers.BrowserProvider(eth);
      const factory = new ethers.Contract(getFactoryAddress(user.chainId), FACTORY_ABI, provider);
      const accounts: string[] = await factory.getUserAccounts(userAddr);
      if (!accounts || accounts.length === 0) { setIsFetchingVaults(false); return; }
      const pairs = await Promise.all(accounts.map(async (acc: string) => {
        const vault = await factory.accountToVault(acc);
        return { account: acc, vault };
      }));
      setMyVaults(pairs);
      localStorage.setItem(STORAGE_VAULTS_KEY, JSON.stringify(pairs));
    } catch (err) {
      console.error('fetchUserVaults error:', err);
    } finally {
      setIsFetchingVaults(false);
    }
  };

  const [currentView, setCurrentView] = useState<'landing' | 'dashboard' | 'docs'>(() => {
    // Hash routing: /#docs, /#dashboard override localStorage
    const hash = window.location.hash.replace('#', '');
    if (hash === 'docs') return 'docs';
    if (hash === 'dashboard') {
      const hasVault = localStorage.getItem(STORAGE_VAULT_KEY);
      if (hasVault) return 'dashboard';
    }
    const lastView = localStorage.getItem(STORAGE_LAST_VIEW);
    const hasVault = localStorage.getItem(STORAGE_VAULT_KEY);
    
    // If a vault exists, default to dashboard unless user explicitly navigated to landing last time
    if (hasVault) {
      return lastView === 'landing' ? 'landing' : 'dashboard';
    }
    return 'landing';
  });

  // New: Initialize Restoring state based on auth key existence to prevent "Disconnected" flash
  const [isRestoring, setIsRestoring] = useState(() => !!localStorage.getItem(STORAGE_AUTH_KEY));

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Modals
  const [showPwModal, setShowPwModal] = useState<{ isOpen: boolean; action?: (pw: string) => Promise<void>; desc?: string }>({ isOpen: false });
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [pendingDeposit, setPendingDeposit] = useState<{amount: string, token: string, symbol: string, isCustom: boolean} | null>(null);
  
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [pendingWithdraw, setPendingWithdraw] = useState<{amount: string, to: string, token: string, symbol: string} | null>(null);

  // New Process State
  const [processState, setProcessState] = useState<{
    isOpen: boolean;
    step: ProcessStep;
    title: string;
    txHash?: string;
    error?: string;
    skipHashing?: boolean;
    successMsg?: string;
  }>({
    isOpen: false,
    step: 'idle',
    title: 'Processing'
  });

  // Gas separation modal — shown when authorized wallet ≠ gas wallet
  const [gasSepModal, setGasSepModal] = useState<{
    isOpen: boolean;
    opHash: string;
    authorizedWallets: string[];
    onSigned: (sig: string) => void;
  }>({ isOpen: false, opHash: '', authorizedWallets: [], onSigned: () => {} });

  // New: Track last success time to auto-clear inputs
  const [lastSuccessTime, setLastSuccessTime] = useState(0);

  const { t } = useLanguage();

  const handleNavigate = (view: 'landing' | 'dashboard' | 'docs') => {
    setCurrentView(view);
    localStorage.setItem(STORAGE_LAST_VIEW, view);
    // Sync URL hash so /#docs / /#dashboard are shareable/bookmarkable
    if (view === 'landing') {
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      window.history.replaceState(null, '', '#' + view);
    }
  };

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getExplorerUrl = (txHash: string) => {
    const chain = CHAINS.find(c => BigInt(c.id) === user.chainId);
    const baseUrl = chain?.explorer || 'https://etherscan.io';
    return `${baseUrl}/tx/${txHash}`;
  };

  const getFriendlyError = (error: any): string => {
    console.error("Tx Error:", error); 

    if (error?.code === "ACTION_REJECTED") {
      return t('err.user_reject');
    }

    if (error?.code === 4001 || error?.info?.error?.code === 4001 || error?.error?.code === 4001) {
      return t('err.user_reject');
    }

    const msg = (
      error?.reason || 
      error?.shortMessage || 
      error?.message || 
      (typeof error === 'string' ? error : "")
    ).toLowerCase();

    // Mapping Solidity Custom Errors to Friendly Text
    if (msg.includes("insufficient funds")) return t('err.insufficient');
    // v2 contract errors
    if (msg.includes("invalidpasswordproof")) return 'Invalid password or WOTS+ signature. Check your password and try again.';
    if (msg.includes("leafalreadyspent")) return 'This WOTS+ leaf has already been used. A new leaf will be used next time.';
    if (msg.includes("notadmin")) return 'This Merkle root is not registered as an admin.';
    if (msg.includes("alreadyadmin")) return 'This Merkle root is already an admin.';
    if (msg.includes("cannotremovelastadmin")) return t('err.last_admin');
    if (msg.includes("cannotremoveprimary")) return 'Cannot remove the primary admin root.';
    if (msg.includes("unauthorizedaccount")) return t('err.unauth');
    // Unauthorized() = wallet is not a registered walletAdmin on this vault
    if (msg.includes("unauthorized(") || (msg.includes("unauthorized") && !msg.includes("unauthorizedaccount") && !msg.includes("unauthorizedfactory"))) {
      return 'Your connected wallet is not a wallet admin on this vault. The vault was created with a different wallet address as the authorized wallet.';
    }
    if (msg.includes("unauthorizedfactory")) return 'Unauthorized factory call.';
    if (msg.includes("zeroroot")) return 'Merkle root cannot be zero.';
    if (msg.includes("rotationalreadypending")) return 'A key rotation is already pending. Cancel it first.';
    if (msg.includes("recoveryalreadypending")) return 'A recovery is already pending.';
    if (msg.includes("vaultforwardfailed")) return 'Failed to forward ETH to vault.';
    // legacy v1 errors kept for compatibility
    if (msg.includes("invalidotp") || msg.includes("InvalidOTP")) return t('err.invalid_otp');
    if (msg.includes("otpexpired") || msg.includes("OTPExpired")) return t('err.expired');
    if (msg.includes("pausecooldown") || msg.includes("PauseCooldown")) return t('err.cooldown');
    if (msg.includes("paused") || msg.includes("Paused")) return t('err.paused');
    if (msg.includes("notauthorizer") || msg.includes("NotAuthorizer")) return t('err.unauth');
    if (msg.includes("lastauthorizer") || msg.includes("LastAuthorizer")) return t('err.last_admin');
    if (msg.includes("cooldown") && msg.includes("wait")) return t('err.timeout');
    if (msg.includes("try again later") || msg.includes("pending") && msg.includes("wait")) return t('err.timeout');
    
    if (
      msg.includes("user rejected") || 
      msg.includes("user denied") || 
      msg.includes("user cancelled") ||
      msg.includes("canceled") ||
      msg.includes("rejected by user") ||
      msg.includes("user declined")
    ) {
      return t('err.user_reject');
    }

    return t('err.generic');
  };

  const closeProcessModal = () => {
    setProcessState(prev => ({ ...prev, isOpen: false }));
  };

  const getEthereumObject = useCallback(() => {
    const type = localStorage.getItem(STORAGE_WALLET_TYPE);
    return getProviderObject(type);
  }, []);

  const verifySignature = async (signer: ethers.JsonRpcSigner, address: string): Promise<boolean> => {
    const storedAuth = localStorage.getItem(STORAGE_AUTH_KEY);
    if (storedAuth) {
      try {
        const { addr } = JSON.parse(storedAuth);
        if (addr.toLowerCase() === address.toLowerCase()) return true; 
      } catch (e) {
        localStorage.removeItem(STORAGE_AUTH_KEY);
      }
    }
    try {
      const timestamp = Date.now();
      const message = `Welcome to QuantumVault Protocol\n\nPost-quantum secure vault secured by WOTS+ Merkle tree signatures. Sign to verify ownership of this wallet.\n\nTimestamp: ${timestamp}`;
      const signature = await signer.signMessage(message);
      localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify({ sig: signature, msg: message, addr: address }));
      return true;
    } catch (e: any) {
      const errorMsg = getFriendlyError(e);
      if (errorMsg === t('err.user_reject')) {
         showToast(t('err.user_reject'), "info");
      } else {
         console.error(e);
         showToast(t('toast.auth_fail'), "error");
      }
      return false;
    }
  };

  const connectWallet = async (walletType: string = 'injected', targetChainId: number) => {
    localStorage.setItem(STORAGE_WALLET_TYPE, walletType);
    // Allow a small delay for provider injection on first load
    await new Promise(r => setTimeout(r, 50));

    // ── WalletConnect v2 special path ────────────────────────────────────────
    if (walletType === 'walletconnect') {
      try {
        setLoading(true);
        setShowWalletModal(false);
        isConnectingRef.current = true;

        const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
        const chainIds = CHAINS.filter(c => c.active).map(c => c.id);

        // Disconnect any existing WC session before opening a new one
        if (_wcProvider) {
          try { await _wcProvider.disconnect(); } catch {}
          _wcProvider = null;
        }

        const wcProvider = await EthereumProvider.init({
          projectId: '9460aa10bf3fd1af3911e57b8dfcda82',
          chains: [targetChainId],
          optionalChains: chainIds.filter(id => id !== targetChainId) as any,
          showQrModal: true,
          qrModalOptions: { themeMode: 'dark' },
          metadata: {
            name: 'QuantumVault',
            description: 'Post-Quantum Secure Asset Vault',
            url: window.location.origin,
            icons: [`${window.location.origin}/favicon.ico`],
          },
        });

        await wcProvider.connect({ chains: [targetChainId] });
        _wcProvider = wcProvider;

        const accounts: string[] = wcProvider.accounts;
        const address = accounts[0];

        const { ethers: _ethers } = await import('ethers');
        const provider = new _ethers.BrowserProvider(wcProvider as any);
        const signer = await provider.getSigner();

        const isVerified = await verifySignature(signer, address);
        if (!isVerified) { setLoading(false); isConnectingRef.current = false; return; }

        const [bal, network] = await Promise.all([
          provider.getBalance(address),
          provider.getNetwork(),
        ]);
        setUser({ address, nativeBalance: bal, isConnected: true, chainId: network.chainId });

        // Listen for WC-specific events
        wcProvider.on('accountsChanged', (accs: string[]) => {
          if (accs.length === 0) disconnectWallet();
          else disconnectWallet();
        });
        wcProvider.on('disconnect', () => disconnectWallet());

        showToast(t('toast.connect_success'), 'success');
        fetchUserVaults(address);
      } catch (e: any) {
        console.error(e);
        const msg = getFriendlyError(e);
        if (msg !== t('err.user_reject') && !String(e?.message).toLowerCase().includes('user rejected')) {
          showToast(e.message || t('toast.connect_fail'), 'error');
        }
        localStorage.removeItem(STORAGE_AUTH_KEY);
        _wcProvider = null;
      } finally {
        setLoading(false);
        isConnectingRef.current = false;
      }
      return;
    }

    let eth = getProviderObject(walletType);

    if (!eth) {
       if (walletType !== 'injected' && window.ethereum) {
          console.warn(`Specific provider for ${walletType} not found, falling back to window.ethereum`);
          eth = window.ethereum;
       } else {
          return showToast(t('toast.connect_fail'), "error");
       }
    }

    isConnectingRef.current = true;
    try {
      setLoading(true);
      setShowWalletModal(false);

      // Step 1: request accounts first so wallet is unlocked before we try switching chain
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      const address = accounts[0];

      // Step 2: get current chain, switch if needed
      const currentChainHex: string = await eth.request({ method: "eth_chainId" });
      const currentChainId = parseInt(currentChainHex, 16);
      if (currentChainId !== targetChainId) {
        const chainHex = "0x" + targetChainId.toString(16);
        try {
          await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainHex }] });
        } catch (switchError: any) {
          if (switchError.code === 4902 || switchError.code === -32603) {
            // Chain not added — try adding it
            const chainCfg = CHAINS.find(c => c.id === targetChainId);
            if (chainCfg) {
              try {
                await eth.request({
                  method: "wallet_addEthereumChain",
                  params: [{
                    chainId: chainHex,
                    chainName: chainCfg.label ?? chainCfg.name,
                    rpcUrls: chainCfg.rpcUrls ?? [chainCfg.rpc],
                    nativeCurrency: chainCfg.nativeCurrency ?? { name: chainCfg.ticker, symbol: chainCfg.ticker, decimals: 18 },
                    blockExplorerUrls: [chainCfg.explorer],
                  }],
                });
              } catch (addErr: any) {
                if (addErr.code === 4001) { setLoading(false); return; }
                throw addErr;
              }
            } else {
              showToast(t('toast.add_chain_first'), "error");
              setLoading(false);
              return;
            }
          } else if (switchError.code === 4001) {
            setLoading(false);
            return;
          } else {
            throw switchError;
          }
        }
        // Brief pause for wallet to settle after chain switch
        await new Promise(r => setTimeout(r, 300));
      }

      // Step 3: build fresh provider after any chain switch
      const provider = new ethers.BrowserProvider(eth);
      const signer = await provider.getSigner();

      // Step 4: signature auth (skipped if same address already signed this session)
      const isVerified = await verifySignature(signer, address);
      if (!isVerified) { setLoading(false); return; }

      // Step 5: read balance + chainId from fresh provider
      const [bal, network] = await Promise.all([
        provider.getBalance(address),
        provider.getNetwork(),
      ]);
      setUser({ address, nativeBalance: bal, isConnected: true, chainId: network.chainId });
      showToast(t('toast.connect_success'), "success");
      fetchUserVaults(address);
    } catch (e: any) {
      console.error(e);
      const msg = getFriendlyError(e);
      if (msg !== t('err.user_reject')) {
        showToast(e.message || t('toast.connect_fail'), "error");
      }
      localStorage.removeItem(STORAGE_AUTH_KEY);
    } finally {
      setLoading(false);
      isConnectingRef.current = false;
    }
  };

  const disconnectWallet = () => {
    setUser({ address: null, nativeBalance: null, isConnected: false, chainId: 0n });
    setVaultState(null);
    setVaultAddress(null);
    setIsDemoMode(false);
    setIsRestoring(false);
    localStorage.removeItem(STORAGE_VAULT_KEY);
    localStorage.removeItem(STORAGE_AUTH_KEY);
    localStorage.removeItem(STORAGE_DEMO_KEY);
    handleNavigate('landing');
    showToast(t('toast.disconnect'), "info");
  };

  const switchChain = async (chainId: number) => {
    const eth = getEthereumObject();
    if (!eth) return;
    const chainHex = '0x' + chainId.toString(16);
    try {
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainHex }] });
    } catch (switchErr: any) {
      // 4902 = chain not added to wallet yet — add it automatically
      if (switchErr.code === 4902 || switchErr.code === -32603) {
        const chainCfg = CHAINS.find(c => c.id === chainId);
        if (!chainCfg) { showToast('Unknown chain', 'error'); return; }
        try {
          await eth.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: chainHex,
              chainName: chainCfg.label ?? chainCfg.name,
              rpcUrls: chainCfg.rpcUrls ?? [chainCfg.rpc],
              nativeCurrency: chainCfg.nativeCurrency ?? { name: chainCfg.ticker, symbol: chainCfg.ticker, decimals: 18 },
              blockExplorerUrls: [chainCfg.explorer],
            }],
          });
        } catch (addErr: any) {
          if (addErr.code !== 4001) showToast(getFriendlyError(addErr), 'error');
          return;
        }
      } else if (switchErr.code !== 4001) {
        showToast(getFriendlyError(switchErr), 'error');
        return;
      } else {
        return; // user rejected
      }
    }
    // chainChanged event will reload page; if it doesn't fire, update state manually
    try {
      const provider = new ethers.BrowserProvider(eth);
      const network = await provider.getNetwork();
      const bal = await provider.getBalance(user.address!);
      setUser(u => ({ ...u, nativeBalance: bal, chainId: network.chainId }));
      setVaultState(null);
      setVaultAddress(null);
      localStorage.removeItem(STORAGE_VAULT_KEY);
    } catch {}
  };

  const checkAutoConnect = useCallback(async () => {
    const storedAuth = localStorage.getItem(STORAGE_AUTH_KEY);
    const eth = getEthereumObject();
    
    if (!storedAuth || !eth) {
        setIsRestoring(false);
        return;
    }

    try {
      const provider = new ethers.BrowserProvider(eth);
      const accounts = await provider.send("eth_accounts", []);
      if (accounts.length > 0) {
        const address = accounts[0];
        const { addr } = JSON.parse(storedAuth);
        if (address.toLowerCase() === addr.toLowerCase()) {
           const bal = await provider.getBalance(address);
           const chainId = (await provider.getNetwork()).chainId;
           setUser({ address, nativeBalance: bal, isConnected: true, chainId });
           fetchUserVaults(address);
        } else {
           localStorage.removeItem(STORAGE_AUTH_KEY);
        }
      }
    } catch (e) {
      console.error("Auto connect failed", e);
    } finally {
      setIsRestoring(false);
    }
  }, [getEthereumObject]);

  // Robust Disconnection Logic
  useEffect(() => {
    checkAutoConnect().finally(() => { isRestoringRef.current = false; });
    const eth = getEthereumObject();
    if (eth) {
      const handleAccountsChanged = (accounts: string[]) => {
          // Suppress during initial restore — wallet emits accountsChanged before
          // checkAutoConnect finishes, causing a false disconnect toast on every refresh.
          if (isRestoringRef.current) return;
          if (accounts.length === 0) {
              disconnectWallet();
          } else {
              // Account switched — force re-auth
              disconnectWallet();
          }
      };

      if (eth.on) {
          eth.on('accountsChanged', handleAccountsChanged);
          eth.on('chainChanged', () => { if (!isConnectingRef.current) window.location.reload(); });
      }
      
      return () => {
          // Cleanup listeners if component unmounts (rare for App)
          // eth.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
    return () => {};
  }, [checkAutoConnect, getEthereumObject]);

  // ── Demo vault loader ────────────────────────────────────────────────────────
  const handleLoadDemoVault = async () => {
    // Use known addresses directly — vaultToAccount reverts on Robinhood chain
    setAccountAddress(DEMO_ACCOUNT_ADDR);
    setVaultAddress(DEMO_VAULT_ADDR);
    setIsDemoMode(true);
    localStorage.setItem(STORAGE_DEMO_KEY, '1');
    // Also store account so loadVaultAddress effect doesn't clobber it
    localStorage.setItem(STORAGE_VAULT_KEY, DEMO_ACCOUNT_ADDR);
    handleNavigate('dashboard');
  };

  const refreshVault = useCallback(async (silent = false) => {
    const eth = getEthereumObject();
    // Demo mode: use a public JSON-RPC provider instead of wallet
    if (isDemoMode && vaultAddress) {
      try {
        const provider = new ethers.JsonRpcProvider(DEMO_RPC);
        const chainId = DEMO_CHAIN_ID;

        const pBal = provider.getBalance(vaultAddress);
        const accountContract = new ethers.Contract(accountAddress!, ACCOUNT_ABI, provider);
        const pPrimaryMerkleRoot = accountContract.primaryMerkleRoot();
        const [bal, primaryMerkleRoot] = await Promise.all([pBal, pPrimaryMerkleRoot]);

        const storedCustomTokens: string[] = JSON.parse(localStorage.getItem(STORAGE_CUSTOM_TOKENS) || '[]');
        const chainTokens = getChainTokens(chainId);
        const tokensToCheck = [...chainTokens];
        storedCustomTokens.forEach(addr => {
          if (!tokensToCheck.find(t => t.address.toLowerCase() === addr.toLowerCase())) {
            tokensToCheck.push({ symbol: 'UNKNOWN', address: addr, decimals: 18 });
          }
        });

        const tokenPromises = tokensToCheck.map(async (t) => {
          try {
            const tokenContract = new ethers.Contract(t.address, ERC20_ABI, provider);
            const tBal = await tokenContract.balanceOf(vaultAddress);
            if (t.symbol === 'UNKNOWN') {
              try {
                const [symbol, decimals] = await Promise.all([tokenContract.symbol(), tokenContract.decimals()]);
                return { ...t, symbol, decimals, balance: tBal };
              } catch { return { ...t, symbol: 'Custom', balance: tBal }; }
            }
            // In demo mode always show all chain tokens (even 0-balance ones)
            return { ...t, balance: tBal };
          } catch {}
          return null;
        });
        const results = await Promise.all(tokenPromises);
        const tokenInfos: TokenInfo[] = results.filter(Boolean) as TokenInfo[];

        setVaultState({
          vaultAddress,
          accountAddress: accountAddress!,
          nativeBalance: bal,
          chainId,
          primaryMerkleRoot,
          isPaused: false,
          vaultTokens: tokenInfos,
        });
      } catch (e) {
        console.warn('Demo vault refresh failed', e);
      }
      return;
    }
    if (!vaultAddress || !user.isConnected || !eth || !user.address) return;
    try {
      const provider = new ethers.BrowserProvider(eth);
      // 1. Get native balance and network from Provider directly
      const pBal = provider.getBalance(vaultAddress);
      const pNetwork = provider.getNetwork();

      // 2. Read account-level state from the deployed QuantumVaultAccount.
      // The V2 vault has no pause mechanism; do not synthesize a paused state.
      const accountContract = new ethers.Contract(accountAddress!, ACCOUNT_ABI, provider);
      const pPrimaryMerkleRoot = accountContract.primaryMerkleRoot();

      const [bal, network, primaryMerkleRoot] =
        await Promise.all([pBal, pNetwork, pPrimaryMerkleRoot]);

      const chainId = network.chainId;

      // 3. Get Token Balances
      const storedCustomTokens: string[] = JSON.parse(localStorage.getItem(STORAGE_CUSTOM_TOKENS) || '[]');

      // Use per-chain token list so refreshVault scans the correct tokens for each network
      const chainTokens = getChainTokens(chainId);
      const tokensToCheck = [...chainTokens];
      storedCustomTokens.forEach(addr => {
         if (!tokensToCheck.find(t => t.address.toLowerCase() === addr.toLowerCase())) {
            tokensToCheck.push({ symbol: 'UNKNOWN', address: addr, decimals: 18 });
         }
      });

      // On BSC we display native BNB directly, so skip scanning the wrapped BNB token
      // (it would show a separate "WBNB" entry with the same value — confusing).
      // On other chains the wrapped native (WETH, WMATIC …) is a real ERC-20 and IS scanned.
      const skipSymbol = chainId === 56n ? "WBNB" : null;

      const tokenPromises = tokensToCheck.map(async (t) => {
         if (skipSymbol && t.symbol === skipSymbol) return null;
         try {
            const tokenContract = new ethers.Contract(t.address, ERC20_ABI, provider);
            const tBal = await tokenContract.balanceOf(vaultAddress);
            
            if (tBal > 0n) {
                if (t.symbol === 'UNKNOWN') {
                    try {
                        const [symbol, decimals] = await Promise.all([
                            tokenContract.symbol(),
                            tokenContract.decimals()
                        ]);
                        return { ...t, symbol, decimals, balance: tBal };
                    } catch {
                        return { ...t, symbol: 'Custom', balance: tBal };
                    }
                }
                return { ...t, balance: tBal };
            }
         } catch (e) {
            // Ignore individual token failures
         }
         return null;
      });
      
      const results = await Promise.all(tokenPromises);
      const tokenInfos: TokenInfo[] = [];
      results.forEach(r => { if(r) tokenInfos.push(r); });

      setVaultState({
        vaultAddress,
        accountAddress: accountAddress,
        nativeBalance: bal,
        chainId,
        primaryMerkleRoot,
        isPaused: false,
        vaultTokens: tokenInfos
      });
    } catch (e) {
      if (!silent) {
        // If unable to read vault (e.g. wrong address or ABI mismatch), silent disconnect and exit to landing
        console.warn("Vault access failed, clearing state:", e);
        // Explicitly warn user about invalid address
        showToast(t('toast.vault_load_fail'), "error");
        
        // Remove invalid address from history if present
        try {
           const history = JSON.parse(localStorage.getItem(STORAGE_HISTORY_KEY) || '[]');
           const newHistory = history.filter((h: string) => h.toLowerCase() !== vaultAddress.toLowerCase());
           localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(newHistory));
        } catch (storageError) {
           console.error("Failed to update history", storageError);
        }

        setVaultAddress(null);
        localStorage.removeItem(STORAGE_VAULT_KEY);
        setVaultState(null);
        handleNavigate('landing');
      }
    }
  }, [vaultAddress, isDemoMode, user.isConnected, user.address, getEthereumObject, t]);

  const checkIsAuthorizer = useCallback(async (address: string): Promise<boolean> => {
    if (!vaultAddress || !address) return false;
    try {
      const eth = getEthereumObject();
      if (!eth) return false;
      const provider = new ethers.BrowserProvider(eth);
      const contract = new ethers.Contract(vaultAddress, VAULT_ABI, provider);
      const authorized = await contract.authorizedAccount();
      // In private vault, only the authorized account can withdraw
      return authorized.toLowerCase() === address.toLowerCase();
    } catch (e) {
      return false;
    }
  }, [vaultAddress, getEthereumObject]);

  useEffect(() => {
    if (isDemoMode && vaultAddress) { refreshVault(); return; }
    if (user.isConnected && vaultAddress) refreshVault();
  }, [user.isConnected, isDemoMode, vaultAddress, refreshVault]);

  useEffect(() => {
    if (!isDemoMode && (!user.isConnected || !vaultAddress)) return;
    if (!vaultAddress) return;
    const intervalId = setInterval(() => refreshVault(true), 10000);
    return () => clearInterval(intervalId);
  }, [user.isConnected, isDemoMode, vaultAddress, refreshVault]);

  useEffect(() => {
    const eth = getEthereumObject();
    if (!eth || !user.isConnected || !vaultAddress || !accountAddress) return;
    let cancelled = false;
    const provider = new ethers.BrowserProvider(eth);
    const handleBlock = () => {
      if (!cancelled) void refreshVault(true);
    };
    provider.on('block', handleBlock);
    return () => {
      cancelled = true;
      void provider.removeListener('block', handleBlock);
    };
  }, [getEthereumObject, user.isConnected, vaultAddress, accountAddress, refreshVault]);

  const fetchUserTokenBalance = useCallback(async (tokenAddress: string): Promise<string> => {
    if (!user.address) return "0";
    const eth = getEthereumObject();
    if (!eth) return "0";
    try {
      const provider = new ethers.BrowserProvider(eth);
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const balance = await contract.balanceOf(user.address);
      const decimals = await contract.decimals();
      return ethers.formatUnits(balance, decimals);
    } catch (e) {
      console.error("Error fetching token balance", e);
      return "0";
    }
  }, [user.address, getEthereumObject]);

  const addToHistory = (addr: string) => {
    try {
      const history = JSON.parse(localStorage.getItem(STORAGE_HISTORY_KEY) || '[]');
      const newHistory = [addr, ...history.filter((h: string) => h.toLowerCase() !== addr.toLowerCase())].slice(0, 5);
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to save history", e);
    }
  };

  const saveCustomToken = (tokenAddr: string) => {
    try {
        if (!ethers.isAddress(tokenAddr)) return;
        const current = JSON.parse(localStorage.getItem(STORAGE_CUSTOM_TOKENS) || '[]');
        // Avoid duplicates
        if (!current.find((a: string) => a.toLowerCase() === tokenAddr.toLowerCase())) {
            const updated = [...current, tokenAddr];
            localStorage.setItem(STORAGE_CUSTOM_TOKENS, JSON.stringify(updated));
        }
    } catch (e) {
        console.error("Failed to save custom token", e);
    }
  };

  const handleLoadVault = async (addr: string) => {
    if (!user.isConnected) {
      showToast(t('landing.btn.connect_first'), "error");
      return;
    }
    if (!chainHasFactory(user.chainId)) {
      const chainName = CHAINS.find(c => BigInt(c.id) === user.chainId)?.name ?? 'this network';
      showToast(`QuantumVault is not yet deployed on ${chainName}. Please switch to a supported chain.`, 'error');
      return;
    }
    if (!ethers.isAddress(addr)) {
      showToast(t('err.invalid_addr_fmt'), "error");
      return;
    }

    setLoading(true);
    try {
      const eth = getProviderObject(localStorage.getItem(STORAGE_WALLET_TYPE));
      if (!eth) throw new Error('No wallet provider');
      const provider = new ethers.BrowserProvider(eth);
      const factory = new ethers.Contract(getFactoryAddress(user.chainId), FACTORY_ABI, provider);

      let resolvedAccount: string | null = null;
      let resolvedVault: string | null = null;

      // Primary: treat input as vault address → reverse-lookup account
      const accountFromVault: string = await factory.vaultToAccount(addr);
      if (accountFromVault && accountFromVault !== ethers.ZeroAddress) {
        resolvedAccount = accountFromVault;
        resolvedVault   = addr;
      } else {
        // Fallback: treat input as account address
        const isAcc: boolean = await factory.isAccount(addr);
        if (isAcc) {
          resolvedAccount = addr;
          resolvedVault   = await factory.accountToVault(addr);
        }
      }

      if (!resolvedAccount || !resolvedVault) {
        showToast('Vault not found. Please check the address and try again.', 'error');
        return;
      }

      // ── Permission gate ──────────────────────────────────────────────────────
      // Vault is password-gated — no on-chain permission check needed at load time.
      // Operations require valid WOTS+ signature + password proof; wrong password produces InvalidPasswordProof.

      setAccountAddress(resolvedAccount);
      setVaultAddress(resolvedVault);
      localStorage.setItem(STORAGE_VAULT_KEY, resolvedAccount);
      addToHistory(resolvedVault); // store vault address in history (what users know)
      handleNavigate('dashboard');
    } catch (err) {
      console.error('Failed to load vault:', err);
      showToast(t('err.load_vault'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVault = async (password: string) => {
    if (!chainHasFactory(user.chainId)) {
      const chainName = CHAINS.find(c => BigInt(c.id) === user.chainId)?.name ?? 'this network';
      showToast(`QuantumVault is not yet deployed on ${chainName}. Please switch to a supported chain.`, 'error');
      return;
    }
    setProcessState({ isOpen: true, step: 'hashing', title: t('landing.create.title'), skipHashing: false });
    let broadcastedTxHash: string | null = null;
    try {
      // Derive masterSeed → WOTS tree
      const masterSeed = await deriveArgon2Key(password);
      if (!masterSeed) throw new Error(t('err.key_derivation'));

      const tree = await buildWOTSTreeAsync(masterSeed);
      const { hexToBytes: hb, derivePasswordPreimage, computePasswordCommit } = await import('./services/wotsService');

      const passwordPreimage = derivePasswordPreimage(masterSeed);

      setProcessState(prev => ({ ...prev, step: 'signing' }));
      const eth = getEthereumObject();
      if (!eth) throw new Error(t('err.wallet_not_found'));
      const provider = new ethers.BrowserProvider(eth);
      const signer = await provider.getSigner();
      const factory = new ethers.Contract(getFactoryAddress(user.chainId), FACTORY_ABI, signer);
      const signerAddress = await signer.getAddress();

      // Compute passwordDomain + passwordCommit matching contract constructor (no chainId — cross-chain compatible)
      const passwordCommit = computePasswordCommit(passwordPreimage, tree.merkleRoot, tree.pubSeed);

      const createFee = await factory.getCreateFee();
      const tx = await factory.createAccount(tree.merkleRoot, tree.pubSeed, passwordCommit, { value: createFee, gasLimit: 4_000_000n });
      broadcastedTxHash = tx.hash;
      flushSync(() => {
        setProcessState(prev => ({ ...prev, step: 'broadcasting', txHash: tx.hash }));
      });
      setProcessState(prev => ({ ...prev, step: 'confirming' }));

      // Robustly wait for receipt — some wallets/providers throw on tx.wait even when
      // the transaction succeeds on-chain (e.g. tx replacement, provider quirks).
      let receipt: any = null;
      try {
        receipt = await tx.wait(1);
      } catch (waitErr) {
        console.warn('tx.wait threw, fetching receipt directly:', waitErr);
        try {
          receipt = await provider.getTransactionReceipt(tx.hash);
        } catch {}
      }
      
      let newAddr: string | null = null;

      if (receipt) {
        // Try ABI interface parsing first
        for (const log of receipt.logs) {
          try {
            const parsed = factory.interface.parseLog({ topics: Array.from(log.topics), data: log.data });
            if (parsed?.name === "AccountCreated") { newAddr = parsed.args[0]; break; }
          } catch {}
        }
        // Fallback: manual topic decode
        if (!newAddr) {
          const topicHash = ethers.id("AccountCreated(address,address,bytes32)");
          for (const log of receipt.logs) {
            if (log.topics[0] === topicHash) {
              // topics[1] = account (indexed), topics[2] = vault (indexed)
              newAddr = ethers.getAddress('0x' + log.topics[1].slice(26));
              break;
            }
          }
        }
      }

      // Last resort: receipt unavailable or log not found — query chain directly
      if (!newAddr) {
        await new Promise(r => setTimeout(r, 2000));
        try {
          const accounts: string[] = await factory.getUserAccounts(signerAddress);
          if (accounts.length > 0) newAddr = accounts[accounts.length - 1];
        } catch {}
      }

      if (newAddr) {
        setAccountAddress(newAddr);
        localStorage.setItem(STORAGE_VAULT_KEY, newAddr);
        addToHistory(newAddr);
        
        // Query vault address with retry (node may need a moment to sync)
        let vaultAddr: string | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const v = await factory.accountToVault(newAddr);
            if (v && v !== ethers.ZeroAddress) { vaultAddr = v; break; }
          } catch {}
          if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
        }
        if (vaultAddr) setVaultAddress(vaultAddr);
        
        handleNavigate('dashboard');
        setProcessState(prev => ({ ...prev, step: 'success', successMsg: t('process.success.create') }));
        setLastSuccessTime(Date.now());
      } else {
        throw new Error(t('err.vault_creation_log'));
      }
    } catch (e: any) {
      if (broadcastedTxHash) {
        // Transaction was broadcast — vault was created on-chain.
        // The error is in post-processing (receipt parsing, node sync, etc.).
        setProcessState(prev => ({
          ...prev,
          step: 'error' as ProcessStep,
          error: 'Vault created on-chain. Use "Access Wallet" on the home page and enter your vault address to access it.'
        }));
      } else {
        setProcessState(prev => ({ ...prev, step: 'error' as ProcessStep, error: getFriendlyError(e) }));
      }
    }
  };

  const handleExitVault = () => {
    setVaultAddress(null);
    setIsDemoMode(false);
    localStorage.removeItem(STORAGE_VAULT_KEY);
    setVaultState(null);
    handleNavigate('landing');
    showToast(t('toast.op_success'), "info");
  };

  const switchToVault = async (accAddr: string) => {
    if (!accAddr || accAddr === accountAddress) {
      if (accAddr === accountAddress) handleNavigate('dashboard');
      return;
    }
    try {
      const eth = getProviderObject(localStorage.getItem(STORAGE_WALLET_TYPE));
      if (!eth) return;
      const provider = new ethers.BrowserProvider(eth);
      const factory = new ethers.Contract(getFactoryAddress(user.chainId), [
        "function accountToVault(address) view returns (address)"
      ], provider);
      const vault = await factory.accountToVault(accAddr);
      setAccountAddress(accAddr);
      setVaultAddress(vault);
      setVaultState(null);
      localStorage.setItem(STORAGE_VAULT_KEY, accAddr);
      handleNavigate('dashboard');
      showToast('Switched to vault ' + accAddr.slice(0, 8) + '…', 'success');
    } catch (err) {
      console.error('switchToVault error:', err);
      showToast('Failed to switch vault', 'error');
    }
  };

  const handleInitiateDeposit = (amount: string, token: string, symbol: string, isCustom: boolean) => {
    setPendingDeposit({ amount, token, symbol, isCustom });
    setShowDepositModal(true);
  };

  const executeDeposit = async () => {
    if (!vaultAddress || !pendingDeposit) return;
    const { amount, token, isCustom } = pendingDeposit;
    
    setShowDepositModal(false);
    // Deposit does not require Argon2 hashing, so we skip it in the modal
    setProcessState({ isOpen: true, step: 'signing', title: t('deposit.title'), skipHashing: true });

    try {
      const eth = getEthereumObject();
      const provider = new ethers.BrowserProvider(eth);
      const signer = await provider.getSigner();

      let tx;
      if (!token) {
        tx = await signer.sendTransaction({ to: vaultAddress, value: ethers.parseEther(amount) });
      } else {
        const tokenContract = new ethers.Contract(token, ERC20_ABI, signer);
        let decimals = 18; try { decimals = await tokenContract.decimals(); } catch {}
        tx = await tokenContract.transfer(vaultAddress, ethers.parseUnits(amount, decimals));
      }

      setProcessState(prev => ({ ...prev, step: 'broadcasting', txHash: tx.hash }));
      flushSync(() => {
        setProcessState(prev => ({ ...prev, step: 'broadcasting', txHash: tx.hash }));
      });
      setProcessState(prev => ({ ...prev, step: 'confirming' }));
      await tx.wait(1);
      
      // If it was a custom token deposit, save it to local storage for future scanning
      if (isCustom && token) {
          saveCustomToken(token);
      }

      refreshVault();
      setPendingDeposit(null);
      // Specific success message
      setProcessState(prev => ({ ...prev, step: 'success', successMsg: t('process.success.deposit') }));
      setLastSuccessTime(Date.now()); // Update timestamp
    } catch (e: any) {
      setProcessState(prev => ({ ...prev, step: 'error', error: getFriendlyError(e) }));
    }
  };

  // ── Core WOTS directExecute helper ───────────────────────────────────────
  // Automatically detects leaf usage and rotates the signing tree in-flight
  // when active leaves drop below 5% (< 13 of 256). No UI required.
  //
  // Dual-factor flow:
  //   1. Derive WOTS+ signature (password factor)
  //   2. Get opHash from contract
  //   3. Connected wallet signs opHash via personal_sign (wallet admin factor)
  //   4. Submit directExecute with both sigs — msg.sender (gas payer) can be anyone
  const executeDirectOp = async (
    pw: string,
    title: string,
    buildCallData: (iface: ethers.Interface, provider: ethers.BrowserProvider) => Promise<string>,
    successMsg: string
  ) => {
    if (!accountAddress || !user.address) return;
    setShowPwModal({ isOpen: false });
    setProcessState({ isOpen: true, step: 'hashing', title, skipHashing: false });

    try {
      const eth = getEthereumObject();
      if (!eth) throw new Error(t('err.wallet_not_found'));
      const provider = new ethers.BrowserProvider(eth);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      // 1. Derive masterSeed once — password preimage is ALWAYS from masterSeed
      const masterSeed = await deriveArgon2Key(pw);
      if (!masterSeed) throw new Error(t('err.key_derivation'));

      const { buildWOTSTreeAsync: bwt, prepareDirectExecSig: pds,
              derivePasswordPreimage, deriveGenerationSeed: dgs } = await import('./services/wotsService');

      // 2. Resolve current active generation
      const currentGen = getKeyGeneration(accountAddress);
      const genSeed = dgs(masterSeed, currentGen);
      const tree = await bwt(genSeed);
      // passwordPreimage always derived from masterSeed (gen 0), never from genSeed
      const passwordPreimage = derivePasswordPreimage(masterSeed);

      const signerRoot = tree.merkleRoot;
      const accountContract = new ethers.Contract(accountAddress, ACCOUNT_ABI, provider);

      // Verify WOTS+ root is registered
      const isAdminRoot: boolean = await accountContract.isAdmin(signerRoot);
      if (!isAdminRoot) {
        throw new Error('Wrong password — the derived Merkle root is not registered as an admin on this vault.');
      }

      const onChainNonce: number = await accountContract.directNonce(signerRoot).then((n: bigint) => Number(n));
      const leafIndex = onChainNonce;
      const TREE_SIZE = 256;
      const ROTATE_THRESHOLD = Math.floor(TREE_SIZE * 0.05); // 5% = 12 leaves remaining

      // 3. Check if we should piggyback a tree rotation
      const remainingLeaves = TREE_SIZE - leafIndex;
      let inbandNewRoot = ethers.ZeroHash;
      let inbandNewPubSeed = ethers.ZeroHash;
      let nextGen = currentGen;

      if (remainingLeaves <= ROTATE_THRESHOLD + 1) {
        nextGen = currentGen + 1;
        const nextGenSeed = dgs(masterSeed, nextGen);
        const nextTree = await bwt(nextGenSeed);
        inbandNewRoot = nextTree.merkleRoot;
        inbandNewPubSeed = nextTree.pubSeed;
      }

      // 4. Build actionCalldata
      const accountIface = new ethers.Interface(ACCOUNT_ABI);
      const actionCalldata = await buildCallData(accountIface, provider);

      // 5. Get opHash (view call, free)
      setProcessState(prev => ({ ...prev, step: 'signing' }));
      const opHash: string = await accountContract.buildDirectOpHash(
        signerRoot,
        inbandNewRoot,
        inbandNewPubSeed,
        passwordPreimage,
        actionCalldata
      );

      // 6. WOTS+ sign using current gen seed (password factor)
      const { otsPubKey, otsSig, merkleProof } = pds(genSeed, tree, leafIndex, opHash);

      // 7. Wallet admin signs opHash (wallet factor).
      //    ── Gas Separation flow ───────────────────────────────────────────────
      //    Case A: connected wallet IS a wallet admin → sign inline, no modal.
      //    Case B: connected wallet is NOT a wallet admin (e.g. it's a fresh gas
      //            wallet with no history, or the admin wallet has no ETH) →
      //            open GasSeparationModal so the user can:
      //              a) switch MetaMask to their authorized wallet and sign,
      //              b) switch back to the gas wallet and click Continue.
      //    Either way msg.sender (gas payer) is whoever calls directExecute —
      //    it is never checked by the contract.
      // ─────────────────────────────────────────────────────────────────────────
      const [isCurrentWalletAdmin, currentBalance] = await Promise.all([
        accountContract.isWalletAdmin(signerAddress),
        provider.getBalance(signerAddress),
      ]);

      // Need at least ~0.0005 BNB to cover gas (rough estimate for directExecute)
      const MIN_GAS = ethers.parseEther('0.0005');
      const hasEnoughGas = currentBalance >= MIN_GAS;

      let walletSig: string;
      if (isCurrentWalletAdmin && hasEnoughGas) {
        // Fast path: authorized wallet with gas — msg.sender IS the wallet factor, no extra sig
        walletSig = '0x';
      } else {
        // Slow path: current wallet is not authorized — need an authorized wallet to sign first
        let knownAdmins: string[] = [];
        try { knownAdmins = await accountContract.getWalletAdmins(); } catch {}

        walletSig = await new Promise<string>((resolve, reject) => {
          setGasSepModal({
            isOpen: true,
            opHash,
            authorizedWallets: knownAdmins,
            onSigned: (sig) => {
              setGasSepModal(prev => ({ ...prev, isOpen: false }));
              resolve(sig);
            },
          });
          // If user cancels, the modal calls onCancel which we expose via the
          // cancel button's onClick. We hook it through state by watching a
          // dedicated cancel flag — simplest: reject when modal closes without sig.
          // We store the reject so the cancel button can call it.
          (window as any).__gasSepReject = () => {
            setGasSepModal(prev => ({ ...prev, isOpen: false }));
            reject(new Error('Signature cancelled. Operation aborted.'));
          };
        });
      }

      // After the walletSig is ready, re-read the current provider/signer
      // (user may have switched wallets for gas).
      const submitProvider = new ethers.BrowserProvider(getEthereumObject() ?? eth);
      const submitSigner  = await submitProvider.getSigner();

      // 8. Submit — msg.sender can be any gas-paying wallet
      // WOTS+ verification is gas-heavy (~67 hash-chains + 8-level Merkle proof).
      // BSC estimateGas is unreliable for this pattern; set an explicit limit.
      const accountSigner = new ethers.Contract(accountAddress, ACCOUNT_ABI, submitSigner);
      const tx = await accountSigner.directExecute(
        signerRoot,
        leafIndex,
        otsPubKey,
        otsSig,
        merkleProof,
        inbandNewRoot,
        inbandNewPubSeed,
        passwordPreimage,
        actionCalldata,
        walletSig,   // wallet admin ECDSA sig (second factor)
        { gasLimit: 3_000_000n }
      );

      flushSync(() => {
        setProcessState(prev => ({ ...prev, step: 'broadcasting', txHash: tx.hash }));
      });
      setProcessState(prev => ({ ...prev, step: 'confirming' }));
      await tx.wait(1);

      // 9. If we rotated, advance local generation counter
      if (nextGen > currentGen) {
        setKeyGeneration(accountAddress, nextGen);
      }

      setProcessState(prev => ({ ...prev, step: 'success', successMsg }));
      setLastSuccessTime(Date.now());
      refreshVault();
    } catch (e: any) {
      setProcessState(prev => ({ ...prev, step: 'error', error: getFriendlyError(e) }));
    }
  };

  const handleInitiateWithdraw = (amount: string, to: string, token: string, symbol: string) => {
    setPendingWithdraw({ amount, to, token, symbol });
    setShowWithdrawModal(true);
  };

  const handleWithdrawConfirm = () => {
    setShowWithdrawModal(false);
    setShowPwModal({
      isOpen: true,
      action: executeWithdraw,
      desc: t('modal.pw.desc')
    });
  };

  const executeWithdraw = async (pw: string) => {
    if (!pendingWithdraw || !accountAddress || !vaultAddress || !user.address) return;
    const { amount, to, token } = pendingWithdraw;
    const toAddr = to || user.address;

    if (!toAddr || !ethers.isAddress(toAddr)) {
      showToast(t('toast.invalid_addr'), 'error');
      return;
    }

    await executeDirectOp(
      pw,
      t('withdraw.title'),
      async (iface, provider) => {
        if (!token) {
          return iface.encodeFunctionData('executeNativeWithdrawal', [toAddr, ethers.parseEther(amount)]);
        }
        const tokenContract = new ethers.Contract(token, ERC20_ABI, provider);
        let decimals = 18; try { decimals = await tokenContract.decimals(); } catch {}
        return iface.encodeFunctionData('executeERC20Withdrawal', [token, toAddr, ethers.parseUnits(amount, decimals)]);
      },
      t('process.success.withdraw')
    );
    setPendingWithdraw(null);
  };

  const handleRotateEcdsaSigner = async (newPw: string, currentPw: string) => {
    // Password change: derives entirely new master seed → resets generation to 0 for new password
    if (!accountAddress || !user.address) return;
    setShowPwModal({ isOpen: false });
    setProcessState({ isOpen: true, step: 'hashing', title: 'Change Vault Password', skipHashing: false });

    try {
      const eth = getEthereumObject();
      if (!eth) throw new Error(t('err.wallet_not_found'));
      const provider = new ethers.BrowserProvider(eth);
      const signer   = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      const { buildWOTSTreeAsync: bwt, prepareDirectExecSig: pds,
              derivePasswordPreimage, deriveGenerationSeed: dgs } = await import('./services/wotsService');

      const [oldMasterSeed, newMasterSeed] = await Promise.all([
        deriveArgon2Key(currentPw),
        deriveArgon2Key(newPw)
      ]);
      if (!oldMasterSeed || !newMasterSeed) throw new Error(t('err.key_derivation'));

      // Signing tree: use current generation of old password
      const currentGen = getKeyGeneration(accountAddress);
      const oldGenSeed = dgs(oldMasterSeed, currentGen);
      // Build both trees in parallel — Worker × 2
      const [oldTree, newTree] = await Promise.all([
        bwt(oldGenSeed),
        bwt(newMasterSeed),
      ]);

      // passwordPreimage always from masterSeed (gen 0)
      const oldPasswordPreimage = derivePasswordPreimage(oldMasterSeed);
      const newPasswordPreimage = derivePasswordPreimage(newMasterSeed);

      const accountContract = new ethers.Contract(accountAddress, ACCOUNT_ABI, provider);
      const signerRoot = oldTree.merkleRoot;

      const isAdminRoot: boolean = await accountContract.isAdmin(signerRoot);
      if (!isAdminRoot) throw new Error('Wrong current password — Merkle root not registered as admin.');

      // Verify connected wallet is authorized + has gas
      const [isWalletAdminAddrRotate, balanceRotate] = await Promise.all([
        accountContract.isWalletAdmin(signerAddress),
        provider.getBalance(signerAddress),
      ]);
      const hasEnoughGasRotate = balanceRotate >= ethers.parseEther('0.0005');

      const [passwordDomainOnChain] = await Promise.all([
        accountContract.passwordDomain()
      ]);
      const onChainNonce2: number = await accountContract.directNonce(signerRoot).then((n: bigint) => Number(n));
      const leafIndex: number = onChainNonce2;

      // New passwordCommit uses newPasswordPreimage + immutable passwordDomain
      const newCommit = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['bytes32', 'bytes32'],
          [newPasswordPreimage, passwordDomainOnChain]
        )
      );

      const accountIface = new ethers.Interface(ACCOUNT_ABI);
      const actionCalldata = accountIface.encodeFunctionData('setPasswordCommit', [newCommit]);

      setProcessState(prev => ({ ...prev, step: 'signing' }));
      const opHash: string = await accountContract.buildDirectOpHash(
        signerRoot,
        newTree.merkleRoot,   // inbandNewRoot — new password's gen-0 tree
        newTree.pubSeed,
        oldPasswordPreimage,
        actionCalldata
      );
      const { otsPubKey, otsSig, merkleProof } = pds(oldGenSeed, oldTree, leafIndex, opHash);

      // Gas separation: same pattern as executeDirectOp
      let walletSigRotate: string;
      if (isWalletAdminAddrRotate && hasEnoughGasRotate) {
        // Fast path: authorized wallet with gas
        walletSigRotate = '0x';
      } else {
        let knownAdmins: string[] = [];
        try { knownAdmins = await accountContract.getWalletAdmins(); } catch {}
        walletSigRotate = await new Promise<string>((resolve, reject) => {
          setGasSepModal({
            isOpen: true,
            opHash,
            authorizedWallets: knownAdmins,
            onSigned: (sig) => {
              setGasSepModal(prev => ({ ...prev, isOpen: false }));
              resolve(sig);
            },
          });
          (window as any).__gasSepReject = () => {
            setGasSepModal(prev => ({ ...prev, isOpen: false }));
            reject(new Error('Signature cancelled.'));
          };
        });
      }

      const submitProvider2 = new ethers.BrowserProvider(getEthereumObject() ?? eth);
      const submitSigner2   = await submitProvider2.getSigner();

      const accountSigner = new ethers.Contract(accountAddress, ACCOUNT_ABI, submitSigner2);
      const tx = await accountSigner.directExecute(
        signerRoot,
        leafIndex,
        otsPubKey,
        otsSig,
        merkleProof,
        newTree.merkleRoot,
        newTree.pubSeed,
        oldPasswordPreimage,
        actionCalldata,
        walletSigRotate
      );

      flushSync(() => {
        setProcessState(prev => ({ ...prev, step: 'broadcasting', txHash: tx.hash }));
      });
      setProcessState(prev => ({ ...prev, step: 'confirming' }));
      await tx.wait(1);

      // Password changed → reset generation counter to 0 for new password
      setKeyGeneration(accountAddress, 0);

      setProcessState(prev => ({ ...prev, step: 'success', successMsg: 'Password changed. Vault now uses the new password and a fresh signing key tree (gen 0).' }));
      setLastSuccessTime(Date.now());
    } catch (e: any) {
      setProcessState(prev => ({ ...prev, step: 'error', error: getFriendlyError(e) }));
    }
  };

  // ── Wallet admin management ───────────────────────────────────────────────
  // Both operations go through dual-factor directExecute:
  //   password (WOTS+) ✓  AND  current wallet in isWalletAdmin ✓
  const handleAddAdmin = async (walletAddress: string, pw: string) => {
    if (!ethers.isAddress(walletAddress)) {
      setProcessState({ isOpen: true, step: 'error', title: 'Add Wallet Admin',
        error: `Invalid address: ${walletAddress}` });
      return;
    }
    await executeDirectOp(
      pw,
      'Add Wallet Admin',
      async (iface) => iface.encodeFunctionData('addWalletAdmin', [walletAddress]),
      `Wallet ${walletAddress.slice(0,6)}…${walletAddress.slice(-4)} added as admin.`
    );
  };

  const handleRemoveAdmin = async (walletAddress: string, pw: string) => {
    if (!ethers.isAddress(walletAddress)) {
      setProcessState({ isOpen: true, step: 'error', title: 'Remove Wallet Admin',
        error: `Invalid address: ${walletAddress}` });
      return;
    }
    await executeDirectOp(
      pw,
      'Remove Wallet Admin',
      async (iface) => iface.encodeFunctionData('removeWalletAdmin', [walletAddress]),
      `Wallet ${walletAddress.slice(0,6)}…${walletAddress.slice(-4)} removed from admins.`
    );
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-200 bg-[#050914] selection:bg-cyan-500/30 overflow-x-hidden">
      {/* Removed Global Max Width Constraint to fix 'black bars' issue */}
      <div className="w-full min-h-screen flex flex-col relative">
        
        <Header 
          user={user} 
          onConnect={() => setShowWalletModal(true)} 
          onDisconnect={disconnectWallet}
          onShowGuide={() => setShowGuide(true)}
          onShowPrivacy={() => setShowPrivacy(true)}
          loading={loading}
          currentView={currentView}
          onNavigate={handleNavigate}
          hasVault={!!vaultAddress}
          myVaults={myVaults}
          activeAccount={accountAddress}
          onSwitchVault={switchToVault}
          isFetchingVaults={isFetchingVaults}
          onSwitchChain={switchChain}
        />
        
        <main className="flex-grow pt-20 md:pt-24 relative z-10">
          {currentView === 'landing' ? (
            <Landing 
              onLoadVault={handleLoadVault}
              onCreateVault={handleCreateVault}
              isConnected={user.isConnected}
              onConnect={() => setShowWalletModal(true)}
              loading={loading}
              activeVaultAddress={isDemoMode ? null : vaultAddress}
              onNavigateToDashboard={() => handleNavigate('dashboard')}
              onExitVault={handleExitVault}
              myVaults={myVaults}
              onSwitchVault={switchToVault}
              isFetchingVaults={isFetchingVaults}
              onRefreshVaults={() => user.address && fetchUserVaults(user.address)}
              chainId={user.chainId}
              onLoadDemo={handleLoadDemoVault}
            />
          ) : currentView === 'docs' ? (
            <Docs />
          ) : (
            <Dashboard 
              user={user}
              vaultState={vaultState}
              accountAddress={accountAddress}
              refreshVault={() => refreshVault(false)}
              onExit={handleExitVault}
              onConnect={() => setShowWalletModal(true)}
              onDeposit={handleInitiateDeposit}
              onInitiateWithdraw={handleInitiateWithdraw} 
              onRotateEcdsaSigner={(newPw: string, currentPw: string) => handleRotateEcdsaSigner(newPw, currentPw)}
              onSecureAction={(desc, action) => setShowPwModal({ isOpen: true, action, desc })}
              onAddAdmin={handleAddAdmin}
              onRemoveAdmin={handleRemoveAdmin}
              loading={loading}
              fetchUserTokenBalance={fetchUserTokenBalance}
              checkIsAuthorizer={checkIsAuthorizer}
              isRestoring={isRestoring}
              lastSuccessTime={lastSuccessTime}
              isDemo={isDemoMode}
            />
          )}
        </main>

        <Footer />
      </div>

      <WalletModal 
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={connectWallet}
        loading={loading}
      />

      <PasswordModal 
        isOpen={showPwModal.isOpen}
        onClose={() => setShowPwModal({ isOpen: false })}
        onConfirm={(pw) => showPwModal.action && showPwModal.action(pw)}
        description={showPwModal.desc}
        isLoading={loading}
      />

      <ProcessModal 
        isOpen={processState.isOpen}
        step={processState.step}
        title={processState.title}
        txHash={processState.txHash}
        explorerUrl={processState.txHash ? getExplorerUrl(processState.txHash) : undefined}
        errorMsg={processState.error}
        onClose={closeProcessModal}
        skipHashing={processState.skipHashing}
        successMsg={processState.successMsg}
      />

      <DepositConfirmModal 
        isOpen={showDepositModal}
        onClose={() => { setShowDepositModal(false); setPendingDeposit(null); }}
        onConfirm={executeDeposit}
        amount={pendingDeposit?.amount || "0"}
        symbol={pendingDeposit?.symbol || "ETH"}
        isCustom={pendingDeposit?.isCustom || false}
        loading={loading}
      />
      
      <WithdrawConfirmModal
        isOpen={showWithdrawModal}
        onClose={() => { setShowWithdrawModal(false); setPendingWithdraw(null); }}
        onConfirm={handleWithdrawConfirm}
        amount={pendingWithdraw?.amount || "0"}
        symbol={pendingWithdraw?.symbol || "ETH"}
        toAddress={pendingWithdraw?.to || "0x..."}
        loading={loading}
      />

      <GuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
      <PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />

      {/* Gas Separation Modal — authorize with admin wallet, submit with gas wallet */}
      <GasSeparationModal
        isOpen={gasSepModal.isOpen}
        opHash={gasSepModal.opHash}
        authorizedWallets={gasSepModal.authorizedWallets}
        onSuccess={(sig) => gasSepModal.onSigned(sig)}
        onCancel={() => {
          const reject = (window as any).__gasSepReject;
          if (reject) { reject(); (window as any).__gasSepReject = null; }
          else setGasSepModal(prev => ({ ...prev, isOpen: false }));
        }}
      />

      {toast && (
        <div className={`fixed z-[200] px-6 py-4 rounded-xl shadow-2xl backdrop-blur-xl border flex items-center gap-4 transition-all duration-300 animate-fade-in-up
          left-4 right-4 bottom-6 md:bottom-auto md:top-28 md:left-1/2 md:-translate-x-1/2 md:max-w-md
          ${toast.type === 'error' ? 'bg-red-950/90 border-red-500/50 text-red-100 shadow-red-900/30' : 
            toast.type === 'success' ? 'bg-teal-950/90 border-teal-500/50 text-teal-100 shadow-teal-900/30' : 
            'bg-slate-800/90 border-cyan-500/30 text-cyan-100 shadow-cyan-900/30'
          }`}
        >
          <div className={`p-2 rounded-full shrink-0 ${
            toast.type === 'error' ? 'bg-red-500/20 text-red-400' : 
            toast.type === 'success' ? 'bg-teal-500/20 text-teal-400' : 
            'bg-cyan-500/20 text-cyan-300'
          }`}>
            {toast.type === 'error' ? <AlertTriangle size={20} /> : 
             toast.type === 'success' ? <ShieldCheck size={20} /> : 
             <Info size={20} />}
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm mb-0.5">
              {toast.type === 'error' ? t('toast.op_fail') : toast.type === 'success' ? t('toast.op_success') : 'System'}
            </h4>
            <p className="text-xs opacity-90 leading-relaxed font-medium">{toast.msg}</p>
          </div>
          <button onClick={() => setToast(null)} className="p-1 hover:bg-cyan-100/[0.07] rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
