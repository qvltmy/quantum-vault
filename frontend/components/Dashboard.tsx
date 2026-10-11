
import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { 
  Copy, RefreshCw, ArrowDownToLine, ArrowRightLeft, Settings, 
  Plus, AlertTriangle, Shield, ShieldCheck, Trash2, KeyRound, LogOut, Lock, 
  Wallet, Coins, Users, Search, Info, CheckCircle2,
  X, ChevronDown, ChevronUp, Check, Clock, Lightbulb, Zap, Loader2, UserCheck, UserX,
  PieChart, Activity
} from 'lucide-react';
import { VaultState, UserState, getChainTokens, TokenInfo, CHAINS } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardProps {
  user: UserState;
  vaultState: VaultState | null;
  accountAddress: string | null;
  refreshVault: () => void;
  onExit: () => void;
  onConnect: () => void;
  onDeposit: (amount: string, token: string, symbol: string, isCustom: boolean) => void; 
  onInitiateWithdraw: (amount: string, to: string, token: string, symbol: string) => void;
  onRotateEcdsaSigner: (newPw: string, currentPw: string) => Promise<void>;
  onSecureAction: (desc: string, action: (pw: string) => Promise<void>) => void;
  onAddAdmin: (adminAddr: string, pw: string) => Promise<void>;
  onRemoveAdmin: (adminAddr: string, pw: string) => Promise<void>;
  loading: boolean;
  fetchUserTokenBalance: (tokenAddr: string) => Promise<string>;
  checkIsAuthorizer: (address: string) => Promise<boolean>;
  isRestoring?: boolean;
  lastSuccessTime: number;
  isDemo?: boolean;
}

const TabButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={`flex-1 py-3 md:py-4 px-2 md:px-4 flex items-center justify-center gap-2 text-xs md:text-sm font-bold transition-all relative overflow-hidden group rounded-xl border duration-300 ${active ? 'text-cyan-50 bg-gradient-to-b from-cyan-400/12 to-cyan-900/10 shadow-lg border-cyan-300/25 shadow-cyan-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-cyan-100/[0.035] border-transparent hover:border-cyan-200/10'}`}
  >
    {active && <><div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200 to-transparent shadow-[0_0_12px_rgba(103,232,249,.8)]"></div><div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400 shadow-[0_0_10px_rgba(34,211,238,.55)]"></div></>}
    <span className="relative z-10 flex items-center gap-2">{icon} <span className="hidden sm:inline">{label}</span></span>
  </button>
);

const StatCard = ({ label, value, icon, subtext, gradient }: { label: string, value: string, icon: React.ReactNode, subtext?: string, gradient?: string }) => (
  <div className={`quantum-card relative overflow-hidden p-5 md:p-6 rounded-2xl md:rounded-[1.5rem] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-cyan-100/[0.16] group h-full flex flex-col justify-between`}>
    {/* Decorative Gradient Background */}
    {gradient && <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none opacity-20 transition-opacity group-hover:opacity-40 ${gradient}`}></div>}
    <div className="absolute inset-y-4 left-0 w-[2px] rounded-r-full bg-gradient-to-b from-cyan-300/70 via-teal-300/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
    
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div className="p-2.5 rounded-xl bg-[#0c1d30]/80 text-slate-400 group-hover:text-white group-hover:bg-cyan-100/[0.07] transition-all shadow-inner border border-cyan-100/[0.11]">
        {React.cloneElement(icon as React.ReactElement<any>, { size: 18 })}
      </div>
      {subtext && <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">{subtext}</span>}
    </div>
    
    <div className="relative z-10">
      <div className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">{label}</div>
      <div className="text-xl md:text-3xl font-sans font-bold tracking-tight text-white truncate">{value}</div>
    </div>
  </div>
);

const PrincipleCard = ({ title, desc, type = 'info' }: { title: string, desc: string, type?: 'info' | 'secure' }) => (
  <div className={`relative group mt-6 rounded-2xl p-5 md:p-6 border backdrop-blur-md overflow-hidden transition-all duration-500
    ${type === 'secure' 
      ? 'quantum-inset border-cyan-300/25 hover:border-cyan-200/40 hover:shadow-[0_0_28px_rgba(34,211,238,.08)]' 
      : 'quantum-inset border-teal-300/20 hover:border-teal-200/35 hover:shadow-[0_0_28px_rgba(45,212,191,.07)]'}
  `}>
     {/* Background decorative glow */}
     <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-[60px] -mr-20 -mt-20 transition-opacity duration-700 opacity-20 group-hover:opacity-40
        ${type === 'secure' ? 'bg-cyan-500' : 'bg-teal-500'}
     `}></div>

     {/* Side Accent Line */}
     <div className={`absolute top-4 bottom-4 left-0 w-1 rounded-r-full transition-colors
        ${type === 'secure' ? 'bg-cyan-500' : 'bg-teal-500'}
     `}></div>

     <div className="flex gap-4 items-start relative z-10 pl-2">
        <div className={`mt-0.5 p-2.5 rounded-xl shrink-0 border shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3
           ${type === 'secure' 
             ? 'bg-[#101c2e] border-cyan-500/30 text-cyan-300 shadow-cyan-900/20' 
             : 'bg-[#101c2e] border-teal-500/30 text-teal-400 shadow-teal-900/20'}
        `}>
           {type === 'secure' ? <Shield size={20} /> : <Lightbulb size={20} />}
        </div>
        <div>
           <h5 className={`text-sm font-bold mb-1.5 flex items-center gap-2 uppercase tracking-wide
              ${type === 'secure' ? 'text-cyan-200' : 'text-teal-200'}
           `}>
              {title}
           </h5>
           <p className={`text-xs leading-relaxed font-medium
              ${type === 'secure' ? 'text-cyan-100/70' : 'text-teal-100/70'}
           `}>
              {desc}
           </p>
        </div>
     </div>
  </div>
);

const PAUSE_COOLDOWN = 180; // 3 minutes
const GAS_RESERVE = 0.0003; 

const Dashboard: React.FC<DashboardProps> = ({ 
  user, vaultState, accountAddress, refreshVault, onExit, onConnect,
  onDeposit, onInitiateWithdraw, onRotateEcdsaSigner,
  onSecureAction, onAddAdmin, onRemoveAdmin,
  loading, fetchUserTokenBalance, checkIsAuthorizer, isRestoring, lastSuccessTime,
  isDemo = false
}) => {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'admin'>('deposit');
  
  // Deposit State
  const [depositAmount, setDepositAmount] = useState("");
  const [selectedDepositToken, setSelectedDepositToken] = useState("");
  const [depositTokenSymbol, setDepositTokenSymbol] = useState("ETH");
  const [isCustomDeposit, setIsCustomDeposit] = useState(false);
  const [depositError, setDepositError] = useState<{amount?: string, addr?: string}>({});
  const [userTokenBalance, setUserTokenBalance] = useState<string>("0");
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);

  // Withdraw State
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawTo, setWithdrawTo] = useState("");
  const [selectedWithdrawToken, setSelectedWithdrawToken] = useState("");
  const [isCustomWithdraw, setIsCustomWithdraw] = useState(false);
  const [customWithdrawTokenAddr, setCustomWithdrawTokenAddr] = useState("");
  const [withdrawError, setWithdrawError] = useState<{amount?: string, addr?: string, tokenAddr?: string}>({});
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const assetDropdownRef = useRef<HTMLDivElement>(null);
  
  // Admin Form States
  const [newPw, setNewPw] = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");

  // Live account permission data — wallet admin list (address[])
  const [adminList, setAdminList] = useState<string[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  // Add wallet admin form
  const [addAdminAddr, setAddAdminAddr] = useState('');
  const [addAdminError, setAddAdminError] = useState<string | undefined>(undefined);

  const { t } = useLanguage();

  const effectiveChainId = isDemo ? 4663n : user.chainId;
  const currentChain = CHAINS.find(c => BigInt(c.id) === effectiveChainId);
  const nativeTicker = currentChain ? currentChain.ticker : "ETH";
  const chainLabel   = currentChain?.label ?? currentChain?.name ?? "Robinhood Chain";
  // Per-chain ERC-20 token list (index 0 is wrapped native — skip it for the quick-pick grid
  // since native is shown separately; slice from 1 to get ERC-20 choices)
  const chainTokens  = getChainTokens(effectiveChainId);
  // Quick-pick ERC-20s: skip index 0 (wrapped native) for chains where native ≠ ERC-20
  const quickPickTokens = chainTokens.slice(1);

  // Auto-Clear Inputs on Successful Operation
  useEffect(() => {
    if (lastSuccessTime > 0) {
        setDepositAmount("");
        setWithdrawAmount("");
        setWithdrawTo("");
        setNewPw("");
        setNewPwConfirm("");
        setDepositError({});
        setWithdrawError({});
    }
  }, [lastSuccessTime]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assetDropdownRef.current && !assetDropdownRef.current.contains(event.target as Node)) {
        setIsAssetDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  useEffect(() => {
    if (!selectedDepositToken && !isCustomDeposit) {
      setDepositTokenSymbol(nativeTicker);
    }
  }, [nativeTicker, selectedDepositToken, isCustomDeposit]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!selectedDepositToken && !isCustomDeposit) {
        setUserTokenBalance(user.nativeBalance ? ethers.formatEther(user.nativeBalance) : "0");
        return;
      }
      const tokenAddr = isCustomDeposit ? (ethers.isAddress(selectedDepositToken) ? selectedDepositToken : null) : selectedDepositToken;
      if (tokenAddr && ethers.isAddress(tokenAddr)) {
        setIsFetchingBalance(true);
        try {
          const bal = await fetchUserTokenBalance(tokenAddr);
          setUserTokenBalance(bal);
        } catch (e) {
          setUserTokenBalance("0");
        } finally {
          setIsFetchingBalance(false);
        }
      } else {
        setUserTokenBalance("0");
      }
    };
    fetchBalance();
  }, [selectedDepositToken, isCustomDeposit, user.nativeBalance, fetchUserTokenBalance]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getMaxWithdrawBalance = (): string => {
    if (!vaultState) return "0";
    if (isCustomWithdraw) return "0"; 
    
    if (!selectedWithdrawToken) {
      return ethers.formatEther(vaultState.nativeBalance);
    }
    const token = vaultState.vaultTokens.find(t => t.address.toLowerCase() === selectedWithdrawToken.toLowerCase());
    if (token) {
      return ethers.formatUnits(token.balance, token.decimals);
    }
    return "0";
  };

  const getWithdrawSymbol = () => {
    if (isCustomWithdraw) return "Token";
    if (!selectedWithdrawToken) return nativeTicker;
    const token = vaultState?.vaultTokens.find(t => t.address.toLowerCase() === selectedWithdrawToken.toLowerCase());
    return token ? token.symbol : "Unknown";
  };

  const handleDepositAmountChange = (val: string) => {
    setDepositAmount(val);
    let error: string | undefined = undefined;
    if (val && parseFloat(val) <= 0) {
       error = t('err.amount_zero');
    } else if (val) {
       const amount = parseFloat(val);
       const balance = parseFloat(userTokenBalance);
       if (!selectedDepositToken && !isCustomDeposit) {
          const gasReserve = GAS_RESERVE; 
          if (amount > balance) {
             error = t('err.insufficient_bal');
          } else if (amount > (balance - gasReserve)) {
             error = t('err.insufficient_gas');
          }
       } else {
          if (amount > balance) {
             error = t('err.insufficient_bal');
          }
       }
    }
    setDepositError(prev => ({ ...prev, amount: error }));
  };

  const handleDepositTokenAddrChange = (val: string) => {
    setSelectedDepositToken(val);
    setDepositTokenSymbol("Custom");
    if (val && !ethers.isAddress(val)) {
        setDepositError(prev => ({ ...prev, addr: t('err.invalid_addr_fmt') }));
    } else {
        setDepositError(prev => ({ ...prev, addr: undefined }));
    }
  };

  const handleWithdrawAmountChange = (val: string) => {
    setWithdrawAmount(val);
    let error: string | undefined = undefined;
    if (val && parseFloat(val) <= 0) {
       error = t('err.amount_zero');
    } else if (val && !isCustomWithdraw) {
       const max = parseFloat(getMaxWithdrawBalance());
       const amount = parseFloat(val);
       if (amount > max) {
          error = t('err.insufficient_bal');
       }
    }
    setWithdrawError(prev => ({ ...prev, amount: error }));
  };

  const handleWithdrawToChange = (val: string) => {
    setWithdrawTo(val);
    if (val && !ethers.isAddress(val)) {
        setWithdrawError(prev => ({ ...prev, addr: t('err.invalid_addr_fmt') }));
    } else {
        setWithdrawError(prev => ({ ...prev, addr: undefined }));
    }
  };

  const handleCustomWithdrawTokenChange = (val: string) => {
    setCustomWithdrawTokenAddr(val);
    if (val && !ethers.isAddress(val)) {
        setWithdrawError(prev => ({ ...prev, tokenAddr: t('err.invalid_addr_fmt') }));
    } else {
        setWithdrawError(prev => ({ ...prev, tokenAddr: undefined }));
    }
  };

  const copyAddr = (addr: string) => {
    navigator.clipboard.writeText(addr).catch(() => {});
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 1500);
  };

  // Fetch live wallet admin list on mount and when admin tab opens
  useEffect(() => {
    if (!accountAddress) return;
    let cancelled = false;
    const fetchPermissions = async () => {
      setIsLoadingPermissions(true);
      try {
        // Demo mode: no wallet connected — use a public RPC
        const provider = isDemo
          ? new ethers.JsonRpcProvider('https://robinhood-rpc.publicnode.com')
          : new ethers.BrowserProvider((window as any).ethereum);
        const account = new ethers.Contract(accountAddress, [
          "function getWalletAdmins() view returns (address[])"
        ], provider);
        const walletAdmins: string[] = await account.getWalletAdmins();
        if (!cancelled) {
          setAdminList([...walletAdmins]);
        }
      } catch (e) {
        console.warn('fetchPermissions failed', e);
      } finally {
        if (!cancelled) setIsLoadingPermissions(false);
      }
    };
    fetchPermissions();
    return () => { cancelled = true; };
  }, [accountAddress]);

  const getAssetList = () => {
    if (!vaultState) return [];
    const assets = [
        {
            symbol: nativeTicker,
            address: "",
            balance: vaultState.nativeBalance,
            decimals: 18
        },
        ...vaultState.vaultTokens
    ];
    return assets;
  };

  if (isRestoring && !user.isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="relative w-20 h-20 md:w-24 md:h-24 mb-6 md:mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-cyan-500/10"></div>
          <div className="absolute inset-0 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <RefreshCw size={24} className="text-cyan-500 opacity-50 animate-pulse md:w-[28px] md:h-[28px]"/>
          </div>
        </div>
        <p className="text-slate-400 font-mono text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase">{t('dash.reconnecting')}</p>
      </div>
    );
  }

  if (!user.isConnected && !isDemo) {
    return (
      <div className="max-w-7xl mx-auto pb-20 pt-12 px-4 relative min-h-[60vh] flex items-center justify-center">
         <div className="absolute inset-0 bg-[#050914]/50 backdrop-blur-xl z-20 flex flex-col items-center justify-center text-center p-6">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-slate-800/50 flex items-center justify-center mb-6 md:mb-8 border border-cyan-100/[0.16] shadow-2xl rotate-3 transform hover:rotate-0 transition-all duration-500">
               <Wallet size={36} className="text-slate-400 md:w-[42px] md:h-[42px]" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">{t('toast.disconnect')}</h3>
            <p className="text-sm md:text-base text-slate-400 mb-8 md:mb-10 max-w-md leading-relaxed">
              {t('landing.btn.connect_first')}
            </p>
            <button 
              onClick={onConnect}
              className="px-8 py-3.5 md:px-10 md:py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-cyan-600 text-white font-bold text-xs md:text-sm shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_50px_rgba(79,70,229,0.5)] active:scale-95 transition-all flex items-center gap-3 border border-cyan-100/[0.16]"
            >
              <Wallet size={18} /> {t('btn.connect')}
            </button>
         </div>
      </div>
    );
  }

  if (!vaultState) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="relative w-20 h-20 md:w-24 md:h-24 mb-6 md:mb-8">
        <div className="absolute inset-0 rounded-full border-4 border-cyan-500/10"></div>
        <div className="absolute inset-0 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
           <Shield size={24} className="text-cyan-500 opacity-50 animate-pulse md:w-[28px] md:h-[28px]"/>
        </div>
      </div>
      <p className="text-slate-400 font-mono text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase">{t('dash.syncing')}</p>
    </div>
  );

  const isLoadingData = !!vaultState.isLoading;
  const nativeBal = isLoadingData ? '—' : (vaultState.nativeBalance ? parseFloat(ethers.formatEther(vaultState.nativeBalance)).toFixed(4) : "0.00");
  const totalAssetsCount = isLoadingData ? '—' : (
    vaultState.vaultTokens.filter(t => (t.balance ?? 0n) > 0n).length +
    (vaultState.nativeBalance > 0n ? 1 : 0)
  ).toString();

  return (
      <div className="max-w-7xl mx-auto pb-20 pt-4 md:pt-8 animate-fade-in px-3 sm:px-6">

      {/* Demo Mode Banner */}
      {isDemo && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl border border-amber-500/30 bg-amber-500/8 text-amber-200 text-xs font-bold">
          <AlertTriangle size={15} className="text-amber-400 shrink-0" />
          <span>
            Demo vault — <span className="font-mono text-amber-100">0xC7c0…772b</span> on Robinhood Chain.
            This is read-only. Connect your wallet to create or manage your own vault.
          </span>
        </div>
      )}

      {/* Header Card */}
      <div className="glass-card quantum-card quantum-edge rounded-2xl md:rounded-[2.5rem] p-4 md:p-10 mb-6 md:mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] -mr-32 -mt-32 pointer-events-none opacity-50"></div>

        <div className="w-full lg:w-auto relative z-10 space-y-3">
          <h2 className="text-2xl md:text-5xl font-bold text-white tracking-tight">{t('dash.title')}</h2>
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px] md:text-sm bg-[#050914]/80 px-3 py-2.5 rounded-xl border border-cyan-100/[0.11] w-full hover:border-white/20 transition-all backdrop-blur-sm shadow-inner max-w-xl">
            <span className="truncate flex-1 text-slate-300 tracking-wide">{vaultState.vaultAddress}</span>
            <button onClick={() => copyToClipboard(vaultState.vaultAddress || "")} className="hover:text-white transition-colors p-1.5 bg-[#0c1d30]/80 rounded-lg hover:bg-cyan-100/[0.07] shrink-0"><Copy size={14} /></button>
          </div>
        </div>

        <div className="flex gap-2 md:gap-4 w-full lg:w-auto relative z-10">
          <button
            onClick={refreshVault}
            className="p-3 md:p-5 rounded-xl md:rounded-2xl bg-[#0b1424] hover:bg-[#151e36] text-slate-300 transition-colors border border-cyan-100/[0.11] active:scale-95 shadow-lg shrink-0 backdrop-blur-md"
            title={t('dash.refresh')}
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={onExit}
            className="flex-1 lg:flex-none px-4 md:px-8 py-3 md:py-5 rounded-xl md:rounded-2xl bg-[#0b1424] hover:bg-red-900/10 hover:text-red-400 hover:border-red-500/30 text-slate-300 text-sm font-bold transition-all border border-cyan-100/[0.11] active:scale-95 shadow-lg flex items-center justify-center gap-2 backdrop-blur-md"
          >
            <LogOut size={16} /> {t('dash.exit')}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
        <StatCard 
          label={`${nativeTicker} ${t('dash.stat.balance_label')}`} 
          value={nativeBal} 
          icon={<Wallet />} 
          gradient="bg-cyan-500"
        />
        <StatCard 
          label={t('dash.stat.admins')} 
          value={adminList.length > 0 ? adminList.length.toString() : "—"} 
          icon={<Users />} 
          gradient="bg-sky-500"
        />
        <StatCard 
          label={t('dash.stat.permission')} 
          value={
            adminList.length === 0
              ? '—'
              : adminList.some(a => a.toLowerCase() === user.address?.toLowerCase())
                ? t('perm.admin')
                : 'Gas Payer'
          }
          icon={
            adminList.some(a => a.toLowerCase() === user.address?.toLowerCase())
              ? <ShieldCheck />
              : <Wallet />
          }
          subtext={
            adminList.some(a => a.toLowerCase() === user.address?.toLowerCase())
              ? 'Authorized'
              : adminList.length === 0
                ? undefined
                : 'Read Only'
          }
          gradient={
            adminList.some(a => a.toLowerCase() === user.address?.toLowerCase())
              ? 'bg-teal-500'
              : 'bg-amber-500'
          }
        />
        <StatCard 
          label={t('dash.stat.tokens')} 
          value={totalAssetsCount} 
          icon={<PieChart />} 
          subtext="Active Assets"
          gradient="bg-amber-500"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="p-1.5 mb-6 flex bg-[#0b1424]/80 backdrop-blur-xl rounded-2xl border border-cyan-100/[0.11] shadow-2xl overflow-x-auto no-scrollbar gap-1 max-w-2xl mx-auto">
         <TabButton active={activeTab === 'deposit'} onClick={() => setActiveTab('deposit')} icon={<ArrowDownToLine size={16}/>} label={t('dash.tab.deposit')} />
         <TabButton active={activeTab === 'withdraw'} onClick={() => setActiveTab('withdraw')} icon={<ArrowRightLeft size={16}/>} label={t('dash.tab.withdraw')} />
         {true && (
            <TabButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<Settings size={16}/>} label={t('dash.tab.admin')} />
         )}
      </div>

      <div className="animate-fade-in-up">
        {activeTab === 'deposit' && (
           <div className="glass-card quantum-card quantum-edge rounded-[2.5rem] p-6 md:p-12 relative overflow-visible">
              <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[120px] -mr-32 -mt-32 pointer-events-none"></div>
              
              <div className="max-w-3xl mx-auto space-y-8 md:space-y-12 relative z-10">
                 <div className="text-center space-y-3">
                    <h3 className="text-3xl font-bold text-white">{t('deposit.title')}</h3>
                    <p className="text-sm text-slate-400 font-medium max-w-lg mx-auto">{t('deposit.desc')}</p>
                 </div>

                 <div className="space-y-8">
                    {/* Vault Deposit Address */}
                    {vaultState.vaultAddress && (
                      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300"><ArrowDownToLine size={14}/></div>
                          <span className="text-xs font-bold text-cyan-200 uppercase tracking-widest">{t('deposit.vault_addr.title')}</span>
                        </div>
                        <p className="text-[11px] text-cyan-200/70 mb-3 leading-relaxed">{t('deposit.vault_addr.desc')}</p>
                        <div className="flex items-center gap-2 bg-black/40 px-4 py-3 rounded-xl border border-cyan-500/10">
                          <span className="flex-1 text-xs font-mono text-white truncate">{vaultState.vaultAddress}</span>
                          <button
                            onClick={() => copyToClipboard(vaultState.vaultAddress || "")}
                            className="shrink-0 p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white transition-all"
                          >
                            <Copy size={13}/>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Token Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-2">
                           {t('deposit.select_asset')}
                        </label>
                      </div>
                      
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                        <button 
                          onClick={() => { setSelectedDepositToken(""); setIsCustomDeposit(false); setDepositTokenSymbol(nativeTicker); setDepositError(prev => ({...prev, addr: undefined})); }}
                          className={`group h-14 md:h-16 rounded-2xl text-xs md:text-sm font-bold transition-all relative overflow-hidden border flex items-center justify-center ${!selectedDepositToken && !isCustomDeposit ? 'quantum-tile text-white shadow-lg border-teal-300/35' : 'bg-[#101c2e]/40 text-slate-400 hover:text-white border-cyan-100/[0.11] hover:bg-[#0c1d30]/80 hover:border-cyan-100/[0.16]'}`}
                        >
                          <div className="flex items-center gap-2">
                             <span>{nativeTicker}</span>
                             {!selectedDepositToken && !isCustomDeposit && <CheckCircle2 size={14} className="text-teal-400"/>}
                          </div>
                        </button>
                        
                        {quickPickTokens.map(t => (
                          <button 
                            key={t.symbol}
                            onClick={() => { setSelectedDepositToken(t.address); setIsCustomDeposit(false); setDepositTokenSymbol(t.symbol); setDepositError(prev => ({...prev, addr: undefined})); }}
                            className={`group h-14 md:h-16 rounded-2xl text-xs md:text-sm font-bold transition-all relative overflow-hidden border flex items-center justify-center ${selectedDepositToken === t.address && !isCustomDeposit ? 'quantum-tile text-white shadow-lg border-teal-300/35' : 'bg-[#101c2e]/40 text-slate-400 hover:text-white border-cyan-100/[0.11] hover:bg-[#0c1d30]/80 hover:border-cyan-100/[0.16]'}`}
                          >
                             <div className="flex items-center gap-2">
                               <span>{t.symbol}</span>
                               {selectedDepositToken === t.address && !isCustomDeposit && <CheckCircle2 size={14} className="text-teal-400"/>}
                             </div>
                          </button>
                        ))}

                        <div className={`col-span-3 md:col-span-1 relative transition-all h-14 md:h-16 rounded-2xl border overflow-hidden ${isCustomDeposit ? 'md:col-span-4 bg-[#101c2e]/80 border-teal-500/50 ring-1 ring-teal-500/30' : 'bg-[#101c2e]/40 border-cyan-100/[0.11] hover:bg-[#0c1d30]/80'}`}>
                          {isCustomDeposit ? (
                            <div className="flex items-center w-full h-full px-3 relative">
                               <input 
                                 autoFocus
                                 value={selectedDepositToken}
                                 onChange={(e) => handleDepositTokenAddrChange(e.target.value)}
                                 placeholder="Paste 0x address..."
                                 className="w-full bg-transparent border-none text-white text-xs md:text-sm font-mono p-0 focus:ring-0 outline-none placeholder-slate-700 h-full"
                               />
                               <button onClick={() => { setIsCustomDeposit(false); setSelectedDepositToken(""); setDepositTokenSymbol(nativeTicker); setDepositError(prev => ({...prev, addr: undefined})); }} className="absolute right-2 p-1 text-slate-400 hover:text-white bg-[#0c1d30]/80 rounded-full hover:bg-cyan-100/[0.07]"><X size={14}/></button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => { setIsCustomDeposit(true); setSelectedDepositToken(""); setDepositTokenSymbol("Custom"); }}
                              className="w-full h-full flex flex-row items-center justify-center text-slate-400 hover:text-white gap-2"
                            >
                              <Search size={16}/> 
                              <span className="text-xs font-bold">{t('deposit.custom_input')}</span>
                            </button>
                          )}
                        </div>
                        {isCustomDeposit && depositError.addr && (
                            <div className="col-span-3 md:col-span-4 text-[10px] text-red-400 flex items-center gap-1 mt-1 font-bold animate-fade-in">
                                <AlertTriangle size={10} /> {depositError.addr}
                            </div>
                        )}
                      </div>
                      
                      {isCustomDeposit && (
                         <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1.5 pl-1">
                            <Info size={12} /> Enter the ERC20 Contract Address you wish to deposit.
                         </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex justify-between items-end pl-1">
                        <span>{t('deposit.amount')}</span>
                        <span className="text-[10px] font-bold text-teal-400 bg-teal-950/50 border border-teal-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                           {isFetchingBalance && <Loader2 size={10} className="animate-spin" />}
                           {t('deposit.balance')}: {parseFloat(userTokenBalance).toFixed(4)} {depositTokenSymbol}
                        </span>
                      </label>
                      <div className="relative group">
                        <input 
                          type="number"
                          value={depositAmount}
                          onChange={(e) => handleDepositAmountChange(e.target.value)}
                          className={`glass-input w-full h-16 md:h-28 pl-5 md:pl-8 pr-20 md:pr-24 rounded-2xl md:rounded-[2rem] text-3xl md:text-5xl font-mono text-white placeholder-slate-800 transition-all shadow-inner bg-[#050914]/50 ${depositError.amount ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/50' : 'border-cyan-100/[0.16] focus:ring-2 focus:ring-teal-500/30'}`}
                          placeholder="0.00"
                        />
                        <button 
                          onClick={() => {
                            if (!selectedDepositToken && !isCustomDeposit) {
                                // Native: reserve gas (0.0003)
                                const gasReserveWei = ethers.parseEther(GAS_RESERVE.toString());
                                const balBN = user.nativeBalance || 0n;
                                let maxVal: bigint = balBN - gasReserveWei;
                                if (maxVal < 0n) maxVal = 0n;
                                const val = ethers.formatEther(maxVal);
                                setDepositAmount(val);
                                handleDepositAmountChange(val);
                            } else {
                                // Token: use full balance
                                setDepositAmount(userTokenBalance);
                                handleDepositAmountChange(userTokenBalance);
                            }
                          }}
                          className="absolute right-6 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-teal-500/10 text-xs font-bold text-teal-400 hover:bg-teal-500/20 transition-colors uppercase tracking-wider border border-teal-500/20"
                        >
                          {t('btn.max')}
                        </button>
                      </div>
                      {depositError.amount && (
                          <div className="text-[10px] text-red-400 flex items-center gap-1 mt-2 font-bold animate-fade-in pl-2">
                             <AlertTriangle size={12} /> {depositError.amount}
                          </div>
                      )}
                    </div>

                    <button 
                      onClick={() => onDeposit(depositAmount, selectedDepositToken, depositTokenSymbol, isCustomDeposit)}
                      disabled={loading || !depositAmount || !!depositError.amount || !!depositError.addr || parseFloat(depositAmount) <= 0}
                      className="w-full h-14 md:h-16 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-600 hover:from-teal-500 hover:to-teal-500 text-white font-bold transition-all shadow-xl shadow-teal-900/30 disabled:opacity-50 disabled:cursor-not-allowed text-base uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                      {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <ArrowDownToLine size={20}/>}
                      <span>{t('deposit.btn')}</span>
                    </button>
                    
                    <PrincipleCard 
                       type="info"
                       title={t('deposit.principle.title')}
                       desc={t('deposit.principle.desc')}
                    />
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'withdraw' && (
           <div className="glass-card quantum-card quantum-edge rounded-[2.5rem] p-6 md:p-12 relative overflow-visible">
              <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] -mr-32 -mt-32 pointer-events-none"></div>
              
              <div className="max-w-3xl mx-auto space-y-8 md:space-y-12 relative z-10">
                 <div className="text-center space-y-3">
                    <h3 className="text-3xl font-bold text-white">{t('withdraw.title')}</h3>
                    <div className="flex items-center justify-center gap-2 mt-2 bg-cyan-950/40 w-fit mx-auto px-4 py-1.5 rounded-full border border-cyan-500/20">
                       <Shield size={14} className="text-cyan-300"/>
                       <p className="text-xs text-cyan-200 font-bold tracking-wide">{t('withdraw.subtitle')}</p>
                    </div>
                 </div>

                 <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
                      {/* Left: Asset Selection */}
                      <div className="space-y-3">
                         <div className="flex justify-between items-center h-7 px-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('withdraw.select_asset')}</label>
                            <div className="flex bg-slate-800/80 rounded-lg p-0.5 border border-cyan-100/[0.16]">
                               <button 
                                 onClick={() => { setIsCustomWithdraw(false); setWithdrawError(prev => ({...prev, tokenAddr: undefined})); }}
                                 className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${!isCustomWithdraw ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                               >
                                 {t('withdraw.list')}
                               </button>
                               <button 
                                 onClick={() => { setIsCustomWithdraw(true); setSelectedWithdrawToken(""); setCustomWithdrawTokenAddr(""); }}
                                 className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${isCustomWithdraw ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                               >
                                 {t('withdraw.manual')}
                               </button>
                            </div>
                         </div>
                         
                         <div className="relative h-20">
                           {isCustomWithdraw ? (
                              <>
                                <input 
                                    value={customWithdrawTokenAddr}
                                    onChange={(e) => handleCustomWithdrawTokenChange(e.target.value)}
                                    placeholder="0x..."
                                    className={`glass-input w-full h-full px-6 rounded-2xl text-sm font-mono text-white placeholder-slate-700 transition-all shadow-inner bg-[#050914]/50 ${withdrawError.tokenAddr ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/50' : 'border-cyan-500/20 focus:ring-2 focus:ring-cyan-500/30'}`}
                                    autoFocus
                                />
                                {withdrawError.tokenAddr && (
                                    <div className="absolute -bottom-5 left-2 flex items-center gap-1 text-[10px] text-red-400 font-bold animate-fade-in">
                                        <AlertTriangle size={10} /> {withdrawError.tokenAddr}
                                    </div>
                                )}
                              </>
                           ) : (
                             <div className="relative h-full w-full" ref={assetDropdownRef}>
                                <button
                                  type="button"
                                  onClick={() => setIsAssetDropdownOpen(!isAssetDropdownOpen)}
                                  className="glass-input quantum-control w-full h-full px-6 rounded-2xl flex items-center justify-between transition-all hover:bg-[#0c1d30]/80 border-cyan-100/[0.16] active:scale-[0.99] group bg-[#050914]/50"
                                >
                                  <span className="text-lg font-bold text-white group-hover:text-cyan-200 transition-colors">
                                    {selectedWithdrawToken 
                                      ? (vaultState?.vaultTokens.find(t => t.address === selectedWithdrawToken)?.symbol || "Unknown")
                                      : nativeTicker}
                                  </span>
                                  <div className="text-slate-400 group-hover:text-white transition-colors">
                                    {isAssetDropdownOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                  </div>
                                </button>

                                {isAssetDropdownOpen && (
                                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#0b1424] border border-cyan-100/[0.16] rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in origin-top">
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                      {getAssetList().map((asset) => {
                                         const isSelected = asset.address === selectedWithdrawToken;
                                         const bal = ethers.formatUnits(asset.balance, asset.decimals);
                                         const isZero = asset.balance === 0n;
                                         
                                         return (
                                           <button
                                             key={asset.address || "native"}
                                             onClick={() => {
                                               if (isZero) return;
                                               setSelectedWithdrawToken(asset.address);
                                               setIsAssetDropdownOpen(false);
                                             }}
                                             disabled={isZero}
                                             className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                                               isSelected 
                                                 ? 'bg-cyan-600 text-white' 
                                                 : isZero 
                                                   ? 'opacity-50 cursor-not-allowed text-slate-400' 
                                                   : 'text-slate-300 hover:bg-[#0c1d30]/80 hover:text-white'
                                             }`}
                                           >
                                             <div className="flex flex-col items-start">
                                               <span className="font-bold text-sm">{asset.symbol}</span>
                                             </div>
                                             <div className="flex items-center gap-3">
                                               <span className="text-xs font-mono opacity-80">{parseFloat(bal).toFixed(4)}</span>
                                               {isSelected && <Check size={16} />}
                                             </div>
                                           </button>
                                         )
                                      })}
                                    </div>
                                  </div>
                                )}
                             </div>
                           )}
                         </div>
                      </div>
                      
                      {/* Right: Amount */}
                      <div className="space-y-3">
                         <div className="flex justify-between items-center h-7 px-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('withdraw.amount')}</label>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${!isCustomWithdraw ? 'text-cyan-300 bg-cyan-950/50 border-cyan-500/20' : 'text-slate-400 bg-slate-800/50 border-cyan-100/[0.11]'}`}>
                               {t('withdraw.available')}: {!isCustomWithdraw ? parseFloat(getMaxWithdrawBalance()).toFixed(4) : "--"}
                            </span>
                         </div>
                         <div className="relative group h-20">
                           <input 
                             type="number"
                             value={withdrawAmount}
                             onChange={(e) => handleWithdrawAmountChange(e.target.value)}
                             className={`glass-input w-full h-full pl-6 pr-20 rounded-2xl text-3xl font-mono text-white placeholder-slate-800 transition-all shadow-inner bg-[#050914]/50 ${withdrawError.amount ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/50' : 'border-cyan-100/[0.16] focus:ring-2 focus:ring-cyan-500/30'}`}
                             placeholder="0.00"
                           />
                           {!isCustomWithdraw && (
                             <button 
                               onClick={() => {
                                   setWithdrawAmount(getMaxWithdrawBalance());
                                   handleWithdrawAmountChange(getMaxWithdrawBalance());
                               }}
                               className="absolute right-6 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-cyan-500/10 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition-colors uppercase tracking-wider border border-cyan-500/20"
                             >
                               {t('btn.max')}
                             </button>
                           )}
                         </div>
                         {withdrawError.amount && (
                              <div className="text-[10px] text-red-400 flex items-center gap-1 mt-1 font-bold animate-fade-in pl-2">
                                 <AlertTriangle size={12} /> {withdrawError.amount}
                              </div>
                          )}
                      </div>
                    </div>

                    {/* Recipient Address */}
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between pl-1">
                        <span>{t('withdraw.recipient')}</span>
                        <button 
                           onClick={() => {
                               setWithdrawTo(user.address || "");
                               handleWithdrawToChange(user.address || "");
                           }}
                           className="text-[10px] text-cyan-200 font-bold bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-cyan-500/20 transition-colors flex items-center gap-1.5"
                        >
                           <Wallet size={12}/> {t('withdraw.use_my_addr')}
                        </button>
                      </label>
                      <input 
                        value={withdrawTo}
                        onChange={(e) => handleWithdrawToChange(e.target.value)}
                        className={`glass-input w-full h-16 px-8 rounded-2xl text-sm font-mono text-white placeholder-slate-700 transition-all shadow-inner bg-[#050914]/50 ${withdrawError.addr ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/50' : 'border-cyan-100/[0.16] focus:ring-2 focus:ring-cyan-500/30'}`}
                        placeholder={user.address || "0x..."}
                      />
                      {withdrawError.addr && (
                          <div className="text-[10px] text-red-400 flex items-center gap-1 mt-2 font-bold animate-fade-in pl-2">
                             <AlertTriangle size={12} /> {withdrawError.addr}
                          </div>
                      )}
                    </div>

                    <button 
                      onClick={() => onInitiateWithdraw(withdrawAmount, withdrawTo || user.address || "", isCustomWithdraw ? customWithdrawTokenAddr : selectedWithdrawToken, getWithdrawSymbol())}
                      disabled={loading || !withdrawAmount || !!withdrawError.amount || !!withdrawError.addr || !!withdrawError.tokenAddr || parseFloat(withdrawAmount) <= 0}
                      className="w-full h-14 md:h-16 py-5 rounded-2xl bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-bold transition-all shadow-xl shadow-cyan-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-base uppercase tracking-widest active:scale-[0.98]"
                    >
                      {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Settings size={20}/>}
                      <span>{t('withdraw.btn')}</span>
                    </button>
                    
                    <PrincipleCard 
                       type="secure"
                       title={t('withdraw.principle.title')}
                       desc={t('withdraw.principle.desc')}
                    />
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'admin' && (
           <div className="space-y-5 max-w-4xl mx-auto">

              {/* ── Admin List ──────────────────────────────────── */}
              <div className="glass-card quantum-card quantum-card rounded-[2rem] p-6">
                <div className="flex items-center justify-between mb-5">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest">
                    <Users size={16} className="text-cyan-300"/> Wallet Admins
                    {adminList.length > 0 && (
                      <span className="text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                        {adminList.length}
                      </span>
                    )}
                  </h4>
                  <button
                    onClick={() => {
                      if (!accountAddress) return;
                      setIsLoadingPermissions(true);
                      setAdminList([]);
                      const provider = isDemo
                        ? new ethers.JsonRpcProvider('https://robinhood-rpc.publicnode.com')
                        : new ethers.BrowserProvider((window as any).ethereum);
                      const acct = new ethers.Contract(accountAddress, [
                        "function getWalletAdmins() view returns (address[])"
                      ], provider);
                      acct.getWalletAdmins()
                        .then((walletAdmins: string[]) => setAdminList([...walletAdmins]))
                        .catch(() => {})
                        .finally(() => setIsLoadingPermissions(false));
                    }}
                    className="text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    <RefreshCw size={14} className={isLoadingPermissions ? 'animate-spin' : ''} />
                  </button>
                </div>

                {isLoadingPermissions ? (
                  <div className="flex items-center gap-3 py-4 text-slate-400 text-xs">
                    <Loader2 size={14} className="animate-spin text-cyan-300" /> Loading wallet admins…
                  </div>
                ) : (
                  <div className="space-y-2">
                    {adminList.length === 0 ? (
                      <div className="text-xs text-slate-400 py-4 text-center">No wallet admins loaded — click refresh</div>
                    ) : adminList.map((wallet) => {
                      const isYou = wallet.toLowerCase() === user.address?.toLowerCase();
                      const isLast = adminList.length === 1;
                      return (
                        <div key={wallet} className="flex items-center justify-between p-4 rounded-2xl bg-black/30 border border-cyan-100/[0.11] group">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${isYou ? 'bg-teal-500/10 border-teal-500/20' : 'bg-cyan-500/10 border-cyan-500/20'}`}>
                              <UserCheck size={14} className={isYou ? 'text-teal-400' : 'text-cyan-300'} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                {isYou && (
                                  <span className="text-[9px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 px-1.5 py-0.5 rounded-full">YOU</span>
                                )}
                                <span className="text-[9px] font-bold bg-slate-800/60 text-slate-400 border border-cyan-100/[0.11] px-1.5 py-0.5 rounded-full">WALLET ADMIN</span>
                              </div>
                              <div className="text-[11px] font-mono leading-relaxed break-all">
                                <span className={isYou ? 'text-teal-200' : 'text-cyan-200'}>{wallet}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => copyAddr(wallet)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-[#0c1d30]/80 rounded-lg transition-all"
                              title="Copy wallet address"
                            >
                              {copiedAddr === wallet ? <Check size={13} className="text-teal-400" /> : <Copy size={13} />}
                            </button>
                            {!isLast ? (
                              <button
                                onClick={() => onSecureAction(
                                  `Enter your vault password to remove wallet ${wallet.slice(0,6)}…${wallet.slice(-4)} from admins`,
                                  (pw: string) => onRemoveAdmin(wallet, pw)
                                )}
                                disabled={loading}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-40"
                                title="Remove wallet admin"
                              >
                                <UserX size={13} />
                              </button>
                            ) : (
                              <span className="text-[9px] text-slate-400 px-2 py-0.5 border border-cyan-100/[0.11] rounded-full">last</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ERC-4337 Account address */}
                {accountAddress && (
                  <div className="mt-4 flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-cyan-100/[0.11]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                        <Zap size={14} className="text-sky-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">QuantumVault Account</div>
                        <div className="text-xs font-mono text-white">
                          <span className="text-sky-200">{accountAddress.slice(0,10)}</span>
                          <span className="text-slate-400">…</span>
                          <span className="text-sky-200">{accountAddress.slice(-8)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => copyAddr(accountAddress)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-[#0c1d30]/80 rounded-lg transition-all shrink-0"
                    >
                      {copiedAddr === accountAddress ? <Check size={13} className="text-teal-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                )}
              </div>

              {/* ── Add Wallet Admin ──────────────────────────────────── */}
              <div className="glass-card quantum-card quantum-card rounded-[2rem] p-6">
                <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <UserCheck size={16} className="text-teal-400" /> Add Wallet Admin
                </h4>
                <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                  Add another <span className="text-slate-300 font-bold">wallet address</span> to the authorized admin list.
                  That wallet can sign vault operations (no gas needed). Requires your current vault password to authorise.
                </p>
                <div className="space-y-2">
                  <input
                    value={addAdminAddr}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      setAddAdminAddr(v);
                      const valid = ethers.isAddress(v);
                      setAddAdminError(v && !valid ? 'Must be a valid 0x wallet address (20 bytes)' : undefined);
                    }}
                    placeholder="0x… wallet address to add as admin"
                    className={`w-full bg-black/30 border rounded-2xl px-4 py-3.5 text-xs font-mono text-white placeholder-slate-600 outline-none transition-all ${addAdminError ? 'border-red-500/40 focus:border-red-500/60' : 'border-cyan-100/[0.16] focus:border-teal-500/40'}`}
                  />
                  {addAdminError && (
                    <div className="text-[10px] text-red-400 flex items-center gap-1 pl-2 font-bold">
                      <AlertTriangle size={10} /> {addAdminError}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (!addAdminAddr || !ethers.isAddress(addAdminAddr)) return;
                      onSecureAction(
                        `Enter your vault password to add ${addAdminAddr.slice(0,6)}…${addAdminAddr.slice(-4)} as wallet admin`,
                        (pw: string) => onAddAdmin(addAdminAddr, pw).then(() => setAddAdminAddr(''))
                      );
                    }}
                    disabled={loading || !addAdminAddr || !!addAdminError}
                    className="w-full py-3.5 bg-teal-500/10 text-teal-400 border border-teal-500/30 rounded-2xl text-xs font-bold hover:bg-teal-500/20 active:scale-95 transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Plus size={14} /> Add Wallet Admin
                  </button>
                </div>
              </div>

              {/* ── Change Vault Password (rotate ECDSA signer) ────────────── */}
              <div className="glass-card quantum-card quantum-card rounded-[2rem] p-6">
                <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <KeyRound size={16} className="text-orange-400" /> Change Vault Password
                </h4>
                <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                  Derives a new WOTS+ Merkle tree from your new password and rotates the on-chain signing root.
                  You will need to enter your <span className="text-slate-300 font-bold">current password</span> to authorise the change.
                </p>
                <div className="space-y-2">
                  <input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="New password"
                    className="w-full bg-black/30 border border-cyan-100/[0.16] rounded-2xl px-4 py-3.5 text-xs text-white placeholder-slate-600 outline-none focus:border-orange-500/40 transition-all"
                  />
                  <input
                    type="password"
                    value={newPwConfirm}
                    onChange={(e) => setNewPwConfirm(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-black/30 border border-cyan-100/[0.16] rounded-2xl px-4 py-3.5 text-xs text-white placeholder-slate-600 outline-none focus:border-orange-500/40 transition-all"
                  />
                  {newPw && newPwConfirm && newPw !== newPwConfirm && (
                    <div className="text-[10px] text-red-400 flex items-center gap-1 pl-2 font-bold">
                      <AlertTriangle size={10} /> Passwords do not match
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (!newPw || newPw !== newPwConfirm) return;
                      onSecureAction('Enter your CURRENT vault password to authorise key rotation', (currentPw: string) => onRotateEcdsaSigner(newPw, currentPw));
                    }}
                    disabled={loading || !newPw || newPw !== newPwConfirm}
                    className="w-full py-3.5 bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-2xl text-xs font-bold hover:bg-orange-500/20 active:scale-95 transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Rotate Signing Key
                  </button>
                </div>
              </div>

           </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;