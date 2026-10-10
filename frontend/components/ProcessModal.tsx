
import React from 'react';
import { Cpu, Wallet, Radio, CheckCircle2, AlertTriangle, Loader2, Lock, ArrowRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export type ProcessStep = 'idle' | 'hashing' | 'signing' | 'broadcasting' | 'confirming' | 'success' | 'error';

interface ProcessModalProps {
  isOpen: boolean;
  step: ProcessStep;
  title: string;
  txHash?: string | null;
  explorerUrl?: string;
  errorMsg?: string;
  onClose: () => void;
  skipHashing?: boolean;
  successMsg?: string; // New prop for specific success feedback
}

const ProcessModal: React.FC<ProcessModalProps> = ({ 
  isOpen, 
  step, 
  title, 
  txHash, 
  explorerUrl, 
  errorMsg, 
  onClose,
  skipHashing = false,
  successMsg
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const isError = step === 'error';
  const isSuccess = step === 'success';

  const allSteps = [
    { id: 'hashing', label: t('modal.process.hashing'), desc: t('modal.process.hashing_desc'), icon: Cpu },
    { id: 'signing', label: t('modal.process.signing'), desc: t('modal.process.signing_desc'), icon: Wallet },
    { id: 'broadcasting', label: t('modal.process.broadcasting'), desc: t('modal.process.broadcasting_desc'), icon: Radio },
    { id: 'confirming', label: t('modal.process.confirming'), desc: t('modal.process.confirming_desc'), icon: Lock },
  ];

  // Filter steps based on skipHashing prop
  const activeSteps = skipHashing ? allSteps.filter(s => s.id !== 'hashing') : allSteps;

  const getCurrentStepIndex = () => {
    if (step === 'success') return activeSteps.length;
    if (step === 'error') return -1;
    return activeSteps.findIndex(s => s.id === step);
  };

  const currentIndex = getCurrentStepIndex();

  const handleBackdropClick = () => {
    // Only allow closing via backdrop if the process is finished (success or error)
    if (isSuccess || isError) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fade-in">
      <div 
        className={`absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity ${isSuccess || isError ? 'cursor-pointer' : ''}`} 
        onClick={handleBackdropClick}
      />
      
      <div 
        className="relative w-full sm:max-w-md quantum-card bg-[#0b1424] border border-cyan-300/25 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-cyan-900/20 to-transparent pointer-events-none" />
        {/* Mobile drag handle */}
        <div className="sm:hidden w-10 h-1 bg-slate-600 rounded-full mx-auto mt-3 mb-1 shrink-0" />
        
        <div className="relative p-5 sm:p-8 overflow-y-auto flex-1">
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold text-white mb-2">{isError ? t('modal.process.failed') : isSuccess ? t('modal.process.success') : title}</h3>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest bg-slate-800/50 py-1 px-3 rounded-full inline-block border border-cyan-100/[0.11]">
              {isError ? t('modal.process.failed_desc') : isSuccess ? (successMsg || t('modal.process.success_desc')) : t('modal.process.subtitle')}
            </p>
          </div>

          <div className="space-y-6 relative">
             {/* Progress Line */}
            <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-slate-800" />
            
            {activeSteps.map((s, idx) => {
              const isActive = currentIndex === idx;
              const isCompleted = currentIndex > idx;
              const Icon = s.icon;

              return (
                <div key={s.id} className={`relative flex items-center gap-4 transition-all duration-500 ${isActive || isCompleted ? 'opacity-100' : 'opacity-40'}`}>
                  <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 shrink-0
                    ${isCompleted 
                      ? 'bg-teal-500 border-teal-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                      : isActive 
                        ? 'bg-[#0b1424] border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(99,102,241,0.4)]' 
                        : 'bg-[#0b1424] border-slate-700 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 size={18} /> : isActive && !isError ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-bold transition-colors ${isActive || isCompleted ? 'text-white' : 'text-slate-400'}`}>
                      {s.label}
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5 font-medium">{s.desc}</p>
                    {s.id === 'confirming' && isActive && txHash && explorerUrl && (
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-cyan-300/60 hover:text-cyan-200 underline decoration-cyan-500/30 font-mono flex items-center gap-1 mt-1"
                      >
                        Track on explorer <ArrowRight size={9} />
                      </a>
                    )}
                  </div>
                  {isActive && !isError && (
                    <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_#6366f1]" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Result States */}
          {isSuccess && (
            <div className="mt-8 p-4 bg-teal-500/10 border border-teal-500/20 rounded-xl text-center animate-fade-in">
              <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-teal-500/30">
                <CheckCircle2 size={24} className="text-white" />
              </div>
              <p className="text-teal-400 font-bold text-sm mb-1">{successMsg || t('modal.process.success_desc')}</p>
              {explorerUrl && (
                <a 
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-teal-200/70 hover:text-white underline decoration-emerald-500/30 font-mono flex items-center justify-center gap-1 mt-1 cursor-pointer"
                >
                  {t('btn.view_explorer')} <ArrowRight size={10} />
                </a>
              )}
              <button onClick={onClose} className="mt-4 w-full py-3 bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg active:scale-95">
                {t('btn.close')}
              </button>
            </div>
          )}

          {isError && (
            <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center animate-fade-in">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-red-500/30">
                <AlertTriangle size={24} className="text-white" />
              </div>
              <p className="text-red-400 font-bold text-sm mb-1">{t('modal.process.failed_desc')}</p>
              <div className="text-xs text-red-300/70 leading-relaxed mb-3 font-mono bg-black/20 p-2 rounded max-h-28 overflow-y-auto break-words text-left">
                {errorMsg || "Unknown Error"}
              </div>
              {txHash && explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-amber-300/80 hover:text-amber-200 underline decoration-amber-500/30 font-mono flex items-center justify-center gap-1 mb-3"
                >
                  Tx submitted — view on explorer <ArrowRight size={10} />
                </a>
              )}
              <button onClick={onClose} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-lg transition-colors border border-cyan-100/[0.16] active:scale-95">
                {t('btn.close')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcessModal;
