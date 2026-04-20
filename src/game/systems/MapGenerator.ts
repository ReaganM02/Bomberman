import { GAME_CONFIG } from '../config/GameConfig';
import type { GridPos, SpawnPoint, TileKind } from '../core/Types';
import { Grid } from '../core/Grid';
import { Rng } from '../utils/Rng';
import { manhattan } from '../utils/MathUtils';

export class MapGenerator {
  generate(seed = GAME_CONFIG.board.seed): Grid {
    const { width, height, crateChance } = GAME_CONFIG.board;
    const rng = new Rng(seed);
    const tiles: TileKind[] = [];
    const spawnBases: SpawnPoint[] = [
      { x: 1, y: 1, team: 'player' },
      { x: width - 2, y: height - 2, team: 'bot' },
      { x: width - 2, y: 1, team: 'bot' },
      { x: 1, y: height - 2, team: 'bot' },
      { x: Math.floor(width / 2), y: height - 2, team: 'bot' },
    ];

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
        const pillar = x % 2 === 0 && y % 2 === 0;
        const nearSpawn = spawnBases.some((spawn) => manhattan(spawn, { x, y }) <= 2);
        let kind: TileKind = 'floor';
        if (edge || pillar) kind = 'hard';
        else if (!nearSpawn && rng.chance(crateChance)) kind = 'crate';
        tiles.push(kind);
      }
    }

    return new Grid(width, height, tiles, spawnBases);
  }
}
