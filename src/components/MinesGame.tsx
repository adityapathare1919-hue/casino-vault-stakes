import React, { useState, useEffect } from 'react';
import { UserProfile, CryptoSymbol, MinesGameState } from '../types';
import { getMinesMultiplier } from '../utils/provablyFair';
import { formatUsd } from '../utils/cryptoHD';
import { Bomb, Gem, ShieldCheck, RefreshCw, Volume2, Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

interface MinesGameProps {
  user: UserProfile;
  onBalanceUpdate: (newBalanceUsd: number) => void;
  onOpenDeposit: () => void;
  onOpenFairModal: (seedHash: string, serverSeed?: string, clientSeed?: string, nonce?: number) => void;
}

export const MinesGame: React.FC<MinesGameProps> = ({
  user,
  onBalanceUpdate,
  onOpenDeposit,
  onOpenFairModal,
}) => {
  const [betAmount, setBetAmount] = useState<number>(10);
  const [minesCount, setMinesCount] = useState<number>(3);
  const [gameState, setGameState] = useState<MinesGameState | null>(null);
  const [revealedMinePositions, setRevealedMinePositions] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const minePresets = [1, 3, 5, 10, 24];
  const isPlaying = gameState?.status === 'in_progress';
  const totalTiles = 25;
  const gemsCount = totalTiles - minesCount;

  // Calculate potential next multiplier
  const currentRevealedCount = gameState?.revealedTiles.length || 0;
  const nextMultiplier = getMinesMultiplier(minesCount, currentRevealedCount + 1);

  const handleStartGame = async () => {
    setErrorMsg(null);
    if (betAmount <= 0) {
      setErrorMsg('Bet amount must be greater than $0.');
      return;
    }
    if (betAmount > user.balanceUsd) {
      setErrorMsg('Insufficient balance! Please deposit to play.');
      return;
    }

    try {
      setIsLoading(true);
      sound.playClick();
      const res = await api.startMines(betAmount, minesCount, user.id);

      onBalanceUpdate(res.updatedBalanceUsd);
      setRevealedMinePositions([]);
      setGameState({
        id: res.gameId,
        betAmountUsd: betAmount,
        cryptoSymbol: 'USDT',
        minesCount,
        gemsCount: 25 - minesCount,
        revealedTiles: [],
        currentMultiplier: 1.0,
        currentPayoutUsd: betAmount,
        status: 'in_progress',
        serverSeedHash: res.serverSeedHash,
        clientSeed: res.clientSeed,
        nonce: res.nonce,
      });
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Failed to start game.');
    }
  };

  const handleTileClick = async (tileIndex: number) => {
    if (!gameState || !isPlaying || isLoading) return;
    if (gameState.revealedTiles.includes(tileIndex)) return;

    try {
      setIsLoading(true);
      const res = await api.revealMinesTile(gameState.id, tileIndex);

      if (res.isMine) {
        // Hit Mine!
        sound.playExplosion();
        setRevealedMinePositions(res.minePositions || [tileIndex]);
        setGameState((prev) =>
          prev
            ? {
                ...prev,
                status: 'lost',
                revealedTiles: [...prev.revealedTiles, tileIndex],
                serverSeed: res.serverSeed,
                minePositions: res.minePositions,
                currentMultiplier: 0,
                currentPayoutUsd: 0,
              }
            : null
        );
      } else {
        // Safe Gem!
        sound.playGem(res.revealedTiles.length - 1);
        if (res.status === 'won') {
          // All gems cleared
          sound.playCashout();
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
          if (res.updatedBalanceUsd !== undefined) {
            onBalanceUpdate(res.updatedBalanceUsd);
          }
          setRevealedMinePositions(res.minePositions || []);
          setGameState((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'won',
                  revealedTiles: res.revealedTiles,
                  currentMultiplier: res.currentMultiplier,
                  currentPayoutUsd: res.currentPayoutUsd,
                  serverSeed: res.serverSeed,
                  minePositions: res.minePositions,
                }
              : null
          );
        } else {
          setGameState((prev) =>
            prev
              ? {
                  ...prev,
                  revealedTiles: res.revealedTiles,
                  currentMultiplier: res.currentMultiplier,
                  currentPayoutUsd: res.currentPayoutUsd,
                }
              : null
          );
        }
      }
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Failed to reveal tile.');
    }
  };

  const handleCashout = async () => {
    if (!gameState || !isPlaying || isLoading || gameState.revealedTiles.length === 0) return;

    try {
      setIsLoading(true);
      sound.playClick();
      const res = await api.cashoutMines(gameState.id);

      sound.playCashout();
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#f59e0b'],
      });

      if (res.updatedBalanceUsd !== undefined) {
        onBalanceUpdate(res.updatedBalanceUsd);
      }
      setRevealedMinePositions(res.minePositions || []);
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              status: 'cashed_out',
              currentMultiplier: res.multiplier,
              currentPayoutUsd: res.payoutUsd,
              serverSeed: res.serverSeed,
              minePositions: res.minePositions,
            }
          : null
      );
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Failed to cashout.');
    }
  };

  const handleQuickBet = (action: 'half' | 'double' | 'min' | 'max') => {
    if (isPlaying) return;
    sound.playClick();
    if (action === 'half') setBetAmount((b) => Math.max(1, Number((b / 2).toFixed(2))));
    if (action === 'double') setBetAmount((b) => Math.min(user.balanceUsd, Number((b * 2).toFixed(2))));
    if (action === 'min') setBetAmount(1);
    if (action === 'max') setBetAmount(user.balanceUsd > 0 ? user.balanceUsd : 100);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-3 sm:p-6 space-y-6 pb-24">
      
      {/* Top Banner / Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl border border-[#c0c0c0]/30 bg-[#0a122a]/90 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/40 flex items-center justify-center text-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.25)]">
            <Bomb className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white font-['Syne',sans-serif] uppercase tracking-wider">
                MINES CASINO
              </h1>
              <span className="px-2 py-0.5 rounded bg-[#c0c0c0]/10 text-[#00ff41] text-[10px] font-mono font-bold uppercase">
                MINES.EXE
              </span>
            </div>
            <p className="text-xs text-[#c0c0c0]">Uncover lucky gems & cash out multiplying payouts</p>
          </div>
        </div>

        {/* Provably Fair Button */}
        <button
          onClick={() =>
            onOpenFairModal(
              gameState?.serverSeedHash || '',
              gameState?.serverSeed,
              gameState?.clientSeed || user.clientSeed,
              gameState?.nonce || user.nonce
            )
          }
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1a2b4b] hover:bg-[#00ff41] hover:text-black border border-[#c0c0c0]/20 text-[#c0c0c0] text-xs font-bold uppercase tracking-wider transition-all"
        >
          <ShieldCheck className="w-4 h-4 text-[#00ff41] group-hover:text-black" />
          <span>Provably Fair</span>
        </button>
      </div>

      {/* Main Grid & Controls Container */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Game Controls (Bet & Mines selector) */}
        <div className="md:col-span-5 rounded-3xl border border-[#c0c0c0]/30 bg-[#0a122a]/80 backdrop-blur-md p-6 space-y-5 shadow-2xl order-2 md:order-1">
          {/* Bet Amount Input */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-[#c0c0c0] uppercase tracking-wider mb-2">
              <span>Bet Amount (USD)</span>
              <span className="text-white">Balance: <strong className="text-[#00ff41] font-mono">{formatUsd(user.balanceUsd)}</strong></span>
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#00ff41] font-black">$</div>
              <input
                type="number"
                disabled={isPlaying}
                min="0.1"
                step="1"
                value={betAmount}
                onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-3 py-2.5 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/20 text-white font-mono font-bold text-sm focus:border-[#00ff41] focus:outline-none disabled:opacity-60 transition-colors"
              />
            </div>

            {/* Quick shortcuts */}
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              <button
                disabled={isPlaying}
                onClick={() => handleQuickBet('half')}
                className="py-1.5 rounded-xl bg-[#1a2b4b] hover:bg-[#00ff41] hover:text-black border border-[#c0c0c0]/15 text-[#c0c0c0] text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                1/2
              </button>
              <button
                disabled={isPlaying}
                onClick={() => handleQuickBet('double')}
                className="py-1.5 rounded-xl bg-[#1a2b4b] hover:bg-[#00ff41] hover:text-black border border-[#c0c0c0]/15 text-[#c0c0c0] text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                2x
              </button>
              <button
                disabled={isPlaying}
                onClick={() => handleQuickBet('min')}
                className="py-1.5 rounded-xl bg-[#1a2b4b] hover:bg-[#00ff41] hover:text-black border border-[#c0c0c0]/15 text-[#c0c0c0] text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                Min
              </button>
              <button
                disabled={isPlaying}
                onClick={() => handleQuickBet('max')}
                className="py-1.5 rounded-xl bg-[#1a2b4b] hover:bg-[#00ff41] hover:text-black border border-[#c0c0c0]/15 text-[#c0c0c0] text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                Max
              </button>
            </div>
          </div>

          {/* Mines Count Selector */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-[#c0c0c0] uppercase tracking-wider mb-2">
              <span>Mines Count</span>
              <span className="text-[#00ff41] font-mono font-bold">{minesCount} Mines / {25 - minesCount} Gems</span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {minePresets.map((count) => (
                <button
                  key={count}
                  disabled={isPlaying}
                  onClick={() => { setMinesCount(count); sound.playClick(); }}
                  className={`py-2 rounded-xl border text-xs font-black font-mono transition-all ${
                    minesCount === count
                      ? 'bg-[#00ff41] border-[#00ff41] text-black shadow-[0_0_12px_rgba(0,255,65,0.3)]'
                      : 'bg-[#050b18] border-[#c0c0c0]/20 hover:border-[#00ff41]/50 text-white'
                  } disabled:opacity-50`}
                >
                  {count}
                </button>
              ))}
            </div>

            <input
              type="range"
              disabled={isPlaying}
              min="1"
              max="24"
              value={minesCount}
              onChange={(e) => setMinesCount(parseInt(e.target.value))}
              className="w-full mt-3 accent-[#00ff41] cursor-pointer disabled:opacity-50"
            />
          </div>

          {/* Error notice */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Primary Action Button (Bet or Cashout) */}
          {!isPlaying ? (
            <button
              id="mines-start-bet-btn"
              onClick={handleStartGame}
              disabled={isLoading || user.balanceUsd < betAmount}
              className="w-full py-4 bg-[#00ff41] hover:bg-white text-black font-black text-sm uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(0,255,65,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating Seed...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-black" />
                  Start Bet ({formatUsd(betAmount)})
                </>
              )}
            </button>
          ) : (
            <button
              id="mines-cashout-btn"
              onClick={handleCashout}
              disabled={isLoading || gameState.revealedTiles.length === 0}
              className="w-full py-4 bg-amber-400 hover:bg-white text-black font-black text-sm uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-[0.98] transition-all flex flex-col items-center justify-center leading-tight disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <span>CASHOUT</span>
                <span className="font-mono font-black">{gameState.currentMultiplier.toFixed(2)}x</span>
              </div>
              <span className="text-xs font-mono font-black mt-0.5">
                {formatUsd(gameState.currentPayoutUsd)}
              </span>
            </button>
          )}

          {/* Quick stats panel */}
          {isPlaying && (
            <div className="p-3 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/20 grid grid-cols-2 gap-2 text-center text-xs font-mono">
              <div className="p-2 rounded-xl bg-[#1a2b4b]">
                <div className="text-[10px] text-[#c0c0c0] uppercase">Gems Left</div>
                <div className="text-[#00ff41] font-bold text-sm">{gemsCount - currentRevealedCount} / {gemsCount}</div>
              </div>
              <div className="p-2 rounded-xl bg-[#1a2b4b]">
                <div className="text-[10px] text-[#c0c0c0] uppercase">Next Multiplier</div>
                <div className="text-amber-400 font-bold text-sm">{nextMultiplier.toFixed(2)}x</div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: 5x5 Mines Tile Board */}
        <div className="md:col-span-7 rounded-3xl border border-[#c0c0c0]/30 bg-[#0a122a]/90 backdrop-blur-md p-6 shadow-2xl order-1 md:order-2">
          {/* Active Multiplier Indicator / Game Outcome Status */}
          <div className="flex items-center justify-between mb-4 px-2">
            <span className="text-xs font-bold text-[#c0c0c0] uppercase tracking-wider">5x5 Grid Matrix</span>
            {gameState?.status === 'cashed_out' && (
              <span className="text-xs font-bold text-[#00ff41] bg-[#00ff41]/10 px-2.5 py-1 rounded-lg border border-[#00ff41]/40 shadow-[0_0_10px_rgba(0,255,65,0.2)]">
                🎉 Won {formatUsd(gameState.currentPayoutUsd)} ({gameState.currentMultiplier.toFixed(2)}x)
              </span>
            )}
            {gameState?.status === 'lost' && (
              <span className="text-xs font-bold text-red-400 bg-red-950/60 px-2.5 py-1 rounded-lg border border-red-500/40">
                💥 Detonated Mine! Bet Lost.
              </span>
            )}
            {isPlaying && (
              <span className="text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-500/40">
                Current: {gameState.currentMultiplier.toFixed(2)}x
              </span>
            )}
          </div>

          {/* 5x5 Grid */}
          <div className="grid grid-cols-5 gap-2 sm:gap-3 aspect-square max-w-sm mx-auto p-2 bg-[#050b18] rounded-2xl border border-[#c0c0c0]/20">
            {Array.from({ length: 25 }).map((_, index) => {
              const isRevealed = gameState?.revealedTiles.includes(index);
              const isMine = revealedMinePositions.includes(index);
              const isGameOver = gameState?.status === 'lost' || gameState?.status === 'won' || gameState?.status === 'cashed_out';

              return (
                <button
                  key={index}
                  id={`mines-tile-${index}`}
                  disabled={!isPlaying || isRevealed || isLoading}
                  onClick={() => handleTileClick(index)}
                  className={`relative rounded-xl font-bold flex items-center justify-center transition-all duration-200 select-none shadow-md ${
                    isRevealed
                      ? isMine
                        ? 'bg-red-600 border-2 border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse'
                        : 'bg-gradient-to-br from-[#00ff41] to-[#008f11] text-black border-2 border-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.4)]'
                      : isGameOver && isMine
                      ? 'bg-red-950/70 border border-red-500/50 opacity-75'
                      : isPlaying
                      ? 'bg-[#0a122a] hover:bg-[#1a2b4b] active:scale-95 border border-[#c0c0c0]/20 hover:border-[#00ff41]'
                      : 'bg-[#0a122a] border border-[#c0c0c0]/15 hover:border-[#c0c0c0]/40'
                  }`}
                >
                  {isRevealed && !isMine && (
                    <div className="animate-in zoom-in-50 duration-200 flex flex-col items-center justify-center">
                      <Gem className="w-6 h-6 sm:w-8 sm:h-8 text-black drop-shadow-md animate-bounce" />
                    </div>
                  )}

                  {isRevealed && isMine && (
                    <div className="animate-in zoom-in-75 duration-200 flex flex-col items-center justify-center">
                      <Bomb className="w-6 h-6 sm:w-8 sm:h-8 text-white drop-shadow-lg" />
                    </div>
                  )}

                  {!isRevealed && isGameOver && isMine && (
                    <Bomb className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 opacity-60" />
                  )}

                  {!isRevealed && (!isGameOver || !isMine) && (
                    <div className="w-2 h-2 rounded-full bg-[#c0c0c0]/30 group-hover:bg-[#00ff41]/50"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
