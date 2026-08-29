import React, { useState, useEffect } from 'react';
import { UserProfile, Transaction, BetRecord, CryptoSymbol } from '../types';
import { formatUsd, formatCryptoAmount, CRYPTO_CONFIGS } from '../utils/cryptoHD';
import { History, ArrowDownLeft, ArrowUpRight, ShieldCheck, CheckCircle2, Clock, ExternalLink, RefreshCw, Filter, Bomb, Castle } from 'lucide-react';
import { api } from '../services/api';
import { sound } from '../utils/audio';

interface HistoryViewProps {
  user: UserProfile;
  onOpenFairModal: (seedHash: string, serverSeed?: string, clientSeed?: string, nonce?: number) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ user, onOpenFairModal }) => {
  const [activeSubTab, setActiveSubTab] = useState<'transactions' | 'bets'>('transactions');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bets, setBets] = useState<BetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const res = await api.getHistory(user.id);
      setTransactions(res.transactions || []);
      setBets(res.bets || []);
      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [user.id, user.balanceUsd]);

  const filteredTransactions = transactions.filter((tx) => {
    if (filterType === 'all') return true;
    return tx.type === filterType;
  });

  const filteredBets = bets.filter((b) => {
    if (filterType === 'all') return true;
    return b.game === filterType;
  });

  return (
    <div className="w-full max-w-4xl mx-auto p-3 sm:p-4 space-y-4 pb-20">
      
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 bg-[#0a122a] border border-[#c0c0c0]/20 rounded-3xl shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/40 flex items-center justify-center text-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.25)]">
            <History className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-white font-['Syne',sans-serif] uppercase tracking-wider">
              Ledger & Bet History
            </h1>
            <p className="text-xs text-[#c0c0c0]">On-chain deposit sweeps, withdrawals, and provably fair bets</p>
          </div>
        </div>

        {/* SubTab Toggle */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[#050b18] border border-[#c0c0c0]/20 rounded-2xl">
          <button
            id="history-subtab-txs"
            onClick={() => { setActiveSubTab('transactions'); setFilterType('all'); sound.playClick(); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeSubTab === 'transactions'
                ? 'bg-[#00ff41] text-black shadow-[0_0_12px_rgba(0,255,65,0.35)]'
                : 'text-[#c0c0c0] hover:text-white hover:bg-[#1a2b4b]'
            }`}
          >
            Transactions ({transactions.length})
          </button>
          <button
            id="history-subtab-bets"
            onClick={() => { setActiveSubTab('bets'); setFilterType('all'); sound.playClick(); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeSubTab === 'bets'
                ? 'bg-[#00ff41] text-black shadow-[0_0_12px_rgba(0,255,65,0.35)]'
                : 'text-[#c0c0c0] hover:text-white hover:bg-[#1a2b4b]'
            }`}
          >
            Game Bets ({bets.length})
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <Filter className="w-4 h-4 text-[#c0c0c0]" />
          {activeSubTab === 'transactions' ? (
            ['all', 'deposit', 'withdrawal', 'rakeback'].map((f) => (
              <button
                key={f}
                onClick={() => { setFilterType(f); sound.playClick(); }}
                className={`px-3 py-1.5 rounded-xl border capitalize font-bold text-xs transition-all ${
                  filterType === f
                    ? 'bg-[#00ff41]/20 border-[#00ff41] text-[#00ff41] shadow-[0_0_10px_rgba(0,255,65,0.2)]'
                    : 'bg-[#0a122a] border-[#c0c0c0]/20 text-[#c0c0c0] hover:border-[#00ff41]/40'
                }`}
              >
                {f}
              </button>
            ))
          ) : (
            ['all', 'mines', 'towers'].map((f) => (
              <button
                key={f}
                onClick={() => { setFilterType(f); sound.playClick(); }}
                className={`px-3 py-1.5 rounded-xl border capitalize font-bold text-xs transition-all ${
                  filterType === f
                    ? 'bg-[#00ff41]/20 border-[#00ff41] text-[#00ff41] shadow-[0_0_10px_rgba(0,255,65,0.2)]'
                    : 'bg-[#0a122a] border-[#c0c0c0]/20 text-[#c0c0c0] hover:border-[#00ff41]/40'
                }`}
              >
                {f}
              </button>
            ))
          )}
        </div>

        <button
          onClick={loadHistory}
          disabled={isLoading}
          className="p-2 rounded-xl bg-[#0a122a] border border-[#c0c0c0]/20 text-[#c0c0c0] hover:text-white hover:bg-[#1a2b4b] transition-colors"
          title="Refresh History"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#00ff41]' : ''}`} />
        </button>
      </div>

      {/* Main Table / Card List */}
      {activeSubTab === 'transactions' ? (
        <div className="space-y-2.5">
          {filteredTransactions.length === 0 ? (
            <div className="p-10 text-center bg-[#0a122a] border border-[#c0c0c0]/20 rounded-3xl text-[#c0c0c0] text-xs">
              No transactions recorded yet. Make a deposit or claim rakeback to get started.
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isDeposit = tx.type === 'deposit';
              const isRakeback = tx.type === 'rakeback';
              const cfg = CRYPTO_CONFIGS[tx.symbol as CryptoSymbol] || CRYPTO_CONFIGS.USDT;

              return (
                <div
                  key={tx.id}
                  className="p-4 bg-[#0a122a] border border-[#c0c0c0]/20 hover:border-[#00ff41]/40 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        isDeposit
                          ? 'bg-[#00ff41]/10 border border-[#00ff41]/50 text-[#00ff41] shadow-[0_0_10px_rgba(0,255,65,0.2)]'
                          : isRakeback
                          ? 'bg-amber-950/80 border border-amber-500/50 text-amber-400'
                          : 'bg-indigo-950/80 border border-indigo-500/50 text-indigo-400'
                      }`}
                    >
                      {isDeposit ? <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" /> : isRakeback ? '👑' : <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white uppercase tracking-wide">
                          {tx.type} • {tx.symbol}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/40 font-bold uppercase">
                          {tx.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#c0c0c0] font-mono mt-0.5">
                        {new Date(tx.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#c0c0c0]/15">
                    <div className={`font-mono font-black text-sm ${isDeposit || isRakeback ? 'text-[#00ff41]' : 'text-white'}`}>
                      {isDeposit || isRakeback ? '+' : '-'}{formatUsd(tx.amountUsd)} USD
                    </div>
                    <div className="text-[11px] text-[#c0c0c0] font-mono">
                      {formatCryptoAmount(tx.amountCrypto, tx.symbol as CryptoSymbol)} {tx.symbol}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredBets.length === 0 ? (
            <div className="p-10 text-center bg-[#0a122a] border border-[#c0c0c0]/20 rounded-3xl text-[#c0c0c0] text-xs">
              No game bets placed yet. Play Mines or Towers to generate bet history and earn VIP rakeback!
            </div>
          ) : (
            filteredBets.map((bet) => {
              const isWin = bet.status === 'win';
              const isMines = bet.game === 'mines';

              return (
                <div
                  key={bet.id}
                  className="p-4 bg-[#0a122a] border border-[#c0c0c0]/20 hover:border-[#00ff41]/40 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        isWin
                          ? 'bg-[#00ff41]/10 border border-[#00ff41]/50 text-[#00ff41] shadow-[0_0_10px_rgba(0,255,65,0.2)]'
                          : 'bg-[#050b18] border border-[#c0c0c0]/20 text-[#c0c0c0]'
                      }`}
                    >
                      {isMines ? <Bomb className="w-5 h-5" /> : <Castle className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white uppercase tracking-wide">
                          {bet.game}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-lg font-black uppercase tracking-wider ${
                            isWin
                              ? 'bg-[#00ff41]/15 text-[#00ff41] border border-[#00ff41]/40'
                              : 'bg-red-950/80 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {isWin ? `${bet.multiplier.toFixed(2)}x WIN` : 'LOSS'}
                        </span>
                        <span className="text-[10px] text-[#c0c0c0] font-mono">
                          Nonce #{bet.nonce}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#c0c0c0] font-mono mt-0.5">
                        {new Date(bet.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#c0c0c0]/15">
                    <div className="text-right">
                      <div className="text-[#c0c0c0] font-mono text-[10px]">Wager: {formatUsd(bet.betAmountUsd)}</div>
                      <div className={`font-mono font-black text-sm ${isWin ? 'text-[#00ff41]' : 'text-[#c0c0c0]'}`}>
                        Payout: {formatUsd(bet.payoutUsd)}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        onOpenFairModal(bet.serverSeedHash, bet.serverSeed, bet.clientSeed, bet.nonce)
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1a2b4b] hover:bg-[#00ff41] hover:text-black border border-[#c0c0c0]/20 hover:border-[#00ff41] text-white text-[11px] font-black uppercase tracking-wider transition-all"
                      title="Verify SHA-256 Seed"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#00ff41] group-hover:text-black" />
                      <span>Verify</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

    </div>
  );
};
