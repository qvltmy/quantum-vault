
import React, { useId } from 'react';
import { 
  ShieldCheck, 
  Wallet, 
  ArrowRightLeft, 
  ArrowDownToLine, 
  Settings, 
  Info, 
  Copy, 
  ExternalLink, 
  Power, 
  RefreshCw, 
  Plus, 
  Trash2, 
  KeyRound, 
  Lock, 
  Menu, 
  X, 
  ChevronRight, 
  ChevronDown, 
  CheckCircle2, 
  Globe, 
  FileText, 
  LogOut, 
  AlertTriangle, 
  Github, 
  Twitter, 
  Cpu, 
  Server, 
  HelpCircle, 
  Shield, 
  Eye, 
  EyeOff, 
  Coins, 
  Users, 
  Database, 
  Smartphone, 
  CreditCard, 
  LayoutGrid, 
  ArrowRight, 
  BookOpen, 
  Zap, 
  Fingerprint, 
  Search, 
  History, 
  Clock, 
  Download, 
  Code,
  XCircle,
  Minus,
  Lightbulb,
  Layers,
  FileCode,
  Radio,
  Loader2,
  Activity
} from 'lucide-react';

export const QuantumVaultLogo = ({ size = 32, className = "" }: { size?: number, className?: string }) => {
  const grad = "qv-grad";
  const core = "qv-core";
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} role="img" aria-label="Quantum Vault">
      <defs>
        <linearGradient id={grad} x1="5" y1="4" x2="35" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A5F3FC"/><stop offset=".52" stopColor="#22D3EE"/><stop offset="1" stopColor="#2DD4BF"/>
        </linearGradient>
        <radialGradient id={core} cx="0" cy="0" r="1" gradientTransform="translate(20 20) rotate(90) scale(15)" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22D3EE" stopOpacity=".18"/><stop offset="1" stopColor="#22D3EE" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="18.4" fill={`url(#${core})`}/>
      <path d="M20 2.8 35.1 11.4v17.2L20 37.2 4.9 28.6V11.4L20 2.8Z" fill="#071522" fillOpacity=".72" stroke={`url(#${grad})`} strokeWidth="1.65" strokeLinejoin="round"/>
      <path d="M20 6.1 32.2 13v14L20 33.9 7.8 27V13L20 6.1Z" stroke="#A5F3FC" strokeOpacity=".28" strokeWidth=".8" strokeLinejoin="round"/>
      <path d="M20 10v5.4l6.1 3.5v5.2M20 30v-5.4l-6.1-3.5v-5.2" stroke={`url(#${grad})`} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20 17.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z" fill="#E6FCFF" stroke="#22D3EE" strokeWidth=".85"/>
      <ellipse cx="20" cy="20" rx="13.2" ry="4.6" transform="rotate(-32 20 20)" stroke={`url(#${grad})`} strokeOpacity=".48" strokeWidth=".65"/>
    </svg>
  );
};

export {
  ShieldCheck,
  Wallet,
  ArrowRightLeft,
  ArrowDownToLine,
  Settings,
  Info,
  Copy,
  ExternalLink,
  Power,
  RefreshCw,
  Plus,
  Trash2,
  KeyRound,
  Lock,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Globe,
  FileText,
  LogOut,
  AlertTriangle,
  Github,
  Twitter,
  Cpu,
  Server,
  HelpCircle,
  Shield,
  Eye,
  EyeOff,
  Coins,
  Users,
  Database,
  Smartphone,
  CreditCard,
  LayoutGrid,
  ArrowRight,
  BookOpen,
  Zap,
  Fingerprint,
  Search,
  History,
  Clock,
  Download,
  Code,
  XCircle,
  Minus,
  Lightbulb,
  Layers,
  FileCode,
  Radio,
  Loader2,
  Activity
};
