import React, { useState } from 'react';
import { UserProfile, TowerDifficulty, TowersGameState, TowerRowState } from '../types';
import { TOWER_CONFIGS, generateTowerRows } from '../utils/provablyFair';
import { formatUsd, sha256 } from '../utils/cryptoHD';
import { Castle, ShieldCheck, RefreshCw, Sparkles, AlertTriangle, ArrowUp, Gem, Bomb } from 'lucide-react';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

interface TowersGameProps {
  user: UserProfile;
  onBalanceUpdate: (newBalanceUsd: number) => void;
  onOpenDeposit: () => void;
  onOpenFairModal: (seedHash: string, serverSeed?: string, clientSeed?: string, nonce?: number) => void;
}

export const TowersGame: React.FC<TowersGameProps> = ({
  user,
  onBalanceUpdate,
  onOpenDeposit,
  onOpenFairModal,
}) => {
  const [betAmount, setBetAmount] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<TowerDifficulty>('medium');
  const [gameState, setGameState] = useState<TowersGameState | null>(null);
  const [generatedBombs, setGeneratedBombs] = useState<number[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const config = TOWER_CONFIGS[difficulty];
  const isPlaying = gameState?.status === 'in_progress';
  const totalRows = 9;

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

      // Generate server seed & commitment
      const serverSeed = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      const serverSeedHash = await sha256(serverSeed);
      const clientSeed = user.clientSeed;
      const nonce = user.nonce + 1;

      // Deterministically generate bomb positions
      const rowsBombs = await generateTowerRows(serverSeed, clientSeed, nonce, difficulty, totalRows);
      setGeneratedBombs(rowsBombs);

      // Deduct bet from balance locally and notify
      const newBal = Number((user.balanceUsd - betAmount).toFixed(2));
      onBalanceUpdate(newBal);

      const rows: TowerRowState[] = Array.from({ length: totalRows }).map((_, r) => ({
        row: r,
        multiplier: config.multipliers[r],
        bombIndices: [],
        isPassed: false,
        isFailed: false,
      }));

      setGameState({
        id: 'tower_' + Math.random().toString(36).substring(2),
        betAmountUsd: betAmount,
        cryptoSymbol: 'USDT',
        difficulty,
        currentRow: 0,
        totalRows,
        currentMultiplier: 1.0,
        currentPayoutUsd: betAmount,
        status: 'in_progress',
        rows,
        serverSeedHash,
        serverSeed,
        clientSeed,
        nonce,
      });

      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Failed to start game.');
    }
  };

  const handleTileSelect = async (rowIndex: number, tileIndex: number) => {
    if (!gameState || !isPlaying || isLoading) return;
    if (rowIndex !== gameState.currentRow) return;

    try {
      setIsLoading(true);
      const isBomb = generatedBombs[rowIndex]?.includes(tileIndex);
      const updatedRows = [...gameState.rows];

      if (isBomb) {
        // Hit Bomb!
        sound.playExplosion();
        updatedRows[rowIndex] = {
          ...updatedRows[rowIndex],
          selectedIndex: tileIndex,
          bombIndices: generatedBombs[rowIndex],
          isFailed: true,
        };

        // Reveal all remaining bomb rows
        for (let r = 0; r < totalRows; r++) {
          updatedRows[r].bombIndices = generatedBombs[r];
        }

        setGameState((prev) =>
          prev
            ? {
                ...prev,
                status: 'lost',
                rows: updatedRows,
                currentMultiplier: 0,
                currentPayoutUsd: 0,
              }
            : null
        );

        // Record bet
        await api.recordBet({
          userId: user.id,
          game: 'towers',
          betAmountUsd: gameState.betAmountUsd,
          payoutUsd: 0,
          multiplier: 0,
          status: 'loss',
          serverSeedHash: gameState.serverSeedHash,
          serverSeed: gameState.serverSeed,
          clientSeed: gameState.clientSeed,
          nonce: gameState.nonce,
          details: {
            difficulty,
            clearedRows: rowIndex,
          },
        });
      } else {
        // Safe Gem!
        sound.playGem(rowIndex);
        const rowMultiplier = config.multipliers[rowIndex];
        const currentPayout = Number((gameState.betAmountUsd * rowMultiplier).toFixed(2));

        updatedRows[rowIndex] = {
          ...updatedRows[rowIndex],
          selectedIndex: tileIndex,
          bombIndices: generatedBombs[rowIndex],
          isPassed: true,
        };

        if (rowIndex === totalRows - 1) {
          // Reached Top of the Tower! Max Win!
          sound.playCashout();
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
          const finalBal = Number((user.balanceUsd + currentPayout).toFixed(2));
          onBalanceUpdate(finalBal);

          setGameState((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'won',
                  currentRow: rowIndex + 1,
                  currentMultiplier: rowMultiplier,
                  currentPayoutUsd: currentPayout,
                  rows: updatedRows,
                }
              : null
          );

          await api.recordBet({
            userId: user.id,
            game: 'towers',
            betAmountUsd: gameState.betAmountUsd,
            payoutUsd: currentPayout,
            multiplier: rowMultiplier,
            status: 'win',
            serverSeedHash: gameState.serverSeedHash,
            serverSeed: gameState.serverSeed,
            clientSeed: gameState.clientSeed,
            nonce: gameState.nonce,
            details: {
              difficulty,
              clearedRows: totalRows,
            },
          });
        } else {
          setGameState((prev) =>
            prev
              ? {
                  ...prev,
                  currentRow: rowIndex + 1,
                  currentMultiplier: rowMultiplier,
                  currentPayoutUsd: currentPayout,
                  rows: updatedRows,
                }
              : null
          );
        }
      }
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Failed to process move.');
    }
  };

  const handleCashout = async () => {
    if (!gameState || !isPlaying || isLoading || gameState.currentRow === 0) return;

    try {
      setIsLoading(true);
      sound.playCashout();
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#f59e0b'],
      });

      const updatedRows = [...gameState.rows];
      for (let r = 0; r < totalRows; r++) {
        updatedRows[r].bombIndices = generatedBombs[r];
      }

      const finalBal = Number((user.balanceUsd + gameState.currentPayoutUsd).toFixed(2));
      onBalanceUpdate(finalBal);

      setGameState((prev) =>
        prev
          ? {
              ...prev,
              status: 'cashed_out',
              rows: updatedRows,
            }
          : null
      );

      await api.recordBet({
        userId: user.id,
        game: 'towers',
        betAmountUsd: gameState.betAmountUsd,
        payoutUsd: gameState.currentPayoutUsd,
        multiplier: gameState.currentMultiplier,
        status: 'win',
        serverSeedHash: gameState.serverSeedHash,
        serverSeed: gameState.serverSeed,
        clientSeed: gameState.clientSeed,
        nonce: gameState.nonce,
        details: {
          difficulty,
          clearedRows: gameState.currentRow,
        },
      });

      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Failed to cashout.');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-3 sm:p-6 space-y-6 pb-24">
      
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl border border-[#c0c0c0]/30 bg-[#0a122a]/90 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
            <Castle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white font-['Syne',sans-serif] uppercase tracking-wider">
                TOWERS CASINO
              </h1>
              <span className="px-2 py-0.5 rounded bg-[#c0c0c0]/10 text-amber-400 text-[10px] font-mono font-bold uppercase">
                TOWERS.EXE
              </span>
            </div>
            <p className="text-xs text-[#c0c0c0]">Climb the cyber tower tiers avoiding bombs for massive multipliers</p>
          </div>
        </div>

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

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Game Controls */}
        <div className="md:col-span-5 rounded-3xl border border-[#c0c0c0]/30 bg-[#0a122a]/80 backdrop-blur-md p-6 space-y-5 shadow-2xl order-2 md:order-1">
          {/* Bet Amount */}
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
              {['1/2', '2x', 'Min', 'Max'].map((lbl) => (
                <button
                  key={lbl}
                  disabled={isPlaying}
                  onClick={() => {
                    if (lbl === '1/2') setBetAmount((b) => Math.max(1, Number((b / 2).toFixed(2))));
                    if (lbl === '2x') setBetAmount((b) => Math.min(user.balanceUsd, Number((b * 2).toFixed(2))));
                    if (lbl === 'Min') setBetAmount(1);
                    if (lbl === 'Max') setBetAmount(user.balanceUsd > 0 ? user.balanceUsd : 100);
                    sound.playClick();
                  }}
                  className="py-1.5 rounded-xl bg-[#1a2b4b] hover:bg-[#00ff41] hover:text-black border border-[#c0c0c0]/15 text-[#c0c0c0] text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Selector */}
          <div>
            <label className="block text-xs font-bold text-[#c0c0c0] mb-2 uppercase tracking-wider">
              Difficulty Tier
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {(['easy', 'medium', 'hard', 'expert', 'crazy'] as TowerDifficulty[]).map((diff) => {
                const isSelected = difficulty === diff;
                return (
                  <button
                    key={diff}
                    disabled={isPlaying}
                    onClick={() => { setDifficulty(diff); sound.playClick(); }}
                    className={`py-2 px-1 rounded-xl border text-xs font-black capitalize transition-all ${
                      isSelected
                        ? 'bg-amber-400 border-amber-400 text-black shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                        : 'bg-[#050b18] border-[#c0c0c0]/20 hover:border-amber-400/50 text-white'
                    } disabled:opacity-50`}
                  >
                    {diff}
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-[#c0c0c0] mt-2 font-mono flex items-center justify-between p-2.5 rounded-xl bg-[#050b18] border border-[#c0c0c0]/20">
              <span>{config.tilesPerRow} Tiles / Row</span>
              <span className="text-[#00ff41] font-bold">{config.safesPerRow} Safe</span>
              <span className="text-red-400 font-bold">{config.bombsPerRow} Bomb</span>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Button */}
          {!isPlaying ? (
            <button
              id="towers-start-bet-btn"
              onClick={handleStartGame}
              disabled={isLoading || user.balanceUsd < betAmount}
              className="w-full py-4 bg-[#00ff41] hover:bg-white text-black font-black text-sm uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(0,255,65,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Starting Climb...
                </>
              ) : (
                <>
                  <Castle className="w-4 h-4" />
                  Start Tower ({formatUsd(betAmount)})
                </>
              )}
            </button>
          ) : (
            <button
              id="towers-cashout-btn"
              onClick={handleCashout}
              disabled={isLoading || gameState.currentRow === 0}
              className="w-full py-4 bg-amber-400 hover:bg-white text-black font-black text-sm uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-[0.98] transition-all flex flex-col items-center justify-center leading-tight disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <span>CASHOUT TIER {gameState.currentRow}</span>
                <span className="font-mono font-black">{gameState.currentMultiplier.toFixed(2)}x</span>
              </div>
              <span className="text-xs font-mono font-black mt-0.5">
                {formatUsd(gameState.currentPayoutUsd)}
              </span>
            </button>
          )}
        </div>

        {/* Right Side: Tower Vertical Climb Board (Rows 8 down to 0) */}
        <div className="md:col-span-7 rounded-3xl border border-[#c0c0c0]/30 bg-[#0a122a]/90 backdrop-blur-md p-6 shadow-2xl order-1 md:order-2">
          <div className="flex items-center justify-between mb-4 px-2 text-xs">
            <span className="font-bold text-[#c0c0c0] uppercase tracking-wider">Tower Height (9 Tiers)</span>
            {gameState?.status === 'cashed_out' && (
              <span className="font-bold text-[#00ff41] bg-[#00ff41]/10 px-2.5 py-1 rounded-lg border border-[#00ff41]/40 shadow-[0_0_10px_rgba(0,255,65,0.2)]">
                🎉 Won {formatUsd(gameState.currentPayoutUsd)} ({gameState.currentMultiplier.toFixed(2)}x)
              </span>
            )}
            {gameState?.status === 'won' && (
              <span className="font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                👑 TOP TIER CLEARED! {formatUsd(gameState.currentPayoutUsd)}
              </span>
            )}
            {gameState?.status === 'lost' && (
              <span className="font-bold text-red-400 bg-red-950/60 px-2.5 py-1 rounded-lg border border-red-500/40">
                💥 Detonated on Tier {gameState.currentRow + 1}
              </span>
            )}
          </div>

          {/* Tower Rows (Rendered from top tier index 8 down to index 0) */}
          <div className="space-y-2 max-w-md mx-auto">
            {Array.from({ length: totalRows })
              .map((_, i) => totalRows - 1 - i)
              .map((rowIndex) => {
                const rowMultiplier = config.multipliers[rowIndex];
                const isCurrent = isPlaying && gameState?.currentRow === rowIndex;
                const isPassed = (gameState?.currentRow || 0) > rowIndex && gameState?.rows[rowIndex]?.isPassed;
                const isFailed = gameState?.rows[rowIndex]?.isFailed;
                const bombIndices = gameState?.rows[rowIndex]?.bombIndices || [];
                const selectedIndex = gameState?.rows[rowIndex]?.selectedIndex;
                const isGameOver = gameState?.status === 'lost' || gameState?.status === 'won' || gameState?.status === 'cashed_out';

                return (
                  <div
                    key={rowIndex}
                    className={`flex items-center gap-2 p-2 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'bg-[#1a2b4b] border-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.25)] ring-1 ring-[#00ff41]'
                        : isPassed
                        ? 'bg-[#050b18] border-[#00ff41]/40 opacity-90'
                        : isFailed
                        ? 'bg-red-950/30 border-red-500/40'
                        : 'bg-[#050b18] border-[#c0c0c0]/15 opacity-60'
                    }`}
                  >
                    {/* Row Tier Label & Multiplier */}
                    <div className="w-16 shrink-0 flex flex-col items-center justify-center font-mono">
                      <span className="text-[9px] text-[#c0c0c0] leading-none uppercase">Tier {rowIndex + 1}</span>
                      <span className={`text-xs font-black ${isCurrent || isPassed ? 'text-[#00ff41]' : 'text-white'}`}>
                        {rowMultiplier.toFixed(2)}x
                      </span>
                    </div>

                    {/* Row Tiles */}
                    <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${config.tilesPerRow}, minmax(0, 1fr))` }}>
                      {Array.from({ length: config.tilesPerRow }).map((_, tileIndex) => {
                        const isSelected = selectedIndex === tileIndex;
                        const isBomb = bombIndices.includes(tileIndex);

                        return (
                          <button
                            key={tileIndex}
                            disabled={!isCurrent || isLoading}
                            onClick={() => handleTileSelect(rowIndex, tileIndex)}
                            className={`h-9 sm:h-10 rounded-xl font-bold flex items-center justify-center transition-all select-none ${
                              isPassed && isSelected
                                ? 'bg-gradient-to-br from-[#00ff41] to-[#008f11] text-black border border-[#00ff41] shadow-[0_0_12px_rgba(0,255,65,0.4)]'
                                : isFailed && isSelected
                                ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)] border border-red-400'
                                : isGameOver && isBomb
                                ? 'bg-red-950/80 border border-red-500/60 text-red-300'
                                : isCurrent
                                ? 'bg-[#0a122a] hover:bg-[#00ff41] hover:text-black border border-[#00ff41]/50 active:scale-95 cursor-pointer shadow-md'
                                : 'bg-[#0a122a] border border-[#c0c0c0]/15 text-[#c0c0c0]'
                            }`}
                          >
                            {isPassed && isSelected && <Gem className="w-4 h-4 text-black animate-bounce" />}
                            {isFailed && isSelected && <Bomb className="w-4 h-4 text-white" />}
                            {isGameOver && !isSelected && isBomb && <Bomb className="w-3.5 h-3.5 text-red-400 opacity-60" />}
                            {isGameOver && !isSelected && !isBomb && <div className="w-1.5 h-1.5 rounded-full bg-[#c0c0c0]/30"></div>}
                            {!isGameOver && !isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#c0c0c0]/30"></div>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

      </div>

    </div>
  );
};
