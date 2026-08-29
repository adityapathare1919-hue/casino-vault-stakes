import React, { useState } from 'react';
import { UserProfile } from '../types';
import { formatUsd } from '../utils/cryptoHD';
import { Award, RefreshCw, Copy, Check, Bot, Zap, ArrowDownRight, ArrowUpRight, ShieldCheck, Sparkles, Gift, Flame, Trophy } from 'lucide-react';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

interface VaultSetupViewProps {
  user: UserProfile;
  onBalanceUpdate: (newBalanceUsd: number) => void;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onMasterSeedChange?: (newSeed: string) => void;
}

export const VaultSetupView: React.FC<VaultSetupViewProps> = ({
  user,
  onBalanceUpdate,
  onOpenDeposit,
  onOpenWithdraw,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isClaimingRakeback, setIsClaimingRakeback] = useState(false);
  const [rakebackMessage, setRakebackMessage] = useState<string | null>(null);

  const claimableRakeback = Math.max(0, Number((user.rakebackEarnedUsd - user.rakebackClaimedUsd).toFixed(2)));

  // VIP Tier Calculations
  const vipTiers = [
    { name: 'Bronze', requiredWager: 0, rakebackRate: '0.5%', bonus: '$0', icon: Award, color: 'text-amber-600', border: 'border-amber-700/40', bg: 'bg-amber-950/20' },
    { name: 'Silver', requiredWager: 1000, rakebackRate: '1.0%', bonus: '$10', icon: Trophy, color: 'text-slate-300', border: 'border-slate-400/40', bg: 'bg-slate-800/20' },
    { name: 'Gold', requiredWager: 5000, rakebackRate: '1.2%', bonus: '$50', icon: Flame, color: 'text-amber-400', border: 'border-amber-400/40', bg: 'bg-amber-900/20' },
    { name: 'Platinum', requiredWager: 25000, rakebackRate: '1.5%', bonus: '$250', icon: Sparkles, color: 'text-indigo-400', border: 'border-indigo-400/40', bg: 'bg-indigo-950/20' },
    { name: 'Diamond', requiredWager: 100000, rakebackRate: '2.0%', bonus: '$1,000', icon: Gift, color: 'text-cyan-400', border: 'border-cyan-400/40', bg: 'bg-cyan-950/20' },
  ];

  const currentTierIdx = vipTiers.findIndex((t) => t.name === user.vipTier);
  const nextTier = vipTiers[currentTierIdx + 1] || vipTiers[vipTiers.length - 1];
  const isMaxTier = currentTierIdx === vipTiers.length - 1;
  const progressPercent = isMaxTier
    ? 100
    : Math.min(100, Math.round((user.totalWageredUsd / (nextTier.requiredWager || 1)) * 100));

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    sound.playClick();
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleClaimRakeback = async () => {
    if (claimableRakeback <= 0 || isClaimingRakeback) return;

    try {
      setIsClaimingRakeback(true);
      sound.playClick();
      const res = await api.claimRakeback(user.id);

      sound.playCashout();
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      onBalanceUpdate(res.updatedBalanceUsd);
      setRakebackMessage(`Claimed ${formatUsd(res.claimedAmountUsd)} Rakeback directly to your live balance!`);
      setTimeout(() => {
        setIsClaimingRakeback(false);
        setRakebackMessage(null);
      }, 3000);
    } catch (err: any) {
      setIsClaimingRakeback(false);
      setRakebackMessage(err.message || 'Failed to claim rakeback.');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-3 sm:p-4 space-y-4 pb-20">
      
      {/* VIP & Rakeback Dashboard Card */}
      <div className="p-5 sm:p-6 bg-[#0a122a] border border-[#c0c0c0]/20 rounded-3xl shadow-xl backdrop-blur-md space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/40 flex items-center justify-center text-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.25)]">
              <Award className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white font-['Syne',sans-serif] uppercase tracking-wider">
                  VIP Rewards & Wager Status
                </h2>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-[#00ff41]/15 border border-[#00ff41]/40 text-[#00ff41] uppercase tracking-wider">
                  {user.vipTier} VIP
                </span>
              </div>
              <p className="text-xs text-[#c0c0c0]">Earn up to 2.0% instant rakeback on every single game wager</p>
            </div>
          </div>

          {/* Claim Rakeback Button */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-[#c0c0c0] uppercase font-bold tracking-wider">Claimable Rakeback</div>
              <div className="text-sm sm:text-base font-black font-mono text-[#00ff41]">{formatUsd(claimableRakeback)}</div>
            </div>

            <button
              id="claim-rakeback-btn"
              onClick={handleClaimRakeback}
              disabled={claimableRakeback <= 0 || isClaimingRakeback}
              className="px-4 py-2.5 bg-[#00ff41] hover:bg-white text-black font-black uppercase text-xs tracking-wider rounded-xl shadow-[0_0_15px_rgba(0,255,65,0.3)] disabled:opacity-50 transition-all flex items-center gap-1.5 active:scale-95"
            >
              {isClaimingRakeback ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
              <span>Claim Rakeback</span>
            </button>
          </div>
        </div>

        {rakebackMessage && (
          <div className="p-3 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/40 text-[#00ff41] text-xs font-bold font-mono animate-in fade-in">
            {rakebackMessage}
          </div>
        )}

        {/* Wager Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#c0c0c0] font-bold">
              Total Wagered: <strong className="text-[#00ff41]">{formatUsd(user.totalWageredUsd)}</strong>
            </span>
            <span className="text-[#c0c0c0]">
              {isMaxTier ? (
                <span className="text-[#00ff41] font-bold">Max VIP Tier Unlocked (Diamond)</span>
              ) : (
                <>Next Rank: <strong className="text-white font-bold">{nextTier.name} ({formatUsd(nextTier.requiredWager)})</strong></>
              )}
            </span>
          </div>

          <div className="w-full h-3.5 bg-[#050b18] rounded-full overflow-hidden border border-[#c0c0c0]/20 p-0.5">
            <div
              className="h-full bg-[#00ff41] rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(0,255,65,0.6)]"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between items-center text-[10px] font-mono text-[#c0c0c0]">
            <span>Current: <strong className="text-white">{user.vipTier}</strong></span>
            <span>Progress: <strong className="text-[#00ff41]">{progressPercent}%</strong></span>
          </div>
        </div>

        {/* VIP Tier Perks Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-[#c0c0c0]/15">
          {vipTiers.map((tier) => {
            const isAchieved = user.totalWageredUsd >= tier.requiredWager;
            const TierIcon = tier.icon;
            return (
              <div
                key={tier.name}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  isAchieved
                    ? 'bg-[#1a2b4b] border-[#00ff41] shadow-[0_0_12px_rgba(0,255,65,0.2)]'
                    : 'bg-[#050b18] border-[#c0c0c0]/15 opacity-60'
                }`}
              >
                <div className="flex items-center justify-center mb-1.5">
                  <TierIcon className={`w-4 h-4 ${tier.color}`} />
                </div>
                <div className="text-xs font-black text-white uppercase tracking-wider">{tier.name}</div>
                <div className="text-[10px] text-[#c0c0c0] font-mono mt-0.5">Wager {formatUsd(tier.requiredWager)}</div>
                <div className="text-xs font-black text-[#00ff41] mt-1">{tier.rakebackRate} Rakeback</div>
              </div>
            );
          })}
        </div>

        {/* Quick Deposit & Withdraw Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#c0c0c0]/15">
          <button
            id="vault-quick-deposit-btn"
            onClick={() => { onOpenDeposit(); sound.playClick(); }}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#00ff41] hover:bg-white text-black font-black uppercase text-xs tracking-wider shadow-[0_0_15px_rgba(0,255,65,0.3)] transition-all active:scale-98"
          >
            <ArrowDownRight className="w-4 h-4 stroke-[3]" />
            <span>Deposit Crypto</span>
          </button>
          <button
            id="vault-quick-withdraw-btn"
            onClick={() => { onOpenWithdraw(); sound.playClick(); }}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#1a2b4b] hover:bg-[#00ff41] hover:text-black text-white border border-[#c0c0c0]/20 font-black uppercase text-xs tracking-wider transition-all active:scale-98"
          >
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            <span>Withdraw Crypto</span>
          </button>
        </div>
      </div>

      {/* VIP Club Exclusive Perks Card */}
      <div className="p-5 sm:p-6 bg-[#0a122a] border border-[#c0c0c0]/20 rounded-3xl shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/40 flex items-center justify-center text-[#00ff41]">
            <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white font-['Syne',sans-serif] uppercase tracking-wider">
              VIP Club Privileges & Benefits
            </h3>
            <p className="text-xs text-[#c0c0c0]">Automated loyalty rewards calculated in real-time</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/15 space-y-1">
            <div className="text-xs font-black text-[#00ff41] uppercase flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Instant Rakeback</span>
            </div>
            <p className="text-[11px] text-[#c0c0c0] leading-relaxed">
              Every bet placed in Mines or Towers instantly accumulates claimable cash back to your balance.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/15 space-y-1">
            <div className="text-xs font-black text-[#00ff41] uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Zero Deposit Fees</span>
            </div>
            <p className="text-[11px] text-[#c0c0c0] leading-relaxed">
              100% of your incoming cryptocurrency deposits are credited at real-time market exchange rates.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/15 space-y-1">
            <div className="text-xs font-black text-[#00ff41] uppercase flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              <span>Fast Withdrawals</span>
            </div>
            <p className="text-[11px] text-[#c0c0c0] leading-relaxed">
              Automated high-speed blockchain withdrawals processed directly to your destination crypto address.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
