import type { GridPos, SpawnPoint, TileKind } from './Types';
import { keyOf } from '../utils/MathUtils';

export class Grid {
  readonly width: number;
  readonly height: number;
  readonly tiles: TileKind[];
  readonly spawns: SpawnPoint[];

  constructor(width: number, height: number, tiles: TileKind[], spawns: SpawnPoint[]) {
    this.width = width;
    this.height = height;
    this.tiles = tiles;
    this.spawns = spawns;
  }

  inBounds(pos: GridPos): boolean {
    return pos.x >= 0 && pos.y >= 0 && pos.x < this.width && pos.y < this.height;
  }

  index(pos: GridPos): number {
    return pos.y * this.width + pos.x;
  }

  get(pos: GridPos): TileKind {
    return this.tiles[this.index(pos)];
  }

  set(pos: GridPos, kind: TileKind): void {
    this.tiles[this.index(pos)] = kind;
  }

  isHard(pos: GridPos): boolean {
    return this.inBounds(pos) && this.get(pos) === 'hard';
  }

  isCrate(pos: GridPos): boolean {
    return this.inBounds(pos) && this.get(pos) === 'crate';
  }

  isFloor(pos: GridPos): boolean {
    return this.inBounds(pos) && this.get(pos) === 'floor';
  }

  forEach(callback: (pos: GridPos, kind: TileKind) => void): void {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) callback({ x, y }, this.tiles[y * this.width + x]);
    }
  }

  cloneWalkableSet(): Set<string> {
    const walkable = new Set<string>();
    this.forEach((pos, kind) => {
      if (kind === 'floor') walkable.add(keyOf(pos));
    });
    return walkable;
  }
}
