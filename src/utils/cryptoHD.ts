import { CryptoSymbol, CryptoConfig, ChildAddress } from '../types';

export const DEFAULT_MASTER_SEED = 'vault stakes casino master seed phrase crypto deposit secure parent wallet 2026';

// Cryptographic hash simulation using SHA-256 (standard Web Crypto API)
export async function sha256(str: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Deterministic Pseudo Random Number Generator from Seed
export function seededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return function () {
    hash = (hash * 9301 + 49297) % 233280;
    return Math.abs(hash / 233280);
  };
}

// Master Parent Addresses generated from Root 12-Word Seed
export const MASTER_PARENT_ADDRESSES: Record<CryptoSymbol, string> = {
  BTC: 'bc1qvs88parent9vaultstakesbtc99master77cold',
  ETH: '0x99A3F1d75Eb1B0586e3D4D685C8D42f888B77c42',
  LTC: 'ltc1qvs88mastervaultstakesltc99parent77cold',
  SOL: '7VaultStkMasterSol99ParentColdVault88Stake',
  USDT: '0x99A3F1d75Eb1B0586e3D4D685C8D42f888B77c42', // ERC-20 / multi-network
};

export const CRYPTO_CONFIGS: Record<CryptoSymbol, CryptoConfig> = {
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    network: 'Bitcoin Mainnet (Native SegWit)',
    icon: '₿',
    color: '#F7931A',
    decimals: 8,
    derivationPath: "m/84'/0'/0'/0/",
    parentAddress: MASTER_PARENT_ADDRESSES.BTC,
    minDeposit: 0.0001,
    confirmationsNeeded: 1,
    currentPriceUsd: 94250.0,
    explorerUrl: 'https://mempool.space/tx/',
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    network: 'Ethereum (ERC-20)',
    icon: 'Ξ',
    color: '#627EEA',
    decimals: 6,
    derivationPath: "m/44'/60'/0'/0/",
    parentAddress: MASTER_PARENT_ADDRESSES.ETH,
    minDeposit: 0.003,
    confirmationsNeeded: 3,
    currentPriceUsd: 2780.0,
    explorerUrl: 'https://etherscan.io/tx/',
  },
  LTC: {
    symbol: 'LTC',
    name: 'Litecoin',
    network: 'Litecoin Mainnet (Native SegWit)',
    icon: 'Ł',
    color: '#345D9D',
    decimals: 8,
    derivationPath: "m/84'/2'/0'/0/",
    parentAddress: MASTER_PARENT_ADDRESSES.LTC,
    minDeposit: 0.02,
    confirmationsNeeded: 2,
    currentPriceUsd: 112.5,
    explorerUrl: 'https://blockchair.com/litecoin/transaction/',
  },
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    network: 'Solana Mainnet (SPL)',
    icon: '◎',
    color: '#14F195',
    decimals: 4,
    derivationPath: "m/44'/501'/0'/",
    parentAddress: MASTER_PARENT_ADDRESSES.SOL,
    minDeposit: 0.05,
    confirmationsNeeded: 1,
    currentPriceUsd: 188.4,
    explorerUrl: 'https://solscan.io/tx/',
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    network: 'USDT (ERC20 / TRC20 / BEP20)',
    icon: '₮',
    color: '#26A17B',
    decimals: 2,
    derivationPath: "m/44'/60'/0'/0/",
    parentAddress: MASTER_PARENT_ADDRESSES.USDT,
    minDeposit: 5.0,
    confirmationsNeeded: 3,
    currentPriceUsd: 1.0,
    explorerUrl: 'https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7?a=',
  },
};

// Generate deterministic child crypto address for a user based on derivation path and userId index
export function deriveChildAddress(
  symbol: CryptoSymbol,
  userId: string | number,
  derivationIndex: number = 0,
  seedPhrase: string = DEFAULT_MASTER_SEED
): ChildAddress {
  const config = CRYPTO_CONFIGS[symbol];
  const path = `${config.derivationPath}${derivationIndex}`;
  
  // Combine seed, symbol, user ID and derivation index for deterministic generation
  const hashKey = `${seedPhrase}-${symbol}-${userId}-${derivationIndex}`;
  let hashNum = 0;
  for (let i = 0; i < hashKey.length; i++) {
    hashNum = (hashNum << 5) - hashNum + hashKey.charCodeAt(i);
    hashNum |= 0;
  }
  const hexPart = Math.abs(hashNum).toString(16).padStart(8, '0');
  
  // Secondary hash for realistic character entropy
  let hexPart2 = '';
  for (let i = 0; i < 6; i++) {
    const chunk = `${hashKey}-part-${i}`;
    let cHash = 0;
    for (let j = 0; j < chunk.length; j++) {
      cHash = (cHash << 5) - cHash + chunk.charCodeAt(j);
      cHash |= 0;
    }
    hexPart2 += Math.abs(cHash).toString(16).padStart(6, '0');
  }

  let formattedAddress = '';
  switch (symbol) {
    case 'BTC':
      // Native Segwit format bc1q...
      formattedAddress = `bc1q${hexPart}${hexPart2.substring(0, 30)}vs`;
      break;
    case 'ETH':
    case 'USDT':
      // Standard Ethereum 0x hex address 42 chars
      formattedAddress = `0x${hexPart}${hexPart2.substring(0, 32)}`;
      break;
    case 'LTC':
      // Litecoin bech32 ltc1q...
      formattedAddress = `ltc1q${hexPart}${hexPart2.substring(0, 30)}vs`;
      break;
    case 'SOL':
      // Base58-style 44 chars alphanumeric
      const b58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      let solAddr = 'VS';
      for (let i = 0; i < 42; i++) {
        const charCode = (hexPart + hexPart2).charCodeAt(i % (hexPart + hexPart2).length) + i * 7;
        solAddr += b58[charCode % b58.length];
      }
      formattedAddress = solAddr;
      break;
  }

  return {
    symbol,
    address: formattedAddress,
    derivationIndex,
    derivationPath: path,
    parentAddress: config.parentAddress,
    qrData: `${symbol.toLowerCase()}:${formattedAddress}`,
    network: config.network,
  };
}

// Generate all child addresses for a user
export function generateUserChildAddresses(
  userId: string | number,
  derivationIndex: number = 0,
  seedPhrase: string = DEFAULT_MASTER_SEED
): Record<CryptoSymbol, ChildAddress> {
  return {
    BTC: deriveChildAddress('BTC', userId, derivationIndex, seedPhrase),
    ETH: deriveChildAddress('ETH', userId, derivationIndex, seedPhrase),
    LTC: deriveChildAddress('LTC', userId, derivationIndex, seedPhrase),
    SOL: deriveChildAddress('SOL', userId, derivationIndex, seedPhrase),
    USDT: deriveChildAddress('USDT', userId, derivationIndex, seedPhrase),
  };
}

// Calculate crypto amount to USD
export function cryptoToUsd(amount: number, symbol: CryptoSymbol, customPrices?: Record<CryptoSymbol, number>): number {
  const price = customPrices?.[symbol] ?? CRYPTO_CONFIGS[symbol].currentPriceUsd;
  return amount * price;
}

// Calculate USD to crypto amount
export function usdToCrypto(usdAmount: number, symbol: CryptoSymbol, customPrices?: Record<CryptoSymbol, number>): number {
  const price = customPrices?.[symbol] ?? CRYPTO_CONFIGS[symbol].currentPriceUsd;
  if (price <= 0) return 0;
  return usdAmount / price;
}

// Format crypto values nicely with precision
export function formatCryptoAmount(amount: number, symbol: CryptoSymbol): string {
  const decimals = CRYPTO_CONFIGS[symbol]?.decimals ?? 8;
  if (decimals <= 2) return amount.toFixed(2);
  if (decimals <= 4) return amount.toFixed(4);
  return amount.toFixed(6).replace(/\.?0+$/, '');
}

// Format USD currency
export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Generate mock on-chain transaction hash
export function generateTxHash(symbol: CryptoSymbol): string {
  const chars = '0123456789abcdef';
  let hash = '';
  const len = symbol === 'ETH' || symbol === 'USDT' ? 64 : 64;
  for (let i = 0; i < len; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return symbol === 'ETH' || symbol === 'USDT' ? `0x${hash}` : hash;
}
