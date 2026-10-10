
import React from 'react';
import { Github, Twitter, Globe, QuantumVaultLogo, Fingerprint, Lock, ShieldCheck, Cpu, Code } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';

const Footer: React.FC = () => {
  const { t } = useLanguage();
  return (
    <footer className="relative bg-[#050914] border-t border-cyan-100/[0.11] pt-16 pb-8 overflow-hidden">
      {/* Background Ambient Grid */}
      <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="flex flex-col md:flex-row gap-10 lg:gap-20">
          
          {/* Brand & Short Description */}
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-3">
               <QuantumVaultLogo size={32} className="text-cyan-500 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
               <div>
                  <h3 className="text-lg font-bold text-white leading-none tracking-tight">Quantum Vault</h3>
                  <span className="text-[11px] text-cyan-300 font-mono tracking-[0.2em] uppercase">Protocol</span>
               </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md font-medium">
              {t('footer.about')}
            </p>
            <div className="flex gap-4">
              <SocialLink href="https://github.com/qvltmy" icon={<Github size={18} />} label="GitHub" />
              <SocialLink href="https://x.com/QuantumVaultmy" icon={<Twitter size={18} />} label="Twitter" />
              <SocialLink href="#" icon={<Globe size={18} />} label="Website" />
            </div>
          </div>
          
          {/* High-End Tech Specs Grid */}
          <div className="flex-1 lg:flex-none lg:w-[480px]">
             <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-1 h-1 bg-teal-500 rounded-full animate-pulse"></div>
                System Specs
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-cyan-100/[0.07] rounded-2xl overflow-hidden border border-cyan-100/[0.16] shadow-2xl">
                <TechSpecCell 
                   icon={<Fingerprint size={20}/>}
                   title={t('footer.benefit.1.title')}
                   desc={t('footer.benefit.1.desc')}
                   accent="group-hover:bg-cyan-500/50"
                />
                <TechSpecCell 
                   icon={<Code size={20}/>}
                   title={t('footer.benefit.2.title')}
                   desc={t('footer.benefit.2.desc')}
                   accent="group-hover:bg-teal-500/50"
                />
                <TechSpecCell 
                   icon={<ShieldCheck size={20}/>}
                   title={t('footer.benefit.3.title')}
                   desc={t('footer.benefit.3.desc')}
                   accent="group-hover:bg-cyan-500/50"
                />
             </div>
          </div>
        </div>
        
        <div className="border-t border-cyan-100/[0.11] mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-400 font-mono">© 2026 Quantum Vault. {t('footer.rights')}</p>
          <div className="flex items-center gap-2 text-xs text-teal-400/80 font-mono font-bold bg-teal-900/10 px-3 py-1 rounded-full border border-teal-500/10">
             <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_8px_#10b981]"></div>
             {t('footer.system_ok')}
          </div>
        </div>
      </div>
    </footer>
  );
};

const SocialLink = ({ href, icon, label }: { href: string, icon: React.ReactNode, label?: string }) => (
  <a 
    href={href}
    target={href.startsWith('http') ? '_blank' : undefined}
    rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
    aria-label={label}
    className="w-9 h-9 rounded-lg bg-[#0c1d30]/80 flex items-center justify-center text-slate-400 hover:text-white hover:bg-cyan-100/[0.07] transition-all border border-cyan-100/[0.11] hover:border-white/20 active:scale-95"
  >
    {icon}
  </a>
);

const TechSpecCell = ({ icon, title, desc, accent }: { icon: React.ReactNode, title: string, desc: string, accent: string }) => (
  <div className="bg-[#0b1424] p-5 hover:bg-[#10182e] transition-colors relative group h-full flex flex-col justify-between">
     {/* Top Glow Bar */}
     <div className={`absolute top-0 left-0 w-full h-[2px] bg-transparent ${accent} transition-colors duration-500`}></div>
     
     <div className="text-slate-400 group-hover:text-white transition-colors mb-3">
        {icon}
     </div>
     <div>
        <h5 className="text-xs font-bold text-slate-200 mb-1 tracking-tight">{title}</h5>
        <p className="text-[11px] text-slate-400 leading-tight font-medium group-hover:text-slate-400 transition-colors">{desc}</p>
     </div>
  </div>
);

export default Footer;
