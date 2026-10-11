
import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import { ArrowDownUp, ChevronDown, Loader2, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import {
  getRelayChains, getRelayCurrencies, getRelayQuote,
  RelayChain, RelayCurrency, RelayQuote,
  ROBINHOOD_CHAIN_ID,
} from '../services/relayService';
import { ethers } from 'ethers';
import { CHAINS } from '../types';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultAddress: string;
  nativeBalance: bigint;
  vaultTokens: Array<{ symbol: string; address: string; decimals: number; balance?: bigint }>;
  onConfirm: (quote: RelayQuote, originCurrency: string, amount: bigint) => void;
  loading: boolean;
}

const ETH_ADDR = '0x0000000000000000000000000000000000000000';

function fmtBalance(balance: bigint, decimals: number, maxDp = 6): string {
  const s = ethers.formatUnits(balance, decimals);
  const parts = s.split('.');
  if (!parts[1]) return parts[0];
  return parts[0] + '.' + parts[1].slice(0, maxDp).replace(/0+$/, '') || parts[0];
}

const SwapModal: React.FC<SwapModalProps> = ({
  isOpen, onClose, vaultAddress, nativeBalance, vaultTokens, onConfirm, loading
}) => {
  const [chains, setChains] = useState<RelayChain[]>([]);
  const [destChain, setDestChain] = useState<RelayChain | null>(null);
  const [destCurrencies, setDestCurrencies] = useState<RelayCurrency[]>([]);
  const [destCurrency, setDestCurrency] = useState<RelayCurrency | null>(null);

  const [originCurrency, setOriginCurrency] = useState<string>(ETH_ADDR); // address
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<RelayQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);

  const [showChainPicker, setShowChainPicker] = useState(false);
  const [showDestCurrencyPicker, setShowDestCurrencyPicker] = useState(false);
  const [showOriginPicker, setShowOriginPicker] = useState(false);

  // Origin token options: ETH + vault ERC20s that have balance
  const originOptions = [
    { symbol: 'ETH', address: ETH_ADDR, decimals: 18, balance: nativeBalance },
    ...vaultTokens.filter(t => (t.balance ?? 0n) > 0n),
  ];

  const selectedOrigin = originOptions.find(o => o.address.toLowerCase() === originCurrency.toLowerCase())
    ?? originOptions[0];

  // Load chains once on open
  useEffect(() => {
    if (!isOpen) return;
    getRelayChains().then(all => {
      const filtered = all.filter(c => c.id !== ROBINHOOD_CHAIN_ID);
      setChains(filtered);
      const base = filtered.find(c => c.id === 8453) ?? filtered[0];
      setDestChain(base ?? null);
    }).catch(() => {});
  }, [isOpen]);

  // Load dest currencies when destChain changes
  useEffect(() => {
    if (!destChain) return;
    setDestCurrencies([]);
    setDestCurrency(null);
    getRelayCurrencies(destChain.id).then(list => {
      setDestCurrencies(list);
      const eth = list.find(c => c.address === ETH_ADDR) ?? list[0];
      setDestCurrency(eth ?? null);
    }).catch(() => {});
  }, [destChain]);

  // Fetch quote when inputs are ready
  const fetchQuote = useCallback(async () => {
    if (!destChain || !destCurrency || !amount || parseFloat(amount) <= 0) {
      setQuote(null); setQuoteError(null); return;
    }
    const decimals = selectedOrigin.decimals;
    let amountWei: bigint;
    try { amountWei = ethers.parseUnits(amount, decimals); } catch { return; }
    if (amountWei <= 0n) return;

    setQuoting(true); setQuoteError(null); setQuote(null);
    try {
      const q = await getRelayQuote({
        user: vaultAddress,
        recipient: vaultAddress,
        originChainId: ROBINHOOD_CHAIN_ID,
        destinationChainId: destChain.id,
        originCurrency: selectedOrigin.address,
        destinationCurrency: destCurrency.address,
        amount: amountWei.toString(),
      });
      setQuote(q);
    } catch (e: any) {
      setQuoteError(e?.message ?? 'Failed to get quote');
    } finally {
      setQuoting(false);
    }
  }, [destChain, destCurrency, amount, selectedOrigin, vaultAddress]);

  useEffect(() => {
    const t = setTimeout(fetchQuote, 600);
    return () => clearTimeout(t);
  }, [fetchQuote]);

  const handleConfirm = () => {
    if (!quote) return;
    const decimals = selectedOrigin.decimals;
    let amountWei: bigint;
    try { amountWei = ethers.parseUnits(amount, decimals); } catch { return; }
    onConfirm(quote, selectedOrigin.address, amountWei);
  };

  const setMax = () => {
    if (!selectedOrigin.balance) return;
    setAmount(fmtBalance(selectedOrigin.balance, selectedOrigin.decimals));
  };

  if (!isOpen) return null;

  const isSameChain = destChain?.id === ROBINHOOD_CHAIN_ID;
  const actionLabel = isSameChain ? 'Swap' : 'Bridge & Swap';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={actionLabel}>
      <div className="flex flex-col gap-4">

        {/* Origin token */}
        <div className="bg-slate-900/50 rounded-2xl border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">From vault</span>
            <button
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
              onClick={setMax}
            >
              Max: {fmtBalance(selectedOrigin.balance ?? 0n, selectedOrigin.decimals)} {selectedOrigin.symbol}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm font-bold text-white transition-colors shrink-0"
              onClick={() => setShowOriginPicker(v => !v)}
            >
              {selectedOrigin.symbol} <ChevronDown size={14} />
            </button>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-transparent text-right text-xl font-mono font-bold text-white outline-none placeholder-slate-600"
            />
          </div>
          {showOriginPicker && (
            <div className="mt-2 flex flex-col gap-1 max-h-36 overflow-y-auto">
              {originOptions.map(o => (
                <button
                  key={o.address}
                  onClick={() => { setOriginCurrency(o.address); setShowOriginPicker(false); setAmount(''); }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${o.address === originCurrency ? 'bg-cyan-500/20 text-cyan-200' : 'hover:bg-slate-700 text-slate-300'}`}
                >
                  <span className="font-bold">{o.symbol}</span>
                  <span className="font-mono text-xs">{fmtBalance(o.balance ?? 0n, o.decimals)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center">
            <ArrowDownUp size={14} className="text-slate-400" />
          </div>
        </div>

        {/* Destination */}
        <div className="bg-slate-900/50 rounded-2xl border border-slate-700 p-4 flex flex-col gap-3">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">To</span>

          {/* Chain picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Chain:</span>
            <button
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm font-bold text-white transition-colors"
              onClick={() => setShowChainPicker(v => !v)}
            >
              {destChain ? (
                <>
                  {destChain.iconUrl && <img src={destChain.iconUrl} className="w-4 h-4 rounded-full" alt="" />}
                  {destChain.displayName}
                </>
              ) : 'Select chain'}
              <ChevronDown size={14} />
            </button>
          </div>
          {showChainPicker && (
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
              {chains.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setDestChain(c); setShowChainPicker(false); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${c.id === destChain?.id ? 'bg-cyan-500/20 text-cyan-200' : 'hover:bg-slate-700 text-slate-300'}`}
                >
                  {c.iconUrl && <img src={c.iconUrl} className="w-4 h-4 rounded-full" alt="" />}
                  {c.displayName}
                </button>
              ))}
            </div>
          )}

          {/* Dest currency picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Token:</span>
            <button
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm font-bold text-white transition-colors"
              onClick={() => setShowDestCurrencyPicker(v => !v)}
              disabled={!destCurrencies.length}
            >
              {destCurrency ? (
                <>
                  {destCurrency.metadata?.logoURI && (
                    <img src={destCurrency.metadata.logoURI} className="w-4 h-4 rounded-full" alt="" />
                  )}
                  {destCurrency.symbol}
                </>
              ) : <span className="text-slate-500">Loading…</span>}
              <ChevronDown size={14} />
            </button>
          </div>
          {showDestCurrencyPicker && (
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
              {destCurrencies.map(c => (
                <button
                  key={c.address}
                  onClick={() => { setDestCurrency(c); setShowDestCurrencyPicker(false); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${c.address === destCurrency?.address ? 'bg-cyan-500/20 text-cyan-200' : 'hover:bg-slate-700 text-slate-300'}`}
                >
                  {c.metadata?.logoURI && <img src={c.metadata.logoURI} className="w-4 h-4 rounded-full" alt="" />}
                  <span className="font-bold">{c.symbol}</span>
                  <span className="text-slate-500 text-xs">{c.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quote result */}
        {quoting && (
          <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
            <Loader2 size={13} className="animate-spin" /> Fetching quote…
          </div>
        )}
        {quoteError && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            <AlertTriangle size={13} className="shrink-0" /> {quoteError}
          </div>
        )}
        {quote && !quoting && (
          <div className="bg-slate-900/50 rounded-2xl border border-slate-700 p-4 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">You receive</span>
              <span className="font-bold text-white text-sm">
                {quote.details.currencyOut.amountFormatted} {quote.details.currencyOut.currency.symbol}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">On</span>
              <span className="text-slate-300">{destChain?.displayName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Relay fee</span>
              <span className="text-slate-300">
                {quote.fees.relayer.amountFormatted} {quote.fees.relayer.currency.symbol}
                {' '}(~${quote.fees.relayer.amountUsd})
              </span>
            </div>
            {quote.details.timeEstimate && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Est. time</span>
                <span className="text-slate-300">{Math.ceil(quote.details.timeEstimate / 60)}m</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-1">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-800 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!quote || quoting || loading || !amount || parseFloat(amount) <= 0}
            className="flex-1 h-11 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-bold hover:shadow-lg hover:shadow-cyan-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 size={15} className="animate-spin" /> Processing…</>
            ) : (
              <>{actionLabel} <ArrowRight size={15} /></>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SwapModal;
