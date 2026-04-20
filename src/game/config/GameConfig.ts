import type { Difficulty, StageNumber } from '../core/Types';

export const TILE_SIZE = 1.2;

export const DIRECTIONS = {
  up: { name: 'up', x: 0, y: -1 },
  down: { name: 'down', x: 0, y: 1 },
  left: { name: 'left', x: -1, y: 0 },
  right: { name: 'right', x: 1, y: 0 },
  none: { name: 'none', x: 0, y: 0 },
} as const;

export const GAME_CONFIG = {
  board: {
    width: 15,
    height: 13,
    crateChance: 0.72,
    seed: 424242,
  },
  player: {
    bombCapacity: 1,
    blastRange: 2,
    moveSpeed: 4.8,
  },
  bombs: {
    fuseSeconds: 2.15,
    explosionSeconds: 0.72,
    chainReactionDelay: 0.05,
  },
  visuals: {
    explosionStyle: 'realistic' as 'classic' | 'arcade' | 'realistic' | 'cyber',
    explosionQuality: 'balanced' as 'low' | 'balanced' | 'high',
  },
  pickups: {
    dropChance: 0.38,
    bobSpeed: 3.2,
  },
  camera: {
    zoom: 38,
    shakeDecay: 10,
  },
  debug: {
    enabledByDefault: false,
  },
};

export const DIFFICULTY_CONFIG: Record<
  Difficulty,
  {
    label: string;
    bots: number;
    decisionInterval: number;
    awareness: number;
    aggression: number;
    bombChance: number;
    color: number;
  }
> = {
  easy: {
    label: 'Easy',
    bots: 2,
    decisionInterval: 0.82,
    awareness: 4,
    aggression: 0.22,
    bombChance: 0.16,
    color: 0x22c55e,
  },
  medium: {
    label: 'Medium',
    bots: 3,
    decisionInterval: 0.46,
    awareness: 7,
    aggression: 0.52,
    bombChance: 0.3,
    color: 0xfacc15,
  },
  hard: {
    label: 'Hard',
    bots: 4,
    decisionInterval: 0.25,
    awareness: 11,
    aggression: 0.78,
    bombChance: 0.42,
    color: 0xef4444,
  },
};

export const STAGE_CONFIG: Record<
  StageNumber,
  {
    label: string;
    description: string;
    mode: 'free-for-all' | 'hunt-player' | 'hunt-player-respawn';
    respawnWaves: number;
  }
> = {
  1: {
    label: 'Stage 1',
    description: 'Bot free-for-all',
    mode: 'free-for-all',
    respawnWaves: 0,
  },
  2: {
    label: 'Stage 2',
    description: 'Bots hunt you',
    mode: 'hunt-player',
    respawnWaves: 0,
  },
  3: {
    label: 'Stage 3',
    description: 'Two hunting respawns',
    mode: 'hunt-player-respawn',
    respawnWaves: 2,
  },
};
