
import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import {
  Shield, Wallet, CheckCircle2, AlertTriangle, Loader2, ArrowRight, X, Zap, RefreshCw
} from 'lucide-react';

interface GasSeparationModalProps {
  isOpen: boolean;
  opHash: string;
  /** Known wallet admins for display (address[]) */
  authorizedWallets: string[];
  /**
   * true  → current wallet IS an authorized admin but has insufficient gas.
   *         User can sign immediately with current wallet, then switch to a gas wallet.
   * false → current wallet is NOT an authorized admin.
   *         User must first switch to an authorized wallet to sign.
   */
  isAlreadyAuthorized: boolean;
  onSuccess: (walletSig: string) => void;
  onCancel: () => void;
}

type Phase = 'sign' | 'signing' | 'signed' | 'error';

const short = (addr: string) => addr ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : '';

const GasSeparationModal: React.FC<GasSeparationModalProps> = ({
  isOpen,
  opHash,
  authorizedWallets,
  isAlreadyAuthorized,
  onSuccess,
  onCancel,
}) => {
  const [phase, setPhase]           = useState<Phase>('sign');
  const [walletSig, setWalletSig]   = useState('');
  const [signerAddr, setSignerAddr] = useState('');
  const [currentAddr, setCurrentAddr] = useState('');
  const [error, setError]           = useState('');
  const listenerRef = useRef<((accounts: string[]) => void) | null>(null);

  const isAuthorized = (addr: string) =>
    authorizedWallets.length === 0 ||
    authorizedWallets.some(a => a.toLowerCase() === addr.toLowerCase());

  // Detect current wallet address
  const detectCurrentWallet = async () => {
    try {
      const eth = (window as any).ethereum;
      if (!eth) return;
      const provider = new ethers.BrowserProvider(eth);
      const signer   = await provider.getSigner();
      setCurrentAddr(await signer.getAddress());
    } catch {}
  };

  // Subscribe to MetaMask accountsChanged for auto-update
  const subscribeAccountChange = () => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    if (listenerRef.current) {
      eth.removeListener('accountsChanged', listenerRef.current);
    }
    const handler = async (accounts: string[]) => {
      if (accounts.length > 0) {
        setCurrentAddr(ethers.getAddress(accounts[0]));
      }
    };
    listenerRef.current = handler;
    eth.on('accountsChanged', handler);
  };

  const unsubscribeAccountChange = () => {
    const eth = (window as any).ethereum;
    if (eth && listenerRef.current) {
      eth.removeListener('accountsChanged', listenerRef.current);
      listenerRef.current = null;
    }
  };

  // Mount/unmount listener with modal lifecycle
  useEffect(() => {
    if (!isOpen) {
      unsubscribeAccountChange();
      return;
    }
    setPhase('sign');
    setWalletSig('');
    setSignerAddr('');
    setError('');
    detectCurrentWallet();
    subscribeAccountChange();
    return () => unsubscribeAccountChange();
  }, [isOpen]);

  // Force MetaMask to show account picker
  const handleSwitchWallet = async () => {
    try {
      const eth = (window as any).ethereum;
      if (!eth) return;
      await eth.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });
      await detectCurrentWallet();
    } catch {
      // user cancelled picker — silently ignore
    }
  };

  const handleSign = async () => {
    setPhase('signing');
    setError('');
    try {
      const eth = (window as any).ethereum;
      if (!eth) throw new Error('No wallet detected. Please install MetaMask or another compatible wallet.');

      const provider = new ethers.BrowserProvider(eth);
      await eth.request({ method: 'eth_requestAccounts' });
      const signer = await provider.getSigner();
      const addr   = await signer.getAddress();

      // Verify it's actually an authorized wallet
      const adminCheck =
        authorizedWallets.length === 0
          ? true
          : authorizedWallets.some(a => a.toLowerCase() === addr.toLowerCase());

      if (!adminCheck) {
        throw new Error(
          `${short(addr)} is not an authorized admin.\n` +
          `Please switch MetaMask to one of the authorized wallets listed above, then try again.`
        );
      }

      const sig       = await signer.signMessage(ethers.getBytes(opHash));
      const recovered = ethers.verifyMessage(ethers.getBytes(opHash), sig);

      setWalletSig(sig);
      setSignerAddr(recovered);
      setPhase('signed');
      await detectCurrentWallet();
    } catch (e: any) {
      const code = e?.code ?? e?.info?.error?.code;
      if (code === 4001 || code === 'ACTION_REJECTED') {
        setError('Signature request was rejected. Please approve it in your wallet to continue.');
      } else {
        setError(e?.message ?? 'Signing failed. Please try again.');
      }
      setPhase('error');
    }
  };

  const handleContinue = () => {
    onSuccess(walletSig);
  };

  if (!isOpen) return null;

  // After signing: ready to submit when current wallet has switched to a gas-paying wallet
  // (different from the signer, since the signer had no gas — that's why we're here)
  const gasWalletReady =
    phase === 'signed' &&
    !!currentAddr &&
    !!signerAddr &&
    currentAddr.toLowerCase() !== signerAddr.toLowerCase();

  // Step 1 labels
  const step1Title = phase === 'signed'
    ? 'Signed ✓'
    : isAlreadyAuthorized
      ? 'Sign with your current authorized wallet'
      : 'Switch to authorized wallet → Sign';

  const step1Desc = phase === 'signed'
    ? `Signed by ${short(signerAddr)}`
    : isAlreadyAuthorized
      ? 'Your connected wallet is authorized. Click the button below to sign — no gas fee required.'
      : 'In MetaMask, switch to an authorized wallet (no BNB needed). Then click the button below — only a signature is requested, no gas fee.';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

      <div className="relative w-full max-w-md quantum-card bg-[#0b1424] border border-sky-300/25 rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
        {/* Glow header */}
        <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-sky-900/25 to-transparent pointer-events-none" />

        <div className="relative p-6 sm:p-8">
          {/* Close button */}
          <button
            onClick={onCancel}
            className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white hover:bg-cyan-100/[0.07] rounded-xl transition-all"
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
              <Shield size={30} className="text-sky-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Gas Separation</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Authorized wallet signs · Gas wallet submits
            </p>
          </div>

          {/* Current wallet live indicator */}
          {currentAddr && (
            <div className="mb-5 flex items-center gap-2.5 p-3 rounded-xl bg-black/30 border border-white/8">
              <div className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                phase === 'signed'
                  ? gasWalletReady ? 'bg-teal-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400'
                  : isAlreadyAuthorized
                    ? 'bg-teal-400 shadow-[0_0_6px_#34d399]'
                    : isAuthorized(currentAddr) ? 'bg-teal-400' : 'bg-amber-400'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">Connected wallet</div>
                <div className="text-xs font-mono text-slate-300 truncate">{currentAddr}</div>
              </div>
              {phase !== 'signed' && (
                isAlreadyAuthorized
                  ? <span className="text-[10px] text-teal-400 font-bold shrink-0">✓ Authorized</span>
                  : isAuthorized(currentAddr)
                    ? <span className="text-[10px] text-teal-400 font-bold shrink-0">✓ Authorized</span>
                    : <span className="text-[10px] text-amber-400 font-bold shrink-0">Not authorized</span>
              )}
              {phase === 'signed' && (
                gasWalletReady
                  ? <span className="text-[10px] text-teal-400 font-bold shrink-0">✓ Gas wallet ready</span>
                  : <span className="text-[10px] text-amber-400 font-bold shrink-0">Switch wallet ↓</span>
              )}
            </div>
          )}

          {/* Steps */}
          <div className="mb-5 space-y-2">
            {/* Step 1 */}
            <div className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
              phase === 'signed'
                ? 'border-teal-500/20 bg-teal-500/5 opacity-70'
                : 'border-sky-500/25 bg-sky-500/8'
            }`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                phase === 'signed' ? 'bg-teal-500 text-white' : 'bg-sky-500/20 text-sky-400'
              }`}>
                {phase === 'signed' ? <CheckCircle2 size={14} /> : '1'}
              </div>
              <div>
                <div className="text-xs font-bold text-white mb-0.5">{step1Title}</div>
                <div className="text-[11px] text-slate-400 leading-relaxed">{step1Desc}</div>
              </div>
            </div>

            {/* Step 2 */}
            <div className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
              phase === 'signed'
                ? gasWalletReady
                  ? 'border-teal-500/30 bg-teal-500/8'
                  : 'border-amber-500/25 bg-amber-500/8'
                : 'border-cyan-100/[0.11] bg-white/2 opacity-40'
            }`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                phase === 'signed'
                  ? gasWalletReady
                    ? 'bg-teal-500 text-white shadow-[0_0_10px_rgba(52,211,153,0.4)]'
                    : 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {phase === 'signed' && gasWalletReady ? <Zap size={13} /> : '2'}
              </div>
              <div>
                <div className="text-xs font-bold text-white mb-0.5">
                  {phase === 'signed' && gasWalletReady
                    ? 'Gas wallet detected — ready to submit'
                    : 'Switch to gas wallet → Submit'}
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  {phase === 'signed'
                    ? gasWalletReady
                      ? `Using ${short(currentAddr)} to pay gas. Click Continue to submit.`
                      : 'Switch MetaMask to any wallet that has BNB to pay gas.'
                    : 'After signing, switch to any wallet with BNB to pay gas and submit the transaction.'}
                </div>
              </div>
            </div>
          </div>

          {/* Authorized wallet list — only shown when not already authorized and before signing */}
          {!isAlreadyAuthorized && authorizedWallets.length > 0 && phase !== 'signed' && (
            <div className="mb-5 p-3 rounded-xl bg-black/30 border border-cyan-100/[0.11]">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Wallet size={10} /> Authorized Wallets
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {authorizedWallets.map(w => (
                  <div key={w} className={`text-[11px] font-mono py-0.5 flex items-center gap-2 ${
                    currentAddr.toLowerCase() === w.toLowerCase()
                      ? 'text-teal-400 font-bold'
                      : 'text-cyan-200'
                  }`}>
                    {currentAddr.toLowerCase() === w.toLowerCase() && (
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0 inline-block" />
                    )}
                    <span>{w.slice(0, 12)}…{w.slice(-10)}</span>
                    {currentAddr.toLowerCase() === w.toLowerCase() && (
                      <span className="text-teal-500 text-[10px] ml-1">← connected</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Phase: sign / signing ─────────────────────────── */}
          {(phase === 'sign' || phase === 'signing') && (
            <div className="space-y-3">
              {/* Only show "Switch wallet" button when not already authorized */}
              {!isAlreadyAuthorized && (
                <button
                  onClick={handleSwitchWallet}
                  className="w-full py-3 rounded-xl bg-[#0c1d30]/80 hover:bg-cyan-100/[0.07] border border-cyan-100/[0.16] text-slate-300 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <RefreshCw size={14} /> Switch to Authorized Wallet
                </button>
              )}
              <button
                onClick={handleSign}
                disabled={phase === 'signing'}
                className="w-full py-4 rounded-2xl bg-sky-600 hover:bg-sky-500 active:scale-95 disabled:opacity-60 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-900/30"
              >
                {phase === 'signing' ? (
                  <><Loader2 size={18} className="animate-spin" /> Waiting for signature…</>
                ) : (
                  <><Wallet size={18} /> Sign with {isAlreadyAuthorized ? 'Current' : 'Authorized'} Wallet</>
                )}
              </button>
              <button
                onClick={onCancel}
                className="w-full py-3 text-slate-400 hover:text-slate-400 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* ── Phase: error ─────────────────────────────────── */}
          {phase === 'error' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 leading-relaxed flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 text-red-400 mt-0.5" />
                <span className="whitespace-pre-line">{error}</span>
              </div>
              <button
                onClick={() => setPhase('sign')}
                className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center gap-2 transition-all border border-cyan-100/[0.16]"
              >
                <Wallet size={18} /> Try Again
              </button>
              <button
                onClick={onCancel}
                className="w-full py-3 text-slate-400 hover:text-slate-400 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* ── Phase: signed ────────────────────────────────── */}
          {phase === 'signed' && (
            <div className="space-y-3">
              {/* Prompt to switch to gas wallet */}
              {!gasWalletReady && (
                <button
                  onClick={handleSwitchWallet}
                  className="w-full py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <RefreshCw size={14} /> Switch to Gas Wallet
                </button>
              )}
              <button
                onClick={handleContinue}
                disabled={!gasWalletReady}
                className={`w-full py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                  gasWalletReady
                    ? 'bg-teal-600 hover:bg-teal-500 active:scale-95 shadow-teal-900/30'
                    : 'bg-slate-700 opacity-50 cursor-not-allowed'
                }`}
              >
                <ArrowRight size={18} />
                {gasWalletReady ? 'Continue — Submit Transaction' : 'Waiting for gas wallet…'}
              </button>
              <button
                onClick={onCancel}
                className="w-full py-3 text-slate-400 hover:text-slate-400 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GasSeparationModal;
