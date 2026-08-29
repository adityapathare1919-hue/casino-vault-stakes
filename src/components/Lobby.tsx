import React, { useState, useEffect } from 'react';
import { UserProfile, CryptoSymbol, BetRecord } from '../types';
import { CRYPTO_CONFIGS, formatUsd } from '../utils/cryptoHD';
import { Bomb, Castle, ArrowDownRight, ArrowUpRight, ShieldCheck, Sparkles, TrendingUp, Zap, Play, Award, CheckCircle2 } from 'lucide-react';
import { sound } from '../utils/audio';
import { api } from '../services/api';

interface LobbyProps {
  user: UserProfile;
  prices: Record<CryptoSymbol, number>;
  onSelectGame: (game: 'mines' | 'towers') => void;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onOpenFairModal: () => void;
  onOpenVIP: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  user,
  prices,
  onSelectGame,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenFairModal,
  onOpenVIP,
}) => {
  const cryptos: CryptoSymbol[] = ['BTC', 'ETH', 'LTC', 'SOL', 'USDT'];
  const [recentBets, setRecentBets] = useState<BetRecord[]>([]);

  useEffect(() => {
    api.getHistory(user.id)
      .then((data) => {
        if (data.bets && Array.isArray(data.bets)) {
          setRecentBets(data.bets.slice(0, 4));
        }
      })
      .catch(() => {});
  }, [user.id, user.balanceUsd]);

  return (
    <div className="w-full max-w-5xl mx-auto p-3 sm:p-6 space-y-6 pb-24">
      
      {/* Hero Welcome & Quick Bankroll Banner */}
      <div 
        id="lobby-hero-banner"
        className="relative overflow-hidden rounded-3xl border border-[#c0c0c0]/30 bg-[#0a122a]/90 backdrop-blur-md p-6 sm:p-8 shadow-2xl"
      >
        {/* Ambient background neon laser accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00ff41]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#1a2b4b]/40 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute top-1/2 left-0 w-32 h-[1px] bg-gradient-to-r from-[#00ff41]/20 to-transparent rotate-45 pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-0 w-64 h-[1px] bg-gradient-to-l from-[#00ff41]/10 to-transparent -rotate-12 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00ff41]/10 border border-[#00ff41]/40 text-[#00ff41] text-xs font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse"></span>
              <span>12-WORD MASTER HD VAULT ACTIVE</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight font-['Syne',sans-serif] leading-tight">
              High-Stakes Crypto Mini App & Telegram Bot
            </h1>
            
            <p className="text-xs sm:text-sm text-[#c0c0c0] leading-relaxed">
              Automated multi-crypto deposits directly swept to parent master cold vaults. Instant live USD conversion and Provably Fair cryptographic gaming with 99% RTP.
            </p>
          </div>

          {/* Quick Action Box */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            <button
              id="hero-deposit-action-btn"
              onClick={() => { onOpenDeposit(); sound.playClick(); }}
              className="flex items-center justify-center gap-2 py-3.5 px-6 bg-[#00ff41] hover:bg-white text-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(0,255,65,0.35)] active:scale-95 transition-all"
            >
              <ArrowDownRight className="w-4 h-4 stroke-[3]" />
              <span>Deposit Crypto</span>
            </button>

            <button
              id="hero-vip-action-btn"
              onClick={() => { onOpenVIP(); sound.playClick(); }}
              className="flex items-center justify-center gap-2 py-3 px-5 bg-[#1a2b4b] hover:bg-[#00ff41] hover:text-black text-white font-bold text-xs uppercase tracking-wider rounded-2xl border border-[#c0c0c0]/20 transition-all"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>VIP Tier: {user.vipTier}</span>
            </button>
          </div>
        </div>

        {/* Crypto Rates Ticker */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-6 pt-5 border-t border-[#c0c0c0]/20 text-xs">
          {cryptos.map((sym) => {
            const cfg = CRYPTO_CONFIGS[sym];
            const price = prices[sym] || cfg.currentPriceUsd;
            return (
              <div key={sym} className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/15 hover:border-[#00ff41]/40 transition-colors">
                <span 
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ backgroundColor: `${cfg.color}25`, color: cfg.color }}
                >
                  {cfg.icon}
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-white text-xs">{sym}</div>
                  <div className="text-[10px] text-[#00ff41] font-mono font-semibold">${price.toLocaleString()}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Featured Games Section */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00ff41] shadow-[0_0_8px_#00ff41]"></div>
            <h2 className="text-lg sm:text-xl font-black text-white font-['Syne',sans-serif] uppercase tracking-wider">
              Featured In-Chat & Mini App Games
            </h2>
          </div>
          <span className="text-xs text-[#00ff41] font-mono font-bold">99.00% Provably Fair RTP</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          
          {/* MINES GAME CARD */}
          <div 
            id="game-card-mines"
            onClick={() => { onSelectGame('mines'); sound.playClick(); }}
            className="group relative rounded-3xl border border-[#c0c0c0]/30 bg-[#0a122a]/80 p-6 backdrop-blur-md hover:border-[#00ff41] shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ff41]/5 rounded-full blur-2xl group-hover:bg-[#00ff41]/15 transition-all"></div>

            <div>
              <div className="flex justify-between items-start mb-4">
                <span className="text-[#c0c0c0] font-mono text-xs font-bold uppercase tracking-wider">MINES.EXE</span>
                <span className="px-2.5 py-1 bg-[#c0c0c0]/10 text-[10px] text-[#c0c0c0] rounded-lg font-bold uppercase tracking-wider">
                  Up to 10,000x
                </span>
              </div>

              <div className="p-3 bg-[#00ff41]/10 rounded-2xl text-[#00ff41] w-fit mb-4 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(0,255,65,0.2)]">
                <Bomb className="w-7 h-7" />
              </div>

              <h3 className="text-xl font-black text-white font-['Syne',sans-serif] mb-1 group-hover:text-[#00ff41] transition-colors">
                MINES CASINO
              </h3>
              <p className="text-xs sm:text-sm text-[#c0c0c0] leading-relaxed mb-4">
                Classic 5x5 grid matrix. Choose 1 to 24 mines, uncover lucky gems, and cash out multiplying crypto payouts anytime!
              </p>

              <div className="w-full h-1.5 bg-[#1a2b4b] rounded-full overflow-hidden mb-4">
                <div className="w-4/5 h-full bg-[#00ff41] shadow-[0_0_10px_#00ff41]"></div>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-3 border-t border-[#c0c0c0]/15">
              <div className="flex items-center gap-1.5 text-[#00ff41] font-mono">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SHA-256 Verified</span>
              </div>

              <button className="px-4 py-2 bg-[#1a2b4b] group-hover:bg-[#00ff41] group-hover:text-black text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5">
                <span>Play Mines</span>
                <Play className="w-3 h-3 fill-current" />
              </button>
            </div>
          </div>

          {/* TOWERS GAME CARD */}
          <div 
            id="game-card-towers"
            onClick={() => { onSelectGame('towers'); sound.playClick(); }}
            className="group relative rounded-3xl border border-[#c0c0c0]/30 bg-[#0a122a]/80 p-6 backdrop-blur-md hover:border-[#00ff41] shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/15 transition-all"></div>

            <div>
              <div className="flex justify-between items-start mb-4">
                <span className="text-[#c0c0c0] font-mono text-xs font-bold uppercase tracking-wider">TOWERS.EXE</span>
                <span className="px-2.5 py-1 bg-[#c0c0c0]/10 text-[10px] text-[#c0c0c0] rounded-lg font-bold uppercase tracking-wider">
                  9-Tier Climb
                </span>
              </div>

              <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400 w-fit mb-4 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Castle className="w-7 h-7" />
              </div>

              <h3 className="text-xl font-black text-white font-['Syne',sans-serif] mb-1 group-hover:text-amber-300 transition-colors">
                TOWERS OF FORTUNE
              </h3>
              <p className="text-xs sm:text-sm text-[#c0c0c0] leading-relaxed mb-4">
                Ascend the cyber tower row by row. Pick safe stepping tiles and avoid hidden bombs. 5 selectable difficulty modes!
              </p>

              <div className="w-full h-1.5 bg-[#1a2b4b] rounded-full overflow-hidden mb-4">
                <div className="w-3/5 h-full bg-amber-400 shadow-[0_0_10px_#f59e0b]"></div>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-3 border-t border-[#c0c0c0]/15">
              <div className="flex items-center gap-1.5 text-amber-400 font-mono">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Multi-Difficulty</span>
              </div>

              <button className="px-4 py-2 bg-[#1a2b4b] group-hover:bg-[#00ff41] group-hover:text-black text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5">
                <span>Play Towers</span>
                <Play className="w-3 h-3 fill-current" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Live Recent Bets Section */}
      <div className="rounded-3xl border border-[#c0c0c0]/30 bg-[#0a122a]/80 backdrop-blur-md p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#00ff41]" />
            <span>Recent Player Bet Activity</span>
          </div>
          <span className="text-[#00ff41] font-mono text-[11px]">PROVABLY FAIR LEDGER</span>
        </div>

        {recentBets.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/15 text-center text-xs text-[#c0c0c0] space-y-1">
            <p className="font-bold text-white uppercase tracking-wider">No Bets Placed Yet</p>
            <p className="text-[11px]">Play a round of Mines or Towers to see your live cryptographic bets recorded here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {recentBets.map((bet) => (
              <div key={bet.id} className="flex items-center justify-between p-3 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/20 hover:border-[#00ff41]/40 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                    bet.won ? 'bg-[#00ff41]/20 text-[#00ff41]' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {bet.game === 'mines' ? '💣' : '🏰'}
                  </div>
                  <div>
                    <div className="font-bold text-white capitalize">{bet.game} • {bet.multiplier.toFixed(2)}x</div>
                    <div className="text-[10px] text-[#c0c0c0] font-mono">Wager: ${bet.amountUsd.toFixed(2)}</div>
                  </div>
                </div>

                <div className={`text-right font-mono font-black text-sm tabular-nums ${
                  bet.won ? 'text-[#00ff41]' : 'text-red-400'
                }`}>
                  {bet.won ? `+$${bet.payoutUsd.toFixed(2)}` : `-$${bet.amountUsd.toFixed(2)}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
