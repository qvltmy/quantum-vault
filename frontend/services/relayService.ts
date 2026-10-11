/**
 * Relay Protocol integration for QuantumVault.
 * All operations originate from the vault account address (smart contract wallet).
 * No wallet connection required for quoting.
 */

const RELAY_API = 'https://api.relay.link';

// Robinhood Chain Relay contracts
export const RELAY_CONTRACTS = {
  depository:    '0x4cd00e387622c35bddb9b4c962c136462338bc31',
  erc20Router:   '0xb92fe925dc43a0ecde6c8b1a2709c170ec4fff4f',
  approvalProxy: '0xccc88a9d1b4ed6b0eaba998850414b24f1c315be',
};

export const ROBINHOOD_CHAIN_ID = 4663;

export interface RelayChain {
  id: number;
  name: string;
  displayName: string;
  iconUrl?: string;
  currency: { symbol: string; decimals: number; address: string };
  depositEnabled: boolean;
  disabled: boolean;
}

export interface RelayCurrency {
  id?: string;
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  supportsBridging: boolean;
  metadata?: { logoURI?: string };
}

export interface RelayStep {
  id: string;           // 'deposit' | 'approve' | 'swap'
  items: Array<{
    status: string;
    data: {
      from: string;
      to: string;
      data: string;
      value: string;
      chainId: number;
      gas: string;
      maxFeePerGas?: string;
      maxPriorityFeePerGas?: string;
    };
    check: { endpoint: string; method: string };
  }>;
  requestId: string;
}

export interface RelayQuote {
  requestId: string;
  steps: RelayStep[];
  fees: {
    gas:            { amountFormatted: string; amountUsd: string; currency: { symbol: string } };
    relayer:        { amountFormatted: string; amountUsd: string; currency: { symbol: string } };
    relayerService: { amountFormatted: string; amountUsd: string; currency: { symbol: string } };
  };
  details: {
    currencyIn:  { amountFormatted: string; amountUsd: string; currency: RelayCurrency & { chainId: number } };
    currencyOut: { amountFormatted: string; amountUsd: string; currency: RelayCurrency & { chainId: number } };
    timeEstimate?: number;
  };
}

// ── API wrappers ──────────────────────────────────────────────────────────────

/** Fetch all chains supported by Relay. */
export async function getRelayChains(): Promise<RelayChain[]> {
  const res = await fetch(`${RELAY_API}/chains`);
  if (!res.ok) throw new Error(`Relay /chains failed: ${res.status}`);
  const data = await res.json();
  return (data.chains as RelayChain[]).filter(c => !c.disabled && c.depositEnabled);
}

/** Fetch bridgeable/swappable currencies on a given chain. */
export async function getRelayCurrencies(chainId: number): Promise<RelayCurrency[]> {
  const res = await fetch(`${RELAY_API}/currencies/v1?chainId=${chainId}&verified=true`);
  if (!res.ok) throw new Error(`Relay /currencies failed: ${res.status}`);
  const data = await res.json();
  // Also include native ETH which may not be in the list
  const currencies: RelayCurrency[] = data.currencies ?? data ?? [];
  return currencies;
}

export interface QuoteParams {
  user: string;           // vaultAddress (smart account)
  recipient: string;      // where output goes (usually vaultAddress)
  originChainId: number;
  destinationChainId: number;
  originCurrency: string;   // token address or 0x0 for native
  destinationCurrency: string;
  amount: string;           // in smallest unit (wei / token decimals)
  tradeType?: 'EXACT_INPUT' | 'EXACT_OUTPUT';
}

/** Get a quote. Returns null on expected errors (no liquidity, etc.). */
export async function getRelayQuote(params: QuoteParams): Promise<RelayQuote> {
  const res = await fetch(`${RELAY_API}/quote/v2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tradeType: 'EXACT_INPUT', ...params }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.message ?? data?.error ?? `Relay API error ${res.status}`;
    throw new Error(msg);
  }
  return data as RelayQuote;
}

/** Poll intent status until terminal state. Returns final status string. */
export async function pollRelayStatus(
  requestId: string,
  onStatus?: (status: string) => void,
  timeoutMs = 120_000
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${RELAY_API}/intents/status/v3?requestId=${requestId}`);
    if (!res.ok) throw new Error(`Status poll failed: ${res.status}`);
    const data = await res.json();
    const status: string = data.status ?? 'unknown';
    onStatus?.(status);
    if (['success', 'failure', 'refund'].includes(status)) return status;
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('Relay intent timed out after 2 minutes');
}

// ── actionCalldata builders ───────────────────────────────────────────────────
// These produce the calldata passed to directExecute's `actionCalldata` param.
// The vault account calls address(this) with this data, which routes to the
// onlyEntryPointOrSelf functions that pull from vault and forward to Relay.

import { ethers } from 'ethers';

const ACCOUNT_RELAY_ABI = [
  'function executeExternalCall(address to, uint256 nativeAmount, bytes calldata data) external',
  'function executeERC20ExternalCall(address token, uint256 tokenAmount, address spender, address to, bytes calldata data) external',
];
const iface = new ethers.Interface(ACCOUNT_RELAY_ABI);

/**
 * Build actionCalldata for a native-ETH operation (bridge out or ETH→token swap).
 * steps must have exactly 1 step (kind='transaction').
 */
export function buildNativeActionCalldata(quote: RelayQuote, amount: bigint): string {
  const step = quote.steps[0];
  const tx = step.items[0].data;
  return iface.encodeFunctionData('executeExternalCall', [
    tx.to,
    amount,
    tx.data,
  ]);
}

/**
 * Build actionCalldata for an ERC-20 bridge/swap (approve + deposit, 2 steps).
 * steps[0] = approve (to = token address)
 * steps[1] = deposit (to = depository)
 */
export function buildERC20ActionCalldata(
  quote: RelayQuote,
  tokenAddress: string,
  tokenAmount: bigint
): string {
  if (quote.steps.length < 2) {
    // Single-step ERC20 path (e.g. permit-based)
    const tx = quote.steps[0].items[0].data;
    return iface.encodeFunctionData('executeERC20ExternalCall', [
      tokenAddress,
      tokenAmount,
      tx.to,   // spender = target
      tx.to,
      tx.data,
    ]);
  }
  const approveTx = quote.steps[0].items[0].data; // approve
  const depositTx = quote.steps[1].items[0].data; // deposit
  return iface.encodeFunctionData('executeERC20ExternalCall', [
    tokenAddress,
    tokenAmount,
    approveTx.to,  // spender (depository or approvalProxy)
    depositTx.to,  // call target
    depositTx.data,
  ]);
}
