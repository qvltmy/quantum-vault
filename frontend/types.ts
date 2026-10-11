export interface VaultState {
  vaultAddress: string | null;
  accountAddress: string | null;
  nativeBalance: bigint;
  chainId: bigint;
  primaryMerkleRoot: string;
  // Legacy field retained for compatibility; V2 contracts have no pause/freeze state.
  isPaused: boolean;
  vaultTokens: TokenInfo[];
}

export interface TokenInfo {
  symbol: string;
  address: string;
  decimals: number;
  balance: bigint;
}

export interface UserState {
  address: string | null;
  nativeBalance: bigint | null;
  isConnected: boolean;
  chainId: bigint;
}

export interface ChainConfig {
  id: number;
  name: string;
  /** Short ticker for native gas token, e.g. "ETH" or "BNB" */
  ticker: string;
  rpc: string;
  /** Chain is currently supported for vault operations */
  active: boolean;
  color: string;
  explorer: string;
  logo?: string;
  /** Human-readable network label shown in UI (e.g. "Ethereum Mainnet") */
  label?: string;
  /** True if this is the official primary/launch chain */
  primary?: boolean;
  /** True if this chain is for testing only */
  testnet?: boolean;
  /** Per-chain factory address — populate when deployed, activates the chain */
  factoryAddress?: string;
  /** Additional RPC URLs for wallet_addEthereumChain */
  rpcUrls?: string[];
  /** Native currency metadata for wallet_addEthereumChain */
  nativeCurrency?: { name: string; symbol: string; decimals: number };
}

// New factory (V2, all chains): 0xb473acF11db7F27F59213C7FE07D47d0eC569744
// Deployed via CREATE2 with fixed salt — same address on every chain.
// evm_version=cancun, solc 0.8.28+commit.7893614a, via_ir, optimizer 200
export const FACTORY_ADDRESS = '0xb473acF11db7F27F59213C7FE07D47d0eC569744';

export const CHAINS: ChainConfig[] = [
  {
    id: 4663,
    name: 'Robinhood',
    label: 'Robinhood Chain',
    ticker: 'ETH',
    rpc: 'https://rpc.mainnet.chain.robinhood.com',
    rpcUrls: [
      'https://rpc.mainnet.chain.robinhood.com',
      'https://robinhood-rpc.publicnode.com',
      'https://robinhood.drpc.org',
    ],
    active: true,
    primary: true,
    color: '#00C805',
    explorer: 'https://robinhoodchain.blockscout.com',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    factoryAddress: FACTORY_ADDRESS,
  },
  {
    id: 1,
    name: 'Ethereum',
    label: 'Ethereum Mainnet',
    ticker: 'ETH',
    rpc: 'https://ethereum.publicnode.com',
    rpcUrls: ['https://ethereum.publicnode.com', 'https://eth.llamarpc.com'],
    active: true,
    color: '#627EEA',
    explorer: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    factoryAddress: FACTORY_ADDRESS,
  },
  {
    id: 56,
    name: 'BNB Chain',
    label: 'BNB Smart Chain Mainnet',
    ticker: 'BNB',
    rpc: 'https://bsc-dataseed.binance.org',
    rpcUrls: ['https://bsc-dataseed.binance.org', 'https://bsc-dataseed1.binance.org'],
    active: true,
    color: '#F3BA2F',
    explorer: 'https://bscscan.com',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    factoryAddress: FACTORY_ADDRESS,
  },
  {
    id: 8453,
    name: 'Base',
    label: 'Base',
    ticker: 'ETH',
    rpc: 'https://mainnet.base.org',
    rpcUrls: ['https://mainnet.base.org'],
    active: true,
    color: '#0052FF',
    explorer: 'https://basescan.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    factoryAddress: FACTORY_ADDRESS,
  },
  {
    id: 42161,
    name: 'Arbitrum',
    label: 'Arbitrum One',
    ticker: 'ETH',
    rpc: 'https://arb1.arbitrum.io/rpc',
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    active: true,
    color: '#12AAFF',
    explorer: 'https://arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    factoryAddress: FACTORY_ADDRESS,
  },
  {
    id: 137,
    name: 'Polygon',
    label: 'Polygon',
    ticker: 'POL',
    rpc: 'https://polygon-bor-rpc.publicnode.com',
    rpcUrls: ['https://polygon-bor-rpc.publicnode.com', 'https://polygon-rpc.com'],
    active: true,
    color: '#8247E5',
    explorer: 'https://polygonscan.com',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    factoryAddress: FACTORY_ADDRESS,
  },
];

declare global {
  interface Window {
    ethereum?: any;
    okxwallet?: any;
    bitkeep?: { ethereum: any };
    trustwallet?: any;
    BinanceChain?: any;
    coinbaseWallet?: any;
    imToken?: { ethereum: any };
    coin98?: { provider: any };
  }
}

// ── Per-chain ERC-20 token lists ──────────────────────────────────────────────
// Convention: index 0 is the "native wrapped" token (WBNB, WETH, WMATIC …).
// The deposit UI shows native first (address="") and slices from index 1 for ERC-20 quick-picks.
// refreshVault skips scanning the WBNB token on BSC (held as native BNB); all tokens
// including the wrapped native are scanned on ETH/Base/Arb/Polygon/Robinhood.
export const CHAIN_TOKENS: Record<number, Omit<TokenInfo, 'balance'>[]> = {
  // ── Ethereum Mainnet ──────────────────────────────────────────────────────
  1: [
    { symbol: 'WETH',  address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
    { symbol: 'USDT',  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6  },
    { symbol: 'USDC',  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6  },
    { symbol: 'DAI',   address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
    { symbol: 'WBTC',  address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8  },
  ],
  // ── BNB Smart Chain ───────────────────────────────────────────────────────
  56: [
    { symbol: 'WBNB',  address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', decimals: 18 },
    { symbol: 'BTCB',  address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', decimals: 18 },
    { symbol: 'WETH',  address: '0x2170ed0880ac9a755fd29b2688956bd959f933f8', decimals: 18 },
    { symbol: 'USDT',  address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
    { symbol: 'USDC',  address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', decimals: 18 },
    { symbol: 'FDUSD', address: '0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409', decimals: 18 },
  ],
  // ── Base ─────────────────────────────────────────────────────────────────
  8453: [
    { symbol: 'WETH',  address: '0x4200000000000000000000000000000000000006', decimals: 18 },
    { symbol: 'USDC',  address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6  },
    { symbol: 'DAI',   address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18 },
    { symbol: 'cbBTC', address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', decimals: 8  },
  ],
  // ── Arbitrum One ─────────────────────────────────────────────────────────
  42161: [
    { symbol: 'WETH',  address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
    { symbol: 'USDC',  address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6  },
    { symbol: 'USDT',  address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6  },
    { symbol: 'WBTC',  address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8  },
    { symbol: 'ARB',   address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18 },
  ],
  // ── Polygon ───────────────────────────────────────────────────────────────
  137: [
    { symbol: 'WPOL',  address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', decimals: 18 },
    { symbol: 'WETH',  address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18 },
    { symbol: 'USDT',  address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6  },
    { symbol: 'USDC',  address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6  },
    { symbol: 'WBTC',  address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', decimals: 8  },
  ],
  // ── Robinhood Chain (ETH L2, Arbitrum Orbit) ──────────────────────────────
  // Verified on-chain via eth_call 2026-10-11. Sorted by on-chain market cap.
  4663: [
    { symbol: 'WETH',    address: '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73', decimals: 18 },
    { symbol: 'USDG',    address: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168', decimals: 6  },
    { symbol: 'cbBTC',   address: '0xCEC185eB182c47d1bA1EFc84e6959e18cd620Be4', decimals: 8  },
    { symbol: 'USDe',    address: '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34', decimals: 18 },
    { symbol: 'U',       address: '0xcE24439F2D9C6a2289F741120FE202248B666666', decimals: 18 },
    { symbol: 'LINK',    address: '0x492641F648a4986844848E0beFE66D14817bCE34', decimals: 18 },
    { symbol: 'PENGU',   address: '0x74BE72AFFAFbC8de30F0C11247814036314D625f', decimals: 18 },
    { symbol: 'VIRTUAL', address: '0xc6911796042b15d7Fa4F6CDe69e245DdCd3d9c31', decimals: 18 },
    { symbol: 'PENDLE',  address: '0x5E49E1f85813F2B65858860A3FA231b4186f2e0E', decimals: 18 },
    { symbol: 'PONS',    address: '0x39dBED3a2bd333467115dE45665cC57F813C4571', decimals: 18 },
    { symbol: 'LIT',     address: '0xeeca2E7Dc194a320d349122d88259bB9595a4cB0', decimals: 18 },
    { symbol: 'APE',     address: '0x8f86a15EC17cb3369d8b3E666dAdBC11daA82b79', decimals: 18 },
  ],
};

/** Returns known ERC-20 tokens for the given chain; falls back to BSC list. */
export const getChainTokens = (chainId: bigint): Omit<TokenInfo, 'balance'>[] =>
  CHAIN_TOKENS[Number(chainId)] ?? CHAIN_TOKENS[56];

/** True only when a factory contract has been deployed on this chain. */
export const chainHasFactory = (chainId: bigint): boolean => {
  const chain = CHAINS.find(c => BigInt(c.id) === chainId);
  return !!(chain?.factoryAddress);
};

/** Returns the factory address for the given chainId, falling back to the global constant. */
export const getFactoryAddress = (chainId: bigint): string => {
  const chain = CHAINS.find(c => BigInt(c.id) === chainId);
  return chain?.factoryAddress ?? FACTORY_ADDRESS;
};

// Backward-compat alias — BSC token list
export const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
export const KNOWN_TOKENS: Omit<TokenInfo, 'balance'>[] = CHAIN_TOKENS[56];
