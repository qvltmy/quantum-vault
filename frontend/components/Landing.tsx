
import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { 
  ShieldCheck, 
  KeyRound, 
  Cpu, 
  ChevronRight,
  Wallet,
  Lock,
  Clock,
  X,
  Search,
  LayoutGrid,
  LogOut,
  Zap,
  ArrowRight,
  Server,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Fingerprint,
  Users,
  Coins,
  ChevronDown,
  Layers,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { CHAINS, getFactoryAddress } from '../types';

// ── Reference definitions ────────────────────────────────────────────────────
const REFS: Record<number, { short: string; label: string; url: string }> = {
  1: { short: 'Shor 1994', label: 'Shor, P.W. — "Algorithms for Quantum Computation" (FOCS 1994). Proves ECDLP solvable in polynomial time.', url: 'https://arxiv.org/abs/quant-ph/9508027' },
  2: { short: 'NIST FIPS 204', label: 'NIST FIPS 204 — ML-DSA (CRYSTALS-Dilithium) Post-Quantum Signature Standard (2024).', url: 'https://doi.org/10.6028/NIST.FIPS.204' },
  3: { short: 'NIST IR 8547', label: 'NIST IR 8547 — Transition to Post-Quantum Cryptography Standards (2024).', url: 'https://doi.org/10.6028/NIST.IR.8547.ipd' },
  4: { short: 'DeepMind AlphaProof', label: 'DeepMind AlphaProof — AI achieves silver-medal standard at IMO 2024 (July 2024).', url: 'https://deepmind.google/discover/blog/ai-solves-imo-problems-at-silver-medal-level/' },
  5: { short: 'Epoch AI FrontierMath', label: 'Epoch AI FrontierMath — AI systems crossing research-grade mathematics benchmarks (2024).', url: 'https://epochai.org/frontiermath' },
  6: { short: 'NSA CNSA 2.0', label: 'NSA CNSA 2.0 — Mandates migration away from ECDSA for national-security systems (Sep 2022).', url: 'https://media.defense.gov/2022/Sep/07/2003071834/-1/-1/0/CSA_CNSA_2.0_ALGORITHMS_.PDF' },
};

const RefLink: React.FC<{ n: number }> = ({ n }) => {
  const [open, setOpen] = useState(false);
  const ref = REFS[n];
  if (!ref) return <span>[{n}]</span>;
  return (
    <>
      {/* Backdrop — captures any outside click */}
      {open && (
        <span
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
          style={{ cursor: 'default' }}
        />
      )}
      <span className="relative inline-block">
        <button
          onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
          className="inline-flex items-center font-mono text-[10px] font-bold text-cyan-400 hover:text-cyan-200 transition-colors px-0.5 rounded align-baseline leading-none"
          aria-label={`Reference ${n}: ${ref.short}`}
        >
          [{n}]
        </button>
        {open && (
          <span
            className={[
              // desktop: float above the button, centered
              'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72',
              // mobile: fixed to bottom of screen, full width with margin
              'max-sm:fixed max-sm:bottom-4 max-sm:left-4 max-sm:right-4 max-sm:w-auto max-sm:translate-x-0 max-sm:translate-y-0',
              'z-50 rounded-xl border border-cyan-300/20 bg-[#0b1a2e] p-3 shadow-2xl text-left',
            ].join(' ')}
            onClick={e => e.stopPropagation()}
          >
            <span className="block text-[10px] font-bold text-cyan-300 mb-1">[{n}] {ref.short}</span>
            <span className="block text-[10px] text-slate-400 leading-relaxed mb-2">{ref.label}</span>
            <a
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-cyan-500 hover:text-cyan-300 underline underline-offset-2 break-all"
            >
              <ExternalLink size={9} /> {ref.url}
            </a>
            <button
              onClick={() => setOpen(false)}
              className="absolute top-2 right-2 text-slate-500 hover:text-slate-300 text-xs leading-none"
            >✕</button>
          </span>
        )}
      </span>
    </>
  );
};

/** Splits a string on [n] tokens and returns React nodes with clickable RefLinks */
const renderWithRefs = (text: string): React.ReactNode => {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (m) return <RefLink key={i} n={parseInt(m[1])} />;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
};

interface VaultEntry { account: string; vault: string; label?: string; }

const DEMO_VAULT_ADDR = '0x19e1F8515d51375764cddac83B66dFb299e6898D';

interface LandingProps {
  onLoadVault: (address: string) => void;
  onCreateVault: (password: string) => Promise<void>;
  isConnected: boolean;
  onConnect: () => void;
  loading: boolean;
  activeVaultAddress: string | null;
  onNavigateToDashboard: () => void;
  onExitVault: () => void;
  myVaults?: VaultEntry[];
  onSwitchVault?: (account: string) => void;
  isFetchingVaults?: boolean;
  onRefreshVaults?: () => void;
  chainId?: bigint;
  onLoadDemo?: () => void;
}

const STORAGE_HISTORY_KEY = 'quantum_vault_history';

const Landing: React.FC<LandingProps> = ({ 
  onLoadVault, onCreateVault, isConnected, onConnect, loading,
  activeVaultAddress, onNavigateToDashboard, onExitVault,
  myVaults = [], onSwitchVault, isFetchingVaults = false, onRefreshVaults,
  chainId = 1n, onLoadDemo
}) => {
  const [activeTab, setActiveTab] = useState<'load' | 'create'>('load');
  const [vaultInput, setVaultInput] = useState("");
  const [createPw, setCreatePw] = useState("");
  const [createPwConfirm, setCreatePwConfirm] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [addrError, setAddrError] = useState<string | null>(null);
  const [createFeeDisplay, setCreateFeeDisplay] = useState<string | null>(null);

  const historyWrapperRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  // Fetch create fee from factory whenever chain changes
  useEffect(() => {
    let cancelled = false;
    if (chainId === 0n) { setCreateFeeDisplay(null); return; }
    const ticker = CHAINS.find(c => BigInt(c.id) === chainId)?.ticker ?? 'ETH';
    const factoryAddr = getFactoryAddress(chainId);
    if (!factoryAddr) { setCreateFeeDisplay(null); return; }

    const rpcUrl = CHAINS.find(c => BigInt(c.id) === chainId)?.rpc;
    if (!rpcUrl) { setCreateFeeDisplay(null); return; }

    const GET_FEE_ABI = ["function getCreateFee() view returns (uint256)"];
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const factory = new ethers.Contract(factoryAddr, GET_FEE_ABI, provider);
    factory.getCreateFee().then((fee: bigint) => {
      if (cancelled) return;
      // Format: trim trailing zeros, max 4 decimal places
      const formatted = parseFloat(ethers.formatEther(fee)).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
      });
      setCreateFeeDisplay(`${formatted} ${ticker}`);
    }).catch(() => {
      if (!cancelled) setCreateFeeDisplay(null);
    });
    return () => { cancelled = true; };
  }, [chainId]);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(STORAGE_HISTORY_KEY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed);
        if (parsed.length > 0) {
          setVaultInput(parsed[0]);
        }
      }
    } catch (e) {
      console.error("Error loading history", e);
    }
  }, []);

  // Handle click outside to close history dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (historyWrapperRef.current && !historyWrapperRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const validatePassword = (pw: string) => {
    if (pw.length < 6) return t('err.pw_weak_desc');
    if (/^\d+$/.test(pw)) return t('err.pw_weak_desc');
    return null;
  };

  const handleCreateSubmit = () => {
    const error = validatePassword(createPw);
    if (error) {
       setValidationError(error);
       return;
    }
    if (createPw && createPw === createPwConfirm) {
      setValidationError(null);
      onCreateVault(createPw);
    }
  };

  const removeFromHistory = (e: React.MouseEvent, addr: string) => {
    e.stopPropagation();
    const newHistory = history.filter(h => h !== addr);
    setHistory(newHistory);
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(newHistory));
  };

  const handleVaultInputChange = (val: string) => {
    setVaultInput(val);
    if (val && !ethers.isAddress(val)) {
        setAddrError(t('err.invalid_addr_fmt'));
    } else {
        setAddrError(null);
    }
  };

  const handleLoadClick = () => {
     if (!isConnected) {
        onConnect();
        return;
     }
     if (ethers.isAddress(vaultInput)) {
        onLoadVault(vaultInput);
     } else {
        setAddrError(t('err.invalid_addr_fmt'));
     }
  };

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* Hero Section */}
      <section className="quantum-scene relative flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center py-10 overflow-hidden">
        {/* Orbital quantum field backdrop */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
          <div className="absolute -left-36 top-[-16rem] h-[32rem] w-[32rem] rounded-full border border-cyan-300/10 shadow-[0_0_100px_rgba(34,211,238,0.08)]" />
          <div className="absolute -right-44 bottom-[-20rem] h-[40rem] w-[40rem] rounded-full border border-teal-300/10" />
          <div className="absolute left-[17%] top-[18%] h-1.5 w-1.5 rounded-full bg-cyan-200 shadow-[0_0_14px_4px_rgba(103,232,249,0.55)]" />
          <div className="absolute right-[16%] top-[29%] h-1 w-1 rounded-full bg-teal-200 shadow-[0_0_12px_3px_rgba(94,234,212,0.5)]" />
          <div className="absolute bottom-[19%] left-[29%] h-1 w-1 rounded-full bg-sky-200 shadow-[0_0_12px_3px_rgba(125,211,252,0.5)]" />
          <div className="absolute right-[28%] bottom-[14%] h-px w-28 rotate-[-34deg] bg-gradient-to-r from-transparent via-cyan-200/40 to-transparent" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-20 items-center">
            
            {/* Left Content */}
            <div className="text-center lg:text-left animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-300/25 text-cyan-100 text-[10px] md:text-xs font-bold mb-5 backdrop-blur-md shadow-[0_0_24px_rgba(34,211,238,.1)]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-200 shadow-[0_0_10px_2px_rgba(103,232,249,.55)]"></span>
                </span>
                <span className="font-mono uppercase tracking-[0.14em]">{t('landing.tag')}</span>
              </div>
              
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-5 leading-[1.05] text-white">
                {t('landing.title.1')} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-400 to-teal-400 animate-shimmer bg-[length:200%_auto]">{t('landing.title.2')}</span>
              </h1>
              
              <p className="text-sm md:text-base text-slate-400 mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0 font-light">
                {t('landing.subtitle')}
              </p>

              {/* 3-step how-to */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-2 sm:gap-0 mb-8">
                {[
                  { icon: <Wallet size={13}/>, label: t('landing.step1'), n: '01' },
                  { icon: <Lock size={13}/>, label: t('landing.step2'), n: '02' },
                  { icon: <ShieldCheck size={13}/>, label: t('landing.step3'), n: '03' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0c1d30]/80 border border-cyan-100/[0.13] flex-1 sm:flex-none">
                      <span className="text-[10px] font-bold text-cyan-500/60 font-mono shrink-0">{s.n}</span>
                      <span className="text-cyan-300 shrink-0">{s.icon}</span>
                      <span className="text-xs font-bold text-slate-200">{s.label}</span>
                    </div>
                    {i < 2 && <ChevronRight size={13} className="text-slate-600 mx-1 shrink-0 hidden sm:block"/>}
                    {i < 2 && <div className="w-px h-3 bg-slate-700 mx-auto sm:hidden my-0.5" />}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap justify-center lg:justify-start gap-2 text-[11px] font-bold text-slate-400">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0c1d30]/60 border border-cyan-100/[0.11]">
                  <div className="text-teal-400"><ShieldCheck size={12}/></div>
                  <span>{t('landing.tag.noncustodial')}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0c1d30]/60 border border-cyan-100/[0.11]">
                  <div className="text-cyan-400"><KeyRound size={12}/></div>
                  <span>Password + Wallet 2FA</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0c1d30]/60 border border-cyan-100/[0.11]">
                  <div className="text-cyan-400"><Cpu size={12}/></div>
                  <span>{t('landing.tag.opensource')}</span>
                </div>
              </div>
            </div>

            {/* Right Interactive Card */}
            <div className="w-full max-w-md mx-auto lg:ml-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              {/* Purpose-built atomic vault visualization */}
              <div className="relative mb-5 h-40 overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-[#071321]/80 shadow-[0_18px_55px_rgba(0,0,0,0.3)] quantum-edge" role="img" aria-label="Quantum-secured vault with orbiting cryptographic key nodes">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(8,145,178,0.18),transparent_58%)]" />
                <div className="absolute inset-x-8 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-300/25 to-transparent" />
                <div className="absolute inset-y-5 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-300/20 to-transparent" />
                <svg className="absolute left-1/2 top-1/2 h-36 w-64 -translate-x-1/2 -translate-y-1/2 overflow-visible" viewBox="0 0 256 144" fill="none" aria-hidden="true">
                  <defs>
                    <radialGradient id="qv-core" cx="0" cy="0" r="1" gradientTransform="translate(128 72) rotate(90) scale(39)"><stop stopColor="#22D3EE" stopOpacity=".24"/><stop offset="1" stopColor="#22D3EE" stopOpacity="0"/></radialGradient>
                    <linearGradient id="qv-orbit-a" x1="22" y1="72" x2="234" y2="72"><stop stopColor="#67E8F9" stopOpacity=".06"/><stop offset=".5" stopColor="#67E8F9" stopOpacity=".8"/><stop offset="1" stopColor="#67E8F9" stopOpacity=".06"/></linearGradient>
                    <linearGradient id="qv-orbit-b" x1="40" y1="28" x2="216" y2="116"><stop stopColor="#5EEAD4" stopOpacity=".06"/><stop offset=".52" stopColor="#5EEAD4" stopOpacity=".66"/><stop offset="1" stopColor="#5EEAD4" stopOpacity=".06"/></linearGradient>
                    <filter id="qv-glow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                  </defs>
                  <circle cx="128" cy="72" r="40" fill="url(#qv-core)"/>
                  <g className="quantum-orbit"><ellipse cx="128" cy="72" rx="101" ry="33" stroke="url(#qv-orbit-a)" strokeWidth="1.2"/><circle cx="30" cy="72" r="3.2" fill="#A5F3FC" filter="url(#qv-glow)"/><circle cx="224" cy="72" r="2" fill="#67E8F9"/></g>
                  <g className="quantum-orbit-reverse"><ellipse cx="128" cy="72" rx="92" ry="28" transform="rotate(-31 128 72)" stroke="url(#qv-orbit-b)" strokeWidth="1.1"/><circle cx="58" cy="23" r="3" fill="#99F6E4" filter="url(#qv-glow)"/><circle cx="201" cy="121" r="2.2" fill="#5EEAD4"/></g>
                  <ellipse cx="128" cy="72" rx="78" ry="25" transform="rotate(31 128 72)" stroke="#7DD3FC" strokeOpacity=".27" strokeDasharray="2 6"/>
                  <circle cx="128" cy="72" r="19" fill="#071827" stroke="#67E8F9" strokeOpacity=".7"/>
                  <circle cx="128" cy="72" r="15" fill="#0B2737" stroke="#A5F3FC" strokeOpacity=".26"/>
                  <path d="M128 62.5 120 66v6c0 5 3.4 8.2 8 10 4.6-1.8 8-5 8-10v-6l-8-3.5Z" fill="#0E7490" fillOpacity=".28" stroke="#A5F3FC" strokeWidth="1.3"/>
                  <path d="m124.5 71.5 2.3 2.3 4.7-5" stroke="#CFFAFE" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div className="absolute left-5 top-5 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-teal-300 shadow-[0_0_9px_2px_rgba(94,234,212,.5)]"/><span className="quantum-kicker text-[9px] font-mono uppercase">Quantum field · active</span></div>
                <div className="absolute bottom-4 right-5 text-right font-mono text-[9px] leading-4 text-slate-400"><div>ML-DSA · WOTS+</div><div className="text-cyan-200/80">KEYSPACE PROTECTED</div></div>
                <div className="absolute bottom-4 left-5 font-mono text-[9px] text-slate-400">SECURE CORE <span className="text-teal-200">● ONLINE</span></div>
              </div>
              {activeVaultAddress ? (
                 <div className="glass-card quantum-card quantum-panel quantum-edge p-1 rounded-[2rem] md:rounded-[2.5rem] bg-gradient-to-b from-white/10 to-white/5 shadow-2xl backdrop-blur-xl mt-4 lg:mt-0">
                   <div className="bg-[#0b1424]/90 rounded-[1.8rem] md:rounded-[2.3rem] p-6 md:p-8 border border-cyan-100/[0.11] relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[60px] -mr-20 -mt-20 pointer-events-none group-hover:bg-teal-500/20 transition-colors duration-700"></div>
                     
                     <div className="text-center relative z-10">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full quantum-core bg-[#071827] flex items-center justify-center mx-auto mb-6 text-cyan-200 border border-cyan-300/30 shadow-[0_0_45px_rgba(34,211,238,0.28),inset_0_0_24px_rgba(34,211,238,0.12)] animate-float">
                           <LayoutGrid size={32} />
                        </div>
                        <h3 className="text-lg md:text-xl font-bold text-white mb-2">{t('landing.card.session')}</h3>
                        <p className="text-xs md:text-sm text-slate-400 mb-8 px-2">{t('landing.card.session_desc')}</p>
                        
                        <div className="flex flex-col gap-3">
                           <button 
                             onClick={onNavigateToDashboard}
                             className="w-full h-12 md:h-14 rounded-2xl bg-gradient-to-r from-cyan-700 via-cyan-600 to-teal-600 text-white font-bold shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group/btn"
                           >
                             {t('landing.btn.enter')} <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform"/>
                           </button>
                           <button 
                             onClick={onExitVault}
                             className="w-full h-12 md:h-14 rounded-2xl border border-cyan-100/[0.16] bg-[#0c1d30]/80 text-slate-400 hover:text-white hover:bg-cyan-100/[0.07] font-bold transition-all flex items-center justify-center gap-2"
                           >
                             <LogOut size={18}/> {t('landing.btn.exit')}
                           </button>
                        </div>

                        {/* My Vaults quick-switch list */}
                        {myVaults.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-cyan-100/[0.11]">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Layers size={11}/> My Vaults ({myVaults.length})
                              </span>
                              <button onClick={onRefreshVaults} disabled={isFetchingVaults} className="text-slate-400 hover:text-slate-400 transition-colors">
                                <RefreshCw size={11} className={isFetchingVaults ? 'animate-spin' : ''} />
                              </button>
                            </div>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {myVaults.map((v, i) => {
                                const isActive = activeVaultAddress?.toLowerCase() === v.vault.toLowerCase() || v.vault === activeVaultAddress;
                                return (
                                  <button
                                    key={v.account}
                                    onClick={() => onSwitchVault?.(v.account)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all group/vitem ${isActive ? 'bg-teal-500/10 border border-teal-500/20' : 'hover:bg-[#0c1d30]/80 border border-transparent'}`}
                                  >
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${isActive ? 'bg-teal-500/30 text-teal-200' : 'bg-[#0c1d30]/80 text-slate-400'}`}>{i+1}</div>
                                    <div className="min-w-0 flex-1 text-left">
                                      <div className="text-[11px] font-mono text-white truncate">{v.account.slice(0,10)}…{v.account.slice(-6)}</div>
                                    </div>
                                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                     </div>
                   </div>
                 </div>
              ) : (
                <div className="relative mt-4 lg:mt-0">
                  {/* Glowing border effect */}
                  <div className="absolute -inset-0.5 bg-gradient-to-b from-cyan-500 to-cyan-500 rounded-[2rem] md:rounded-[2.5rem] opacity-30 blur-sm"></div>
                  
                  <div className="relative bg-[#0b1424]/80 backdrop-blur-xl rounded-[2rem] md:rounded-[2.5rem] border border-cyan-100/[0.16] p-2 shadow-2xl">
                    <div className="flex p-1 mb-6 bg-black/40 rounded-[1.8rem]">
                      <button 
                        onClick={() => setActiveTab('load')}
                        className={`flex-1 py-3 md:py-4 text-xs md:text-sm font-bold rounded-[1.5rem] transition-all duration-300 ${activeTab === 'load' ? 'bg-surfaceHighlight text-white shadow-lg' : 'text-slate-400 hover:text-slate-300'}`}
                      >
                        {t('landing.tab.load')}
                      </button>
                      <button 
                        onClick={() => setActiveTab('create')}
                        className={`flex-1 py-3 md:py-4 text-xs md:text-sm font-bold rounded-[1.5rem] transition-all duration-300 ${activeTab === 'create' ? 'bg-surfaceHighlight text-white shadow-lg' : 'text-slate-400 hover:text-slate-300'}`}
                      >
                        {t('landing.tab.create')}
                      </button>
                    </div>

                    <div className="px-4 pb-4 md:px-8 md:pb-10 relative">
                      {activeTab === 'load' ? (
                        <div className="space-y-5 md:space-y-6 animate-fade-in">
                          <div className="text-center mb-4 md:mb-6">
                            <h3 className="text-base md:text-lg font-bold text-white">{t('landing.load.title')}</h3>
                            <p className="text-[10px] md:text-xs text-slate-400 mt-1">{t('landing.load.desc')}</p>
                          </div>
                          
                          <div className="relative group/input" ref={historyWrapperRef}>
                            <div className="relative">
                               <input 
                                  value={vaultInput}
                                  onChange={(e) => handleVaultInputChange(e.target.value)}
                                  onFocus={() => history.length > 0 && setShowHistory(true)}
                                  placeholder={t('landing.load.placeholder')}
                                  className={`w-full h-12 md:h-16 pl-10 md:pl-12 pr-4 rounded-2xl bg-black/40 border text-xs md:text-sm font-mono text-white placeholder-slate-600 focus:bg-black/60 transition-all outline-none ${addrError ? 'border-red-500/50 focus:border-red-500/80 focus:ring-1 focus:ring-red-500/50' : 'border-cyan-100/[0.16] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50'}`}
                               />
                               <div className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                   <Search size={16} className="md:w-[18px] md:h-[18px]" />
                               </div>
                            </div>
                            
                            {addrError && (
                                <div className="absolute -bottom-5 left-2 flex items-center gap-1.5 text-[10px] text-red-400 font-bold animate-fade-in">
                                   <AlertTriangle size={10} /> {addrError}
                                </div>
                            )}

                            {/* History Dropdown */}
                            {showHistory && history.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1e293b] border border-cyan-100/[0.16] rounded-2xl shadow-xl overflow-hidden z-20 animate-fade-in">
                                <div className="px-4 py-2 bg-black/20 border-b border-cyan-100/[0.11] text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                  <span className="flex items-center gap-1.5"><Clock size={12}/> {t('landing.load.recent')}</span>
                                </div>
                                <div className="max-h-40 overflow-y-auto custom-scrollbar">
                                  {history.map((addr) => (
                                    <div 
                                      key={addr}
                                      onClick={() => { handleVaultInputChange(addr); setShowHistory(false); }}
                                      className="px-4 py-3 hover:bg-[#0c1d30]/80 cursor-pointer flex items-center justify-between group/item transition-colors"
                                    >
                                      <span className="text-xs font-mono text-slate-300">{addr.slice(0, 6)}...{addr.slice(-4)}</span>
                                      <button 
                                        onClick={(e) => removeFromHistory(e, addr)}
                                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover/item:opacity-100 transition-all"
                                      >
                                        <X size={14}/>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {onLoadDemo && (
                            <button
                              onClick={onLoadDemo}
                              className="w-full h-10 md:h-12 rounded-2xl border border-cyan-300/25 bg-cyan-500/5 hover:bg-cyan-500/15 text-cyan-300 font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                            >
                              <Zap size={15} className="text-cyan-400" />
                              Try Demo Vault
                              <span className="text-[10px] font-mono text-cyan-500/70 ml-1 border border-cyan-500/20 px-1.5 py-0.5 rounded-full">View Only</span>
                            </button>
                          )}

                          <button 
                            onClick={handleLoadClick}
                            disabled={isConnected && (!vaultInput || !!addrError)}
                            className={!isConnected ? "w-full h-12 md:h-16 group relative rounded-2xl overflow-hidden transition-all duration-300 shadow-[0_0_20px_rgba(79,70,229,0.2)] hover:shadow-[0_0_30px_rgba(79,70,229,0.4)] flex items-center justify-center" : "w-full h-12 md:h-16 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm md:text-base shadow-lg transition-all active:scale-[0.98] bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/20 disabled:opacity-50 disabled:cursor-not-allowed"}
                          >
                             {!isConnected ? (
                               <>
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-sky-600 to-cyan-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-cyan-400 opacity-0 group-hover:opacity-30 blur-xl transition-opacity"></div>
                                <span className="relative flex items-center gap-2 text-white font-bold text-sm tracking-wide">
                                  <Wallet size={18} className="md:w-[20px] md:h-[20px]" />
                                  <span>{t('landing.btn.connect_first')}</span>
                                </span>
                              </>
                             ) : (
                               <> {t('landing.btn.enter')} <ArrowRight size={18} className="md:w-[20px] md:h-[20px]" /></>
                             )}
                          </button>

                          {/* My Vaults quick-access — shown when wallet connected and vaults detected */}
                          {isConnected && myVaults.length > 0 && (
                            <div className="pt-4 border-t border-cyan-100/[0.11]">
                              <div className="flex items-center justify-between mb-2 px-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <Layers size={11} /> My Vaults ({myVaults.length})
                                </span>
                                <button
                                  onClick={onRefreshVaults}
                                  disabled={isFetchingVaults}
                                  className="text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
                                >
                                  <RefreshCw size={11} className={isFetchingVaults ? 'animate-spin' : ''} />
                                </button>
                              </div>
                              <div className="space-y-1 max-h-44 overflow-y-auto">
                                {myVaults.map((v, i) => (
                                  <button
                                    key={v.account}
                                    onClick={() => onSwitchVault?.(v.account)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-[#0c1d30]/80 border border-transparent hover:border-cyan-100/[0.11] group/vi"
                                  >
                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 bg-[#0c1d30]/80 text-slate-400 group-hover/vi:text-slate-300">
                                      {i + 1}
                                    </div>
                                    <div className="min-w-0 flex-1 text-left">
                                      <div className="text-[11px] font-mono text-white truncate">{v.vault.slice(0, 10)}…{v.vault.slice(-6)}</div>
                                      <div className="text-[10px] font-mono text-slate-500">Acct: {v.account.slice(0, 8)}…</div>
                                    </div>
                                    <ChevronRight size={12} className="text-slate-600 group-hover/vi:text-cyan-400 transition-colors shrink-0" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4 md:space-y-5 animate-fade-in">
                           <div className="text-center mb-4 md:mb-6">
                            <h3 className="text-base md:text-lg font-bold text-white">{t('landing.create.title')}</h3>
                            <p className="text-[10px] md:text-xs text-slate-400 mt-1">{t('landing.create.desc')}</p>
                          </div>

                          <div className="space-y-3">
                            <input 
                              type="password"
                              value={createPw}
                              onChange={(e) => { setCreatePw(e.target.value); setValidationError(null); }}
                              placeholder={t('landing.create.pw_placeholder')} 
                              className={`w-full h-12 md:h-14 px-4 rounded-2xl bg-black/40 border text-xs md:text-sm text-white placeholder-slate-600 font-mono outline-none transition-all ${validationError ? 'border-red-500/50 focus:ring-1 focus:ring-red-500' : 'border-cyan-100/[0.16] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50'}`}
                            />
                            <input 
                              type="password"
                              value={createPwConfirm}
                              onChange={(e) => setCreatePwConfirm(e.target.value)}
                              placeholder={t('landing.create.pw_confirm')}
                              className="w-full h-12 md:h-14 px-4 rounded-2xl bg-black/40 border border-cyan-100/[0.16] text-xs md:text-sm text-white placeholder-slate-600 font-mono focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all"
                            />
                            {validationError && (
                                <div className="flex items-center gap-2 text-[10px] text-red-400 px-2 animate-fade-in">
                                   <AlertTriangle size={12} /> {validationError}
                                </div>
                            )}
                          </div>
                          
                          <div className="bg-cyan-500/10 p-3 md:p-4 rounded-2xl border border-cyan-500/20 flex gap-3 items-start">
                              <div className="mt-0.5"><Lock size={14} className="text-cyan-300"/></div>
                              <p className="text-[10px] md:text-[11px] text-cyan-200/80 leading-relaxed">
                                <span className="font-bold text-cyan-200 block mb-1">{t('landing.create.tip_title')}</span>
                                {t('landing.create.tip_desc')}
                              </p>
                          </div>

                          {/* Creation fee notice */}
                            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[10px] text-amber-300 font-semibold mb-2">
                              <AlertTriangle size={12} className="shrink-0 text-amber-400" />
                              One-time protocol fee:{' '}
                              <span className="font-bold text-amber-200 ml-1">
                                {createFeeDisplay ?? '…'}
                              </span>
                            </div>

                            {isConnected ? (
                            <button 
                              onClick={handleCreateSubmit}
                              disabled={loading || !createPw || createPw !== createPwConfirm}
                              className="w-full h-12 md:h-16 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm md:text-base shadow-lg shadow-cyan-900/20 transition-all active:scale-[0.98]"
                            >
                              {loading ? t('landing.btn.deploying') : t('landing.btn.deploy')}
                            </button>
                          ) : (
                            <button 
                              onClick={onConnect}
                              className="w-full h-12 md:h-16 group relative rounded-2xl overflow-hidden transition-all duration-300 shadow-[0_0_20px_rgba(79,70,229,0.2)] hover:shadow-[0_0_30px_rgba(79,70,229,0.4)] flex items-center justify-center"
                            >
                               <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-sky-600 to-cyan-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                               <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-cyan-400 opacity-0 group-hover:opacity-30 blur-xl transition-opacity"></div>
                               <span className="relative flex items-center gap-2 text-white font-bold text-sm tracking-wide">
                                 <Wallet size={18} className="md:w-[20px] md:h-[20px]" />
                                 <span>{t('landing.btn.connect_first')}</span>
                               </span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 animate-bounce">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Scroll</span>
            <ChevronDown size={16} className="text-slate-400" />
        </div>
      </section>

      {/* New Benefits Section: Redefining Asset Security */}
      <section className="py-20 relative border-t border-cyan-100/[0.11] bg-[#050914]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-6">{t('landing.benefits.title')}</h2>
              <p className="text-slate-400 text-base md:text-lg leading-relaxed">{renderWithRefs(t('landing.benefits.subtitle'))}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-10">
              {/* Secure Card */}
              <div className="group relative p-8 rounded-3xl bg-gradient-to-br from-[#0b1424] to-cyan-950/20 border border-cyan-500/20 overflow-hidden hover:border-cyan-500/40 transition-all duration-500">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-cyan-500/20 transition-all"></div>
                  
                  <div className="relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-[#101c2e] border border-cyan-500/30 flex items-center justify-center text-cyan-300 mb-6 shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
                          <ShieldCheck size={28} />
                      </div>
                      <div className="text-xs font-bold text-cyan-500 uppercase tracking-widest mb-2">{t('landing.benefits.secure.tag')}</div>
                      <h3 className="text-2xl font-bold text-white mb-4">{t('landing.benefits.secure.title')}</h3>
                      <p className="text-slate-400 leading-relaxed text-sm md:text-base">
                          {renderWithRefs(t('landing.benefits.secure.desc'))}
                      </p>
                  </div>
              </div>

              {/* Smart Card */}
              <div className="group relative p-8 rounded-3xl bg-gradient-to-br from-[#0b1424] to-teal-950/20 border border-teal-500/20 overflow-hidden hover:border-teal-500/40 transition-all duration-500">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-teal-500/20 transition-all"></div>
                  
                  <div className="relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-[#101c2e] border border-teal-500/30 flex items-center justify-center text-teal-400 mb-6 shadow-lg shadow-teal-500/20 group-hover:scale-110 transition-transform">
                          <Zap size={28} />
                      </div>
                      <div className="text-xs font-bold text-teal-500 uppercase tracking-widest mb-2">{t('landing.benefits.smart.tag')}</div>
                      <h3 className="text-2xl font-bold text-white mb-4">{t('landing.benefits.smart.title')}</h3>
                      <p className="text-slate-400 leading-relaxed text-sm md:text-base">
                          {t('landing.benefits.smart.desc')}
                      </p>
                  </div>
              </div>
              {/* Dual-Factor Card */}
              <div className="group relative p-8 rounded-3xl bg-gradient-to-br from-[#0b1424] to-sky-950/20 border border-sky-500/20 overflow-hidden hover:border-sky-500/40 transition-all duration-500">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-sky-500/20 transition-all"></div>
                  <div className="relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-[#101c2e] border border-sky-500/30 flex items-center justify-center text-sky-400 mb-6 shadow-lg shadow-sky-500/20 group-hover:scale-110 transition-transform">
                          <Lock size={28} />
                      </div>
                      <div className="text-xs font-bold text-sky-500 uppercase tracking-widest mb-2">{t('landing.benefits.dual.tag')}</div>
                      <h3 className="text-2xl font-bold text-white mb-4">{t('landing.benefits.dual.title')}</h3>
                      <p className="text-slate-400 leading-relaxed text-sm md:text-base">
                          {t('landing.benefits.dual.desc')}
                      </p>
                  </div>
              </div>

              {/* Infinite Capacity Card */}
              <div className="group relative p-8 rounded-3xl bg-gradient-to-br from-[#0b1424] to-amber-950/20 border border-amber-500/20 overflow-hidden hover:border-amber-500/40 transition-all duration-500">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-amber-500/20 transition-all"></div>
                  <div className="relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-[#101c2e] border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                          <RefreshCw size={28} />
                      </div>
                      <div className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">{t('landing.benefits.infinite.tag')}</div>
                      <h3 className="text-2xl font-bold text-white mb-4">{t('landing.benefits.infinite.title')}</h3>
                      <p className="text-slate-400 leading-relaxed text-sm md:text-base">
                          {t('landing.benefits.infinite.desc')}
                      </p>
                  </div>
              </div>
          </div>
        </div>
      </section>

      {/* Comparison Section (Updated) */}
      <section className="py-20 md:py-28 bg-[#050914] relative border-t border-cyan-100/[0.11]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 md:mb-16 max-w-4xl mx-auto">
             <span className="text-cyan-300 font-bold text-[10px] md:text-xs uppercase tracking-[0.24em] mb-4 block">{t('landing.comp.subtitle')}</span>
             <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">{t('landing.comp.title')}</h2>
             <p className="mt-5 text-sm md:text-base leading-relaxed text-slate-400">{renderWithRefs(t('landing.comp.lead'))}</p>
          </div>

          {/* Desktop Comparison Table */}
          <div className="hidden md:block overflow-hidden rounded-[2rem] border border-cyan-100/[0.11] bg-[#0b1424]/50 backdrop-blur-md relative shadow-[0_24px_80px_rgba(0,0,0,.3)]">
            <div className="absolute top-0 left-1/3 w-px h-full bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
            <div className="absolute top-0 left-2/3 w-px h-full bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
            <div className="grid grid-cols-3">
               <div className="p-8 text-center border-b border-cyan-100/[0.11] bg-white/[0.02]">
                  <div className="w-12 h-12 mx-auto bg-slate-800 rounded-xl flex items-center justify-center mb-4 text-slate-400 border border-cyan-100/[0.11]"><Wallet size={24} /></div>
                  <h3 className="font-bold text-slate-300 text-lg">{t('landing.comp.eoa')}</h3>
               </div>
               <div className="p-8 text-center border-b border-cyan-100/[0.11] bg-white/[0.02]">
                  <div className="w-12 h-12 mx-auto bg-slate-800 rounded-xl flex items-center justify-center mb-4 text-slate-400 border border-cyan-100/[0.11]"><Users size={24} /></div>
                  <h3 className="font-bold text-slate-300 text-lg">{t('landing.comp.multisig')}</h3>
               </div>
               <div className="p-8 text-center border-b border-cyan-500/20 bg-cyan-500/5 relative overflow-hidden">
                  <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent"></div>
                  <div className="w-12 h-12 mx-auto bg-cyan-500/10 rounded-xl flex items-center justify-center mb-4 text-cyan-300 border border-cyan-300/20 shadow-lg shadow-cyan-500/10"><ShieldCheck size={24} /></div>
                  <h3 className="font-bold text-cyan-100 text-lg">{t('landing.comp.swiftsafe')}</h3>
               </div>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {[
                { label: t('landing.comp.row.security'), values: [t('landing.comp.eoa.security'), t('landing.comp.multisig.security'), t('landing.comp.swiftsafe.security')] },
                { label: t('landing.comp.row.risk'), values: [t('landing.comp.eoa.risk'), t('landing.comp.multisig.risk'), t('landing.comp.swiftsafe.risk')] },
                { label: t('landing.comp.row.ux'), values: [t('landing.comp.eoa.ux'), t('landing.comp.multisig.ux'), t('landing.comp.swiftsafe.ux')] },
                { label: t('landing.comp.row.recovery'), values: [t('landing.comp.eoa.recovery'), t('landing.comp.multisig.recovery'), t('landing.comp.swiftsafe.recovery')] },
              ].map(({ label, values }) => (
                <div key={label} className="grid grid-cols-3">
                  {values.map((value, i) => <div key={i} className={`p-5 lg:p-6 text-center text-sm leading-relaxed ${i === 2 ? 'bg-cyan-500/[0.035] text-cyan-50/90' : 'text-slate-400'}`}><div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</div>{renderWithRefs(value)}</div>)}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile comparison cards */}
          <div className="md:hidden grid gap-4">
            {[
              { key: 'eoa', title: t('landing.comp.eoa'), icon: <Wallet size={20} />, accent: 'border-white/10 bg-slate-900/70', titleColor: 'text-slate-200' },
              { key: 'multisig', title: t('landing.comp.multisig'), icon: <Users size={20} />, accent: 'border-white/10 bg-slate-900/70', titleColor: 'text-slate-200' },
              { key: 'swiftsafe', title: t('landing.comp.swiftsafe'), icon: <ShieldCheck size={20} />, accent: 'border-cyan-300/25 bg-gradient-to-br from-cyan-950/60 to-slate-900/80 shadow-lg shadow-cyan-950/30', titleColor: 'text-cyan-100' },
            ].map(({ key, title, icon, accent, titleColor }) => (
              <article key={key} className={`rounded-2xl border p-5 ${accent}`}>
                <div className={`mb-4 flex items-center gap-3 font-bold ${titleColor}`}><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/20">{icon}</span>{title}</div>
                <div className="space-y-3">
                  {[
                    [t('landing.comp.row.security'), t(`landing.comp.${key}.security`)],
                    [t('landing.comp.row.risk'), t(`landing.comp.${key}.risk`)],
                    [t('landing.comp.row.ux'), t(`landing.comp.${key}.ux`)],
                    [t('landing.comp.row.recovery'), t(`landing.comp.${key}.recovery`)],
                  ].map(([label, value]) => <div key={label} className="border-t border-white/[0.07] pt-3"><div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div><p className="text-sm leading-relaxed text-slate-300">{renderWithRefs(value)}</p></div>)}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-10 md:mt-14">
            <h3 className="mb-5 text-center text-xl md:text-2xl font-bold text-white">{t('landing.comp.detail.title')}</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[1,2,3,4].map((n) => <article key={n} className="rounded-2xl border border-cyan-200/10 bg-gradient-to-br from-slate-900/80 to-cyan-950/20 p-5"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 font-mono text-xs font-bold text-cyan-200">0{n}</div><h4 className="mb-2 font-bold text-white">{t(`landing.comp.detail.${n}.title`)}</h4><p className="text-sm leading-relaxed text-slate-400">{renderWithRefs(t(`landing.comp.detail.${n}.desc`))}</p></article>)}
            </div>
            <p className="mx-auto mt-5 max-w-4xl text-center text-xs leading-relaxed text-slate-500">{renderWithRefs(t('landing.comp.disclaimer'))}</p>
          </div>
        </div>
      </section>

      {/* How It Works Section - Process Flow */}
      <section className="py-20 md:py-28 relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-noise opacity-10"></div>
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px] -translate-y-1/2"></div>
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px] -translate-y-1/2"></div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-16 md:mb-20">
             <span className="text-cyan-500 font-bold text-[10px] md:text-xs uppercase tracking-widest mb-3 block">Process Flow</span>
             <h2 className="text-3xl md:text-4xl font-bold text-white">{t('landing.process.title')}</h2>
          </div>

          <div className="relative">
             {/* Desktop Connection Line - Horizontal */}
             <div className="hidden lg:block absolute top-[50px] left-[15%] right-[15%] h-[2px] bg-slate-800">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent w-1/2 animate-shimmer opacity-50"></div>
             </div>
             
             {/* Mobile Connection Line - Vertical */}
             <div className="lg:hidden absolute left-1/2 top-[50px] bottom-[50px] w-[2px] bg-slate-800 -translate-x-1/2"></div>

             <div className="grid lg:grid-cols-3 gap-12 lg:gap-8">
               <ProcessNode 
                 step="01" 
                 title={t('landing.process.step1')} 
                 desc={t('landing.process.desc1')}
                 icon={<Cpu size={28} className="text-cyan-300" />}
                 color="cyan"
               />
               <ProcessNode 
                 step="02" 
                 title={t('landing.process.step2')} 
                 desc={t('landing.process.desc2')}
                 icon={<div className="flex -space-x-1 text-sky-400"><KeyRound size={24}/><Lock size={24}/></div>}
                 color="sky"
               />
               <ProcessNode 
                 step="03" 
                 title={t('landing.process.step3')} 
                 desc={t('landing.process.desc3')}
                 icon={<ShieldCheck size={28} className="text-teal-400" />}
                 color="emerald"
               />
             </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection />

      {/* References */}
      <ReferencesSection />
    </div>
  );
};

const MobileCompCard = ({ title, icon, items, highlight }: { title: string, icon: React.ReactNode, items: any[], highlight?: boolean }) => (
   <div className={`p-6 rounded-2xl border ${highlight ? 'bg-cyan-900/10 border-cyan-500/30 shadow-lg shadow-cyan-900/10' : 'bg-[#0c1d30]/80 border-cyan-100/[0.16]'}`}>
      <div className="flex items-center gap-3 mb-6">
         <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${highlight ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'bg-slate-800 text-slate-400'}`}>
            {icon}
         </div>
         <h3 className={`font-bold text-lg ${highlight ? 'text-white' : 'text-slate-300'}`}>{title}</h3>
      </div>
      <div className="space-y-4">
         {items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center border-b border-cyan-100/[0.11] pb-2 last:border-0 last:pb-0">
               <span className="text-xs font-bold text-slate-400 uppercase">{item.label}</span>
               <span className={`text-sm font-medium ${item.danger ? 'text-red-400' : item.success ? 'text-teal-400' : highlight ? 'text-white' : 'text-slate-300'}`}>
                  {item.val}
               </span>
            </div>
         ))}
      </div>
   </div>
);

const ProcessNode = ({ step, title, desc, icon, color }: { step: string, title: string, desc: string, icon: React.ReactNode, color: string }) => {
  const colorClasses = {
    cyan: "border-cyan-500/30 shadow-cyan-500/20",
    sky: "border-sky-500/30 shadow-sky-500/20",
    emerald: "border-teal-500/30 shadow-teal-500/20"
  };

  const bgGlow = {
    cyan: "bg-cyan-500/10",
    sky: "bg-sky-500/10",
    emerald: "bg-teal-500/10"
  };

  return (
    <div className="relative z-10 flex flex-col items-center gap-6 lg:gap-8 group text-center">
      {/* Icon Circle */}
      <div className={`w-24 h-24 rounded-full bg-[#0b1424] border-2 ${colorClasses[color as keyof typeof colorClasses]} flex items-center justify-center relative shadow-[0_0_30px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-500`}>
        <div className={`absolute inset-2 rounded-full ${bgGlow[color as keyof typeof bgGlow]} animate-pulse-slow`}></div>
        <div className="relative z-10">{icon}</div>
        
        {/* Step Badge */}
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-slate-800 border border-cyan-100/[0.16] flex items-center justify-center text-xs font-bold text-white shadow-lg">
          {step}
        </div>
      </div>

      {/* Text Content */}
      <div className="flex-1">
         <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-200 transition-colors">{title}</h3>
         <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">{desc}</p>
      </div>
    </div>
  );
};

const FAQSection = () => {
  const { t } = useLanguage();
  // New importance order: Concept (q2) -> MultiSig Comp (q1) -> Safety (q5) -> Security (q3) -> Features (q7) -> Cost (q6)
  const faqs = ['q2', 'q1', 'q5', 'q3', 'q7', 'q6'];
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-16 md:py-24 bg-[#050914] border-t border-cyan-100/[0.11] relative">
       {/* Background accent */}
       <div className="absolute top-1/4 left-0 w-96 h-96 bg-cyan-600/5 rounded-full blur-[100px] pointer-events-none"></div>
       <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-cyan-600/5 rounded-full blur-[100px] pointer-events-none"></div>

       <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-10 md:mb-14">
             <span className="text-cyan-500 font-bold text-[10px] md:text-xs uppercase tracking-widest mb-3 block">Support</span>
             <h2 className="text-3xl md:text-4xl font-bold text-white">{t('landing.faq.title')}</h2>
          </div>
          
          <div className="space-y-3 md:space-y-4">
             {faqs.map((qKey, idx) => (
                <div 
                   key={qKey}
                   className={`glass-card rounded-2xl md:rounded-3xl border border-cyan-100/[0.11] overflow-hidden transition-all duration-300 ${openIndex === idx ? 'bg-[#0c1d30]/80 border-cyan-100/[0.16]' : 'bg-transparent hover:bg-white/[0.02]'}`}
                >
                   <button 
                      onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                      className="w-full text-left p-5 md:p-6 flex items-center justify-between gap-4"
                   >
                      <h4 className={`text-sm md:text-base font-bold transition-colors ${openIndex === idx ? 'text-white' : 'text-slate-300'}`}>
                         {t(`landing.faq.${qKey}`)}
                      </h4>
                      <div className={`shrink-0 text-slate-400 transition-transform duration-300 ${openIndex === idx ? 'rotate-180 text-white' : ''}`}>
                         {openIndex === idx ? <Minus size={18} /> : <Plus size={18} />}
                      </div>
                   </button>
                   
                   <div 
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === idx ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}
                   >
                      <div className="p-5 md:p-6 pt-0 text-xs md:text-sm text-slate-400 leading-relaxed border-t border-cyan-100/[0.11]">
                         {renderWithRefs(t(`landing.faq.a${qKey.slice(1)}`))}
                      </div>
                   </div>
                </div>
             ))}
          </div>
       </div>
    </section>
  );
};

const ReferencesSection = () => {
  const threatRefs = [
    { n: 1, label: 'Shor, P.W. (1994). "Algorithms for Quantum Computation: Discrete Logarithms and Factoring." FOCS 1994.', url: 'https://arxiv.org/abs/quant-ph/9508027' },
    { n: 2, label: 'NIST FIPS 204 — Module-Lattice-Based Digital Signature Standard (ML-DSA / CRYSTALS-Dilithium). August 2024.', url: 'https://doi.org/10.6028/NIST.FIPS.204' },
    { n: 3, label: 'NIST IR 8547 — Transition to Post-Quantum Cryptography Standards. Initial Public Draft, 2024.', url: 'https://doi.org/10.6028/NIST.IR.8547.ipd' },
    { n: 4, label: 'DeepMind. "AI achieves silver-medal standard solving International Mathematical Olympiad problems." July 2024.', url: 'https://deepmind.google/discover/blog/ai-solves-imo-problems-at-silver-medal-level/' },
    { n: 5, label: "Epoch AI. \"Humanity's Last Exam & FrontierMath: AI crossing research-grade math benchmarks.\" 2024.", url: 'https://epochai.org/frontiermath' },
    { n: 6, label: 'NSA CNSA 2.0 — Commercial National Security Algorithm Suite 2.0. September 2022. Mandates migration from ECDSA.', url: 'https://media.defense.gov/2022/Sep/07/2003071834/-1/-1/0/CSA_CNSA_2.0_ALGORITHMS_.PDF' },
  ];

  const implRefs = [
    { n: 7, label: 'Hülsing, A. (2013). "W-OTS+ — Shorter Signatures for Hash-Based Signature Schemes." AFRICACRYPT 2013. Defines the WOTS+ one-time signature scheme used in Quantum Vault.', url: 'https://eprint.iacr.org/2012/479' },
    { n: 8, label: 'Hülsing, A., Butin, D., Gazdag, S., Rijneveld, J., Mohaisen, A. RFC 8391 — XMSS: Extended Hash-Based Signatures. IETF, 2018. Specifies the XMSS Merkle-tree construction over WOTS+ leaves.', url: 'https://datatracker.ietf.org/doc/html/rfc8391' },
    { n: 9, label: 'NIST FIPS 205 — Stateless Hash-Based Digital Signature Standard (SLH-DSA). August 2024. The NIST-standardized hash-based signature scheme built on WOTS+ and hypertree structures.', url: 'https://doi.org/10.6028/NIST.FIPS.205' },
    { n: 10, label: 'Bernstein, D.J. & Lange, T. (2017). "Post-quantum cryptography." Nature 549, 188–194. Accessible overview of why hash-based schemes resist quantum attacks.', url: 'https://doi.org/10.1038/nature23461' },
    { n: 11, label: 'Biryukov, A., Dinu, D., Großschädl, J. (2016). "Argon2: New Generation of Memory-Hard Functions for Password Hashing." EuroS&P 2016. Argon2id is used to derive the vault master seed from the user password.', url: 'https://www.cryptolux.org/images/0/0d/Argon2.pdf' },
  ];

  const Group = ({ title, items }: { title: string; items: typeof threatRefs }) => (
    <div>
      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 mb-3">{title}</h4>
      <ol className="space-y-2.5">
        {items.map(({ n, label, url }) => (
          <li key={n} className="flex gap-3 text-[11px] leading-relaxed text-slate-500">
            <span className="shrink-0 font-mono text-slate-600">[{n}]</span>
            <span>
              {label}{' '}
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="text-cyan-700 hover:text-cyan-400 transition-colors underline underline-offset-2 break-all">
                {url}
              </a>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );

  return (
    <section className="py-12 md:py-16 bg-[#050914] border-t border-cyan-100/[0.07] relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        <h3 className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">References</h3>
        <Group title="Threat Landscape" items={threatRefs} />
        <Group title="Cryptographic Implementation" items={implRefs} />
      </div>
    </section>
  );
};

export default Landing;
