export type CryptoSymbol = 'BTC' | 'ETH' | 'LTC' | 'SOL' | 'USDT';

export interface CryptoConfig {
  symbol: CryptoSymbol;
  name: string;
  network: string;
  icon: string;
  color: string;
  decimals: number;
  derivationPath: string;
  parentAddress: string;
  minDeposit: number;
  confirmationsNeeded: number;
  currentPriceUsd: number;
  explorerUrl: string;
}

export interface ChildAddress {
  symbol: CryptoSymbol;
  address: string;
  derivationIndex: number;
  derivationPath: string;
  parentAddress: string;
  qrData: string;
  network: string;
}

export interface UserProfile {
  id: string;
  telegramId: number;
  username: string;
  firstName: string;
  lastName?: string;
  avatarUrl: string;
  isTelegramWebApp: boolean;
  balanceUsd: number;
  cryptoBalances: Record<CryptoSymbol, number>;
  childAddresses: Record<CryptoSymbol, ChildAddress>;
  vipTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
  totalWageredUsd: number;
  totalDepositedUsd: number;
  totalWithdrawnUsd: number;
  rakebackEarnedUsd: number;
  rakebackClaimedUsd: number;
  clientSeed: string;
  nonce: number;
  createdAt: string;
}

export type TransactionType = 'deposit' | 'withdrawal' | 'sweep' | 'rakeback' | 'bonus';
export type TransactionStatus = 'pending' | 'confirming' | 'completed' | 'failed';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  symbol: CryptoSymbol;
  amountCrypto: number;
  amountUsd: number;
  rateUsd: number;
  fromAddress: string;
  toAddress: string;
  txHash: string;
  confirmations: number;
  requiredConfirmations: number;
  status: TransactionStatus;
  isSweptToParent?: boolean;
  parentSweepTxHash?: string;
  createdAt: string;
  completedAt?: string;
}

export type GameType = 'mines' | 'towers';
export type GameStatus = 'idle' | 'in_progress' | 'won' | 'lost' | 'cashed_out';

export interface MinesTile {
  index: number;
  isRevealed: boolean;
  isMine: boolean;
  multiplier: number;
}

export interface MinesGameState {
  id: string;
  betAmountUsd: number;
  cryptoSymbol: CryptoSymbol;
  minesCount: number;
  gemsCount: number;
  revealedTiles: number[];
  currentMultiplier: number;
  currentPayoutUsd: number;
  status: GameStatus;
  serverSeedHash: string;
  serverSeed?: string; // only revealed on finish
  clientSeed: string;
  nonce: number;
  minePositions?: number[]; // only revealed on finish
}

export type TowerDifficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'crazy';

export interface TowerTierConfig {
  difficulty: TowerDifficulty;
  name: string;
  tilesPerRow: number;
  bombsPerRow: number;
  safesPerRow: number;
  multipliers: number[];
}

export interface TowerRowState {
  row: number;
  multiplier: number;
  selectedIndex?: number;
  bombIndices: number[]; // revealed on row complete or game over
  isPassed: boolean;
  isFailed: boolean;
}

export interface TowersGameState {
  id: string;
  betAmountUsd: number;
  cryptoSymbol: CryptoSymbol;
  difficulty: TowerDifficulty;
  currentRow: number;
  totalRows: number;
  currentMultiplier: number;
  currentPayoutUsd: number;
  status: GameStatus;
  rows: TowerRowState[];
  serverSeedHash: string;
  serverSeed?: string;
  clientSeed: string;
  nonce: number;
}

export interface BetRecord {
  id: string;
  userId: string;
  game: GameType;
  betAmountUsd: number;
  payoutUsd: number;
  multiplier: number;
  status: 'win' | 'loss';
  serverSeedHash: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  details: {
    minesCount?: number;
    revealedCount?: number;
    difficulty?: TowerDifficulty;
    clearedRows?: number;
  };
  createdAt: string;
}

export interface MasterWalletConfig {
  mnemonicPhrase: string;
  parentAddresses: Record<CryptoSymbol, string>;
  totalSweptUsd: number;
  totalDepositsTracked: number;
  lastSweepTimestamp: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  buttons?: Array<{
    text: string;
    action: string;
    url?: string;
  }>;
  quickInfo?: {
    type: 'balance' | 'deposit' | 'game' | 'vip';
    data?: any;
  };
}
