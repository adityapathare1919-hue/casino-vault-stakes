import React, { useState } from 'react';
import { UserProfile, CryptoSymbol } from '../types';
import { formatUsd, DEFAULT_MASTER_SEED, MASTER_PARENT_ADDRESSES, deriveChildAddress } from '../utils/cryptoHD';
import { Award, ShieldCheck, Key, RefreshCw, Copy, Check, ExternalLink, Bot, Zap, ArrowDownRight, ArrowUpRight, Layers } from 'lucide-react';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

interface VaultSetupViewProps {
  user: UserProfile;
  onBalanceUpdate: (newBalanceUsd: number) => void;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
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
  const [testUserIndex, setTestUserIndex] = useState<number>(user.telegramId % 1000);
  const [testSymbol, setTestSymbol] = useState<CryptoSymbol>('BTC');

  const claimableRakeback = Math.max(0, Number((user.rakebackEarnedUsd - user.rakebackClaimedUsd).toFixed(2)));

  // VIP Tier Calculations
  const vipTiers = [
    { name: 'Bronze', requiredWager: 0, rakebackRate: '0.5%', color: 'from-amber-700 to-amber-900', border: 'border-amber-700' },
    { name: 'Silver', requiredWager: 1000, rakebackRate: '1.0%', color: 'from-slate-400 to-slate-600', border: 'border-slate-400' },
    { name: 'Gold', requiredWager: 5000, rakebackRate: '1.2%', color: 'from-amber-400 to-yellow-600', border: 'border-amber-400' },
    { name: 'Platinum', requiredWager: 25000, rakebackRate: '1.5%', color: 'from-purple-400 to-indigo-600', border: 'border-purple-400' },
    { name: 'Diamond', requiredWager: 100000, rakebackRate: '2.0%', color: 'from-cyan-400 to-blue-600', border: 'border-cyan-400' },
  ];

  const currentTierIdx = vipTiers.findIndex((t) => t.name === user.vipTier);
  const nextTier = vipTiers[currentTierIdx + 1] || vipTiers[vipTiers.length - 1];
  const progressPercent = Math.min(100, Math.round((user.totalWageredUsd / (nextTier.requiredWager || 1)) * 100));

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
      setRakebackMessage(`Claimed ${formatUsd(res.claimedAmountUsd)} Rakeback to your live balance!`);
      setTimeout(() => {
        setIsClaimingRakeback(false);
        setRakebackMessage(null);
      }, 3000);
    } catch (err: any) {
      setIsClaimingRakeback(false);
      setRakebackMessage(err.message || 'Failed to claim rakeback.');
    }
  };

  const derivedSampleAddress = deriveChildAddress(testSymbol, `tg_user_${testUserIndex}`, testUserIndex, DEFAULT_MASTER_SEED);

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
              <p className="text-xs text-[#c0c0c0]">Earn up to 2.0% instant rakeback on every game wager</p>
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
              className="px-4 py-2.5 bg-[#00ff41] hover:bg-white text-black font-black uppercase text-xs tracking-wider rounded-xl shadow-[0_0_15px_rgba(0,255,65,0.3)] disabled:opacity-50 transition-all flex items-center gap-1.5"
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
              Next Rank: <strong className="text-white font-bold">{nextTier.name} ({formatUsd(nextTier.requiredWager)})</strong>
            </span>
          </div>

          <div className="w-full h-3.5 bg-[#050b18] rounded-full overflow-hidden border border-[#c0c0c0]/20 p-0.5">
            <div
              className="h-full bg-[#00ff41] rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(0,255,65,0.6)]"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* VIP Tier Perks Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-[#c0c0c0]/15">
          {vipTiers.map((tier) => {
            const isAchieved = user.totalWageredUsd >= tier.requiredWager;
            return (
              <div
                key={tier.name}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  isAchieved
                    ? 'bg-[#1a2b4b] border-[#00ff41] shadow-[0_0_12px_rgba(0,255,65,0.2)]'
                    : 'bg-[#050b18] border-[#c0c0c0]/15 opacity-60'
                }`}
              >
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
            <span>Deposit Crypto to Vault</span>
          </button>
          <button
            id="vault-quick-withdraw-btn"
            onClick={() => { onOpenWithdraw(); sound.playClick(); }}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#1a2b4b] hover:bg-[#00ff41] hover:text-black text-white border border-[#c0c0c0]/20 font-black uppercase text-xs tracking-wider transition-all active:scale-98"
          >
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            <span>Withdraw Crypto Payout</span>
          </button>
        </div>
      </div>

      {/* Master 12-Word HD Seed & Child Derivation Inspector */}
      <div className="p-5 sm:p-6 bg-[#0a122a] border border-[#c0c0c0]/20 rounded-3xl shadow-xl backdrop-blur-md space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/40 flex items-center justify-center text-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.25)]">
            <Key className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white font-['Syne',sans-serif] uppercase tracking-wider">
              12-Word Master HD Wallet & Parent Address Inspector
            </h2>
            <p className="text-xs text-[#c0c0c0]">
              Deterministic BIP-39/BIP-44 child address generation for BTC, ETH, LTC, SOL, USDT
            </p>
          </div>
        </div>

        {/* Seed Phrase Display */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-[#c0c0c0] mb-2 uppercase tracking-wider">
            <span>Active Master Recovery Seed Phrase (12 Words)</span>
            <button
              onClick={() => handleCopy(DEFAULT_MASTER_SEED, 'seed')}
              className="flex items-center gap-1 text-[11px] text-[#00ff41] hover:underline font-black uppercase tracking-wider"
            >
              {copiedKey === 'seed' ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'seed' ? 'Copied' : 'Copy Phrase'}</span>
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-3.5 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/20 font-mono text-xs text-white">
            {DEFAULT_MASTER_SEED.split(' ').map((word, idx) => (
              <div key={idx} className="p-2 rounded-xl bg-[#0a122a] border border-[#c0c0c0]/15 flex items-center gap-2">
                <span className="text-[10px] text-[#c0c0c0] font-bold">{idx + 1}.</span>
                <span className="text-[#00ff41] font-bold">{word}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Master Parent Addresses */}
        <div>
          <h3 className="text-xs font-bold text-[#c0c0c0] mb-2 uppercase tracking-wider">
            Cold Vault Master Parent Addresses (Deposits Automatically Land Here)
          </h3>
          <div className="space-y-2 text-xs font-mono">
            {(['BTC', 'ETH', 'LTC', 'SOL', 'USDT'] as CryptoSymbol[]).map((sym) => (
              <div key={sym} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2.5 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/20">
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded-lg bg-[#1a2b4b] text-[#00ff41] font-black text-[10px] w-14 text-center border border-[#00ff41]/30">
                    {sym}
                  </span>
                  <span className="text-[#c0c0c0] text-[11px] break-all select-all font-bold">
                    {MASTER_PARENT_ADDRESSES[sym]}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(MASTER_PARENT_ADDRESSES[sym], `parent-${sym}`)}
                  className="self-end sm:self-auto px-2.5 py-1 rounded-lg bg-[#1a2b4b] hover:bg-[#00ff41] hover:text-black text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0 transition-colors"
                >
                  {copiedKey === `parent-${sym}` ? <Check className="w-3 h-3 stroke-[3]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === `parent-${sym}` ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Live Child Address Derivation Playground */}
        <div className="p-4 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
              <Layers className="w-4 h-4 text-[#00ff41]" />
              <span>Deterministic Child Address Simulator</span>
            </div>
            <span className="text-[10px] text-[#00ff41] font-mono font-bold">BIP-44 DERIVATION</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-[#c0c0c0] mb-1 uppercase">User Derivation Index</label>
              <input
                type="number"
                min="0"
                max="999999"
                value={testUserIndex}
                onChange={(e) => setTestUserIndex(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-[#0a122a] border border-[#c0c0c0]/20 text-white font-mono text-xs focus:border-[#00ff41] focus:outline-none font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#c0c0c0] mb-1 uppercase">Cryptocurrency</label>
              <select
                value={testSymbol}
                onChange={(e) => setTestSymbol(e.target.value as CryptoSymbol)}
                className="w-full px-3 py-2 rounded-xl bg-[#0a122a] border border-[#c0c0c0]/20 text-white font-mono text-xs focus:border-[#00ff41] focus:outline-none font-bold"
              >
                <option value="BTC">BTC (Bitcoin - Native SegWit)</option>
                <option value="ETH">ETH (Ethereum ERC20)</option>
                <option value="LTC">LTC (Litecoin SegWit)</option>
                <option value="SOL">SOL (Solana SPL)</option>
                <option value="USDT">USDT (Tether USD)</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0a122a] border border-[#c0c0c0]/20 font-mono text-xs space-y-1">
            <div className="text-[#c0c0c0] text-[10px]">Derivation Path: <span className="text-[#00ff41] font-bold">{derivedSampleAddress.derivationPath}</span></div>
            <div className="text-white break-all text-[11px]">Generated Child Address: <strong className="text-[#00ff41] select-all">{derivedSampleAddress.address}</strong></div>
          </div>
        </div>

      </div>

      {/* Telegram Bot Integration Center */}
      <div className="p-5 sm:p-6 bg-[#0a122a] border border-[#c0c0c0]/20 rounded-3xl shadow-xl backdrop-blur-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/40 flex items-center justify-center text-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.25)]">
              <Bot className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-['Syne',sans-serif] uppercase tracking-wider">
                Telegram Bot & Mini App Integration Center
              </h2>
              <p className="text-xs text-[#c0c0c0]">
                Full live Telegram long-polling engine & WebApp integration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff41] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00ff41]"></span>
            </span>
            <span className="text-xs font-mono font-bold text-[#00ff41] uppercase tracking-wider">
              Telegram Engine Ready
            </span>
          </div>
        </div>

        {/* Telegram WebApp URL Direct Copy Box */}
        <div className="p-4 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/20 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#c0c0c0] uppercase tracking-wider">
            <span>Your Casino Mini App Web URL (For @BotFather)</span>
            <button
              onClick={() => handleCopy(window.location.origin, 'app-url')}
              className="flex items-center gap-1 text-[11px] text-[#00ff41] hover:underline font-black uppercase tracking-wider"
            >
              {copiedKey === 'app-url' ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'app-url' ? 'Copied' : 'Copy WebApp URL'}</span>
            </button>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0a122a] border border-[#c0c0c0]/15 font-mono text-xs text-white break-all select-all font-bold">
            {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}
          </div>
        </div>

        {/* Step-by-Step Setup Guide */}
        <div className="p-4 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/20 text-xs text-[#c0c0c0] space-y-3">
          <p className="font-black text-white uppercase tracking-wider">
            How to activate your Bot in Telegram in 3 simple steps:
          </p>
          <div className="space-y-2 text-[11px] text-[#c0c0c0]">
            <div className="p-2.5 rounded-xl bg-[#0a122a] border border-[#c0c0c0]/10 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#00ff41]/20 text-[#00ff41] font-bold flex items-center justify-center shrink-0 text-xs">1</span>
              <div>
                <strong className="text-white">Get your Bot Token from @BotFather:</strong> Open Telegram, chat with <strong className="text-[#00ff41]">@BotFather</strong>, send <code className="text-white font-mono font-bold">/newbot</code>, follow the prompts, and copy the HTTP API Token.
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#0a122a] border border-[#c0c0c0]/10 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#00ff41]/20 text-[#00ff41] font-bold flex items-center justify-center shrink-0 text-xs">2</span>
              <div>
                <strong className="text-white">Attach Mini App in @BotFather:</strong> In @BotFather, send <code className="text-[#00ff41] font-mono font-bold">/newapp</code> (or <code className="text-[#00ff41] font-mono font-bold">/setmenubutton</code>) and paste the <strong className="text-white">WebApp URL</strong> from above.
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#0a122a] border border-[#c0c0c0]/10 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#00ff41]/20 text-[#00ff41] font-bold flex items-center justify-center shrink-0 text-xs">3</span>
              <div>
                <strong className="text-white">Add Token to Settings:</strong> Set <code className="text-[#00ff41] font-mono font-bold">TELEGRAM_BOT_TOKEN</code> in your environment or Settings. The bot instantly starts polling and responds to <code className="text-white font-mono font-bold">/start, /balance, /deposit, /withdraw, /vip</code>!
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
