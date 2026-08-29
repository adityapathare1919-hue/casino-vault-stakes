import React, { useState } from 'react';
import { UserProfile, CryptoSymbol } from '../types';
import { CRYPTO_CONFIGS, formatUsd, formatCryptoAmount } from '../utils/cryptoHD';
import { ArrowDownLeft, ArrowUpRight, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import { sound } from '../utils/audio';

interface HeaderProps {
  user: UserProfile;
  prices: Record<CryptoSymbol, number>;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  prices,
  onOpenDeposit,
  onOpenWithdraw,
}) => {
  const [showBalanceDropdown, setShowBalanceDropdown] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = () => {
    sound.isMuted = !sound.isMuted;
    setIsMuted(sound.isMuted);
    sound.playClick();
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Diamond': return 'text-cyan-400 border-cyan-500/40 bg-cyan-950/30';
      case 'Platinum': return 'text-purple-400 border-purple-500/40 bg-purple-950/30';
      case 'Gold': return 'text-amber-400 border-amber-500/40 bg-amber-950/30';
      case 'Silver': return 'text-slate-300 border-slate-400/40 bg-slate-800/40';
      default: return 'text-amber-600 border-amber-700/40 bg-amber-950/20';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0a122a] border-b border-[#c0c0c0]/30 shadow-2xl backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-6">
        
        {/* TOP LEFT: Stylish "VS" Monogram & Brand */}
        <div className="flex items-center gap-3">
          <div 
            id="vs-monogram-logo" 
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#00ff41] to-[#008f11] flex items-center justify-center shadow-[0_0_15px_rgba(0,255,65,0.4)] group cursor-pointer shrink-0 transition-transform active:scale-95"
          >
            <span className="font-['Syne',sans-serif] font-black text-xl text-black tracking-tighter select-none">
              VS
            </span>
          </div>

          <div className="hidden sm:block h-8 w-[1px] bg-[#c0c0c0]/40"></div>

          <div className="hidden min-[450px]:flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-[#c0c0c0] font-bold">
              Vault Stakes
            </span>
            <span className="text-[#00ff41] text-xs font-mono font-bold">
              v1.0.4 Live
            </span>
          </div>
        </div>

        {/* TOP MIDDLE: Balance in USD with Dropdown */}
        <div className="relative flex flex-col items-center">
          <div 
            id="user-balance-card"
            onClick={() => setShowBalanceDropdown(!showBalanceDropdown)}
            className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/20 hover:border-[#00ff41]/60 cursor-pointer transition-all duration-200 shadow-inner group"
          >
            <div className="flex flex-col items-center">
              <div className="text-base sm:text-2xl font-black tracking-tight flex items-baseline gap-1.5 tabular-nums">
                <span className="text-[#00ff41] text-xs sm:text-base font-bold">$</span>
                <span className="text-white">{user.balanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse"></span>
                <span className="text-[9px] text-[#c0c0c0] uppercase tracking-tighter font-semibold">
                  Real-Time USD
                </span>
              </div>
            </div>

            <ChevronDown className={`w-3.5 h-3.5 text-[#c0c0c0] group-hover:text-[#00ff41] transition-transform duration-200 ${showBalanceDropdown ? 'rotate-180' : ''}`} />
          </div>

          {/* Balance Breakdown Dropdown */}
          {showBalanceDropdown && (
            <div 
              id="balance-dropdown-menu"
              className="absolute top-full mt-2 w-72 bg-[#0a122a] border border-[#c0c0c0]/40 rounded-2xl shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#c0c0c0]/20 mb-2.5">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Account Balance</span>
                <span className="text-[10px] text-[#00ff41] font-mono font-bold">USD Live Ledger</span>
              </div>
              
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#050b18] border border-[#c0c0c0]/15">
                  <span className="text-[#c0c0c0]">Playable Balance:</span>
                  <span className="text-[#00ff41] font-bold text-sm">${user.balanceUsd.toFixed(2)} USD</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#050b18] border border-[#c0c0c0]/15">
                  <span className="text-[#c0c0c0]">Total Deposited:</span>
                  <span className="text-white font-bold">${user.totalDepositedUsd.toFixed(2)} USD</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#050b18] border border-[#c0c0c0]/15">
                  <span className="text-[#c0c0c0]">Total Withdrawn:</span>
                  <span className="text-white font-bold">${user.totalWithdrawnUsd.toFixed(2)} USD</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#050b18] border border-[#c0c0c0]/15">
                  <span className="text-[#c0c0c0]">VIP Rakeback:</span>
                  <span className="text-amber-400 font-bold">${Math.max(0, user.rakebackEarnedUsd - user.rakebackClaimedUsd).toFixed(2)} USD</span>
                </div>
              </div>

              {/* Quick Actions in Dropdown */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-[#c0c0c0]/20">
                <button
                  id="header-dropdown-deposit-btn"
                  onClick={() => { setShowBalanceDropdown(false); onOpenDeposit(); sound.playClick(); }}
                  className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-[#00ff41] hover:bg-white text-black font-black text-xs shadow-[0_0_10px_rgba(0,255,65,0.3)] transition-colors uppercase"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                  Deposit
                </button>
                <button
                  id="header-dropdown-withdraw-btn"
                  onClick={() => { setShowBalanceDropdown(false); onOpenWithdraw(); sound.playClick(); }}
                  className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-[#1a2b4b] hover:bg-[#00ff41] hover:text-black text-white font-bold text-xs border border-[#c0c0c0]/20 transition-all uppercase"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  Withdraw
                </button>
              </div>
            </div>
          )}
        </div>

        {/* TOP RIGHT: Controls & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mute Toggle */}
          <button
            id="sound-toggle-btn"
            onClick={toggleMute}
            className="p-2 rounded-xl bg-[#1a2b4b] hover:bg-[#00ff41] hover:text-black text-[#c0c0c0] border border-[#c0c0c0]/20 transition-colors"
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Telegram User Profile Avatar & VIP Badge */}
          <div 
            id="user-profile-header-badge" 
            className="flex items-center gap-2 pl-2 pr-2.5 py-1 bg-[#050b18] border border-[#c0c0c0]/30 rounded-2xl shadow-inner"
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-[#00ff41] p-0.5 bg-[#050b18] flex items-center justify-center shrink-0">
              <img 
                src={user.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"} 
                alt={user.firstName}
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="hidden md:flex flex-col text-right leading-tight">
              <span className="text-xs font-bold text-white">@{user.username}</span>
              <span className="text-[10px] text-[#00ff41] font-mono font-bold uppercase tracking-tighter">
                {user.vipTier} VIP
              </span>
            </div>
          </div>

        </div>

      </div>
    </header>
  );
};
