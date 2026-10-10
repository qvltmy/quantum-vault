
import React, { useState } from 'react';
import Modal from './Modal';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  title?: string;
  description?: string;
  isLoading?: boolean;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description,
  isLoading = false
}) => {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      onConfirm(password);
      setPassword(""); // Clear after submit attempt
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || t('modal.pw.title')}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-start gap-3 bg-cyan-500/10 p-3 rounded-lg border border-cyan-500/20">
          <KeyRound className="text-cyan-300 shrink-0 mt-0.5" size={18} />
          <p className="text-sm text-cyan-100/80 leading-relaxed">{description || t('modal.pw.desc')}</p>
        </div>

        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('modal.pw.input')}
            className="w-full h-12 rounded-xl bg-slate-900/50 border border-slate-600 px-4 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all font-mono"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white transition-colors"
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-800 transition-colors"
            disabled={isLoading}
          >
            {t('btn.cancel')}
          </button>
          <button
            type="submit"
            className="flex-1 h-11 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-600 text-white font-medium hover:shadow-lg hover:shadow-cyan-500/25 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            disabled={!password || isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                {t('modal.pw.verifying')}
              </>
            ) : (
              t('btn.confirm')
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PasswordModal;
