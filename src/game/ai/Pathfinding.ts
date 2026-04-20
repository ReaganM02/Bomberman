import { DIRECTIONS } from '../config/GameConfig';
import type { Grid } from '../core/Grid';
import type { GridPos } from '../core/Types';
import { keyOf, samePos } from '../utils/MathUtils';

const CARDINALS = [DIRECTIONS.up, DIRECTIONS.down, DIRECTIONS.left, DIRECTIONS.right];

export interface PathContext {
  grid: Grid;
  blocked: Set<string>;
  dangerous?: Set<string>;
}

export function findPath(start: GridPos, goal: GridPos, context: PathContext): GridPos[] {
  if (samePos(start, goal)) return [];
  const queue: GridPos[] = [start];
  const cameFrom = new Map<string, string>();
  const seen = new Set<string>([keyOf(start)]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const dir of CARDINALS) {
      const next = { x: current.x + dir.x, y: current.y + dir.y };
      const nextKey = keyOf(next);
      if (seen.has(nextKey)) continue;
      if (!context.grid.isFloor(next) || context.blocked.has(nextKey)) continue;
      seen.add(nextKey);
      cameFrom.set(nextKey, keyOf(current));
      if (samePos(next, goal)) return reconstruct(start, next, cameFrom);
      queue.push(next);
    }
  }

  return [];
}

export function nearestSafeTile(start: GridPos, context: PathContext): GridPos | undefined {
  const dangerous = context.dangerous ?? new Set<string>();
  const queue: GridPos[] = [start];
  const seen = new Set<string>([keyOf(start)]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentKey = keyOf(current);
    if (!dangerous.has(currentKey) && !context.blocked.has(currentKey) && context.grid.isFloor(current)) return current;
    for (const dir of CARDINALS) {
      const next = { x: current.x + dir.x, y: current.y + dir.y };
      const nextKey = keyOf(next);
      if (seen.has(nextKey)) continue;
      if (!context.grid.isFloor(next) || context.blocked.has(nextKey)) continue;
      seen.add(nextKey);
      queue.push(next);
    }
  }

  return undefined;
}

export function nearestReachable(
  start: GridPos,
  context: PathContext,
  predicate: (pos: GridPos) => boolean,
): GridPos | undefined {
  const queue: GridPos[] = [start];
  const seen = new Set<string>([keyOf(start)]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (predicate(current)) return current;
    for (const dir of CARDINALS) {
      const next = { x: current.x + dir.x, y: current.y + dir.y };
      const nextKey = keyOf(next);
      if (seen.has(nextKey)) continue;
      if (!context.grid.isFloor(next) || context.blocked.has(nextKey)) continue;
      seen.add(nextKey);
      queue.push(next);
    }
  }

  return undefined;
}

function reconstruct(start: GridPos, goal: GridPos, cameFrom: Map<string, string>): GridPos[] {
  const path: GridPos[] = [goal];
  let cursor = keyOf(goal);
  const startKey = keyOf(start);
  while (cursor !== startKey) {
    const previous = cameFrom.get(cursor);
    if (!previous) break;
    const [x, y] = previous.split(',').map(Number);
    cursor = previous;
    if (cursor !== startKey) path.unshift({ x, y });
  }
  return path;
}
