
import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  X, 
  HelpCircle, 
  LayoutGrid, 
  Fingerprint,
  ExternalLink,
  ChevronRight,
  Download,
  Server,
  ChevronDown
} from './Icons';
import { CHAINS, ChainConfig } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (walletType: string, chainId: number) => void;
  loading: boolean;
}

interface WalletOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  isInstalled: boolean;
  downloadUrl: string;
  descriptionKey: string;
  isMainstream: boolean;
  check: () => boolean;
}

const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose, onConnect, loading }) => {
  const [view, setView] = useState<'main' | 'learn'>('main');
  const [selectedChain, setSelectedChain] = useState<ChainConfig>(CHAINS[0]);
  
  const [visibleWallets, setVisibleWallets] = useState<WalletOption[]>([]);
  const [hiddenWallets, setHiddenWallets] = useState<WalletOption[]>([]);
  const [showMore, setShowMore] = useState(false);

  const { t, language } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;

    // Use a small timeout to allow window.ethereum to be injected if checking immediately on load
    const timeoutId = setTimeout(() => {
        const eth = window.ethereum;
        
        // Strict MetaMask check: Ensure it's not another wallet masquerading as MetaMask
        const isStrictMetaMask = () => {
            if (!eth || !eth.isMetaMask) return false;
            // Exclude all other known wallets that also set isMetaMask to true
            // Added eth.isBinance check here to prevent Binance Wallet from being detected as MetaMask
            if (eth.isBinance || eth.isBinanceWallet || eth.isTrust || eth.isTokenPocket || eth.isBitKeep || eth.isMathWallet || eth.isOkxWallet || eth.isCoin98 || eth.isSafePal) {
                return false;
            }
            return true;
        };

        const ALL_WALLETS: Omit<WalletOption, 'isInstalled'>[] = [
          { 
            id: 'metamask', 
            name: 'MetaMask', 
            icon: <div className="text-xl md:text-2xl">🦊</div>, 
            downloadUrl: 'https://metamask.io/download/', 
            descriptionKey: 'wallet.desc.metamask', 
            isMainstream: true, 
            check: isStrictMetaMask
          },
          { 
            id: 'okx', 
            name: 'OKX Wallet', 
            icon: <div className="font-bold text-white bg-black w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-[8px] md:text-[10px] border border-white/20">OKX</div>, 
            downloadUrl: 'https://www.okx.com/web3', 
            descriptionKey: 'wallet.desc.okx', 
            isMainstream: true, 
            check: () => !!window.okxwallet || !!eth?.isOkxWallet 
          },
          { 
            id: 'bitget', 
            name: 'Bitget Wallet', 
            icon: <div className="text-white bg-[#7524f9] w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-sm md:text-lg">🟣</div>, 
            downloadUrl: 'https://web3.bitget.com/', 
            descriptionKey: 'wallet.desc.bitget', 
            isMainstream: true, 
            check: () => !!window.bitkeep?.ethereum || !!eth?.isBitKeep 
          },
          { 
            id: 'binance', 
            name: 'Binance Wallet', 
            icon: (
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-[#1e293b] flex items-center justify-center">
                <svg width="20" height="20" className="md:w-6 md:h-6" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#F3BA2F" d="M16 0c8.837 0 16 7.163 16 16s-7.163 16-16 16S0 24.837 0 16 7.163 0 16 0zm0 7.375l-4.25 4.25 4.25 4.25 4.25-4.25L16 7.375zm-6.375 6.375L5.375 18l4.25 4.25 4.25-4.25-4.25-4.25zm12.75 0l-4.25 4.25 4.25 4.25 4.25-4.25-4.25-4.25zM16 20.25l-4.25 4.25 4.25 4.25 4.25-4.25-4.25-4.25z" />
                </svg>
              </div>
            ),
            downloadUrl: 'https://www.binance.com/en/wallet', 
            descriptionKey: 'wallet.desc.binance', 
            isMainstream: true, 
            // Enhanced check: support window.BinanceChain, eth.isBinance (new), and eth.isBinanceWallet (legacy)
            check: () => !!window.BinanceChain || !!eth?.isBinance || !!eth?.isBinanceWallet 
          },
          { 
            id: 'trust', 
            name: 'Trust Wallet', 
            icon: <div className="text-xl md:text-2xl">🛡️</div>, 
            downloadUrl: 'https://trustwallet.com/', 
            descriptionKey: 'wallet.desc.trust', 
            isMainstream: false, 
            check: () => !!window.trustwallet || !!eth?.isTrust 
          },
          { 
            id: 'coinbase', 
            name: 'Coinbase Wallet', 
            icon: <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-[#075985] flex items-center justify-center"><svg width="16" height="16" className="md:w-5 md:h-5" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32ZM13.8696 11.5161H18.1304V20.4839H13.8696V11.5161Z" fill="white"></path></svg></div>, 
            downloadUrl: 'https://www.coinbase.com/wallet', 
            descriptionKey: 'wallet.desc.coinbase', 
            isMainstream: false, 
            check: () => !!window.coinbaseWallet || !!eth?.isCoinbaseWallet 
          },
          { 
            id: 'imtoken', 
            name: 'imToken', 
            icon: <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-[#102b40] flex items-center justify-center border border-cyan-100/15"><svg width="16" height="16" className="md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3.66699L19.4648 8.00033V16.667L12 21.0003L4.53516 16.667V8.00033L12 3.66699Z" stroke="#67E8F9" stroke-width="1.5"></path><path d="M12 12.167V21.0003M12 12.167L4.53516 8.00033M12 12.167L19.4648 8.00033" stroke="#67E8F9" stroke-width="1.5"></path></svg></div>, 
            downloadUrl: 'https://token.im/', 
            descriptionKey: 'wallet.desc.imtoken', 
            isMainstream: false, 
            check: () => !!window.imToken || !!eth?.isImToken 
          },
          { 
            id: 'tokenpocket', 
            name: 'TokenPocket', 
            icon: <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-[#2980fe] flex items-center justify-center text-white text-[8px] md:text-[10px] font-bold">TP</div>, 
            downloadUrl: 'https://www.tokenpocket.pro/', 
            descriptionKey: 'wallet.desc.tp', 
            isMainstream: false, 
            check: () => !!eth?.isTokenPocket 
          },
          { 
            id: 'mathwallet', 
            name: 'MathWallet', 
            icon: <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-black flex items-center justify-center"><svg width="16" height="16" className="md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L4 6V18L12 22L20 18V6L12 2Z" fill="#22D3EE"></path><path d="M12 14.5L16 12.5V8.5L12 10.5V14.5Z" fill="white"></path><path d="M12 14.5V10.5L8 8.5V12.5L12 14.5Z" fill="white" fill-opacity="0.7"></path></svg></div>, 
            downloadUrl: 'https://mathwallet.org', 
            descriptionKey: 'wallet.desc.math', 
            isMainstream: false, 
            check: () => !!eth?.isMathWallet 
          },
          { 
            id: 'coin98', 
            name: 'Coin98', 
            icon: <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-[#1c1c1c] flex items-center justify-center"><svg width="16" height="16" className="md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM17.3 12.63L13.2 16.73L9.1 12.63L12 9.73L17.3 12.63Z" fill="#F8D46A"></path></svg></div>, 
            downloadUrl: 'https://coin98.com/wallet', 
            descriptionKey: 'wallet.desc.coin98', 
            isMainstream: false, 
            check: () => !!window.coin98 || !!eth?.isCoin98 
          },
          { 
            id: 'safepal', 
            name: 'SafePal', 
            icon: <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-[#1c1c1c] flex items-center justify-center"><svg width="16" height="16" className="md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM16.5 15.21L12 18.21L7.5 15.21V8.79L12 5.79L16.5 8.79V15.21Z" fill="#4688F1"></path></svg></div>, 
            downloadUrl: 'https://safepal.com/', 
            descriptionKey: 'wallet.desc.safepal', 
            isMainstream: false, 
            check: () => !!eth?.isSafePal 
          },
        ];

        const processedWallets: WalletOption[] = ALL_WALLETS.map(w => ({ ...w, isInstalled: w.check() }));

        const detected = processedWallets.filter(w => w.isInstalled);
        const notDetected = processedWallets.filter(w => !w.isInstalled);

        let visible: WalletOption[] = [];
        let hidden: WalletOption[] = [];

        // 1. All detected wallets go to Main List
        visible.push(...detected);

        // 2. Mainstream wallets that are NOT detected also go to Main List (as install links)
        const visibleIds = new Set(visible.map(w => w.id));
        notDetected.forEach(w => {
          if (w.isMainstream && !visibleIds.has(w.id)) {
            visible.push(w);
          }
        });

        // 3. All other wallets go to Hidden (Show More)
        const finalVisibleIds = new Set(visible.map(w => w.id));
        hidden = processedWallets.filter(w => !finalVisibleIds.has(w.id));
        
        // 4. Fallback: If absolutely nothing detected, show Browser Wallet option
        if (detected.length === 0 && eth) {
            visible.push({
                id: 'injected', name: 'Browser Wallet', icon: <Globe size={24} className="text-cyan-300"/>, downloadUrl: '#', descriptionKey: 'wallet.desc.browser', isMainstream: false, isInstalled: true, check: () => true
            });
        }

        setVisibleWallets(visible.sort((a,b) => b.isInstalled ? 1 : -1));
        setHiddenWallets(hidden);
        setShowMore(false);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [isOpen, language, t]); 

  useEffect(() => {
    if (isOpen) {
      setView('main');
      setShowMore(false);
    }
  }, [isOpen]);

  const WalletItem: React.FC<{wallet: WalletOption}> = ({ wallet }) => (
    <div
      key={wallet.id}
      className={`group relative flex items-center justify-between p-2 md:p-4 rounded-xl md:rounded-2xl border transition-all duration-300 ${
        wallet.isInstalled 
          ? 'bg-[#0c1d30]/80 border-cyan-100/[0.11] hover:bg-cyan-100/[0.07] hover:border-[#F3BA2F]/40 cursor-pointer active:scale-[0.99] shadow-lg shadow-black/20'
          : 'bg-transparent border-transparent opacity-50 hover:opacity-100 hover:bg-[#0c1d30]/80'
      }`}
      onClick={() => wallet.isInstalled && onConnect(wallet.id, selectedChain.id)}
    >
      <div className="flex items-center gap-3 md:gap-5 flex-1 min-w-0 mr-2">
        <div className={`w-8 h-8 md:w-14 md:h-14 rounded-lg md:rounded-2xl bg-[#1e293b] flex items-center justify-center border border-cyan-100/[0.11] shadow-xl group-hover:scale-105 transition-transform shrink-0 ${!wallet.isInstalled && 'grayscale opacity-70'}`}>
          {wallet.icon}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
              <span className="text-sm md:text-base font-bold text-white group-hover:text-yellow-200 transition-colors truncate">
                {wallet.name}
              </span>
              {wallet.isInstalled && (
                <span className="shrink-0 px-1.5 py-0.5 md:px-2 rounded-md bg-teal-500/10 text-teal-400 text-[8px] md:text-[10px] font-bold border border-teal-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                  {t('wallet.detected')}
                </span>
              )}
          </div>
          <div className="text-[10px] md:text-xs text-slate-400 mt-0.5 md:mt-1 font-medium truncate">
            {t(wallet.descriptionKey)}
          </div>
        </div>
      </div>

      <div className="shrink-0">
        {loading && wallet.isInstalled ? (
          <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
        ) : wallet.isInstalled ? (
          <div className="w-6 h-6 md:w-10 md:h-10 rounded-full bg-[#0c1d30]/80 flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-4 group-hover:translate-x-0 hover:bg-[#F3BA2F] hover:text-black">
            <ChevronRight size={16} className="md:w-5 md:h-5"/>
          </div>
        ) : (
          <a 
            href={wallet.downloadUrl} 
            target="_blank" 
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-slate-800 text-slate-300 text-[10px] md:text-xs font-bold hover:bg-cyan-600 hover:text-white transition-all border border-cyan-100/[0.11] hover:border-cyan-500/50 whitespace-nowrap"
          >
            <Download size={12} /> <span>{t('wallet.install')}</span>
          </a>
        )}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6 animate-fade-in">
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl transition-opacity duration-300" 
        onClick={onClose}
      />
      
      {/* Modal Body */}
      <div className="relative w-full max-w-4xl transform overflow-hidden rounded-t-[2rem] sm:rounded-[2.5rem] bg-[#0b1424] border-t sm:border border-cyan-100/[0.16] shadow-2xl transition-all duration-300 flex flex-col md:flex-row max-h-[85vh] md:min-h-[550px] animate-fade-in-up">
        
        {/* Left Side: Chain Selection & Info */}
        <div className="w-full md:w-80 bg-slate-900/60 border-b md:border-b-0 md:border-r border-cyan-100/[0.11] p-4 md:p-8 flex flex-col gap-4 md:gap-6 shrink-0 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-yellow-400 to-amber-500"></div>
           
           <div>
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 md:mb-6 flex items-center gap-2">
               <Globe size={14} /> {t('wallet.network')}
             </h3>
             <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-visible pb-2 md:pb-0 no-scrollbar">
               {CHAINS.map(chain => (
                 <button
                   key={chain.id}
                   onClick={() => chain.active && setSelectedChain(chain)}
                   disabled={!chain.active}
                   className={`flex items-center gap-3 p-2 md:p-3.5 rounded-xl md:rounded-2xl border transition-all shrink-0 md:shrink-1 relative overflow-hidden group w-32 md:w-full ${
                     selectedChain.id === chain.id
                       ? 'bg-[#F3BA2F]/10 border-[#F3BA2F]/50 text-white shadow-[0_0_20px_rgba(243,186,47,0.15)]'
                       : chain.active 
                         ? 'bg-[#0c1d30]/80 border-transparent text-slate-400 hover:bg-cyan-100/[0.07] hover:text-slate-200'
                         : 'bg-transparent border-transparent text-slate-400 opacity-60 cursor-not-allowed grayscale'
                   }`}
                 >
                   <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 shadow-inner ring-1 ring-white/5" style={{ backgroundColor: chain.active ? chain.color : '#1e293b' }}>
                     <span className="font-bold text-white text-[10px] md:text-xs">{chain.ticker[0]}</span>
                   </div>
                   <div className="flex flex-col items-start min-w-0 relative z-10">
                     <span className="text-xs md:text-sm font-bold truncate">{chain.name}</span>
                     {selectedChain.id === chain.id ? (
                        <span className="text-[9px] md:text-[10px] text-yellow-400 font-mono flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-yellow-400 animate-pulse"/> Active</span>
                     ) : !chain.active ? (
                        <span className="text-[9px] md:text-[10px] text-slate-400 font-mono">Soon</span>
                     ) : null}
                   </div>
                   {selectedChain.id === chain.id && <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#F3BA2F] shadow-[0_0_10px_#F3BA2F]"/>}
                 </button>
               ))}
             </div>
           </div>

           <div className="hidden md:block mt-auto p-6 rounded-3xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/20 relative overflow-hidden group">
             <div className="absolute -right-10 -top-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>
             <div className="relative z-10">
               <div className="flex items-center gap-2 mb-3">
                  <Server size={18} className="text-cyan-300" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Multi-Chain</span>
               </div>
               <p className="text-xs text-cyan-200/70 leading-relaxed font-medium">
                 The Quantum Vault protocol is chain-agnostic. Currently optimized for BNB Chain.
               </p>
             </div>
           </div>
        </div>

        {/* Right Side: Wallet List */}
        <div className="flex-1 bg-[#0b1424] relative flex flex-col overflow-hidden max-h-[60vh] md:max-h-full">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 md:top-6 md:right-6 z-20 p-2 rounded-full text-slate-400 hover:bg-cyan-100/[0.07] hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          {view === 'main' ? (
            <div className="flex flex-col h-full animate-fade-in">
              <div className="p-4 md:p-8 pb-2 md:pb-4 shrink-0">
                <h2 className="text-lg md:text-3xl font-bold text-white mb-1 md:mb-3">{t('wallet.title')}</h2>
                <p className="text-xs md:text-sm text-slate-400 leading-relaxed max-w-md">
                  {t('wallet.subtitle')}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8 custom-scrollbar min-h-0">
                <div className="grid grid-cols-1 gap-2 md:gap-3">
                  {visibleWallets.map((wallet) => <WalletItem key={wallet.id} wallet={wallet} />)}
                  
                  {hiddenWallets.length > 0 && (
                     <>
                        <button
                          onClick={() => setShowMore(!showMore)}
                          className="w-full flex justify-center items-center gap-2 text-xs font-bold text-slate-400 hover:text-white py-2 md:py-3 rounded-xl hover:bg-[#0c1d30]/80 transition-colors group"
                        >
                          {t(showMore ? 'wallet.show_less' : 'wallet.show_more')}
                          <ChevronDown size={14} className={`transition-transform ${showMore ? 'rotate-180' : ''}`} />
                        </button>

                        {showMore && (
                          <div className="grid grid-cols-1 gap-2 md:gap-3 animate-fade-in">
                              {hiddenWallets.map((wallet) => <WalletItem key={wallet.id} wallet={wallet} />)}
                          </div>
                        )}
                     </>
                  )}
                </div>
              </div>

              <div className="p-4 md:p-6 border-t border-cyan-100/[0.11] flex items-center justify-between shrink-0 bg-[#0b1424] relative z-20">
                <span className="text-xs text-slate-400 hidden sm:inline">{t('wallet.new_to')}</span>
                <button 
                  onClick={() => setView('learn')}
                  className="flex items-center gap-2 text-xs md:text-sm font-bold text-[#F3BA2F] hover:text-yellow-300 transition-colors w-full sm:w-auto justify-center group py-2 sm:py-0"
                >
                  <HelpCircle size={16} /> {t('wallet.learn')}
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full animate-fade-in bg-[#0b1424]">
              <div className="p-4 md:p-8 pb-0 shrink-0">
                <button 
                  onClick={() => setView('main')}
                  className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors mb-4 md:mb-6 group"
                >
                  <ChevronRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> {t('wallet.back')}
                </button>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{t('wallet.learn')}</h2>
                <p className="text-xs md:text-sm text-slate-400">{t('wallet.intro.desc')}</p>
              </div>

              <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6 space-y-3 md:space-y-4 custom-scrollbar min-h-0">
                <div className="p-4 md:p-6 rounded-3xl bg-surfaceHighlight/30 border border-cyan-100/[0.11] hover:bg-surfaceHighlight/50 transition-colors">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-300 mb-4 border border-cyan-500/20">
                    <LayoutGrid size={20} className="md:w-6 md:h-6" />
                  </div>
                  <h4 className="text-white font-bold mb-2 text-sm md:text-base">{t('wallet.bank.title')}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t('wallet.bank.desc')}
                  </p>
                </div>

                <div className="p-4 md:p-6 rounded-3xl bg-surfaceHighlight/30 border border-cyan-100/[0.11] hover:bg-surfaceHighlight/50 transition-colors">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-300 mb-4 border border-cyan-500/20">
                    <Fingerprint size={20} className="md:w-6 md:h-6" />
                  </div>
                  <h4 className="text-white font-bold mb-2 text-sm md:text-base">{t('wallet.login.title')}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t('wallet.login.desc')}
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-cyan-100/[0.11] bg-slate-900/50 shrink-0">
                <a 
                  href="https://ethereum.org/en/wallets/" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center justify-center w-full py-3 md:py-4 rounded-xl bg-cyan-600 text-white font-bold hover:bg-cyan-500 transition-colors text-sm shadow-lg shadow-cyan-900/20 gap-2 active:scale-95 transform"
                >
                  {t('wallet.get')} <ExternalLink size={14}/>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletModal;
