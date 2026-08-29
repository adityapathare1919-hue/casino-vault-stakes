import { sha256 } from './cryptoHD';
import { TowerDifficulty, TowerTierConfig } from '../types';

export function generateRandomHex(length: number = 32): string {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Mines Multiplier Table Calculation with 1% house edge
export function getMinesMultiplier(minesCount: number, gemsRevealed: number): number {
  if (gemsRevealed <= 0) return 1.0;
  const totalTiles = 25;
  const totalGems = totalTiles - minesCount;
  if (gemsRevealed > totalGems) return 0;

  let multiplier = 1.0;
  const houseEdge = 0.99; // 99% RTP / 1% edge

  for (let i = 0; i < gemsRevealed; i++) {
    multiplier *= (totalTiles - i) / (totalGems - i);
  }

  // Round to 2 decimals or 4 decimals for high values
  return Number((multiplier * houseEdge).toFixed(2));
}

// Generate Mine positions for a 5x5 grid (25 tiles) deterministically using Server Seed + Client Seed + Nonce
export async function generateMinesPositions(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  minesCount: number
): Promise<number[]> {
  const combined = `${serverSeed}:${clientSeed}:${nonce}`;
  const hash = await sha256(combined);
  
  const positions: number[] = [];
  let index = 0;
  
  // Use hash chunks to pick unique positions 0..24
  while (positions.length < minesCount && index + 4 <= hash.length) {
    const chunk = hash.substring(index, index + 4);
    const num = parseInt(chunk, 16);
    const pos = num % 25;
    if (!positions.includes(pos)) {
      positions.push(pos);
    }
    index += 4;
    // If we run out of hex digits, generate next SHA-256 cycle
    if (index + 4 > hash.length && positions.length < minesCount) {
      const nextHash = await sha256(`${hash}:${positions.length}`);
      index = 0;
    }
  }
  
  return positions;
}

// Towers Configuration
export const TOWER_CONFIGS: Record<TowerDifficulty, TowerTierConfig> = {
  easy: {
    difficulty: 'easy',
    name: 'Easy (3 Safe / 1 Bomb)',
    tilesPerRow: 4,
    bombsPerRow: 1,
    safesPerRow: 3,
    multipliers: [1.31, 1.74, 2.32, 3.10, 4.13, 5.51, 7.35, 9.80, 13.07],
  },
  medium: {
    difficulty: 'medium',
    name: 'Medium (2 Safe / 1 Bomb)',
    tilesPerRow: 3,
    bombsPerRow: 1,
    safesPerRow: 2,
    multipliers: [1.48, 2.23, 3.34, 5.02, 7.53, 11.29, 16.94, 25.41, 38.12],
  },
  hard: {
    difficulty: 'hard',
    name: 'Hard (1 Safe / 1 Bomb)',
    tilesPerRow: 2,
    bombsPerRow: 1,
    safesPerRow: 1,
    multipliers: [1.98, 3.92, 7.76, 15.37, 30.43, 60.25, 119.30, 236.21, 467.70],
  },
  expert: {
    difficulty: 'expert',
    name: 'Expert (1 Safe / 2 Bombs)',
    tilesPerRow: 3,
    bombsPerRow: 2,
    safesPerRow: 1,
    multipliers: [2.97, 8.82, 26.20, 77.81, 231.10, 686.37, 2038.52, 6054.40, 17981.57],
  },
  crazy: {
    difficulty: 'crazy',
    name: 'Crazy (1 Safe / 4 Bombs)',
    tilesPerRow: 5,
    bombsPerRow: 4,
    safesPerRow: 1,
    multipliers: [4.95, 24.50, 121.28, 600.34, 2971.68, 14709.82, 72813.61, 360427.37, 1784115.48],
  },
};

// Generate deterministic tower bombs for each row
export async function generateTowerRows(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  difficulty: TowerDifficulty,
  totalRows: number = 9
): Promise<number[][]> {
  const config = TOWER_CONFIGS[difficulty];
  const combined = `towers:${serverSeed}:${clientSeed}:${nonce}:${difficulty}`;
  const rowsBombs: number[][] = [];
  
  let currentHash = await sha256(combined);
  
  for (let r = 0; r < totalRows; r++) {
    const bombs: number[] = [];
    let hexOffset = 0;
    while (bombs.length < config.bombsPerRow) {
      if (hexOffset + 2 > currentHash.length) {
        currentHash = await sha256(`${currentHash}:row:${r}`);
        hexOffset = 0;
      }
      const byteVal = parseInt(currentHash.substring(hexOffset, hexOffset + 2), 16);
      const bombIndex = byteVal % config.tilesPerRow;
      if (!bombs.includes(bombIndex)) {
        bombs.push(bombIndex);
      }
      hexOffset += 2;
    }
    rowsBombs.push(bombs);
  }
  
  return rowsBombs;
}
