
import React from 'react';
import Modal from './Modal';
import { ArrowDownToLine, Wallet, Activity, ShieldCheck, AlertTriangle, ArrowRightLeft, Lock, Cpu, Fingerprint } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface DepositConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: string;
  symbol: string;
  isCustom: boolean;
  loading: boolean;
}

export const DepositConfirmModal: React.FC<DepositConfirmModalProps> = ({
  isOpen, onClose, onConfirm, amount, symbol, isCustom, loading
}) => {
  const { t } = useLanguage();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('deposit.title')}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-teal-500/10 to-teal-500/5 rounded-2xl border border-teal-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
          <span className="text-teal-400 text-[10px] font-bold uppercase tracking-widest mb-2">{t('deposit.amount')}</span>
          <div className="text-4xl font-mono font-bold text-white mb-1 drop-shadow-sm">{amount}</div>
          <div className="text-sm font-bold text-teal-200 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">{symbol}</div>
        </div>

        <div className="bg-[#0b1424] p-5 rounded-2xl border border-cyan-100/[0.11] space-y-4">
          <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider border-b border-cyan-100/[0.11] pb-2">
            <Activity size={14} /> {t('deposit.principle.title')}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
             {t('deposit.principle.desc')}
          </p>
        </div>

        {isCustom && (
           <div className="flex items-start gap-3 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
             <AlertTriangle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
             <p className="text-xs text-yellow-200/80 leading-relaxed font-medium">
               {t('deposit.warn_custom')}
             </p>
           </div>
        )}

        <div className="flex gap-3 mt-2">
          <button onClick={onClose} disabled={loading} className="flex-1 h-12 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-800 transition-colors">{t('btn.cancel')}</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 h-12 rounded-xl bg-gradient-to-r from-teal-600 to-teal-600 text-white font-bold shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('btn.processing')}</> : <><ArrowDownToLine size={18} /> {t('btn.confirm')}</>}
          </button>
        </div>
      </div>
    </Modal>
  );
};

interface WithdrawConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: string;
  symbol: string;
  toAddress: string;
  loading: boolean;
}

export const WithdrawConfirmModal: React.FC<WithdrawConfirmModalProps> = ({
  isOpen, onClose, onConfirm, amount, symbol, toAddress, loading
}) => {
  const { t } = useLanguage();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('withdraw.title')}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-cyan-500/10 to-sky-500/5 rounded-2xl border border-cyan-500/20 relative overflow-hidden">
           <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>
           <div className="text-3xl font-mono font-bold text-white mb-1">{amount} <span className="text-lg text-cyan-200">{symbol}</span></div>
           <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-2 bg-black/20 px-3 py-1.5 rounded-lg border border-cyan-100/[0.11]">
              <span>To:</span>
              <span className="font-mono text-slate-200">{toAddress.slice(0,6)}...{toAddress.slice(-4)}</span>
           </div>
        </div>

        {/* 2FA Operation Principle Visualization */}
        <div className="bg-[#0b1424] p-5 rounded-2xl border border-cyan-100/[0.11]">
          <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider mb-4">
            <Cpu size={14} /> {t('withdraw.principle.title')}
          </div>
          
          <div className="relative pl-4 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-cyan-500/50 before:to-transparent">
             {/* Step 1 */}
             <div className="relative">
                <div className="absolute -left-4 top-0 w-6 h-6 rounded-full bg-[#101c2e] border border-cyan-500 flex items-center justify-center text-[10px] font-bold text-cyan-300 z-10 shadow-lg shadow-cyan-900/50">1</div>
                <div className="pl-4">
                   <h5 className="text-white text-xs font-bold flex items-center gap-2">{t('landing.process.step1')} <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200 text-[9px] border border-cyan-500/20">Local Encrypt</span></h5>
                   <p className="text-[10px] text-slate-400 mt-1 leading-relaxed font-medium">
                      {t('landing.process.desc1')}
                   </p>
                </div>
             </div>

             {/* Step 2 */}
             <div className="relative">
                <div className="absolute -left-4 top-0 w-6 h-6 rounded-full bg-[#101c2e] border border-cyan-500 flex items-center justify-center text-[10px] font-bold text-cyan-300 z-10 shadow-lg shadow-cyan-900/50">2</div>
                <div className="pl-4">
                   <h5 className="text-white text-xs font-bold flex items-center gap-2">{t('landing.process.step3')} <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200 text-[9px] border border-cyan-500/20">Contract</span></h5>
                   <p className="text-[10px] text-slate-400 mt-1 leading-relaxed font-medium">
                      {t('landing.process.desc3')}
                   </p>
                </div>
             </div>
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <button onClick={onClose} disabled={loading} className="flex-1 h-12 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-800 transition-colors">{t('btn.cancel')}</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 h-12 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 text-white font-bold shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
             <Fingerprint size={18} />
             {t('btn.next')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
