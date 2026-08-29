import React, { useState, useEffect, useRef } from 'react';
import { CryptoSymbol, UserProfile } from '../types';
import { CRYPTO_CONFIGS, formatUsd, formatCryptoAmount } from '../utils/cryptoHD';
import { X, Copy, Check, QrCode, ArrowDownRight, RefreshCw, Zap, Shield, ExternalLink } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState<string | null>(null);
  const [customSimAmount, setCustomSimAmount] = useState<number>(100);
  const [isCheckingLive, setIsCheckingLive] = useState(false);
  const [liveCheckStatus, setLiveCheckStatus] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const cryptos: CryptoSymbol[] = ['USDT', 'BTC', 'ETH', 'LTC', 'SOL'];
  const config = CRYPTO_CONFIGS[selectedCrypto];
  const childAddressInfo = user.childAddresses[selectedCrypto];
  const currentPrice = prices[selectedCrypto] || config.currentPriceUsd;

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

  // Generate QR Code on canvas
  useEffect(() => {
    if (isOpen && qrCanvasRef.current && childAddressInfo?.address) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        childAddressInfo.address,
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
  }, [isOpen, selectedCrypto, childAddressInfo]);

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
    if (childAddressInfo?.address) {
      navigator.clipboard.writeText(childAddressInfo.address);
      setCopied(true);
      sound.playClick();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRunSimulation = async () => {
    try {
      setIsSimulating(true);
      setSimulationStep('Broadcasting transaction to blockchain...');
      sound.playClick();

      await new Promise((r) => setTimeout(r, 600));
      setSimulationStep('Detecting incoming unconfirmed UTXO/Transfer on Child Address...');
      
      await new Promise((r) => setTimeout(r, 800));
      setSimulationStep('Validating 3/3 confirmations & Converting rate to USD...');
      
      await new Promise((r) => setTimeout(r, 800));
      setSimulationStep('Crediting Vault Stakes USD Balance & Sweeping to Master Vault...');
      
      const res = await onSimulateDeposit(selectedCrypto, customSimAmount);
      
      sound.playDepositSound();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#6ee7b7'],
      });

      setSimulationStep(`✅ Deposit Successful! +${customSimAmount} ${selectedCrypto} (+$${(customSimAmount * currentPrice).toFixed(2)} USD)`);
      setTimeout(() => {
        setIsSimulating(false);
        setSimulationStep(null);
      }, 2500);
    } catch (err: any) {
      setIsSimulating(false);
      setSimulationStep(`❌ Error: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="deposit-modal-container" 
        className="relative w-full max-w-lg bg-[#0a122a] border border-[#c0c0c0]/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
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
              <p className="text-xs text-[#c0c0c0]">Instant deposit with automatic USD conversion</p>
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
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Crypto Selector Chips */}
          <div>
            <label className="block text-xs font-bold text-[#c0c0c0] mb-2 uppercase tracking-wider">
              Select Currency
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
                        ? 'bg-[#1a2b4b] border-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.25)] text-white'
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

          {/* Network & Live Rate Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/20 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[#c0c0c0] font-bold">Network:</span>
              <span className="font-bold text-[#00ff41]">{config.network}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#c0c0c0] font-bold">Live Rate:</span>
              <span className="font-bold text-white font-mono">1 {selectedCrypto} = {formatUsd(currentPrice)}</span>
            </div>
          </div>

          {/* QR Code & Address Display */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/20 shadow-inner">
            <div className="p-3 bg-white rounded-2xl shadow-xl border border-slate-300 mb-3">
              <canvas ref={qrCanvasRef} className="rounded-xl"></canvas>
            </div>

            <div className="w-full">
              <div className="flex items-center justify-between text-xs text-[#c0c0c0] mb-1.5">
                <span className="font-bold">Your Deposit Address:</span>
                <span className="font-mono text-[10px] text-[#00ff41] font-bold">{config.network}</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0a122a] border border-[#c0c0c0]/20 font-mono text-xs text-white break-all">
                <span className="flex-1 select-all">{childAddressInfo?.address}</span>
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
              • Send only <strong className="text-white">{selectedCrypto}</strong> ({config.network}) to this address.
              <br />
              • Real blockchain deposits are detected via public mempool APIs and automatically converted to your live USD balance.
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
