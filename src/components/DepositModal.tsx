import React, { useState, useEffect, useRef } from 'react';
import { CryptoSymbol, UserProfile } from '../types';
import { CRYPTO_CONFIGS, CRYPTO_NETWORKS, deriveNetworkAddress, formatUsd, formatCryptoAmount } from '../utils/cryptoHD';
import { X, Copy, Check, QrCode, ArrowDownRight, RefreshCw, Zap, Shield, Globe, Clock, CheckCircle2 } from 'lucide-react';
import QRCode from 'qrcode';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  prices: Record<CryptoSymbol, number>;
  onSimulateDeposit: (symbol: CryptoSymbol, amount: number) => Promise<any>;
  onCheckLiveDeposits?: () => Promise<any>;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  user,
  prices,
  onSimulateDeposit,
  onCheckLiveDeposits,
}) => {
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoSymbol>('USDT');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('TRC20');
  const [copied, setCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState<string | null>(null);
  const [customSimAmount, setCustomSimAmount] = useState<number>(100);
  const [isCheckingLive, setIsCheckingLive] = useState(false);
  const [liveCheckStatus, setLiveCheckStatus] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const cryptos: CryptoSymbol[] = ['USDT', 'BTC', 'ETH', 'LTC', 'SOL'];
  const config = CRYPTO_CONFIGS[selectedCrypto];
  const availableNetworks = CRYPTO_NETWORKS[selectedCrypto] || [];
  const currentPrice = prices[selectedCrypto] || config.currentPriceUsd;

  // Derive address for selected crypto + network
  const activeDepositAddress = deriveNetworkAddress(selectedCrypto, selectedNetwork, user.id);
  const activeNetworkConfig = availableNetworks.find((n) => n.id === selectedNetwork) || availableNetworks[0];

  // When selected crypto changes, reset selected network to the recommended or first one
  useEffect(() => {
    const defaultNet = availableNetworks.find((n) => n.isRecommended) || availableNetworks[0];
    if (defaultNet) {
      setSelectedNetwork(defaultNet.id);
    }
  }, [selectedCrypto]);

  // Live on-chain deposit checker handler
  const handleCheckLiveOnChain = async (silent = false) => {
    if (!onCheckLiveDeposits) return;
    try {
      if (!silent) {
        setIsCheckingLive(true);
        setLiveCheckStatus('Scanning mempools and blockchain explorers for your address...');
        sound.playClick();
      }
      const res = await onCheckLiveDeposits();
      if (res && res.creditedCount > 0) {
        sound.playDepositSound();
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00ff41', '#34d399', '#ffffff'],
        });
        setLiveCheckStatus(`✅ Detected and credited on-chain deposit! +$${res.credited.reduce((acc: number, c: any) => acc + c.amountUsd, 0).toFixed(2)} USD added.`);
        setTimeout(() => setLiveCheckStatus(null), 6000);
      } else if (!silent) {
        setLiveCheckStatus('🔍 Checked! No new uncredited transactions found on blockchain yet. Monitoring continues...');
        setTimeout(() => setLiveCheckStatus(null), 4000);
      }
    } catch (err: any) {
      if (!silent) {
        setLiveCheckStatus(`⚠️ Check completed: ${err.message || 'Waiting for network block'}`);
        setTimeout(() => setLiveCheckStatus(null), 4000);
      }
    } finally {
      if (!silent) setIsCheckingLive(false);
    }
  };

  // Auto-scan on open and periodically while open
  useEffect(() => {
    if (isOpen && onCheckLiveDeposits) {
      handleCheckLiveOnChain(true);
      const interval = setInterval(() => {
        handleCheckLiveOnChain(true);
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [isOpen, onCheckLiveDeposits]);

  // Generate QR Code on canvas whenever crypto, network, or address changes
  useEffect(() => {
    if (isOpen && qrCanvasRef.current && activeDepositAddress) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        activeDepositAddress,
        {
          width: 180,
          margin: 1,
          color: {
            dark: '#080e1e',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('QR code error:', error);
        }
      );
    }
  }, [isOpen, selectedCrypto, selectedNetwork, activeDepositAddress]);

  // Set default simulation amounts based on crypto
  useEffect(() => {
    switch (selectedCrypto) {
      case 'BTC': setCustomSimAmount(0.005); break;
      case 'ETH': setCustomSimAmount(0.05); break;
      case 'LTC': setCustomSimAmount(1.0); break;
      case 'SOL': setCustomSimAmount(1.5); break;
      case 'USDT': setCustomSimAmount(100); break;
    }
  }, [selectedCrypto]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (activeDepositAddress) {
      navigator.clipboard.writeText(activeDepositAddress);
      setCopied(true);
      sound.playClick();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="deposit-modal-container" 
        className="relative w-full max-w-lg bg-[#0a122a] border border-[#c0c0c0]/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#c0c0c0]/20 bg-[#050b18]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/40 flex items-center justify-center text-[#00ff41] shadow-[0_0_12px_rgba(0,255,65,0.25)]">
              <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider font-['Syne',sans-serif]">
                Deposit Crypto
              </h2>
              <p className="text-xs text-[#c0c0c0]">Choose currency & transfer network for instant deposit</p>
            </div>
          </div>
          <button
            id="close-deposit-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-[#c0c0c0] hover:text-white hover:bg-[#1a2b4b] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Step 1: Crypto Selector Menu */}
          <div>
            <label className="block text-xs font-bold text-[#c0c0c0] mb-2 uppercase tracking-wider">
              1. Select Cryptocurrency
            </label>
            <div className="grid grid-cols-5 gap-2">
              {cryptos.map((sym) => {
                const cfg = CRYPTO_CONFIGS[sym];
                const isSelected = selectedCrypto === sym;
                return (
                  <button
                    key={sym}
                    id={`crypto-select-deposit-${sym}`}
                    onClick={() => { setSelectedCrypto(sym); sound.playClick(); }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-[#1a2b4b] border-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.25)] text-white scale-[1.02]'
                        : 'bg-[#050b18] border-[#c0c0c0]/20 hover:border-[#00ff41]/40 text-[#c0c0c0]'
                    }`}
                  >
                    <span 
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold mb-1.5 shadow-sm"
                      style={{ backgroundColor: `${cfg.color}30`, color: cfg.color }}
                    >
                      {cfg.icon}
                    </span>
                    <span className="font-black text-xs text-white">{sym}</span>
                    <span className="text-[10px] text-[#00ff41] font-mono font-bold">
                      ${prices[sym] ? prices[sym].toLocaleString() : cfg.currentPriceUsd.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Transfer Network Selection Menu */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#c0c0c0] uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#00ff41]" />
                <span>2. Select Transfer Network</span>
              </label>
              <span className="text-[11px] text-[#00ff41] font-mono font-bold">
                {availableNetworks.length} {availableNetworks.length === 1 ? 'Network' : 'Networks Available'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableNetworks.map((net) => {
                const isSelected = selectedNetwork === net.id;
                return (
                  <button
                    key={net.id}
                    id={`deposit-network-select-${net.id}`}
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

          {/* Network & Live Rate Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/20 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[#c0c0c0] font-bold">Selected:</span>
              <span className="font-bold text-[#00ff41]">{selectedCrypto} ({activeNetworkConfig?.name || selectedNetwork})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#c0c0c0] font-bold">Rate:</span>
              <span className="font-bold text-white font-mono">1 {selectedCrypto} = {formatUsd(currentPrice)}</span>
            </div>
          </div>

          {/* QR Code & Address Display */}
          <div className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/20 shadow-inner">
            <div className="p-3 bg-white rounded-2xl shadow-xl border border-slate-300 mb-3">
              <canvas ref={qrCanvasRef} className="rounded-xl"></canvas>
            </div>

            <div className="w-full">
              <div className="flex items-center justify-between text-xs text-[#c0c0c0] mb-1.5">
                <span className="font-bold">{selectedCrypto} Deposit Address ({activeNetworkConfig?.shortName}):</span>
                <span className="font-mono text-[10px] text-[#00ff41] font-bold">{activeNetworkConfig?.protocol}</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0a122a] border border-[#c0c0c0]/20 font-mono text-xs text-white break-all">
                <span className="flex-1 select-all font-mono font-bold text-[#00ff41]">{activeDepositAddress}</span>
                <button
                  id="copy-deposit-address-btn"
                  onClick={handleCopy}
                  className={`px-3 py-1.5 rounded-lg font-sans text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                    copied
                      ? 'bg-[#00ff41] text-black shadow-[0_0_10px_rgba(0,255,65,0.4)]'
                      : 'bg-[#1a2b4b] hover:bg-[#00ff41] hover:text-black text-white'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Confirmation & Network Notice */}
          <div className="p-3.5 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/20 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#00ff41] font-black uppercase tracking-wider">
                <Shield className="w-4 h-4" />
                <span>Live Blockchain Verification</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#00ff41]/10 border border-[#00ff41]/30 text-[10px] text-[#00ff41] font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse"></span>
                <span>Active Scanner</span>
              </div>
            </div>
            <p className="text-[#c0c0c0] leading-relaxed text-[11px]">
              • Send only <strong className="text-white">{selectedCrypto}</strong> via <strong className="text-[#00ff41]">{activeNetworkConfig?.name || selectedNetwork}</strong> to this address.
              <br />
              • Real blockchain deposits are detected via live mempool monitors and automatically converted to your USD balance.
            </p>

            {/* Manual Check Live On-Chain Deposits Button */}
            <div className="pt-2 border-t border-[#c0c0c0]/15 flex flex-col gap-2">
              <button
                id="check-live-deposit-btn"
                onClick={() => handleCheckLiveOnChain(false)}
                disabled={isCheckingLive}
                className="w-full py-2.5 px-4 rounded-xl bg-[#1a2b4b] hover:bg-[#00ff41] text-[#00ff41] hover:text-black border border-[#00ff41]/40 font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingLive ? 'animate-spin' : ''}`} />
                <span>{isCheckingLive ? 'Scanning Blockchain...' : '🔄 Check Live On-Chain Deposits'}</span>
              </button>

              {liveCheckStatus && (
                <div className="p-2.5 rounded-xl bg-[#0a122a] border border-[#00ff41]/30 text-[#00ff41] text-xs text-center font-mono animate-in fade-in duration-150">
                  {liveCheckStatus}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

