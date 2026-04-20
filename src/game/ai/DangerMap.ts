import { DIRECTIONS } from '../config/GameConfig';
import type { Grid } from '../core/Grid';
import type { GridPos } from '../core/Types';
import type { Bomb } from '../entities/Bomb';
import type { Explosion } from '../entities/Explosion';
import { keyOf } from '../utils/MathUtils';

const CARDINALS = [DIRECTIONS.up, DIRECTIONS.down, DIRECTIONS.left, DIRECTIONS.right];

export class DangerMap {
  readonly active = new Set<string>();
  readonly predicted = new Set<string>();

  rebuild(grid: Grid, bombs: Bomb[], explosions: Explosion[], ranges: Map<string, number>): void {
    this.active.clear();
    this.predicted.clear();

    for (const explosion of explosions) {
      for (const tile of explosion.tiles) this.active.add(keyOf(tile));
    }

    for (const bomb of bombs) {
      const range = ranges.get(bomb.ownerId) ?? 2;
      const tiles = computeBlastTiles(grid, bomb.gridPos, range);
      for (const tile of tiles) this.predicted.add(keyOf(tile));
    }
  }

  isDanger(pos: GridPos): boolean {
    const key = keyOf(pos);
    return this.active.has(key) || this.predicted.has(key);
  }
}

export function computeBlastTiles(grid: Grid, origin: GridPos, range: number): GridPos[] {
  const tiles: GridPos[] = [{ ...origin }];
  for (const dir of CARDINALS) {
    for (let step = 1; step <= range; step += 1) {
      const pos = { x: origin.x + dir.x * step, y: origin.y + dir.y * step };
      if (!grid.inBounds(pos) || grid.isHard(pos)) break;
      tiles.push(pos);
      if (grid.isCrate(pos)) break;
    }
  }
  return tiles;
}
