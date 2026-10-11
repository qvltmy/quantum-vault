/**
 * Blockscout API — auto-discover ERC-20 tokens held by a vault address across all 6 chains.
 * Uses the public v2 API (no key required, browser-friendly).
 */

export interface BlockscoutToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string; // raw string, divide by 10^decimals
  chainId: number;
}

// Blockscout base URLs per chainId
const BLOCKSCOUT_BASE: Record<number, string> = {
  4663:  'https://robinhoodchain.blockscout.com',
  1:     'https://eth.blockscout.com',
  56:    'https://bsc.blockscout.com',
  8453:  'https://base.blockscout.com',
  42161: 'https://arbitrum.blockscout.com',
  137:   'https://polygon.blockscout.com',
};

// BSC uses its own instance path
const BSC_BASE = 'https://bsc.blockscout.com';

/**
 * Fetch all ERC-20 tokens held by `address` on a single chain.
 * Returns [] on any error (404, timeout, rate-limit — never throws).
 */
export async function fetchChainTokens(
  chainId: number,
  address: string,
): Promise<BlockscoutToken[]> {
  const base = BLOCKSCOUT_BASE[chainId];
  if (!base) return [];

  try {
    const res = await fetch(
      `${base}/api/v2/addresses/${address}/tokens?type=ERC-20`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items: any[] = data.items ?? [];
    return items
      .filter(item => item.token && BigInt(item.value ?? '0') > 0n)
      .map(item => ({
        address:  item.token.address,
        symbol:   item.token.symbol ?? '?',
        name:     item.token.name ?? item.token.symbol ?? 'Unknown',
        decimals: Number(item.token.decimals ?? 18),
        balance:  item.value ?? '0',
        chainId,
      }));
  } catch {
    return [];
  }
}

/**
 * Fetch native balance for `address` on a chain via Blockscout.
 * Returns null on failure.
 */
export async function fetchChainNativeBalance(
  chainId: number,
  address: string,
): Promise<{ balance: bigint; chainId: number } | null> {
  const base = BLOCKSCOUT_BASE[chainId];
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/v2/addresses/${address}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data.coin_balance ?? '0';
    return { balance: BigInt(raw), chainId };
  } catch {
    return null;
  }
}

/**
 * Fetch tokens + native balance across ALL 6 chains in parallel.
 * Returns results keyed by chainId — never throws.
 */
export async function fetchAllChainsTokens(address: string): Promise<{
  tokens: BlockscoutToken[];
  nativeByChain: Record<number, bigint>;
}> {
  const chainIds = [4663, 1, 56, 8453, 42161, 137];

  const [tokenResults, nativeResults] = await Promise.all([
    Promise.all(chainIds.map(id => fetchChainTokens(id, address))),
    Promise.all(chainIds.map(id => fetchChainNativeBalance(id, address))),
  ]);

  const tokens = tokenResults.flat();
  const nativeByChain: Record<number, bigint> = {};
  nativeResults.forEach(r => {
    if (r) nativeByChain[r.chainId] = r.balance;
  });

  return { tokens, nativeByChain };
}
