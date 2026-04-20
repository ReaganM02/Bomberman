import type { Group, Vector3 } from 'three';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type StageNumber = 1 | 2 | 3;
export type StageMode = 'free-for-all' | 'hunt-player' | 'hunt-player-respawn';
export type DirectionName = 'up' | 'down' | 'left' | 'right' | 'none';
export type TileKind = 'floor' | 'hard' | 'crate';
export type PickupKind = 'bomb' | 'range' | 'speed';
export type RoundState = 'menu' | 'playing' | 'paused' | 'won' | 'lost';

export interface GridPos {
  x: number;
  y: number;
}

export interface Direction {
  name: DirectionName;
  x: number;
  y: number;
}

export interface CharacterStats {
  bombCapacity: number;
  blastRange: number;
  moveSpeed: number;
}

export interface SpawnPoint extends GridPos {
  team: 'player' | 'bot';
}

export interface SceneEntity {
  id: string;
  group: Group;
  gridPos: GridPos;
  update(delta: number): void;
  dispose(): void;
}

export interface CameraShakeRequest {
  intensity: number;
  duration: number;
}

export interface MoveIntent {
  direction: Direction;
  bomb: boolean;
}

export interface WorldLike {
  gridToWorld(pos: GridPos): Vector3;
}
