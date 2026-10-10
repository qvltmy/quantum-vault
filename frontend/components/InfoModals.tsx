
import React from 'react';
import Modal from './Modal';
import { 
  Database, ShieldCheck, Clock, AlertTriangle, Fingerprint, Lock, 
  KeyRound, Server, ArrowRight, Cpu, Zap, Users, Globe, Layers, 
  FileCode, Smartphone, Wallet, CheckCircle2 
} from './Icons';
import { useLanguage } from '../contexts/LanguageContext';

export const GuideModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('modal.guide.title')}>
      <div className="flex flex-col gap-6 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
        
        {/* Section 1: Visual Comparison */}
        <div>
           <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              <Database size={14} /> {t('info.smart_vs_wallet')}
           </h4>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Standard Wallet */}
              <div className="p-4 rounded-2xl bg-[#0c1d30]/80 border border-cyan-100/[0.11] flex flex-col items-center text-center opacity-70 hover:opacity-100 transition-opacity">
                 <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3 text-slate-400">
                    <Wallet size={20} />
                 </div>
                 <h5 className="text-white text-xs font-bold mb-1">{t('guide.wallet_std')}</h5>
                 <div className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/10 mb-2">
                    <AlertTriangle size={10} /> {t('guide.tag_failure')}
                 </div>
                 <p className="text-[10px] text-slate-400 leading-tight">{t('guide.desc_failure')}</p>
              </div>

              {/* Quantum Vault */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-cyan-900/40 to-cyan-900/10 border border-cyan-500/40 flex flex-col items-center text-center relative overflow-hidden shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                 <div className="absolute inset-0 bg-cyan-500/5 animate-pulse-slow"></div>
                 <div className="w-12 h-12 rounded-full bg-cyan-600 flex items-center justify-center mb-3 text-white shadow-lg shadow-cyan-500/40 z-10">
                    <ShieldCheck size={20} />
                 </div>
                 <h5 className="text-white text-xs font-bold mb-1 relative z-10">{t('guide.vault_name')}</h5>
                 <div className="flex items-center gap-1 text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/10 mb-2 relative z-10">
                    <CheckCircle2 size={10} /> {t('guide.tag_secure')}
                 </div>
                 <p className="text-[10px] text-cyan-200/70 leading-tight relative z-10">{t('guide.desc_secure')}</p>
              </div>
           </div>
        </div>

        {/* Section 2: Multi-Sig Comparison (Optimized for Mobile) */}
        <div className="mt-2">
           <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">{t('info.multisig_comp')}</span>
              <div className="h-px flex-1 bg-cyan-100/[0.07]"></div>
           </div>
           
           <div className="grid gap-3">
              <div className="flex gap-4 p-4 rounded-2xl bg-[#0c1d30]/80 border border-cyan-100/[0.11] items-start">
                 <div className="p-2.5 rounded-xl bg-slate-800/80 text-slate-400 shrink-0">
                    <Users size={18} />
                 </div>
                 <div>
                    <div className="text-xs font-bold text-slate-300 mb-1">{t('guide.multisig.traditional')}</div>
                    <div className="text-[10px] text-slate-400 leading-relaxed font-medium">{t('guide.multisig.traditional_desc')}</div>
                 </div>
              </div>

              <div className="flex gap-4 p-4 rounded-2xl bg-gradient-to-br from-sky-500/10 to-fuchsia-500/5 border border-sky-500/20 items-start relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-20 h-20 bg-sky-500/10 rounded-full blur-xl -mr-10 -mt-10 pointer-events-none"></div>
                 <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-200 shrink-0 relative z-10 shadow-inner">
                    <ShieldCheck size={18} />
                 </div>
                 <div className="relative z-10">
                    <div className="text-xs font-bold text-sky-200 mb-1">{t('guide.multisig.swiftsafe')}</div>
                    <div className="text-[10px] text-sky-200/70 leading-relaxed font-medium">{t('guide.multisig.swiftsafe_desc')}</div>
                 </div>
              </div>
           </div>
        </div>

        {/* Section 3: Execution Flow */}
        <div>
          <h4 className="flex items-center gap-2 text-teal-400 font-bold mb-4 text-xs uppercase tracking-widest pl-1">
            <Zap size={14} />
            {t('nav.principle')}
          </h4>
          
          {/* Vertical Timeline */}
          <div className="relative space-y-0 pl-4 border-l-2 border-slate-800 ml-3">
            {/* Step 1 */}
            <div className="relative pb-8 pl-8 group">
               {/* Timeline Dot */}
               <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#0b1424] border-2 border-cyan-500 flex items-center justify-center z-10 group-hover:scale-125 transition-transform shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                 <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></div>
               </div>
               
               <div className="bg-[#0b1424] p-4 rounded-xl border border-cyan-100/[0.16] group-hover:border-cyan-500/30 transition-colors shadow-lg">
                  <div className="flex justify-between items-start mb-2">
                     <h5 className="text-white font-bold text-xs flex items-center gap-2">
                        <Cpu size={14} className="text-cyan-300" />
                        {t('landing.process.step1')}
                     </h5>
                     <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono border border-cyan-100/[0.11]">{t('guide.step_local')}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{t('landing.process.desc1')}</p>
               </div>
            </div>
            
            {/* Step 2 */}
            <div className="relative pb-8 pl-8 group">
               <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#0b1424] border-2 border-sky-500 flex items-center justify-center z-10 group-hover:scale-125 transition-transform shadow-[0_0_10px_rgba(139,92,246,0.5)]">
                 <div className="w-1.5 h-1.5 bg-sky-500 rounded-full"></div>
               </div>
               
               <div className="bg-[#0b1424] p-4 rounded-xl border border-cyan-100/[0.16] group-hover:border-sky-500/30 transition-colors shadow-lg">
                  <div className="flex justify-between items-start mb-2">
                     <h5 className="text-white font-bold text-xs flex items-center gap-2">
                        <Lock size={14} className="text-sky-400" />
                        {t('landing.process.step2')}
                     </h5>
                     <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono border border-cyan-100/[0.11]">{t('guide.step_sig')}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{t('landing.process.desc2')}</p>
               </div>
            </div>

            {/* Step 3 */}
            <div className="relative pl-8 group">
               <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#0b1424] border-2 border-teal-500 flex items-center justify-center z-10 group-hover:scale-125 transition-transform shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                 <div className="w-1.5 h-1.5 bg-teal-500 rounded-full"></div>
               </div>
               
               <div className="bg-[#0b1424] p-4 rounded-xl border border-cyan-100/[0.16] group-hover:border-teal-500/30 transition-colors shadow-lg">
                  <div className="flex justify-between items-start mb-2">
                     <h5 className="text-white font-bold text-xs flex items-center gap-2">
                        <ShieldCheck size={14} className="text-teal-400" />
                        {t('landing.process.step3')}
                     </h5>
                     <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono border border-cyan-100/[0.11]">{t('guide.step_chain')}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{t('landing.process.desc3')}</p>
               </div>
            </div>
          </div>
        </div>
        
        <div className="pt-2 sticky bottom-0">
           <button onClick={onClose} className="w-full py-4 bg-gradient-to-r from-cyan-600 to-cyan-600 hover:from-cyan-500 hover:to-cyan-500 text-white rounded-xl font-bold transition-all text-sm shadow-lg shadow-cyan-900/30 active:scale-[0.98] flex items-center justify-center gap-2 group ring-1 ring-white/10">
              {t('btn.understand')} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
           </button>
        </div>
      </div>
    </Modal>
  );
};

export const PrivacyModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('modal.privacy.title')}>
      <div className="flex flex-col gap-5 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
        
        <div className="text-xs text-slate-300 leading-relaxed bg-cyan-900/10 p-4 rounded-xl border border-cyan-500/20 shadow-inner flex gap-3">
          <ShieldCheck size={20} className="text-cyan-300 shrink-0 mt-0.5" />
          <p>{t('info.privacy_intro')}</p>
        </div>
        
        <div className="space-y-4">
           <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
             <Layers size={14} /> {t('privacy.arch_title')}
           </h4>

           {/* Layer 1: Client Side */}
           <div className="group relative bg-[#0b1424] rounded-2xl p-5 border border-cyan-100/[0.11] hover:border-cyan-500/30 transition-all">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 to-cyan-600 rounded-l-2xl"></div>
              <div className="flex justify-between items-start mb-2">
                 <div className="flex items-center gap-2">
                    <Smartphone size={16} className="text-cyan-300" />
                    <span className="text-sm font-bold text-white">{t('privacy.layer_client')}</span>
                 </div>
                 <span className="text-[9px] font-mono text-teal-400 bg-teal-900/20 px-2 py-0.5 rounded border border-teal-500/20">{t('privacy.tag_zk')}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pl-6 border-l border-cyan-100/[0.11] ml-2">
                 {t('privacy.desc_client')}
              </p>
           </div>

           {/* Layer 2: Protocol Side */}
           <div className="group relative bg-[#0b1424] rounded-2xl p-5 border border-cyan-100/[0.11] hover:border-sky-500/30 transition-all">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sky-500 to-teal-300 rounded-l-2xl"></div>
              <div className="flex justify-between items-start mb-2">
                 <div className="flex items-center gap-2">
                    <Globe size={16} className="text-sky-400" />
                    <span className="text-sm font-bold text-white">{t('privacy.layer_proto')}</span>
                 </div>
                 <span className="text-[9px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-cyan-100/[0.11]">{t('privacy.tag_agnostic')}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pl-6 border-l border-cyan-100/[0.11] ml-2">
                 {t('privacy.desc_proto')}
              </p>
           </div>

           {/* Layer 3: Contract Side */}
           <div className="group relative bg-[#0b1424] rounded-2xl p-5 border border-cyan-100/[0.11] hover:border-teal-500/30 transition-all">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-500 to-teal-600 rounded-l-2xl"></div>
              <div className="flex justify-between items-start mb-2">
                 <div className="flex items-center gap-2">
                    <FileCode size={16} className="text-teal-400" />
                    <span className="text-sm font-bold text-white">{t('privacy.layer_contract')}</span>
                 </div>
                 <span className="text-[9px] font-mono text-cyan-300 bg-cyan-900/20 px-2 py-0.5 rounded border border-cyan-500/20">{t('privacy.tag_immutable')}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pl-6 border-l border-cyan-100/[0.11] ml-2">
                 {t('privacy.desc_contract')}
              </p>
           </div>
        </div>

        <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl flex gap-3 items-start mt-2">
           <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
           <p className="text-[10px] text-red-300/80 leading-relaxed font-medium">
             {t('info.privacy_tip')}
           </p>
        </div>
        
        <div className="pt-2 sticky bottom-0">
           <button onClick={onClose} className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 border border-cyan-100/[0.16] text-white rounded-xl font-bold transition-all text-sm active:scale-95 shadow-lg">
              {t('btn.understand')}
           </button>
        </div>
      </div>
    </Modal>
  );
};
