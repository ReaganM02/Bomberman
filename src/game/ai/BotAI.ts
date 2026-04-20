import { DIFFICULTY_CONFIG, DIRECTIONS } from '../config/GameConfig';
import type { Difficulty, Direction, GridPos, PickupKind, StageMode } from '../core/Types';
import type { Character } from '../entities/Character';
import { keyOf, manhattan } from '../utils/MathUtils';
import { findPath, nearestReachable, nearestSafeTile, type PathContext } from './Pathfinding';

export interface BotWorldView {
  player: Character;
  target: Character;
  bot: Character;
  difficulty: Difficulty;
  stageMode: StageMode;
  context: PathContext;
  pickups: Array<{ kind: PickupKind; gridPos: GridPos }>;
  canPlaceBomb: boolean;
}

export interface BotDecision {
  direction: Direction;
  placeBomb: boolean;
  state: string;
}

export class BotAI {
  private decisionTimer = 0;
  private current: BotDecision = { direction: DIRECTIONS.none, placeBomb: false, state: 'idle' };

  constructor(
    readonly difficulty: Difficulty,
    private readonly random: () => number,
  ) {}

  update(delta: number, view: BotWorldView): BotDecision {
    const config = DIFFICULTY_CONFIG[this.difficulty];
    this.decisionTimer -= delta;
    if (this.decisionTimer > 0 && view.bot.canAcceptMove()) return this.current;
    this.decisionTimer = config.decisionInterval * (0.85 + this.random() * 0.3);
    this.current = this.decide(view);
    return this.current;
  }

  private decide(view: BotWorldView): BotDecision {
    const config = DIFFICULTY_CONFIG[this.difficulty];
    const bot = view.bot;
    const target = view.target;
    const danger = view.context.dangerous ?? new Set<string>();
    const botKey = keyOf(bot.gridPos);

    if (danger.has(botKey)) {
      const safe = nearestSafeTile(bot.gridPos, view.context);
      return this.followTarget(bot, safe, view.context, 'seek cover', false);
    }

    const pickupTarget = this.findPickupTarget(view);
    if (pickupTarget && this.difficulty !== 'easy') {
      return this.followTarget(bot, pickupTarget, view.context, 'collect power-up', false);
    }

    const distanceToTarget = manhattan(bot.gridPos, target.gridPos);
    const canSeeTarget = target.alive && distanceToTarget <= config.awareness;
    const aligned = bot.gridPos.x === target.gridPos.x || bot.gridPos.y === target.gridPos.y;
    const pressureBomb =
      view.canPlaceBomb &&
      canSeeTarget &&
      (distanceToTarget <= 2 || (aligned && distanceToTarget <= bot.stats.blastRange + 1)) &&
      this.random() < config.aggression;

    if (pressureBomb) {
      const state = view.stageMode === 'free-for-all' ? 'duel rival' : this.difficulty === 'hard' ? 'trap player' : 'place bomb';
      return { direction: DIRECTIONS.none, placeBomb: true, state };
    }

    if (canSeeTarget && this.difficulty !== 'easy') {
      const path = findPath(bot.gridPos, target.gridPos, view.context);
      const state = view.stageMode === 'free-for-all' ? 'fight rival' : this.difficulty === 'hard' ? 'chase' : 'pressure';
      if (path.length > 0) return this.stepToward(bot.gridPos, path[0], state);
    }

    const crateTarget = this.findCrateFrontier(view);
    if (crateTarget) {
      if (view.canPlaceBomb && manhattan(crateTarget, bot.gridPos) === 0 && this.random() < config.bombChance) {
        return { direction: DIRECTIONS.none, placeBomb: true, state: 'wall farming' };
      }
      return this.followTarget(bot, crateTarget, view.context, 'wall farming', false);
    }

    return this.roam(view, this.difficulty === 'easy' ? 0.18 : 0.08);
  }

  private findPickupTarget(view: BotWorldView): GridPos | undefined {
    let best: GridPos | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const pickup of view.pickups) {
      const path = findPath(view.bot.gridPos, pickup.gridPos, view.context);
      if (path.length > 0 && path.length < bestDistance) {
        best = pickup.gridPos;
        bestDistance = path.length;
      }
    }
    return best;
  }

  private findCrateFrontier(view: BotWorldView): GridPos | undefined {
    return nearestReachable(view.bot.gridPos, view.context, (pos) => {
      for (const dir of [DIRECTIONS.up, DIRECTIONS.down, DIRECTIONS.left, DIRECTIONS.right]) {
        const neighbor = { x: pos.x + dir.x, y: pos.y + dir.y };
        if (view.context.grid.isCrate(neighbor)) return true;
      }
      return false;
    });
  }

  private followTarget(bot: Character, target: GridPos | undefined, context: PathContext, state: string, placeBomb: boolean): BotDecision {
    if (!target) return this.roam({ bot, context } as BotWorldView, 0.2);
    if (target.x === bot.gridPos.x && target.y === bot.gridPos.y) {
      return { direction: DIRECTIONS.none, placeBomb, state };
    }
    const path = findPath(bot.gridPos, target, context);
    return path.length > 0 ? this.stepToward(bot.gridPos, path[0], state) : this.roam({ bot, context } as BotWorldView, 0.2);
  }

  private roam(view: Pick<BotWorldView, 'bot' | 'context'>, bombChance: number): BotDecision {
    const dirs = [DIRECTIONS.up, DIRECTIONS.down, DIRECTIONS.left, DIRECTIONS.right].sort(() => this.random() - 0.5);
    for (const dir of dirs) {
      const next = { x: view.bot.gridPos.x + dir.x, y: view.bot.gridPos.y + dir.y };
      const key = keyOf(next);
      if (view.context.grid.isFloor(next) && !view.context.blocked.has(key) && !view.context.dangerous?.has(key)) {
        return { direction: dir, placeBomb: this.random() < bombChance, state: 'roam' };
      }
    }
    return { direction: DIRECTIONS.none, placeBomb: false, state: 'idle' };
  }

  private stepToward(from: GridPos, to: GridPos, state: string): BotDecision {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const direction =
      dx > 0 ? DIRECTIONS.right : dx < 0 ? DIRECTIONS.left : dy > 0 ? DIRECTIONS.down : dy < 0 ? DIRECTIONS.up : DIRECTIONS.none;
    return { direction, placeBomb: false, state };
  }
}
