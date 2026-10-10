import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Wallet, LogOut, ShieldCheck, Zap, ArrowRight, ChevronRight, QuantumVaultLogo, BookOpen } from './Icons';
import { ChevronDown, Layers, Plus, Loader2 } from 'lucide-react';
import { UserState, CHAINS } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface VaultEntry { account: string; vault: string; label?: string; }

interface HeaderProps {
  user: UserState;
  onConnect: () => void;
  onDisconnect: () => void;
  onShowGuide: () => void;
  onShowPrivacy: () => void;
  loading: boolean;
  currentView: 'landing' | 'dashboard' | 'docs';
  onNavigate: (view: 'landing' | 'dashboard' | 'docs') => void;
  hasVault: boolean;
  myVaults?: VaultEntry[];
  activeAccount?: string | null;
  onSwitchVault?: (account: string) => void;
  isFetchingVaults?: boolean;
  onSwitchChain?: (chainId: number) => void;
}

const Header: React.FC<HeaderProps> = ({
  user, onConnect, onDisconnect, onShowGuide, onShowPrivacy, loading,
  currentView, onNavigate, hasVault,
  myVaults = [], activeAccount, onSwitchVault, isFetchingVaults = false,
  onSwitchChain
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showVaultSwitcher, setShowVaultSwitcher] = useState(false);
  const [showChainSwitcher, setShowChainSwitcher] = useState(false);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  const chainRef = useRef<HTMLDivElement>(null);
  const vaultRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMenuOpen]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (chainRef.current && !chainRef.current.contains(e.target as Node)) {
        setShowChainSwitcher(false);
      }
      if (vaultRef.current && !vaultRef.current.contains(e.target as Node)) {
        setShowVaultSwitcher(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSwitchChain = async (chainId: number) => {
    if (!onSwitchChain) return;
    setShowChainSwitcher(false);
    setIsSwitchingChain(true);
    try {
      await (onSwitchChain(chainId) as unknown as Promise<void>);
    } finally {
      setIsSwitchingChain(false);
    }
  };

  const shortAddr = (addr: string | null) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';
  const currentChain = CHAINS.find(c => BigInt(c.id) === user.chainId) || CHAINS[0];
  const activeChains = CHAINS.filter(c => c.active);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b ${
          scrolled || isMenuOpen
            ? 'bg-[#050914]/80 backdrop-blur-2xl border-cyan-100/[0.16] py-3 shadow-lg shadow-black/20'
            : 'bg-transparent border-transparent py-6'
        }`}
      >
        {/*
          Three-column flex layout:
            col-1 (shrink-0):  Logo
            col-2 (flex-1):    Center nav — naturally centered with justify-center, never overlaps
            col-3 (shrink-0):  Right actions + mobile toggle
        */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-full gap-2 md:gap-4">

          {/* ── 1. Logo ───────────────────────────────────────────────── */}
          <div
            className="flex items-center gap-3 cursor-pointer group select-none shrink-0 z-50"
            onClick={() => onNavigate('landing')}
          >
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 via-teal-300 to-sky-500 rounded-xl rotate-3 group-hover:rotate-12 transition-transform duration-500 shadow-lg shadow-cyan-500/30 blur-[2px] opacity-60 group-hover:opacity-100"></div>
              <div className="absolute inset-0.5 bg-[#0b1424] rounded-[10px] flex items-center justify-center z-10 border border-cyan-100/[0.16] backdrop-blur-sm group-hover:border-cyan-500/30 transition-colors">
                <QuantumVaultLogo size={24} className="drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight text-white leading-none font-sans drop-shadow-sm group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-cyan-200 transition-all">
                Quantum Vault
              </span>
              <span className="text-[11px] text-cyan-300/80 font-bold tracking-[0.3em] uppercase mt-1 hidden sm:block">
                Protocol
              </span>
            </div>
          </div>

          {/* ── 2. Center Navigation (desktop) — flex-1 keeps it centered ── */}
          <div className="hidden md:flex flex-1 justify-center min-w-0">
            <div className="flex items-center gap-1 bg-[#0c1d30]/80 border border-cyan-100/[0.11] rounded-full p-1.5 backdrop-blur-md shadow-2xl hover:bg-white/[0.07] transition-colors">
              <NavLink onClick={onShowGuide} icon={<Zap size={15} />} label={t('nav.principle')} />
              <div className="w-px h-4 bg-cyan-100/[0.07] mx-1"></div>
              <NavLink onClick={onShowPrivacy} icon={<ShieldCheck size={15} />} label={t('nav.security')} />
              <div className="w-px h-4 bg-cyan-100/[0.07] mx-1"></div>
              <NavLink onClick={() => onNavigate('docs')} icon={<BookOpen size={15} />} label="Docs" />
            </div>
          </div>

          {/* ── 3. Right Actions (desktop) + Mobile Toggle ─────────────── */}
          <div className="flex items-center gap-2 shrink-0 z-50">

            {/* Desktop connected state */}
            {user.isConnected ? (
              <div className="hidden md:flex items-center gap-2 animate-fade-in pl-3 border-l border-cyan-100/[0.11]">

                {/* Chain Switcher — visible at md+, icon-only until lg */}
                <div className="relative" ref={chainRef}>
                  <button
                    onClick={() => setShowChainSwitcher(v => !v)}
                    disabled={isSwitchingChain}
                    title={currentChain.name}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                      showChainSwitcher
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-200'
                        : 'bg-white/[0.03] border-cyan-100/[0.16] text-slate-300 hover:border-cyan-500/30 hover:text-white'
                    }`}
                  >
                    {isSwitchingChain ? (
                      <Loader2 size={11} className="animate-spin text-cyan-400" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: currentChain.color }} />
                    )}
                    {/* Name only on lg+; icon-only on md keeps layout tight */}
                    <span className="hidden lg:inline">{currentChain.name}</span>
                    <ChevronDown size={11} className={`transition-transform ${showChainSwitcher ? 'rotate-180' : ''}`} />
                  </button>

                  {showChainSwitcher && (
                    <div className="absolute top-full right-0 mt-2 w-52 bg-[#0b1424] border border-cyan-100/[0.16] rounded-2xl shadow-2xl z-[100] overflow-hidden animate-fade-in">
                      <div className="px-4 py-2.5 border-b border-cyan-100/[0.11]">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Switch Network</span>
                      </div>
                      <div className="p-2 space-y-1">
                        {activeChains.map(chain => {
                          const isCurrent = BigInt(chain.id) === user.chainId;
                          return (
                            <button
                              key={chain.id}
                              onClick={() => handleSwitchChain(chain.id)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                                isCurrent
                                  ? 'bg-cyan-500/15 border border-cyan-500/30'
                                  : 'hover:bg-[#0c1d30]/80 border border-transparent'
                              }`}
                            >
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: chain.color }} />
                              <span className="text-xs font-bold text-white flex-1">{chain.name}</span>
                              {chain.primary && <span className="text-[10px] text-cyan-400 font-bold">Primary</span>}
                              {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Vault Switcher — lg+ only */}
                {myVaults.length > 0 && (
                  <div className="relative hidden lg:block" ref={vaultRef}>
                    <button
                      onClick={() => setShowVaultSwitcher(v => !v)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-bold transition-all ${
                        showVaultSwitcher
                          ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-200'
                          : 'bg-white/[0.03] border-cyan-100/[0.16] text-slate-300 hover:border-cyan-500/30 hover:text-white'
                      }`}
                    >
                      <Layers size={11} />
                      {isFetchingVaults ? '…' : `${myVaults.length} Vault${myVaults.length > 1 ? 's' : ''}`}
                      <ChevronDown size={11} className={`transition-transform ${showVaultSwitcher ? 'rotate-180' : ''}`} />
                    </button>

                    {showVaultSwitcher && (
                      <div className="absolute top-full right-0 mt-2 w-72 bg-[#0b1424] border border-cyan-100/[0.16] rounded-2xl shadow-2xl z-[100] overflow-hidden animate-fade-in">
                        <div className="px-4 py-2.5 border-b border-cyan-100/[0.11] flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">My Vaults</span>
                          <span className="text-[11px] text-slate-400 font-mono">{myVaults.length} total</span>
                        </div>
                        <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                          {myVaults.map((v, i) => {
                            const isActive = activeAccount?.toLowerCase() === v.account.toLowerCase();
                            return (
                              <button
                                key={v.account}
                                onClick={() => { onSwitchVault?.(v.account); setShowVaultSwitcher(false); }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                                  isActive
                                    ? 'bg-cyan-500/15 border border-cyan-500/30'
                                    : 'hover:bg-[#0c1d30]/80 border border-transparent'
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                  isActive ? 'bg-cyan-500/30 text-cyan-200' : 'bg-[#0c1d30]/80 text-slate-400 group-hover:text-slate-300'
                                }`}>
                                  {i + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-bold text-white font-mono truncate">{v.vault.slice(0, 10)}…{v.vault.slice(-6)}</div>
                                  <div className="text-[11px] text-slate-400 font-mono">Acct: {v.account.slice(0, 8)}…</div>
                                </div>
                                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                        <div className="px-3 py-2 border-t border-cyan-100/[0.11]">
                          <button
                            onClick={() => { onNavigate('landing'); setShowVaultSwitcher(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/10 transition-all"
                          >
                            <Plus size={12} /> Create New Vault
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Wallet Info pill */}
                <div className="flex items-center gap-2 pl-1 pr-3 py-1 bg-slate-800/80 border border-cyan-100/[0.16] rounded-full transition-all hover:border-cyan-500/30 hover:bg-slate-800 group cursor-default shadow-lg">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)] ring-2 ring-[#050914] group-hover:scale-105 transition-transform shrink-0">
                    <Wallet size={13} className="text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-teal-400 leading-none mb-0.5 font-bold uppercase tracking-wider">
                      {t('nav.connected')}
                    </span>
                    <span className="text-xs font-mono text-white font-semibold tracking-wide">{shortAddr(user.address)}</span>
                  </div>
                </div>

                <button
                  onClick={onDisconnect}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[#0c1d30]/80 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                  title={t('btn.disconnect')}
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={onConnect}
                disabled={loading}
                className="hidden md:flex group relative px-5 py-2.5 rounded-full overflow-hidden transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(79,70,229,0.2)] hover:shadow-[0_0_30px_rgba(79,70,229,0.4)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-sky-600 to-cyan-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-cyan-400 opacity-0 group-hover:opacity-30 blur-xl transition-opacity"></div>
                <span className="relative flex items-center gap-2 text-white font-bold text-sm tracking-wide">
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Wallet size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                  )}
                  <span>{loading ? t('btn.connecting') : t('btn.connect')}</span>
                  {!loading && <ArrowRight size={14} className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />}
                </span>
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 text-slate-300 hover:text-white transition-colors active:scale-90 z-50 relative bg-[#0c1d30]/80 rounded-xl border border-cyan-100/[0.16]"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-[#050914]/95 backdrop-blur-2xl md:hidden flex flex-col pt-28 pb-8 px-6 transition-all duration-300 ease-in-out ${
          isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex flex-col gap-6 h-full">
          <div className="flex justify-between items-center pb-6 border-b border-cyan-100/[0.11]">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Menu</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <MobileNavLink onClick={() => { onShowGuide(); setIsMenuOpen(false); }} icon={<Zap size={18} />} title={t('nav.principle')} desc="2FA Mechanism & Security" />
            <MobileNavLink onClick={() => { onShowPrivacy(); setIsMenuOpen(false); }} icon={<ShieldCheck size={18} />} title={t('nav.security')} desc="Privacy & Local Compute" />
            <MobileNavLink onClick={() => { onNavigate('docs'); setIsMenuOpen(false); }} icon={<BookOpen size={18} />} title="Docs" desc="Technical architecture & cryptography" />
          </div>

          {/* Mobile Chain Switcher */}
          {user.isConnected && onSwitchChain && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Network</span>
              <div className="grid grid-cols-2 gap-2">
                {activeChains.map(chain => {
                  const isCurrent = BigInt(chain.id) === user.chainId;
                  return (
                    <button
                      key={chain.id}
                      onClick={() => { handleSwitchChain(chain.id); setIsMenuOpen(false); }}
                      disabled={isSwitchingChain}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all border disabled:opacity-60 ${
                        isCurrent
                          ? 'bg-cyan-500/15 border-cyan-500/30 text-white'
                          : 'bg-[#0c1d30]/80 border-cyan-100/[0.11] text-slate-400 active:scale-95'
                      }`}
                    >
                      {isSwitchingChain && isCurrent ? (
                        <Loader2 size={14} className="animate-spin text-cyan-400 shrink-0" />
                      ) : (
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: chain.color }} />
                      )}
                      <span className="text-xs font-bold flex-1">{chain.name}</span>
                      {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mobile Vault Switcher */}
          {user.isConnected && myVaults.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">My Vaults</span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {myVaults.map((v, i) => {
                  const isActive = activeAccount?.toLowerCase() === v.account.toLowerCase();
                  return (
                    <button
                      key={v.account}
                      onClick={() => { onSwitchVault?.(v.account); setIsMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border ${
                        isActive
                          ? 'bg-cyan-500/15 border-cyan-500/30'
                          : 'bg-[#0c1d30]/80 border-cyan-100/[0.11] active:scale-[0.98]'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        isActive ? 'bg-cyan-500/30 text-cyan-200' : 'bg-[#050914] text-slate-400'
                      }`}>{i + 1}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white font-mono truncate">{v.vault.slice(0, 10)}…{v.vault.slice(-6)}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Acct: {v.account.slice(0, 8)}…</div>
                      </div>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-auto space-y-4">
            {user.isConnected ? (
              <div className="bg-slate-800/60 rounded-2xl p-4 border border-cyan-100/[0.16] flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center shadow-lg">
                    <Wallet size={18} className="text-white" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 mb-0.5 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentChain.color }} />
                      {currentChain.name}
                    </div>
                    <div className="font-mono text-white font-bold text-sm">{shortAddr(user.address)}</div>
                  </div>
                </div>
                <button
                  onClick={() => { onDisconnect(); setIsMenuOpen(false); }}
                  className="p-2.5 bg-[#0c1d30]/80 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { onConnect(); setIsMenuOpen(false); }}
                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-cyan-600 rounded-2xl text-white font-bold shadow-lg shadow-cyan-900/30 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                <Wallet size={20} /> {t('btn.connect')}
              </button>
            )}
          </div>

          <div className="pt-6 flex justify-center">
            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></div>
              System Operational
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Helper Components

const NavLink = ({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) => (
  <button
    onClick={onClick}
    className="group flex items-center gap-2 px-4 py-1.5 rounded-full hover:bg-[#0c1d30]/80 transition-all relative overflow-hidden"
  >
    <span className="text-slate-400 group-hover:text-cyan-300 transition-colors duration-300">{icon}</span>
    <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors duration-300">{label}</span>
  </button>
);

const MobileNavLink = ({ onClick, icon, title, desc }: { onClick: () => void; icon: React.ReactNode; title: string; desc: string }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-4 p-4 rounded-2xl bg-[#0c1d30]/80 border border-cyan-100/[0.11] active:scale-[0.98] transition-all text-left group hover:border-cyan-500/30 hover:bg-white/[0.08]"
  >
    <div className="w-10 h-10 rounded-xl bg-[#050914] flex items-center justify-center text-slate-400 group-hover:text-cyan-300 group-hover:scale-110 transition-all border border-cyan-100/[0.11] shadow-inner">
      {icon}
    </div>
    <div>
      <div className="text-sm font-bold text-white group-hover:text-cyan-200 transition-colors flex items-center gap-2">
        {title}
        <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
      </div>
      <div className="text-[11px] text-slate-400 mt-0.5">{desc}</div>
    </div>
  </button>
);

export default Header;
