import React, { useState } from 'react';
import { X, ShieldCheck, Check, Copy, RefreshCw } from 'lucide-react';
import { sha256 } from '../utils/cryptoHD';
import { sound } from '../utils/audio';

interface ProvablyFairModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverSeedHash?: string;
  serverSeed?: string;
  clientSeed?: string;
  nonce?: number;
  gameType?: string;
}

export const ProvablyFairModal: React.FC<ProvablyFairModalProps> = ({
  isOpen,
  onClose,
  serverSeedHash = '',
  serverSeed = '',
  clientSeed = '',
  nonce = 1,
  gameType = 'mines',
}) => {
  const [calcServerSeed, setCalcServerSeed] = useState(serverSeed);
  const [calcClientSeed, setCalcClientSeed] = useState(clientSeed);
  const [calcNonce, setCalcNonce] = useState(nonce);
  const [verifiedHash, setVerifiedHash] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    sound.playClick();
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    sound.playClick();
    const hash = await sha256(calcServerSeed);
    setVerifiedHash(hash);
    setIsVerifying(false);
  };

  const isMatching = verifiedHash && verifiedHash.toLowerCase() === (serverSeedHash || '').toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="provably-fair-modal-container"
        className="relative w-full max-w-lg bg-[#0a122a] border border-[#c0c0c0]/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#c0c0c0]/20 bg-[#050b18]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/40 flex items-center justify-center text-[#00ff41] shadow-[0_0_12px_rgba(0,255,65,0.25)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider font-['Syne',sans-serif]">
                Provably Fair
              </h2>
              <p className="text-xs text-[#c0c0c0]">Cryptographic Proof of Unmanipulated Game Outcomes</p>
            </div>
          </div>
          <button
            id="close-fair-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-[#c0c0c0] hover:text-white hover:bg-[#1a2b4b] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          <p className="text-[#c0c0c0] leading-relaxed">
            Vault Stakes games use cryptographic SHA-256 hashing. Before every round, a <strong className="text-[#00ff41]">Server Seed Hash</strong> is committed so the outcome cannot be altered. When the round completes, the unhashed <strong className="text-white">Server Seed</strong> is revealed.
          </p>

          {/* Seed Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-[#c0c0c0] uppercase tracking-wider mb-1.5">
                Server Seed (SHA-256 Pre-Commitment Hash)
              </label>
              <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/20 font-mono text-[11px] text-[#00ff41] break-all">
                <span className="flex-1 select-all">{serverSeedHash || 'Hash generated prior to bet'}</span>
                {serverSeedHash && (
                  <button
                    onClick={() => handleCopy(serverSeedHash, 'hash')}
                    className="p-1.5 rounded-xl bg-[#1a2b4b] hover:bg-[#00ff41] hover:text-black text-white shrink-0 transition-colors"
                  >
                    {copiedField === 'hash' ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#c0c0c0] uppercase tracking-wider mb-1.5">
                Unhashed Server Seed (Revealed Post-Round)
              </label>
              <input
                type="text"
                value={calcServerSeed}
                onChange={(e) => setCalcServerSeed(e.target.value)}
                placeholder="Revealed upon game conclusion"
                className="w-full px-3 py-2 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/20 font-mono text-[11px] text-white focus:border-[#00ff41] focus:outline-none font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-[#c0c0c0] uppercase tracking-wider mb-1.5">
                  Client Seed
                </label>
                <input
                  type="text"
                  value={calcClientSeed}
                  onChange={(e) => setCalcClientSeed(e.target.value)}
                  className="w-full px-3 py-2 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/20 font-mono text-[11px] text-white focus:border-[#00ff41] focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#c0c0c0] uppercase tracking-wider mb-1.5">
                  Nonce (Game Round)
                </label>
                <input
                  type="number"
                  value={calcNonce}
                  onChange={(e) => setCalcNonce(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/20 font-mono text-[11px] text-white focus:border-[#00ff41] focus:outline-none font-bold"
                />
              </div>
            </div>
          </div>

          {/* Verification Result */}
          {verifiedHash && (
            <div className={`p-3.5 rounded-2xl border ${isMatching ? 'bg-[#00ff41]/10 border-[#00ff41]/50 shadow-[0_0_15px_rgba(0,255,65,0.2)]' : 'bg-[#050b18] border-[#c0c0c0]/20'} space-y-1`}>
              <div className="flex items-center gap-1.5 font-black uppercase text-xs">
                {isMatching ? (
                  <>
                    <Check className="w-4 h-4 text-[#00ff41] stroke-[3]" />
                    <span className="text-[#00ff41]">100% Mathematically Verified Fair!</span>
                  </>
                ) : (
                  <span className="text-[#c0c0c0]">Calculated Hash:</span>
                )}
              </div>
              <div className="font-mono text-[10px] text-white break-all">{verifiedHash}</div>
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={!calcServerSeed || isVerifying}
            className="w-full py-3.5 bg-[#1a2b4b] hover:bg-[#00ff41] hover:text-black border border-[#c0c0c0]/20 hover:border-[#00ff41] font-black uppercase text-xs tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 text-white disabled:opacity-40"
          >
            {isVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-[#00ff41]" />}
            Verify SHA-256 Seed Hash
          </button>
        </div>
      </div>
    </div>
  );
};
