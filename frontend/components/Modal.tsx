
import React, { Fragment } from 'react';
import { X } from './Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl transition-opacity duration-300" 
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-[#0b1424]/90 border border-cyan-100/[0.16] shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all animate-fade-in-up max-h-[88dvh] flex flex-col">
        {/* Decorative top sheen */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-cyan-500/0 opacity-50"></div>
        
        <div className="flex items-center justify-between border-b border-cyan-100/[0.11] px-6 py-5 shrink-0">
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            {title}
          </h3>
          <button 
            onClick={onClose} 
            className="rounded-full p-2 text-slate-400 hover:bg-[#0c1d30]/80 hover:text-white transition-colors active:scale-90"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
