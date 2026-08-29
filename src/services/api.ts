import { CryptoSymbol, UserProfile, Transaction, BetRecord } from '../types';

export const api = {
  // Fetch user profile and child addresses
  async getUser(userId?: string): Promise<{ user: UserProfile; childAddresses: any; prices: Record<CryptoSymbol, number> }> {
    const res = await fetch(`/api/user${userId ? `?userId=${userId}` : ''}`);
    if (!res.ok) throw new Error('Failed to fetch user data');
    return res.json();
  },

  // Simulate crypto deposit
  async simulateDeposit(symbol: CryptoSymbol, amount: number, userId?: string): Promise<{
    success: boolean;
    message: string;
    transaction: Transaction;
    updatedBalanceUsd: number;
    user: UserProfile;
  }> {
    const res = await fetch('/api/deposit/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, amount, userId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to simulate deposit');
    }
    return res.json();
  },

  // Submit withdrawal
  async withdraw(params: {
    symbol: CryptoSymbol;
    destinationAddress: string;
    amountUsd?: number;
    amountCrypto?: number;
    userId?: string;
  }): Promise<{
    success: boolean;
    message: string;
    transaction: Transaction;
    updatedBalanceUsd: number;
    user: UserProfile;
  }> {
    const res = await fetch('/api/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to process withdrawal');
    }
    return res.json();
  },

  // Claim VIP Rakeback
  async claimRakeback(userId?: string): Promise<{
    success: boolean;
    claimedAmountUsd: number;
    updatedBalanceUsd: number;
    user: UserProfile;
  }> {
    const res = await fetch('/api/vip/claim-rakeback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to claim rakeback');
    }
    return res.json();
  },

  // Fetch History (Transactions and Bets)
  async getHistory(userId?: string): Promise<{ transactions: Transaction[]; bets: BetRecord[] }> {
    const res = await fetch(`/api/history${userId ? `?userId=${userId}` : ''}`);
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
  },

  // Mines Game API: Start
  async startMines(betAmountUsd: number, minesCount: number, userId?: string) {
    const res = await fetch('/api/games/mines/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ betAmountUsd, minesCount, userId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to start Mines game');
    }
    return res.json();
  },

  // Mines Game API: Reveal Tile
  async revealMinesTile(gameId: string, tileIndex: number) {
    const res = await fetch('/api/games/mines/reveal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, tileIndex }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reveal tile');
    }
    return res.json();
  },

  // Mines Game API: Cashout
  async cashoutMines(gameId: string) {
    const res = await fetch('/api/games/mines/cashout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to cashout Mines game');
    }
    return res.json();
  },

  // Record bet
  async recordBet(betData: any) {
    const res = await fetch('/api/bets/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(betData),
    });
    if (!res.ok) throw new Error('Failed to record bet');
    return res.json();
  },

  // Send Telegram message to bot webhook
  async sendTelegramWebhook(messageText: string, from?: any) {
    const res = await fetch('/api/telegram/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          text: messageText,
          from: from || { id: 789123, username: 'Player', first_name: 'Alex' },
        },
      }),
    });
    if (!res.ok) throw new Error('Failed to communicate with bot');
    return res.json();
  },
};
