import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Cpu, Lock, KeyRound, Zap, Server, Code, Globe,
  ChevronRight, AlertTriangle, CheckCircle2, ArrowRight, Layers,
  FileCode, Database, Fingerprint, Activity, BookOpen, ExternalLink,
  Radio, Lightbulb, GitBranch, RefreshCw
} from 'lucide-react';

// ─── Section IDs ─────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'overview',       label: 'Overview',               icon: BookOpen },
  { id: 'threat-model',   label: 'Quantum Threat Model',   icon: AlertTriangle },
  { id: 'wots-plus',      label: 'WOTS+ Signatures',       icon: Fingerprint },
  { id: 'merkle-tree',    label: 'Merkle Key Tree',        icon: GitBranch },
  { id: 'architecture',   label: 'System Architecture',    icon: Layers },
  { id: 'erc4337',        label: 'ERC-4337 Integration',   icon: Zap },
  { id: 'direct-execute', label: 'Direct Execution',       icon: Radio },
  { id: 'contracts',      label: 'Smart Contracts',        icon: FileCode },
  { id: 'key-derivation', label: 'Key Derivation',         icon: KeyRound },
  { id: 'key-rotation',   label: 'Key Rotation & Recovery',icon: RefreshCw },
  { id: 'security',       label: 'Security Model',         icon: ShieldCheck },
  { id: 'tech-stack',     label: 'Tech Stack',             icon: Code },
];

// ─── Helper sub-components ────────────────────────────────────────────────────

const SectionTitle: React.FC<{ id: string; icon: React.ElementType; title: string; subtitle?: string }> = ({ id, icon: Icon, title, subtitle }) => (
  <div id={id} className="mb-8 scroll-mt-24">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-300 shrink-0">
        <Icon size={18} />
      </div>
      <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
    </div>
    {subtitle && <p className="text-slate-400 text-sm leading-relaxed ml-12">{subtitle}</p>}
    <div className="mt-4 ml-12 h-px bg-gradient-to-r from-cyan-500/30 to-transparent" />
  </div>
);

const InfoBox: React.FC<{ type?: 'info' | 'warning' | 'success'; children: React.ReactNode }> = ({ type = 'info', children }) => {
  const styles = {
    info:    'bg-cyan-500/5 border-cyan-500/20 text-cyan-200',
    warning: 'bg-amber-500/5 border-amber-500/20 text-amber-200',
    success: 'bg-teal-500/5 border-teal-500/20 text-teal-200',
  };
  const icons = {
    info:    <Lightbulb size={15} className="text-cyan-300 shrink-0 mt-0.5" />,
    warning: <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />,
    success: <CheckCircle2 size={15} className="text-teal-400 shrink-0 mt-0.5" />,
  };
  return (
    <div className={`flex gap-3 p-4 rounded-xl border text-sm leading-relaxed ${styles[type]} mb-6`}>
      {icons[type]}
      <div>{children}</div>
    </div>
  );
};

const CodeBlock: React.FC<{ code: string; lang?: string }> = ({ code, lang = '' }) => (
  <div className="mb-6 rounded-xl overflow-hidden border border-cyan-100/[0.11] shadow-lg">
    {lang && (
      <div className="px-4 py-2 bg-slate-800/80 border-b border-cyan-100/[0.11] flex items-center justify-between">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest">{lang}</span>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
        </div>
      </div>
    )}
    <pre className="bg-[#08101d] p-5 overflow-x-auto text-xs font-mono leading-relaxed text-slate-300 custom-scrollbar">
      <code>{code.trim()}</code>
    </pre>
  </div>
);

const StepCard: React.FC<{ step: string; title: string; desc: string; color?: string }> = ({ step, title, desc, color = 'cyan' }) => {
  const colors: Record<string, string> = {
    cyan: 'border-cyan-500/30 bg-cyan-500/5 text-cyan-300',
    sky: 'border-sky-500/30 bg-sky-500/5 text-sky-400',
    emerald: 'border-teal-500/30 bg-teal-500/5 text-teal-400',
    amber:  'border-amber-500/30 bg-amber-500/5 text-amber-400',
  };
  return (
    <div className="flex gap-4 mb-4">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-sm font-bold shrink-0 ${colors[color]}`}>
        {step}
      </div>
      <div className="pt-1">
        <div className="text-sm font-bold text-white mb-1">{title}</div>
        <div className="text-sm text-slate-400 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
};

const PropRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className={`flex items-start justify-between gap-4 py-3 border-b border-cyan-100/[0.11] last:border-0 ${highlight ? 'bg-cyan-500/5 -mx-4 px-4 rounded-lg' : ''}`}>
    <span className="text-sm text-slate-400 shrink-0 font-medium">{label}</span>
    <span className="text-sm text-white font-mono text-right">{value}</span>
  </div>
);

const CompareRow: React.FC<{ feature: string; classical: string; wots: string; classicalBad?: boolean }> = ({ feature, classical, wots, classicalBad }) => (
  <div className="grid grid-cols-3 gap-px bg-[#0c1d30]/80">
    <div className="bg-[#0b1424] px-4 py-3 text-sm font-medium text-slate-300">{feature}</div>
    <div className={`bg-[#0b1424] px-4 py-3 text-sm ${classicalBad ? 'text-red-400' : 'text-slate-400'}`}>{classical}</div>
    <div className="bg-cyan-500/5 px-4 py-3 text-sm text-teal-400 font-medium">{wots}</div>
  </div>
);

// ─── Main Docs Component ──────────────────────────────────────────────────────

const Docs: React.FC = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          const topEntry = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b
          );
          setActiveSection(topEntry.target.id);
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );

    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#050914] text-slate-200">
      {/* Page Header */}
      <div className="border-b border-cyan-100/[0.11] bg-[#050914]/80 backdrop-blur-xl sticky top-20 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <BookOpen size={16} className="text-cyan-300" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-none">Documentation</h1>
              <p className="text-[10px] text-slate-400 mt-0.5 font-mono uppercase tracking-widest">Quantum Vault Protocol</p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(v => !v)}
            className="lg:hidden px-3 py-1.5 rounded-lg bg-[#0c1d30]/80 border border-cyan-100/[0.16] text-sm text-slate-300 flex items-center gap-2"
          >
            <BookOpen size={14} /> Contents
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex gap-10 relative">
        {/* ── Sidebar ── */}
        <aside className={`
          lg:block shrink-0 w-64
          ${isSidebarOpen
            ? 'fixed inset-0 z-40 bg-[#050914]/95 backdrop-blur-xl p-6 pt-24 overflow-y-auto lg:relative lg:inset-auto lg:bg-transparent lg:p-0'
            : 'hidden lg:block'}
        `}>
          <div className="sticky top-36">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-3">On This Page</div>
            <nav className="space-y-0.5">
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all group ${
                    activeSection === id
                      ? 'bg-cyan-500/10 text-cyan-200 font-semibold border border-cyan-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-[#0c1d30]/80'
                  }`}
                >
                  <Icon size={14} className={activeSection === id ? 'text-cyan-300' : 'text-slate-400 group-hover:text-slate-400'} />
                  {label}
                </button>
              ))}
            </nav>

            <div className="mt-8 p-4 rounded-xl bg-white/3 border border-cyan-100/[0.11]">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Version</div>
              <div className="text-xs text-slate-300 font-mono">v2.0 — Quantum Vault</div>
              <div className="text-[10px] text-slate-400 mt-1">WOTS+ Merkle Tree · 6-chain deployment</div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-mono break-all">Factory: 0x6936...808D</div>
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 min-w-0 space-y-16">

          {/* ━━ 1. Overview ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <section>
            <SectionTitle
              id="overview"
              icon={BookOpen}
              title="Overview"
              subtitle="What Quantum Vault is, what it solves, and how it works."
            />
            <div className="ml-0 space-y-5 text-sm leading-relaxed text-slate-300">
              <p>
                <strong className="text-white">Quantum Vault</strong> is a self-custody on-chain asset vault that replaces traditional ECDSA
                wallet cryptography with <strong className="text-cyan-200">WOTS+</strong> (Winternitz One-Time Signatures Plus) organized
                into a <strong className="text-cyan-200">256-leaf Merkle key tree</strong>. Signature verification runs entirely
                in Solidity on-chain — no ZK proofs, no trusted setup, no external oracles.
              </p>
              <p>
                Every standard Ethereum wallet uses ECDSA over secp256k1 for externally owned account signatures. A sufficiently capable fault-tolerant quantum computer could use Shor's algorithm to attack that elliptic-curve assumption; the practical timeline is uncertain. Quantum Vault changes the vault's password-derived authorization to WOTS+ hash-chain signatures, but still requires an authorized wallet factor that may use ECDSA.
              </p>

              <div className="grid sm:grid-cols-3 gap-4 my-6">
                {[
                  { icon: Fingerprint, color: 'cyan', label: 'WOTS+', desc: 'Winternitz One-Time Signatures — hash-chain based and designed for post-quantum use with keccak256' },
                  { icon: GitBranch,   color: 'sky', label: 'Merkle Tree', desc: '256-leaf binary Merkle tree — 256 one-time uses per key set, root stored on-chain' },
                  { icon: Zap,         color: 'emerald', label: 'Account Execution', desc: 'ERC-4337-compatible smart account plus directExecute() for direct relayed operations' },
                ].map(({ icon: Icon, color, label, desc }) => {
                  const c: Record<string, string> = {
                    cyan:  'border-cyan-500/20 bg-cyan-500/5 text-cyan-300',
                    sky:  'border-sky-500/20 bg-sky-500/5 text-sky-400',
                    emerald: 'border-teal-500/20 bg-teal-500/5 text-teal-400',
                  };
                  return (
                    <div key={label} className={`p-4 rounded-xl border ${c[color]}`}>
                      <Icon size={22} className="mb-3" />
                      <div className="text-white font-bold text-sm mb-1">{label}</div>
                      <div className="text-xs text-slate-400 leading-relaxed">{desc}</div>
                    </div>
                  );
                })}
              </div>

                <InfoBox type="success">
                  <strong>Key property:</strong> signing keys are derived and used locally; the account contract verifies the submitted WOTS+ proof and never receives the password or master seed.
                  <br /><br />
                  <strong>Deployment:</strong> factory deployed and source-verified on 6 chains — Ethereum, BNB Chain, Base, Arbitrum, Polygon, and Robinhood Chain — all at the same address <code>0x693671914331B6FaaCEeD66A805D33aa95D8808D</code>.
                </InfoBox>

              <InfoBox type="warning">
                <strong>No emergency-freeze switch:</strong> V2 does not expose a general pause function. The custody contract accepts withdrawals only from its linked account; the account contract enforces the WOTS+ proof, password commitment, wallet-admin authorization, nonce, and one-time-leaf checks.
              </InfoBox>            </div>
          </section>

          {/* ━━ 2. Quantum Threat Model ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <section>
            <SectionTitle
              id="threat-model"
              icon={AlertTriangle}
              title="Quantum Threat Model"
              subtitle="Why ECDSA has a known quantum threat, and what hash-based signatures are designed to protect against."
            />
            <div className="space-y-5 text-sm leading-relaxed text-slate-300">
              <p>
                Ethereum uses <strong className="text-white">ECDSA over secp256k1</strong>. The security of ECDSA relies on the
                computational hardness of the <em>Elliptic Curve Discrete Logarithm Problem (ECDLP)</em>:
                given a public key <code className="text-cyan-200 bg-cyan-500/10 px-1 rounded">Q = k·G</code>,
                it is classically infeasible to recover the scalar <code className="text-cyan-200 bg-cyan-500/10 px-1 rounded">k</code>.
              </p>

              <InfoBox type="warning">
                <strong>Quantum risk is structural, not a prediction of timing:</strong> a sufficiently capable fault-tolerant quantum computer could use Shor's algorithm against ECDSA's elliptic-curve discrete-log assumption. NIST identifies elliptic-curve signatures as vulnerable to such a machine and has standardized post-quantum signature alternatives. This does not mean such a machine exists today or that a precise arrival date is known.
              </InfoBox>

              <InfoBox type="warning">
                <strong>AI changes the pace of security research—not the laws of cryptography:</strong> more capable AI and mathematical tools may help researchers and attackers analyze implementations, discover bugs, or automate parts of their workflow. There is no established evidence that AI alone has broken ECDSA or keccak256. The practical risk is broader than cryptographic math: implementation defects, compromised devices, malicious interfaces, and operational mistakes can expose keys today.
              </InfoBox>

              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-sm mb-2">
                    <AlertTriangle size={14} /> Threat 1 — "Harvest Now, Decrypt Later"
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Public-key exposure can matter for future quantum attacks, but a future quantum computer does not make every previously signed account automatically compromised today. The concrete risk depends on the chain, account state, public-key exposure, attacker capability, and migration options.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5">
                  <div className="flex items-center gap-2 text-orange-400 font-bold text-sm mb-2">
                    <AlertTriangle size={14} /> Threat 2 — Long-Term ECDSA Exposure
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    A sufficiently capable quantum computer could threaten ECDSA signatures, but the timing and practical feasibility are unknown; this is not a claim that an attacker can recover a key in seconds today. Quantum Vault's WOTS+ authorization uses hash chains instead of that elliptic-curve assumption. The separate authorized-wallet factor still uses ECDSA and remains subject to wallet and chain risks.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-500/5">
                  <div className="flex items-center gap-2 text-violet-300 font-bold text-sm mb-2">
                    <Cpu size={14} /> Threat 3 — AI-Accelerated Analysis
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    AI is not a magic key-recovery machine, and no public evidence shows it has broken modern ECDSA or keccak256. But AI-assisted research can help analyze code and mathematical structures, potentially shortening the path from a subtle weakness to a practical exploit. That makes implementation quality, open review, and reducing dependence on a single cryptographic assumption increasingly important.
                  </p>
                </div>
              </div>

              <p>
                <strong className="text-white">Why WOTS+ is considered post-quantum-oriented:</strong> WOTS+ security reduces largely to the
                one-wayness of keccak256. Grover's algorithm gives a quadratic speedup against hash preimage search,
                effectively halving security bits. With 256-bit outputs and w=16 chains, the post-Grover security
                target is approximately 128 bits. The construction avoids the discrete-log assumption used by ECDSA;
                this is a security design target, not a proof of immunity against every future attack.
              </p>
            </div>
          </section>

          {/* ━━ 3. WOTS+ Signatures ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <section>
            <SectionTitle
              id="wots-plus"
              icon={Fingerprint}
              title="WOTS+ Signatures"
              subtitle="Winternitz One-Time Signatures — a hash-based signing scheme designed for post-quantum use."
            />
            <div className="space-y-5 text-sm leading-relaxed text-slate-300">
              <p>
                WOTS+ (Winternitz One-Time Signatures Plus) is a post-quantum digital signature scheme
                based solely on the one-wayness of a cryptographic hash function. Each signature uses
                exactly one leaf from the key tree and must never be reused.
              </p>

              <h3 className="text-white font-bold mt-6 mb-3">Parameter Set</h3>
              <div className="rounded-xl border border-cyan-100/[0.11] overflow-hidden">
                <PropRow label="Winternitz parameter (w)" value="16 (base-16 chains)" highlight />
                <PropRow label="Hash output size (n)" value="32 bytes (256 bits)" />
                <PropRow label="Message chains (L1)" value="64 (one per nibble of 32-byte hash)" />
                <PropRow label="Checksum chains (L2)" value="3" />
                <PropRow label="Total chains (L)" value="67" />
                <PropRow label="Hash function" value="keccak256" />
                <PropRow label="One-time key size" value="67 × 32 = 2,144 bytes" />
                <PropRow label="Signature size" value="67 × 32 = 2,144 bytes" highlight />
                <PropRow label="Post-Grover security" value="~128 bits (keccak256 one-wayness)" />
              </div>

              <h3 className="text-white font-bold mt-8 mb-4">How a WOTS+ Signature Works</h3>
              <StepCard step="1" color="cyan" title="Chain Step"
                desc="Each chain step XORs the current value with a bitmask derived from (pubSeed, chainIndex, stepIndex), then applies keccak256. This domain-separates each step to prevent cross-chain attacks." />
              <StepCard step="2" color="sky" title="Key Generation (per leaf)"
                desc="For each of 67 chains: derive a private sk_i = keccak256(leafSeed || i). Run the full w-1=15 chain steps to produce pk_i. The public key is the array of 67 chain endpoints." />
              <StepCard step="3" color="cyan" title="Signing"
                desc="Encode the 32-byte message hash into 64 nibbles (base-16 digits) + 3 checksum nibbles = 67 values b[0..66]. For chain i, output sig_i = chain(sk_i, from=0, steps=b[i]). The receiver will complete the remaining W-1-b[i] steps to reach the public key." />
              <StepCard step="4" color="emerald" title="Verification (on-chain)"
                desc="For each chain i: run W-1-b[i] more steps starting from sig_i. If the result equals pk_i for all 67 chains, the signature is valid. This is what WOTSVerifier.verifyOTS() implements in Solidity." />

              <CodeBlock lang="WOTSVerifier.sol (chain step)" code={`
// One chain step: bitmask = keccak256(pubSeed || chainIdx(u32) || stepIdx(u8))
// result = keccak256(value XOR bitmask)
function _step(
    bytes32 val,
    bytes32 pubSeed,
    uint32  i,    // chain index
    uint8   j     // step index within chain
) internal pure returns (bytes32) {
    bytes32 bm = keccak256(abi.encodePacked(pubSeed, i, j));
    return keccak256(abi.encodePacked(val ^ bm));
}

// Verification: complete the remaining steps, check against registered pk
for (uint256 k = 0; k < 67; k++) {
    bytes32 val  = sig[k];
    uint8   rem  = uint8(W - 1) - b[k];   // steps remaining
    for (uint8 s = 0; s < rem; s++) {
        val = _step(val, pubSeed, uint32(k), b[k] + s);
    }
    if (val != pubKey[k]) return false;    // mismatch → invalid sig
}
`} />

              <h3 className="text-white font-bold mt-8 mb-3">WOTS+ vs ECDSA</h3>
              <div className="rounded-xl border border-cyan-100/[0.11] overflow-hidden">
                <div className="grid grid-cols-3 gap-px bg-[#0c1d30]/80">
                  <div className="bg-[#0d1526] px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Property</div>
                  <div className="bg-[#0d1526] px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">ECDSA (secp256k1)</div>
                  <div className="bg-cyan-500/10 px-4 py-2 text-[11px] font-bold text-cyan-300 uppercase tracking-widest">WOTS+</div>
                </div>
                <CompareRow feature="Hard Problem"       classical="Elliptic Curve DLP"        wots="keccak256 one-wayness" />
                <CompareRow feature="Quantum Security"   classical="Exposed to Shor's algorithm on a capable quantum computer"          wots="Hash-based; designed to avoid the elliptic-curve assumption" classicalBad />
                <CompareRow feature="Classical Security" classical="~128 bits"                 wots="~128 bits" />
                <CompareRow feature="Signature Size"     classical="64 bytes"                  wots="2,144 bytes (67×32)" />
                <CompareRow feature="Key Reuse"          classical="Unlimited reuse"           wots="One-time only per leaf" />
                <CompareRow feature="Trusted Setup"      classical="None required"             wots="None required" />
                <CompareRow feature="On-chain Verifier"  classical="ecrecover precompile"      wots="Pure Solidity, ~67 keccak256 ops" />
                <CompareRow feature="Key on-chain"       classical="Pub key on every tx"       wots="Only Merkle root stored" classicalBad />
              </div>

              <InfoBox type="warning">
                <strong>One-time use is critical.</strong> Signing two different messages with the same WOTS+ leaf
                reveals enough chain values that an attacker can forge arbitrary signatures for that leaf.
                The contract enforces this: every used leaf is burned in <code>isLeafSpent[root][leafIndex]</code>
                and any attempt to reuse it reverts with <code>LeafAlreadySpent</code>.
              </InfoBox>
            </div>
          </section>

          {/* ━━ 4. Merkle Key Tree ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <section>
            <SectionTitle
              id="merkle-tree"
              icon={GitBranch}
              title="Merkle Key Tree"
              subtitle="256 WOTS+ one-time keys organized into a binary Merkle tree — the root is the on-chain identity."
            />
            <div className="space-y-5 text-sm leading-relaxed text-slate-300">
              <p>
                Because each WOTS+ leaf can only be used once, a single key tree gives you
                <strong className="text-white"> 256 transaction signatures</strong> before a new tree is needed.
                The tree root (32 bytes) is the only value stored on-chain — it commits to all 256 leaf public keys
                without revealing any of them.
              </p>

              <div className="rounded-xl border border-cyan-100/[0.11] overflow-hidden">
                <PropRow label="Tree depth" value="8" highlight />
                <PropRow label="Number of leaves" value="256 (2⁸)" />
                <PropRow label="Leaf hash" value="keccak256(0x00 || pk[0] || pk[1] || … || pk[66])" />
                <PropRow label="Internal node hash" value="keccak256(0x01 || left || right)" />
                <PropRow label="Domain separation" value="0x00 = leaf, 0x01 = internal node" highlight />
                <PropRow label="Proof size" value="8 siblings × 32 bytes = 256 bytes" />
                <PropRow label="On-chain storage" value="merkleRoot (32 bytes) + pubSeed (32 bytes)" />
              </div>

              <h3 className="text-white font-bold mt-6 mb-4">Tree Construction</h3>
              <StepCard step="1" color="cyan" title="Derive pubSeed"
                desc="pubSeed = keccak256(masterSeed || 'QVPS'). Shared across all 256 leaves — parameterizes the chain step bitmask function." />
              <StepCard step="2" color="sky" title="Derive 256 leaf seeds"
                desc="leafSeed_j = keccak256(masterSeed || uint32BE(j)), for j = 0..255. Each leaf has an independent seed, so compromise of one leaf reveals nothing about others." />
              <StepCard step="3" color="cyan" title="Compute 256 WOTS+ public keys"
                desc="For each leaf j: derive 67 private chain starts sk_i = keccak256(leafSeed_j || i), run 15 chain steps to produce pk_i. The leaf's public key is pk[0..66]." />
              <StepCard step="4" color="emerald" title="Hash leaves and build tree bottom-up"
                desc="leafHash_j = keccak256(0x00 || pk[0] || … || pk[66]). Internal nodes: parent = keccak256(0x01 || left || right). Root = levels[0][0]. Stored on-chain as merkleRoot." />

              <CodeBlock lang="WOTSVerifier.sol (Merkle verification)" code={`
// Leaf hash: domain byte 0x00 prevents second-preimage attacks
function leafHash(bytes32[67] memory pubKey) internal pure returns (bytes32 result) {
    assembly ("memory-safe") {
        let ptr := mload(0x40)
        mstore8(ptr, 0x00)                    // domain prefix
        // copy 67 × 32 = 2144 bytes
        let src := pubKey
        let dst := add(ptr, 1)
        for { let i := 0 } lt(i, 2144) { i := add(i, 32) } {
            mstore(add(dst, i), mload(add(src, i)))
        }
        result := keccak256(ptr, 2145)         // hash 1 + 2144 bytes
    }
}

// Merkle inclusion proof: domain byte 0x01 for internal nodes
function verifyMerkle(
    bytes32   root,
    bytes32   leaf,
    bytes32[] memory proof,
    uint32    index
) internal pure returns (bool) {
    bytes32 node = leaf;
    for (uint256 i = 0; i < proof.length; i++) {
        bytes32 sibling = proof[i];
        if (index & 1 == 0) {
            node = keccak256(abi.encodePacked(uint8(0x01), node, sibling));
        } else {
            node = keccak256(abi.encodePacked(uint8(0x01), sibling, node));
        }
        index >>= 1;
    }
    return node == root;
}
`} />

              <InfoBox type="info">
                The same <code>pubSeed</code> is used across all leaves in a tree — this is safe because domain
                separation in the chain step function (pubSeed || chainIdx || stepIdx) prevents any cross-leaf
                interaction. Different leaf seeds ensure each leaf's private keys are independent.
              </InfoBox>
            </div>
          </section>

          {/* ━━ 5. Architecture ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <section>
            <SectionTitle
              id="architecture"
              icon={Layers}
              title="System Architecture"
              subtitle="Two layers: client-side key operations and on-chain verification."
            />
            <div className="space-y-5 text-sm leading-relaxed text-slate-300">
              <div className="space-y-4">
                {/* Layer 1 */}
                <div className="relative p-5 rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/8 to-transparent overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-200 text-[10px] font-bold uppercase tracking-widest">Layer 1</div>
                      <span className="text-white font-bold">Client Side (Browser)</span>
                      <span className="ml-auto text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded font-bold">Derived Locally</span>
                    </div>
                    <ul className="space-y-1.5 text-slate-400 text-sm">
                      <li className="flex items-start gap-2"><ArrowRight size={12} className="mt-1 text-cyan-300 shrink-0" /> Argon2id: password → 32-byte masterSeed</li>
                      <li className="flex items-start gap-2"><ArrowRight size={12} className="mt-1 text-cyan-300 shrink-0" /> masterSeed → pubSeed + 256 leaf seeds → WOTS+ key tree (TypeScript/WASM)</li>
                      <li className="flex items-start gap-2"><ArrowRight size={12} className="mt-1 text-cyan-300 shrink-0" /> Sign operation hash with selected leaf (otsSig[67], otsPubKey[67])</li>
                      <li className="flex items-start gap-2"><ArrowRight size={12} className="mt-1 text-cyan-300 shrink-0" /> Compute Merkle proof (8 sibling hashes)</li>
                      <li className="flex items-start gap-2"><ArrowRight size={12} className="mt-1 text-cyan-300 shrink-0" /> Derive passwordPreimage, passwordCommit</li>
                      <li className="flex items-start gap-2"><ArrowRight size={12} className="mt-1 text-cyan-300 shrink-0" /> Wallet admin signs opHash / userOpHash via MetaMask (second factor — ECDSA)</li>
                    </ul>
                    <div className="mt-3 text-[11px] text-cyan-200/60 font-mono">Password-derived material is processed locally; browser or device compromise can still expose it.</div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="flex flex-col items-center gap-1 text-slate-400 text-[10px]">
                    <div className="w-px h-6 bg-slate-700" />
                    <span className="font-mono">otsSig[67] + otsPubKey[67] + merkleProof[8] + leafIndex + passwordPreimage</span>
                    <div className="w-px h-6 bg-slate-700" />
                  </div>
                </div>

                {/* Layer 2 */}
                <div className="relative p-5 rounded-2xl border border-teal-500/25 bg-gradient-to-br from-teal-500/8 to-transparent overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-200 text-[10px] font-bold uppercase tracking-widest">Layer 2</div>
                      <span className="text-white font-bold">Contract Layer (On-Chain)</span>
                      <span className="ml-auto text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded font-bold">Immutable Rules</span>
                    </div>
                    <ul className="space-y-1.5 text-slate-400 text-sm">
                      <li className="flex items-start gap-2"><ArrowRight size={12} className="mt-1 text-teal-400 shrink-0" /> <code className="text-teal-200/80 text-[11px]">WOTSVerifier.verifyOTS()</code> — 67 keccak256 chain completions + comparison</li>
                      <li className="flex items-start gap-2"><ArrowRight size={12} className="mt-1 text-teal-400 shrink-0" /> <code className="text-teal-200/80 text-[11px]">WOTSVerifier.leafHash()</code> — hash 67 pubkey chains into leaf</li>
                      <li className="flex items-start gap-2"><ArrowRight size={12} className="mt-1 text-teal-400 shrink-0" /> <code className="text-teal-200/80 text-[11px]">WOTSVerifier.verifyMerkle()</code> — 8-step Merkle path to root</li>
                      <li className="flex items-start gap-2"><ArrowRight size={12} className="mt-1 text-teal-400 shrink-0" /> Password commit verification: keccak256(preimage, domain) == stored commit</li>
                      <li className="flex items-start gap-2"><ArrowRight size={12} className="mt-1 text-teal-400 shrink-0" /> Leaf burn: <code className="text-teal-200/80 text-[11px]">isLeafSpent[root][idx] = true</code></li>
                      <li className="flex items-start gap-2"><ArrowRight size={12} className="mt-1 text-teal-400 shrink-0" /> Asset transfer via <code className="text-teal-200/80 text-[11px]">QuantumVault.withdrawNative/withdrawERC20</code></li>
                    </ul>
                    <div className="mt-3 text-[11px] text-teal-200/60 font-mono">All verification is pure Solidity — no ZK proofs, no oracles, no trusted setup</div>
                  </div>
                </div>
              </div>

              <InfoBox type="info">
                <strong>One WOTS+ proof plus one wallet-admin factor:</strong> every operation combines a password-derived WOTS+ proof with wallet authorization. If an authorized wallet submits directly, no extra wallet signature is needed; otherwise an authorized wallet signs the operation and a separate relayer pays gas.
                <br /><br />
                <strong>Two execution paths:</strong> <strong>ERC-4337</strong> (UserOp via EntryPoint) and <strong>directExecute</strong> (a direct account call). The current frontend uses direct execution for the supported flow; ERC-4337 remains an available account interface, not a requirement for every operation.
              </InfoBox>
            </div>
          </section>

          {/* ━━ 6. ERC-4337 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <section>
            <SectionTitle
              id="erc4337"
              icon={Zap}
              title="ERC-4337 Account Abstraction"
              subtitle="How WOTS+ signatures plug into the ERC-4337 UserOperation validation flow."
            />
            <div className="space-y-5 text-sm leading-relaxed text-slate-300">
              <p>
                ERC-4337 introduces <strong className="text-white">UserOperations (UserOps)</strong> — intent objects
                processed by the <strong className="text-white">EntryPoint</strong> contract, which calls
                <code className="text-cyan-200 bg-cyan-500/10 px-1 rounded mx-1">validateUserOp</code> on the smart account,
                then <code className="text-cyan-200 bg-cyan-500/10 px-1 rounded mx-1">executeUserOp</code> on success.
              </p>

              <h3 className="text-white font-bold mt-6 mb-3">UserOp Signature Encoding</h3>
              <p className="text-slate-400">
                The <code className="text-cyan-200 bg-cyan-500/10 px-1 rounded">userOp.signature</code> field
                is ABI-encoded as:
              </p>
              <CodeBlock lang="solidity" code={`
abi.decode(userOp.signature, (
    bytes32,       // signerMerkleRoot — which admin key tree is signing
    uint32,        // leafIndex        — which of the 256 leaves (0-255)
    bytes32[67],   // otsPubKey        — WOTS+ one-time public key (67 × 32 bytes)
    bytes32[67],   // otsSig           — WOTS+ signature (67 × 32 bytes)
    bytes32[],     // merkleProof      — 8 sibling hashes, leaf→root
    bytes32,       // inbandNewRoot    — optional: rotate to new tree in-band (or bytes32(0))
    bytes32,       // inbandNewPubSeed — new tree's pubSeed (if rotating)
    bytes32,       // passwordPreimage — keccak256(masterSeed || "QVPW")
    bytes          // walletSig        — EIP-191 ECDSA sig over userOpHash by a wallet admin
));
`} />

              <h3 className="text-white font-bold mt-6 mb-3">validateUserOp Flow</h3>
              <CodeBlock lang="QuantumVaultAccount.sol (simplified)" code={`
function _validateSignature(
    PackedUserOperation calldata userOp,
    bytes32 userOpHash
) internal view override returns (uint256 validationData) {

    // 1. Decode all fields from userOp.signature
    (signerMerkleRoot, leafIndex, otsPubKey, otsSig,
     merkleProof, inbandNewRoot, inbandNewPubSeed, passwordPreimage)
        = abi.decode(userOp.signature, (...));

    // 2. Must be a registered admin root
    if (!isAdmin[signerMerkleRoot]) return SIG_VALIDATION_FAILED;

    // 3. Leaf must not have been used before
    if (isLeafSpent[signerMerkleRoot][leafIndex]) return SIG_VALIDATION_FAILED;

    // 4. Factor 2: verify wallet admin ECDSA signature over userOpHash
    //    userOpHash already includes chainId (injected by EntryPoint)
    address walletSigner = ECDSA.recover(
        MessageHashUtils.toEthSignedMessageHash(userOpHash), walletSig
    );
    if (!isWalletAdmin[walletSigner]) return SIG_VALIDATION_FAILED;

    // 5. Password preimage must match the stored commit
    if (keccak256(abi.encode(passwordPreimage, passwordDomain)) != passwordCommit)
        return SIG_VALIDATION_FAILED;

    // 6. sigHash binds UserOp hash + rotation intent + password
    bytes32 sigHash = keccak256(abi.encode(
        userOpHash, inbandNewRoot, inbandNewPubSeed, passwordPreimage
    ));

    // 6. WOTS+ chain verification (67 × up-to-15 keccak256 steps)
    if (!WOTSVerifier.verifyOTS(sigHash, pubSeedOf[signerMerkleRoot], otsSig, otsPubKey))
        return SIG_VALIDATION_FAILED;

    // 7. Merkle proof: leaf belongs to signerMerkleRoot
    bytes32 leaf = WOTSVerifier.leafHash(otsPubKey);
    if (!WOTSVerifier.verifyMerkle(signerMerkleRoot, leaf, merkleProof, leafIndex))
        return SIG_VALIDATION_FAILED;

    return SIG_VALIDATION_SUCCESS;
}
`} />

              <h3 className="text-white font-bold mt-6 mb-3">executeUserOp</h3>
              <p>
                After EntryPoint calls <code className="text-cyan-200 bg-cyan-500/10 px-1 rounded">executeUserOp</code>,
                the account burns the leaf and executes the inner calldata:
              </p>
              <CodeBlock lang="solidity" code={`
function executeUserOp(PackedUserOperation calldata userOp, bytes32) external onlyEntryPoint {
    // Burn the leaf unconditionally (even if inner call fails)
    isLeafSpent[signerMerkleRoot][leafIndex] = true;

    // Optional in-band tree rotation
    if (inbandNewRoot != bytes32(0) && !isAdmin[inbandNewRoot]) {
        _addAdmin(inbandNewRoot, inbandNewPubSeed);
        // remove old root if not the primary (primary is permanent)
    }

    // Execute action — reverts on failure so EntryPoint rolls back isLeafSpent
    (bool ok, bytes memory ret) = address(this).call(userOp.callData[4:]);
    if (!ok) {
        assembly { revert(add(ret, 0x20), mload(ret)) }
    }
}
`} />

              <InfoBox type="warning">
                <strong>executeUserOp reverts on inner call failure.</strong> ERC-4337 v0.7 EntryPoint wraps
                <code>executeUserOp</code> in a try/catch — on revert, all state (including <code>isLeafSpent</code>)
                is rolled back, preserving the leaf for a retry. This prevents a DoS where an attacker submits
                always-failing UserOps to exhaust all 256 leaves.
              </InfoBox>
            </div>
          </section>

          {/* ━━ 7. Direct Execution ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <section>
            <SectionTitle
              id="direct-execute"
              icon={Radio}
              title="Direct Execution (No Bundler)"
              subtitle="Call the account contract directly from any EOA — same WOTS+ security, no ERC-4337 infrastructure needed."
            />
            <div className="space-y-5 text-sm leading-relaxed text-slate-300">
              <p>
                <code className="text-cyan-200 bg-cyan-500/10 px-1 rounded">directExecute()</code> is a second
                execution path that bypasses the ERC-4337 EntryPoint entirely.
                Any EOA (or contract) can call it as a relayer — but the WOTS+ signature still proves ownership,
                so the relayer gains no special privilege and cannot alter the authorized action.
              </p>

              <h3 className="text-white font-bold mt-6 mb-3">Operation Hash Construction</h3>
              <CodeBlock lang="solidity" code={`
// opHash binds: domain tag, this contract, chainId, nonce, action, rotation intent, password
bytes32 opHash = keccak256(abi.encode(
    keccak256("QuantumVault:Direct:v1"),  // domain separator
    address(this),                         // prevents cross-account replay
    block.chainid,                         // prevents cross-chain replay
    directNonce[signerMerkleRoot],         // prevents replay of same op
    actionCalldata,                        // the actual action being authorized
    inbandNewRoot,                         // optional tree rotation
    inbandNewPubSeed,
    passwordPreimage                       // second factor
));
`} />

              <h3 className="text-white font-bold mt-6 mb-3">Execution Flow</h3>
              <StepCard step="1" color="cyan" title="Caller provides WOTS+ proof"
                desc="Same inputs as ERC-4337: signerMerkleRoot, leafIndex, otsPubKey[67], otsSig[67], merkleProof[8], passwordPreimage, plus the actionCalldata to execute." />
              <StepCard step="2" color="sky" title="Password + WOTS+ verification"
                desc="Contract verifies passwordPreimage against stored passwordCommit, then runs WOTSVerifier.verifyOTS() and WOTSVerifier.verifyMerkle() — identical to _validateSignature." />
              <StepCard step="3" color="cyan" title="Leaf burned + nonce incremented"
                desc="isLeafSpent[root][leafIndex] = true, directNonce[root]++. Prevents any replay of this exact operation." />
              <StepCard step="4" color="emerald" title="Action executed via self-call"
                desc="address(this).call(actionCalldata). If the call reverts, directExecute also reverts — the leaf is NOT burned on failure, preserving the user's WOTS+ leaf for a retry." />

              <InfoBox type="info">
                Unlike <code>executeUserOp</code>, <code>directExecute</code> reverts on inner call failure
                — so the leaf is only consumed if the action actually succeeds. This is safe because the
                signature has not yet appeared in any committed transaction.
              </InfoBox>

              <h3 className="text-white font-bold mt-6 mb-3">In-Band Tree Rotation</h3>
              <p>
                Both <code>directExecute</code> and ERC-4337 support in-band key rotation: if
                <code className="text-cyan-200 bg-cyan-500/10 px-1 rounded mx-1">inbandNewRoot != bytes32(0)</code>,
                the new Merkle root is added as an admin in the same transaction as the action.
                This lets you atomically execute an action and rotate to a fresh key tree without a separate transaction.
              </p>
            </div>
          </section>

          {/* ━━ 8. Smart Contracts ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <section>
            <SectionTitle
              id="contracts"
              icon={FileCode}
              title="Smart Contracts"
              subtitle="Contract architecture, responsibilities, and deployed addresses."
            />
            <div className="space-y-6 text-sm leading-relaxed text-slate-300">

              {[
                {
                  name: 'WOTSVerifier',
                  file: 'src/WOTSVerifier.sol',
                  color: 'cyan',
                  desc: 'Solidity library implementing the full WOTS+ verification pipeline. verifyOTS() completes the hash chains and compares against the provided public key. leafHash() computes the Merkle leaf commitment (domain prefix 0x00). verifyMerkle() traverses the 8-level inclusion proof (domain prefix 0x01). Stateless — no storage, pure functions only.',
                  methods: ['verifyOTS(msgHash, pubSeed, sig[67], pubKey[67])', 'leafHash(pubKey[67])', 'verifyMerkle(root, leaf, proof[], index)'],
                },
                {
                  name: 'QuantumVaultAccount',
                  file: 'src/QuantumVaultAccount.sol',
                  color: 'sky',
                  desc: 'ERC-4337 smart account. Dual-factor auth: WOTS+ password proof AND wallet ECDSA signature — both required for every operation. Supports multiple admin Merkle roots and multiple wallet admins. Gas-separation: authorized wallet signs opHash offline, any wallet pays gas and submits. ETH sent directly to the account address is automatically forwarded to the Vault (receive() hook) — the account never holds assets.',
                  methods: ['validateUserOp()', 'executeUserOp()', 'directExecute()', 'buildDirectOpHash()', 'addAdmin()', 'removeAdmin()', 'rotateMerkleRoot()', 'addWalletAdmin()', 'removeWalletAdmin()', 'setPasswordCommit()', 'getAdmins()', 'getWalletAdmins()'],
                },
                {
                  name: 'QuantumVault',
                  file: 'src/QuantumVault.sol',
                  color: 'emerald',
                  desc: 'Pure asset custody contract. Holds native ETH and ERC-20 tokens. Withdrawals can only be initiated by the linked QuantumVaultAccount (the authorizedAccount, set once by the factory). No admin keys, no upgradeability, no owner. ReentrancyGuard on all withdrawals.',
                  methods: ['withdrawNative(recipient, amount)', 'withdrawERC20(token, recipient, amount)', 'setAuthorizedAccount(account)'],
                },
                {
                  name: 'QuantumVaultAccountFactory',
                  file: 'src/QuantumVaultAccountFactory.sol',
                  color: 'cyan',
                  desc: 'CREATE2 factory. Deploys a paired (QuantumVaultAccount + QuantumVault) per user. Salt = keccak256(creator, vaultIndex) — password-independent, so vault address = f(wallet, vaultIndex) only. Addresses are identical across every EVM chain when deployed at the same address via Nick\'s deterministic deployer. Fee per deploy is set per-chain via setChainFee(); unrecognized chains fall back to defaultFee. Query getCreateFee() before calling createAccount.',
                  methods: ['createAccount(merkleRoot, pubSeed, passwordCommit)', 'getAddress(merkleRoot, pubSeed, passwordCommit, creator, vaultIndex)', 'nextVaultIndex(user)', 'withdrawFees(token, recipient, amount)'],
                },
              ].map(({ name, file, color, desc, methods }) => {
                const c: Record<string, string> = {
                  cyan:  'border-cyan-500/20 bg-cyan-500/5',
                  emerald: 'border-teal-500/20 bg-teal-500/5',
                  sky:  'border-sky-500/20 bg-sky-500/5',
                };
                const tc: Record<string, string> = {
                  cyan: 'text-cyan-200', emerald: 'text-teal-200',
                  sky: 'text-sky-200',
                };
                return (
                  <div key={name} className={`p-5 rounded-xl border ${c[color]}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <div>
                        <div className={`text-base font-bold ${tc[color]} font-mono`}>{name}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{file}</div>
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm mb-3 leading-relaxed">{desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {methods.map(m => (
                        <span key={m} className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/30 border border-cyan-100/[0.11] text-slate-400">{m}</span>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="p-4 rounded-xl border border-cyan-100/[0.11] bg-white/3 text-sm">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Deployed &amp; Verified — All 6 Chains</div>
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">Factory (all chains)</span><span className="text-teal-300">0x693671914331B6FaaCEeD66A805D33aa95D8808D</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">EntryPoint</span><span className="text-slate-300">0x0000000071727De22E5E9d8BAf0edAc6f37da032</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">EVM version</span><span className="text-slate-300">cancun</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Compiler</span><span className="text-slate-300">v0.8.28+commit.7893614a · via_ir · runs=200</span></div>
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  {[
                    { name: 'Ethereum', id: 1,     url: 'https://etherscan.io/address/0x693671914331B6FaaCEeD66A805D33aa95D8808D' },
                    { name: 'BNB Chain', id: 56,   url: 'https://bscscan.com/address/0x693671914331B6FaaCEeD66A805D33aa95D8808D' },
                    { name: 'Base',      id: 8453,  url: 'https://basescan.org/address/0x693671914331B6FaaCEeD66A805D33aa95D8808D' },
                    { name: 'Arbitrum',  id: 42161, url: 'https://arbiscan.io/address/0x693671914331B6FaaCEeD66A805D33aa95D8808D' },
                    { name: 'Polygon',   id: 137,   url: 'https://polygonscan.com/address/0x693671914331B6FaaCEeD66A805D33aa95D8808D' },
                    { name: 'Robinhood', id: 4663,  url: 'https://sourcify.dev/#/lookup/0x693671914331B6FaaCEeD66A805D33aa95D8808D' },
                  ].map(({ name, id, url }) => (
                    <a key={id} href={url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 text-cyan-300 hover:bg-cyan-500/10 transition-colors">
                      <ExternalLink size={10} />
                      <span className="font-medium">{name}</span>
                      <span className="text-slate-500 ml-auto">{id}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ━━ 9. Key Derivation ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <section>
            <SectionTitle
              id="key-derivation"
              icon={KeyRound}
              title="Key Derivation"
              subtitle="From password to masterSeed to full WOTS+ key tree — fully deterministic."
            />
            <div className="space-y-5 text-sm leading-relaxed text-slate-300">
              <CodeBlock lang="wotsService.ts (key derivation)" code={`
// 1. Password → masterSeed via Argon2id (memory-hard KDF)
const masterSeed = await argon2id({
  password: encode(password),
  salt:     STATIC_SALT,   // 32 bytes
  m:        131072,        // 128 MB memory
  t:        3,             // 3 iterations
  p:        1,
  dkLen:    32,            // 32-byte output = masterSeed
});

// 2. masterSeed → pubSeed (shared across all leaves in tree)
// pubSeed = keccak256(masterSeed || "QVPS")
const pubSeed = derivePubSeed(masterSeed);

// 3. masterSeed → 256 leaf seeds (independent per leaf)
// leafSeed_j = keccak256(masterSeed || uint32BE(j))
for (let j = 0; j < 256; j++) {
  const leafSeed = deriveLeafSeed(masterSeed, j);

  // 4. Each leaf seed → 67 private chain starts
  // sk_i = keccak256(leafSeed || uint32BE(i))
  for (let i = 0; i < 67; i++) {
    const sk = deriveSK(leafSeed, i);
    pk[i] = chain(sk, pubSeed, i, 0, W - 1);  // run 15 steps
  }

  leafHashes[j] = keccak256(0x00 || pk[0] || ... || pk[66]);
}

// 5. masterSeed → passwordPreimage (for password 2FA)
// passwordPreimage = keccak256(masterSeed || "QVPW")
const passwordPreimage = derivePasswordPreimage(masterSeed);

// 6. passwordDomain = keccak256(abi.encode(merkleRoot, pubSeed))
// passwordCommit = keccak256(abi.encode(passwordPreimage, passwordDomain))
// → stored on-chain in QuantumVaultAccount.passwordCommit
`} />

              <h3 className="text-white font-bold mt-4 mb-3">Derivation Summary</h3>
              <div className="rounded-xl border border-cyan-100/[0.11] overflow-hidden">
                <PropRow label="KDF" value="Argon2id (RFC 9106)" highlight />
                <PropRow label="Memory cost" value="128 MB (m=131072)" />
                <PropRow label="Time cost" value="3 iterations" />
                <PropRow label="masterSeed size" value="32 bytes" />
                <PropRow label="pubSeed" value="keccak256(masterSeed || 'QVPS')" />
                <PropRow label="leafSeed_j" value="keccak256(masterSeed || uint32BE(j))" />
                <PropRow label="sk_i (per leaf)" value="keccak256(leafSeed || uint32BE(i))" />
                <PropRow label="passwordPreimage" value="keccak256(masterSeed || 'QVPW')" highlight />
                <PropRow label="passwordDomain" value="keccak256(abi.encode(root, pubSeed))" />
                <PropRow label="passwordCommit" value="keccak256(abi.encode(preimage, domain))" highlight />
              </div>

              <InfoBox type="warning">
                <strong>Protocol limitations:</strong> this account contract has no password-reset, social-recovery, or 72-hour recovery mechanism. Losing the password or all authorized wallets can make outgoing access unavailable even though the primary root remains registered.
              </InfoBox>

              <p>
                <strong className="text-white">On-chain storage per account:</strong>
              </p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2"><ChevronRight size={14} className="text-cyan-300 shrink-0 mt-0.5" /> <code className="text-cyan-200 bg-cyan-500/10 px-1 rounded">merkleRoot</code> = 32 bytes — commits to all 256 WOTS+ leaf public keys</li>
                <li className="flex items-start gap-2"><ChevronRight size={14} className="text-cyan-300 shrink-0 mt-0.5" /> <code className="text-cyan-200 bg-cyan-500/10 px-1 rounded">pubSeed</code> = 32 bytes — parameterizes chain step bitmask function</li>
                <li className="flex items-start gap-2"><ChevronRight size={14} className="text-cyan-300 shrink-0 mt-0.5" /> <code className="text-cyan-200 bg-cyan-500/10 px-1 rounded">passwordCommit</code> = 32 bytes — second-factor authentication</li>
              </ul>
              <p className="text-slate-400 mt-2">
                The actual WOTS+ public keys (67 × 32 = 2,144 bytes per leaf × 256 = 549 KB) are
                never stored on-chain. They are submitted at signing time and verified against
                the Merkle root. Only the root stays on-chain.
              </p>
            </div>
          </section>

          {/* ━━ 10. Key Rotation & Recovery ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <section>
            <SectionTitle
              id="key-rotation"
              icon={RefreshCw}
              title="Key Rotation & Recovery"
              subtitle="Replace or add WOTS+ signing trees. This account version has no separate social-recovery flow."
            />
            <div className="space-y-5 text-sm leading-relaxed text-slate-300">
              <p>
                Each key tree has 256 leaves. When leaves are running low, you can rotate to a
                fresh tree. Two rotation mechanisms are available depending on your security posture.
              </p>

              <p>
                The client can monitor leaf usage and prepare a fresh WOTS+ tree when capacity is low.
                A directExecute operation can atomically register a fresh root; if the old root is non-primary,
                the contract removes it. The primary root is not removed by this automatic path, so renewal
                may leave it registered. Rotation consumes the normal authenticated operation and depends on
                the client successfully submitting it before the current tree is exhausted.
              </p>
              <p className="mt-3">
                This renews signing capacity, not recovery: it does not replace a lost password or wallet
                authorization, and it does not guarantee unlimited successful operations if the client is
                unavailable or the required key material is lost.
              </p>
              <InfoBox type="info">
                Each tree has at most 256 leaves. Automatic renewal is a client-side convenience, not a
                contract-enforced scheduled action; keep access to the password and an authorized wallet.
              </InfoBox>

              <h3 className="text-white font-bold mt-6 mb-3">Manual In-Band Rotation</h3>
              <p>
                You can also trigger rotation manually at any time by including non-zero
                <code className="text-cyan-200 bg-cyan-500/10 px-1 rounded mx-1">inbandNewRoot</code>
                in any operation — for example, to proactively rotate after a suspected key compromise
                or before an extended offline period. Same atomic guarantee, no extra transaction.
              </p>

              <h3 className="text-white font-bold mt-6 mb-3">Explicit Rotation (rotateMerkleRoot)</h3>
              <p>
                <code className="text-cyan-200 bg-cyan-500/10 px-1 rounded">rotateMerkleRoot(oldRoot, newRoot, newPubSeed)</code> swaps
                one admin root for another in a single authenticated transaction. Requires a valid WOTS+ + wallet signature
                (same dual-factor as any other operation). Use this to replace a secondary admin root immediately.
              </p>
              <InfoBox type="info">
                The primary Merkle root cannot be removed from the key-tree admin list by the current account contract. It is not, by itself, a recovery guarantee: access still depends on retaining the matching password-derived key material and an authorized wallet factor.
              </InfoBox>

              <h3 className="text-white font-bold mt-8 mb-3">Password Change</h3>
              <p>
                <code className="text-cyan-200 bg-cyan-500/10 px-1 rounded">setPasswordCommit(newCommit)</code> updates
                the on-chain password commitment. By itself it does not register a WOTS+ root derived from the new
                password or replace the existing root; the current app's Change Password flow coordinates the
                commitment update with key-tree rotation. Verify the frontend's transaction summary and retain
                both old and new credentials until the transaction is confirmed and the new password is tested.
                The operation requires the existing valid WOTS+ proof and authorized wallet factor.
              </p>

              <h3 className="text-white font-bold mt-8 mb-3">Multiple Admin Roots</h3>
              <p>
                An account can have multiple key-tree admin roots. Each root is an independent authentication key, not an independent user or wallet admin. Every operation still requires an authorized wallet factor; registering multiple roots does not create an M-of-N approval policy, because any valid root may authorize its WOTS+ factor.
              </p>
              <p className="text-slate-400">
                The primary root cannot be removed, but this alone does not guarantee recovery: you still need its derived key material (normally the password) and at least one authorized wallet.
              </p>
            </div>
          </section>

          {/* ━━ 11. Security Model ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <section>
            <SectionTitle
              id="security"
              icon={ShieldCheck}
              title="Security Model"
              subtitle="A layered security design: cryptographic proof, wallet authorization, replay protection, on-chain execution, and clearly stated trust boundaries."
            />
            <div className="space-y-6 text-sm leading-relaxed text-slate-300">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  { n: '01', title: 'Password-derived WOTS+ proof', body: 'A one-time WOTS+ signature proves control of a leaf in a registered 256-leaf Merkle tree. The account verifies the signature and its path to the registered root on-chain.' },
                  { n: '02', title: 'Authorized wallet factor', body: 'Each direct operation also requires an authorized wallet: either it is the transaction sender or it signs the operation hash for a separate gas-paying submitter. ERC-4337 validation also checks the wallet signature.' },
                  { n: '03', title: 'Replay & leaf protection', body: 'The operation hash binds the account, chain ID, per-root nonce, action calldata, rotation intent, and password preimage. Used leaves are marked spent, and direct-execution nonces advance after validation.' },
                  { n: '04', title: 'Atomic action execution', body: 'The account invokes the requested action only after authentication succeeds. If the inner action reverts in directExecute, the transaction reverts as a whole, including leaf consumption and rotation changes.' },
                  { n: '05', title: 'Client-side key handling', body: 'Password-derived material and WOTS+ signing are handled in the browser. This reduces reliance on a key-holding server, but cannot protect against a compromised device, malicious extension, injected script, or altered frontend.' },
                  { n: '06', title: 'Public, verifiable state', body: 'Registered roots, wallet admins, password commitment, and transaction activity are on-chain. This supports independent inspection, but does not make operation details private.' },
                ].map(({ n, title, body }) => (
                  <article key={n} className="relative overflow-hidden rounded-2xl border border-cyan-200/10 bg-gradient-to-br from-slate-900/90 to-cyan-950/30 p-4 sm:p-5 shadow-[0_12px_35px_rgba(0,0,0,.18)]">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 font-mono text-xs font-bold text-cyan-200">{n}</span>
                      <h3 className="font-bold text-white">{title}</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-400">{body}</p>
                  </article>
                ))}
              </div>

              <div className="rounded-2xl border border-teal-300/15 bg-teal-400/[0.04] p-4 sm:p-5">
                <h3 className="mb-4 flex items-center gap-2 font-bold text-white"><ShieldCheck size={17} className="text-teal-300"/>Trust assumptions & boundaries</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    { label: 'Cryptographic primitives', desc: 'Security depends on correct WOTS+, Merkle-tree, Argon2id, and keccak256 implementations and their underlying assumptions. Post-quantum design intent is not a guarantee against every future attack.' },
                    { label: 'Smart contract & chain', desc: 'The EVM, deployed account/factory code, token contracts, and chain consensus must behave as expected. Contract bugs or chain-level failures can affect access and assets.' },
                    { label: 'Device & browser', desc: 'The client derives and uses password material locally. Malware, browser extensions, keyloggers, malicious injected code, or a compromised frontend can capture secrets or alter transaction details.' },
                    { label: 'RPC, relayer & bundler', desc: 'Infrastructure can observe network metadata, delay or censor submissions, or return faulty data. A directExecute submission avoids an ERC-4337 bundler for that path, but still relies on an RPC and the underlying network.' },
                    { label: 'Public blockchain', desc: 'Addresses, contract state, and transaction details are public. Do not treat the vault as a privacy mixer or assume on-chain activity is anonymous.' },
                    { label: 'Recovery & availability', desc: 'There is no password reset or social-recovery flow in this account version. Keep the password-derived access material and authorized wallet available; a registered primary root alone cannot restore them.' },
                  ].map(({ label, desc }) => (
                    <div key={label} className="rounded-xl border border-white/[0.07] bg-black/15 p-3.5">
                      <div className="mb-1 text-xs font-bold uppercase tracking-wider text-teal-200">{label}</div>
                      <p className="text-sm leading-relaxed text-slate-400">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-300/20 bg-amber-400/[0.05] p-4 sm:p-5">
                <h3 className="mb-3 font-bold text-amber-100">Threats, mitigations & residual risks</h3>
                <div className="space-y-3">
                  {[
                    { attack: 'Attempted forged or replayed operation', mitigation: 'WOTS+ signature and Merkle membership are verified, the wallet factor is checked, and used leaves plus the direct-operation nonce prevent reuse. Residual risk: implementation defects or compromised signing material.' },
                    { attack: 'Password guessing or theft', mitigation: 'Use a strong, unique password and protect the device. Argon2id raises password-guessing cost, but cannot make a weak password strong or prevent malware/keylogging.' },
                    { attack: 'WOTS+ leaf exhaustion', mitigation: 'A tree supports up to 256 leaves. The client can include a new root during a normal authenticated operation; renewal depends on client availability and successful submission before the current tree is exhausted.' },
                    { attack: 'Malicious UI or misleading transaction', mitigation: 'The UI is not a security boundary. Verify the site, account address, chain, recipient, asset, and amount before signing; a compromised frontend may try to induce an otherwise valid signature for an unintended action.' },
                    { attack: 'Submission censorship or outage', mitigation: 'The direct execution path can submit without an ERC-4337 bundler, but it still depends on RPC access, a functioning wallet, available gas, and chain liveness. No path guarantees inclusion.' },
                    { attack: 'Lost password or authorized wallets', mitigation: 'Keep secure backups and at least one usable authorized wallet. The primary key-tree root cannot be removed, but it does not recover lost key material or wallet authorization.' },
                  ].map(({ attack, mitigation }) => (
                    <div key={attack} className="grid gap-1 rounded-xl border border-amber-200/10 bg-black/15 p-3.5 sm:grid-cols-[minmax(190px,0.8fr)_2fr] sm:gap-4">
                      <div className="font-semibold text-white">{attack}</div>
                      <p className="text-sm leading-relaxed text-slate-400">{mitigation}</p>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-slate-500">Further reading: <a className="text-cyan-300 hover:text-cyan-200 underline" href="https://csrc.nist.gov/Projects/post-quantum-cryptography" target="_blank" rel="noreferrer">NIST Post-Quantum Cryptography Project</a> · <a className="text-cyan-300 hover:text-cyan-200 underline" href="https://eprint.iacr.org/2025/440" target="_blank" rel="noreferrer">IACR Cryptology ePrint 2025/440: AI for Code-based Cryptography</a>. These sources describe field-wide research and algorithmic threats; they do not establish that AI has broken ECDSA or keccak256.</p>
            <p className="text-xs leading-relaxed text-slate-500">This section describes the intended design and known boundaries; it is not an independent security audit or a guarantee that funds are risk-free. Review the deployed contract addresses and source before use.</p>
            </div>
          </section>

          {/* ━━ 12. Tech Stack ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          <section>
            <SectionTitle
              id="tech-stack"
              icon={Code}
              title="Tech Stack"
              subtitle="Every library, tool, and standard used to build Quantum Vault."
            />
            <div className="space-y-6 text-sm">
              {[
                {
                  category: 'Cryptography',
                  color: 'cyan',
                  items: [
                    { name: 'WOTS+', role: 'Post-quantum one-time signatures (w=16, L=67, keccak256)', spec: 'Buchmann-Dahmen-Huelsing 2011' },
                    { name: 'Binary Merkle Tree', role: 'Aggregates 256 WOTS+ leaves into a single 32-byte root', spec: 'Depth=8, domain-sep. keccak256' },
                    { name: 'Argon2id', role: 'Password-based key derivation — memory-hard, GPU/ASIC resistant', spec: 'RFC 9106' },
                    { name: 'keccak256', role: 'Sole hash function — all chain steps, leaf hashing, Merkle nodes', spec: 'EVM native / @noble/hashes' },
                  ],
                },
                {
                  category: 'Smart Contracts',
                  color: 'emerald',
                  items: [
                    { name: 'Solidity 0.8.28', role: 'Smart contract language', spec: 'via_ir=true, optimizer_runs=200' },
                    { name: 'ERC-4337 v0.7', role: 'Account abstraction standard', spec: 'EntryPoint 0x0000000071727De22E5E9d8BAf0edAc6f37da032' },
                    { name: 'Foundry', role: 'Testing, deployment, scripting', spec: 'forge + cast' },
                    { name: 'OpenZeppelin v5', role: 'ReentrancyGuard, SafeERC20, Ownable', spec: 'Inherited in vault + factory' },
                    { name: 'account-abstraction v0.8', role: 'BaseAccount, IAccountExecute, Helpers', spec: 'Eth-Infinitism' },
                  ],
                },
                {
                  category: 'Frontend',
                  color: 'sky',
                  items: [
                    { name: 'React 19', role: 'UI framework', spec: 'Vite build' },
                    { name: 'TypeScript', role: 'Type-safe logic including WOTS+ tree builder', spec: 'esbuild / Vite' },
                    { name: 'ethers.js v6', role: 'Ethereum provider, ABI encoding, contract calls', spec: 'npm' },
                    { name: 'Tailwind CSS', role: 'Utility-first styling', spec: 'v3' },
                    { name: '@noble/hashes', role: 'keccak_256 for WOTS+ chain computation in browser', spec: 'v1.x' },
                  ],
                },
                {
                  category: 'Infrastructure',
                  color: 'cyan',
                  items: [
                    { name: 'Ethereum Mainnet', role: 'Live — factory verified', spec: 'Chain ID 1' },
                    { name: 'BNB Smart Chain', role: 'Live — factory verified', spec: 'Chain ID 56' },
                    { name: 'Base', role: 'Live — factory verified', spec: 'Chain ID 8453' },
                    { name: 'Arbitrum One', role: 'Live — factory verified', spec: 'Chain ID 42161' },
                    { name: 'Polygon', role: 'Live — factory verified', spec: 'Chain ID 137' },
                    { name: 'Robinhood Chain', role: 'Live — factory verified', spec: 'Chain ID 4663' },
                    { name: 'CREATE2', role: 'Deterministic paired (Account, Vault) addresses', spec: 'EIP-1014' },
                    { name: 'ERC-4337 Bundler', role: 'UserOp relay (optional — directExecute bypasses)', spec: 'Pimlico / Alchemy' },
                  ],
                },
              ].map(({ category, color, items }) => {
                const c: Record<string, string> = {
                  cyan:  'text-cyan-300 border-cyan-500/20 bg-cyan-500/5',
                  emerald: 'text-teal-400 border-teal-500/20 bg-teal-500/5',
                  sky:  'text-sky-400 border-sky-500/20 bg-sky-500/5',
                };
                return (
                  <div key={category}>
                    <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2 ${c[color].split(' ')[0]}`}>
                      <Activity size={13} /> {category}
                    </h3>
                    <div className="rounded-xl border border-cyan-100/[0.11] overflow-hidden">
                      {items.map(({ name, role, spec }, idx) => (
                        <div key={name} className={`flex items-center gap-4 px-4 py-3 ${idx % 2 === 0 ? 'bg-[#0b1424]' : 'bg-[#080f1c]'} border-b border-white/3 last:border-0`}>
                          <div className="w-52 shrink-0">
                            <div className="text-sm text-white font-medium">{name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{spec}</div>
                          </div>
                          <div className="text-sm text-slate-400">{role}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="mt-8 p-5 rounded-xl border border-cyan-100/[0.11] bg-white/3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Open Source</div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  All smart contracts and the frontend are open source.
                  Your assets remain accessible even if this website is unavailable — interact directly
                  with the contracts via any Ethereum block explorer using <code className="text-cyan-200 bg-cyan-500/10 px-1 rounded">directExecute()</code>.
                  No server required for asset access.
                </p>
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
};

export default Docs;
