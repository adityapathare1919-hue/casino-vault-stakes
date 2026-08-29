import React, { useState, useEffect } from 'react';
import { UserProfile, CryptoSymbol } from './types';
import { api } from './services/api';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { Lobby } from './components/Lobby';
import { MinesGame } from './components/MinesGame';
import { TowersGame } from './components/TowersGame';
import { HistoryView } from './components/HistoryView';
import { VaultSetupView } from './components/VaultSetupView';
import { DepositModal } from './components/DepositModal';
import { WithdrawModal } from './components/WithdrawModal';
import { ProvablyFairModal } from './components/ProvablyFairModal';
import { generateUserChildAddresses, DEFAULT_MASTER_SEED, CRYPTO_CONFIGS } from './utils/cryptoHD';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isFairModalOpen, setIsFairModalOpen] = useState(false);
  const [fairModalData, setFairModalData] = useState<{
    serverSeedHash?: string;
    serverSeed?: string;
    clientSeed?: string;
    nonce?: number;
  }>({});

  const [prices, setPrices] = useState<Record<CryptoSymbol, number>>({
    BTC: 94250.0,
    ETH: 2780.0,
    LTC: 112.5,
    SOL: 188.4,
    USDT: 1.0,
  });

  const [user, setUser] = useState<UserProfile>({
    id: 'tg_user_789123',
    telegramId: 789123,
    username: 'Player',
    firstName: 'Player',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    isTelegramWebApp: false,
    balanceUsd: 0.0,
    cryptoBalances: {
      BTC: 0.0,
      ETH: 0.0,
      LTC: 0.0,
      SOL: 0.0,
      USDT: 0.0,
    },
    childAddresses: generateUserChildAddresses(789123, 1, DEFAULT_MASTER_SEED),
    vipTier: 'Bronze',
    totalWageredUsd: 0.0,
    totalDepositedUsd: 0.0,
    totalWithdrawnUsd: 0.0,
    rakebackEarnedUsd: 0.0,
    rakebackClaimedUsd: 0.0,
    clientSeed: 'player_seed_alpha',
    nonce: 0,
    createdAt: new Date().toISOString(),
  });

  // Telegram WebApp initialization & Server User load
  useEffect(() => {
    let currentUserId = user.id;

    // Check if running in Telegram WebApp
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      const tgUser = tg.initDataUnsafe?.user;
      if (tgUser) {
        currentUserId = `tg_user_${tgUser.id}`;
        setUser((prev) => ({
          ...prev,
          id: currentUserId,
          telegramId: tgUser.id,
          username: tgUser.username || `Player_${tgUser.id}`,
          firstName: tgUser.first_name || 'Player',
          lastName: tgUser.last_name,
          avatarUrl: tgUser.photo_url || prev.avatarUrl,
          isTelegramWebApp: true,
          childAddresses: generateUserChildAddresses(tgUser.id, tgUser.id % 1000, DEFAULT_MASTER_SEED),
        }));
      }
    }

    // Load user state & live prices from backend for this exact user
    api.getUser(currentUserId)
      .then((data) => {
        if (data.user) {
          setUser((prev) => ({
            ...prev,
            balanceUsd: data.user.balanceUsd,
            cryptoBalances: data.user.cryptoBalances || prev.cryptoBalances,
            totalWageredUsd: data.user.totalWageredUsd,
            totalDepositedUsd: data.user.totalDepositedUsd,
            totalWithdrawnUsd: data.user.totalWithdrawnUsd,
            rakebackEarnedUsd: data.user.rakebackEarnedUsd,
            rakebackClaimedUsd: data.user.rakebackClaimedUsd,
            vipTier: data.user.vipTier,
            nonce: data.user.nonce,
          }));
        }
        if (data.prices) {
          setPrices(data.prices);
        }
      })
      .catch((err) => {
        console.log('Backend sync active:', err.message);
      });

    // Real-time live market price polling every 10 seconds
    const fetchLivePrices = async () => {
      try {
        const data = await api.getPrices();
        if (data.prices) {
          setPrices(data.prices);
        }
      } catch (e) {
        // Client-side fallback to Binance direct public ticker
        try {
          const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22LTCUSDT%22,%22SOLUSDT%22%5D');
          if (res.ok) {
            const list: Array<{ symbol: string; price: string }> = await res.json();
            setPrices((prev) => {
              const updated = { ...prev };
              for (const item of list) {
                const val = parseFloat(item.price);
                if (item.symbol === 'BTCUSDT' && val > 0) updated.BTC = parseFloat(val.toFixed(2));
                if (item.symbol === 'ETHUSDT' && val > 0) updated.ETH = parseFloat(val.toFixed(2));
                if (item.symbol === 'LTCUSDT' && val > 0) updated.LTC = parseFloat(val.toFixed(2));
                if (item.symbol === 'SOLUSDT' && val > 0) updated.SOL = parseFloat(val.toFixed(2));
              }
              updated.USDT = 1.0;
              return updated;
            });
          }
        } catch (err) {}
      }
    };

    fetchLivePrices();
    const priceInterval = setInterval(fetchLivePrices, 10000);

    // Periodic live balance & deposit status sync every 6 seconds
    const syncUserBalance = async () => {
      try {
        const data = await api.getUser(user.id);
        if (data && data.user) {
          setUser((prev) => ({
            ...prev,
            balanceUsd: data.user.balanceUsd,
            cryptoBalances: data.user.cryptoBalances || prev.cryptoBalances,
            totalWageredUsd: data.user.totalWageredUsd,
            totalDepositedUsd: data.user.totalDepositedUsd,
            totalWithdrawnUsd: data.user.totalWithdrawnUsd,
            rakebackEarnedUsd: data.user.rakebackEarnedUsd,
            rakebackClaimedUsd: data.user.rakebackClaimedUsd,
            vipTier: data.user.vipTier,
            nonce: data.user.nonce,
          }));
        }
      } catch (e) {}
    };

    const userSyncInterval = setInterval(syncUserBalance, 6000);

    return () => {
      clearInterval(priceInterval);
      clearInterval(userSyncInterval);
    };
  }, [user.id]);

  const handleCheckLiveDeposits = async () => {
    try {
      const res = await api.checkLiveDeposits(user.id);
      if (res && res.user) {
        setUser((prev) => ({
          ...prev,
          balanceUsd: res.user.balanceUsd,
          totalDepositedUsd: res.user.totalDepositedUsd,
          cryptoBalances: res.user.cryptoBalances || prev.cryptoBalances,
        }));
      }
      return res;
    } catch (e: any) {
      throw e;
    }
  };

  const handleBalanceUpdate = (newBalanceUsd: number) => {
    setUser((prev) => ({ ...prev, balanceUsd: newBalanceUsd }));
  };

  const handleSimulateDeposit = async (symbol: CryptoSymbol, amount: number) => {
    const res = await api.simulateDeposit(symbol, amount, user.id);
    if (res.updatedBalanceUsd !== undefined) {
      setUser((prev) => ({
        ...prev,
        balanceUsd: res.updatedBalanceUsd,
        totalDepositedUsd: res.user?.totalDepositedUsd || prev.totalDepositedUsd + amount * (prices[symbol] || 1),
        cryptoBalances: res.user?.cryptoBalances || prev.cryptoBalances,
      }));
    }
    return res;
  };

  const handleWithdraw = async (params: {
    symbol: CryptoSymbol;
    destinationAddress: string;
    amountUsd?: number;
    amountCrypto?: number;
  }) => {
    const res = await api.withdraw({ ...params, userId: user.id });
    if (res.updatedBalanceUsd !== undefined) {
      setUser((prev) => ({
        ...prev,
        balanceUsd: res.updatedBalanceUsd,
        totalWithdrawnUsd: res.user?.totalWithdrawnUsd || prev.totalWithdrawnUsd,
      }));
    }
    return res;
  };

  const handleOpenFairModal = (
    serverSeedHash: string = '',
    serverSeed: string = '',
    clientSeed: string = user.clientSeed,
    nonce: number = user.nonce
  ) => {
    setFairModalData({ serverSeedHash, serverSeed, clientSeed, nonce });
    setIsFairModalOpen(true);
  };

  const unclaimedRakeback = Math.max(0, Number((user.rakebackEarnedUsd - user.rakebackClaimedUsd).toFixed(2)));

  const handleMasterSeedChange = (newSeed: string) => {
    setUser((prev) => ({
      ...prev,
      childAddresses: generateUserChildAddresses(prev.telegramId, prev.telegramId % 1000, newSeed),
    }));
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      
      {/* Top Header Bar */}
      <Header
        user={user}
        prices={prices}
        onOpenDeposit={() => setIsDepositOpen(true)}
        onOpenWithdraw={() => setIsWithdrawOpen(true)}
      />

      {/* Main Content View */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 py-3">
        {activeTab === 'home' && (
          <Lobby
            user={user}
            prices={prices}
            onSelectGame={(game) => setActiveTab(game)}
            onOpenDeposit={() => setIsDepositOpen(true)}
            onOpenWithdraw={() => setIsWithdrawOpen(true)}
            onOpenFairModal={() => handleOpenFairModal()}
            onOpenVIP={() => setActiveTab('wager')}
          />
        )}

        {activeTab === 'mines' && (
          <MinesGame
            user={user}
            onBalanceUpdate={handleBalanceUpdate}
            onOpenDeposit={() => setIsDepositOpen(true)}
            onOpenFairModal={handleOpenFairModal}
          />
        )}

        {activeTab === 'towers' && (
          <TowersGame
            user={user}
            onBalanceUpdate={handleBalanceUpdate}
            onOpenDeposit={() => setIsDepositOpen(true)}
            onOpenFairModal={handleOpenFairModal}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            user={user}
            onOpenFairModal={handleOpenFairModal}
          />
        )}

        {activeTab === 'wager' && (
          <VaultSetupView
            user={user}
            onBalanceUpdate={handleBalanceUpdate}
            onOpenDeposit={() => setIsDepositOpen(true)}
            onOpenWithdraw={() => setIsWithdrawOpen(true)}
            onMasterSeedChange={handleMasterSeedChange}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        unclaimedRakebackUsd={unclaimedRakeback}
      />

      {/* Modals */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        user={user}
        prices={prices}
        onSimulateDeposit={handleSimulateDeposit}
        onCheckLiveDeposits={handleCheckLiveDeposits}
      />

      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        user={user}
        prices={prices}
        onWithdraw={handleWithdraw}
      />

      <ProvablyFairModal
        isOpen={isFairModalOpen}
        onClose={() => setIsFairModalOpen(false)}
        serverSeedHash={fairModalData.serverSeedHash}
        serverSeed={fairModalData.serverSeed}
        clientSeed={fairModalData.clientSeed}
        nonce={fairModalData.nonce}
      />

    </div>
  );
}
