import React, { useState, useEffect } from 'react';
import { CryptoSymbol, UserProfile } from '../types';
import { CRYPTO_CONFIGS, CRYPTO_NETWORKS, formatUsd, formatCryptoAmount } from '../utils/cryptoHD';
import { X, ArrowUpRight, ShieldCheck, AlertCircle, CheckCircle2, RefreshCw, Globe } from 'lucide-react';
import { sound } from '../utils/audio';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  prices: Record<CryptoSymbol, number>;
  onWithdraw: (params: {
    symbol: CryptoSymbol;
    network?: string;
    destinationAddress: string;
    amountUsd?: number;
    amountCrypto?: number;
  }) => Promise<any>;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  user,
  prices,
  onWithdraw,
}) => {
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoSymbol>('USDT');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('TRC20');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [amountUsd, setAmountUsd] = useState<number>(user.balanceUsd > 0 ? Number((user.balanceUsd).toFixed(2)) : 10);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const cryptos: CryptoSymbol[] = ['USDT', 'BTC', 'ETH', 'LTC', 'SOL'];
  const config = CRYPTO_CONFIGS[selectedCrypto];
  const availableNetworks = CRYPTO_NETWORKS[selectedCrypto] || [];
  const currentPrice = prices[selectedCrypto] || config.currentPriceUsd;
  const activeNetworkConfig = availableNetworks.find((n) => n.id === selectedNetwork) || availableNetworks[0];

  // When selected crypto changes, reset selected network
  useEffect(() => {
    const defaultNet = availableNetworks.find((n) => n.isRecommended) || availableNetworks[0];
    if (defaultNet) {
      setSelectedNetwork(defaultNet.id);
    }
  }, [selectedCrypto]);

  const cryptoEquivalent = currentPrice > 0 ? amountUsd / currentPrice : 0;
  const netUsd = amountUsd;
  const netCrypto = currentPrice > 0 ? netUsd / currentPrice : 0;

  if (!isOpen) return null;

  const handleQuickPercent = (pct: number) => {
    const val = Number((user.balanceUsd * pct).toFixed(2));
    setAmountUsd(val);
    sound.playClick();
  };

  const getAddressPlaceholder = () => {
    if (selectedCrypto === 'USDT') {
      if (selectedNetwork === 'TRC20') return 'Enter TRON (TRC20) address (starts with T...)';
      if (selectedNetwork === 'SOL') return 'Enter Solana wallet address...';
      return 'Enter EVM address (starts with 0x...)';
    }
    if (selectedCrypto === 'BTC') {
      if (selectedNetwork === 'Legacy') return 'Enter BTC Legacy address (starts with 1...)';
      if (selectedNetwork === 'Taproot') return 'Enter BTC Taproot address (starts with bc1p...)';
      return 'Enter BTC Native SegWit address (starts with bc1q...)';
    }
    if (selectedCrypto === 'LTC') {
      if (selectedNetwork === 'Legacy') return 'Enter LTC Legacy address (starts with L or M...)';
      return 'Enter LTC Native SegWit address (starts with ltc1q...)';
    }
    if (selectedCrypto === 'ETH') return 'Enter Ethereum wallet address (0x...)';
    if (selectedCrypto === 'SOL') return 'Enter Solana wallet address...';
    return `Enter your ${selectedCrypto} destination address...`;
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!destinationAddress.trim()) {
      setErrorMsg('Please enter your destination wallet address.');
      return;
    }
    if (amountUsd <= 0) {
      setErrorMsg('Please enter a valid withdrawal amount.');
      return;
    }
    if (amountUsd > user.balanceUsd) {
      setErrorMsg(`Insufficient funds! Your balance is ${formatUsd(user.balanceUsd)}.`);
      return;
    }

    try {
      setIsLoading(true);
      sound.playClick();
      const res = await onWithdraw({
        symbol: selectedCrypto,
        network: activeNetworkConfig?.name || selectedNetwork,
        destinationAddress: destinationAddress.trim(),
        amountUsd,
      });

      sound.playCashout();
      setSuccessMsg(`Withdrawal of ${formatCryptoAmount(netCrypto, selectedCrypto)} ${selectedCrypto} (${formatUsd(netUsd)}) dispatched on ${activeNetworkConfig?.shortName || selectedNetwork}!`);
      setDestinationAddress('');
      setTimeout(() => {
        setIsLoading(false);
        onClose();
        setSuccessMsg(null);
      }, 2200);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Withdrawal failed. Please check parameters.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="withdraw-modal-container"
        className="relative w-full max-w-lg bg-[#0a122a] border border-[#c0c0c0]/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#c0c0c0]/20 bg-[#050b18]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/40 flex items-center justify-center text-[#00ff41] shadow-[0_0_12px_rgba(0,255,65,0.25)]">
              <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider font-['Syne',sans-serif]">
                Withdraw Crypto
              </h2>
              <p className="text-xs text-[#c0c0c0]">Select currency & transfer network for payout</p>
            </div>
          </div>
          <button
            id="close-withdraw-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-[#c0c0c0] hover:text-white hover:bg-[#1a2b4b] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleWithdrawSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Step 1: Crypto Selector */}
          <div>
            <label className="block text-xs font-bold text-[#c0c0c0] mb-2 uppercase tracking-wider">
              1. Select Payout Currency
            </label>
            <div className="grid grid-cols-5 gap-2">
              {cryptos.map((sym) => {
                const cfg = CRYPTO_CONFIGS[sym];
                const isSelected = selectedCrypto === sym;
                return (
                  <button
                    key={sym}
                    type="button"
                    id={`crypto-select-withdraw-${sym}`}
                    onClick={() => { setSelectedCrypto(sym); sound.playClick(); }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-[#1a2b4b] border-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.25)] text-white scale-[1.02]'
                        : 'bg-[#050b18] border-[#c0c0c0]/20 hover:border-[#00ff41]/40 text-[#c0c0c0]'
                    }`}
                  >
                    <span 
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold mb-1 shadow-sm"
                      style={{ backgroundColor: `${cfg.color}30`, color: cfg.color }}
                    >
                      {cfg.icon}
                    </span>
                    <span className="font-black text-xs text-white">{sym}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Transfer Network Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#c0c0c0] uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#00ff41]" />
                <span>2. Select Transfer Network</span>
              </label>
              <span className="text-[11px] text-[#00ff41] font-mono font-bold">
                {activeNetworkConfig?.shortName}
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableNetworks.map((net) => {
                const isSelected = selectedNetwork === net.id;
                return (
                  <button
                    key={net.id}
                    id={`withdraw-network-select-${net.id}`}
                    type="button"
                    onClick={() => { setSelectedNetwork(net.id); sound.playClick(); }}
                    className={`p-2.5 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? 'bg-[#1a2b4b] border-[#00ff41] text-white shadow-[0_0_12px_rgba(0,255,65,0.2)]'
                        : 'bg-[#050b18] border-[#c0c0c0]/20 hover:border-[#00ff41]/40 text-[#c0c0c0]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-black text-xs text-white">{net.shortName}</span>
                      {net.isRecommended && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#00ff41]/20 text-[#00ff41] font-bold">
                          Fastest
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#c0c0c0]">
                      <span className="font-mono">{net.confirmationTime}</span>
                      <span className="text-[#00ff41] font-bold">$0 Fee</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Destination Address */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#c0c0c0] uppercase tracking-wider">
                Recipient {selectedCrypto} Destination Address ({activeNetworkConfig?.shortName})
              </label>
              <span className="text-[10px] font-mono text-[#00ff41] font-bold">
                {activeNetworkConfig?.protocol}
              </span>
            </div>
            <input
              type="text"
              id="withdraw-destination-address-input"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              placeholder={getAddressPlaceholder()}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/20 text-white font-mono text-xs focus:border-[#00ff41] focus:outline-none placeholder:text-slate-600 font-bold"
            />
          </div>

          {/* Amount in USD & Percentage Shortcuts */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#c0c0c0] uppercase tracking-wider">
                Amount to Withdraw (USD)
              </label>
              <span className="text-xs text-[#c0c0c0]">
                Available: <span className="font-bold text-[#00ff41] font-mono">{formatUsd(user.balanceUsd)}</span>
              </span>
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#00ff41] font-black">$</div>
              <input
                type="number"
                id="withdraw-amount-usd-input"
                min="0.01"
                max={user.balanceUsd}
                step="0.01"
                value={amountUsd}
                onChange={(e) => setAmountUsd(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-3 py-2.5 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/20 text-white font-mono font-bold text-sm focus:border-[#00ff41] focus:outline-none"
              />
            </div>

            {/* Percentage shortcuts */}
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              {[0.25, 0.5, 0.75, 1.0].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleQuickPercent(pct)}
                  className="py-1.5 rounded-xl bg-[#1a2b4b] hover:bg-[#00ff41] hover:text-black border border-[#c0c0c0]/15 text-[#c0c0c0] font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  {pct === 1.0 ? 'MAX' : `${pct * 100}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Breakdown Summary */}
          <div className="p-3.5 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/20 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[#c0c0c0]">
              <span>Transfer Network:</span>
              <span className="text-white font-bold">{activeNetworkConfig?.name || selectedNetwork}</span>
            </div>
            <div className="flex items-center justify-between text-[#c0c0c0]">
              <span>Withdrawal Amount:</span>
              <span className="text-white font-bold">{formatCryptoAmount(cryptoEquivalent, selectedCrypto)} {selectedCrypto} ({formatUsd(amountUsd)})</span>
            </div>
            <div className="flex items-center justify-between text-[#c0c0c0]">
              <span>Network Transfer Fee:</span>
              <span className="text-[#00ff41] font-bold">$0.00 (Zero Fee)</span>
            </div>
            <div className="border-t border-[#c0c0c0]/15 pt-2 flex items-center justify-between font-bold">
              <span className="text-white">You Receive:</span>
              <span className="text-[#00ff41] font-black text-sm">~{formatCryptoAmount(netCrypto, selectedCrypto)} {selectedCrypto} ({formatUsd(netUsd)})</span>
            </div>
          </div>

          {/* Error / Success Notifications */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/40 text-[#00ff41] text-xs flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            id="confirm-withdraw-submit-btn"
            disabled={isLoading || amountUsd <= 0 || amountUsd > user.balanceUsd}
            className="w-full py-4 bg-[#00ff41] hover:bg-white text-black font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(0,255,65,0.35)] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Dispatching On-Chain Payout...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Confirm Withdrawal
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

