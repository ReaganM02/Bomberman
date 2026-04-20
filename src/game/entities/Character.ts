import * as THREE from 'three';
import { DIRECTIONS } from '../config/GameConfig';
import type { CharacterStats, Direction, GridPos } from '../core/Types';
import { addDir, clamp01, lerpVector, samePos } from '../utils/MathUtils';
import type { RendererSystem } from '../systems/RendererSystem';

export class Character {
  readonly group = new THREE.Group();
  readonly mixer: THREE.AnimationMixer;
  readonly actions = new Map<string, THREE.AnimationAction>();
  readonly id: string;
  stats: CharacterStats;
  gridPos: GridPos;
  alive = true;
  moving = false;
  turning = false;
  targetPos: GridPos;
  facing: Direction = DIRECTIONS.down;
  activeBombs = 0;
  aiState = 'idle';

  private moveFrom = new THREE.Vector3();
  private moveTo = new THREE.Vector3();
  private moveProgress = 1;
  private queuedMoveDirection: Direction = DIRECTIONS.none;
  private turnFromYaw = 0;
  private turnToYaw = 0;
  private turnProgress = 1;
  private readonly turnDuration = 0.1;
  private readonly visualRoot = new THREE.Group();
  private currentAction?: THREE.AnimationAction;

  constructor(
    id: string,
    model: THREE.Group,
    animations: THREE.AnimationClip[],
    stats: CharacterStats,
    spawn: GridPos,
    private readonly renderer: RendererSystem,
  ) {
    this.id = id;
    this.stats = { ...stats };
    this.gridPos = { ...spawn };
    this.targetPos = { ...spawn };
    this.mixer = new THREE.AnimationMixer(model);
    this.group.add(this.visualRoot);
    this.visualRoot.add(model);
    this.group.position.copy(renderer.gridToWorld(spawn));
    animations.forEach((clip) => this.actions.set(clip.name, this.mixer.clipAction(clip)));
    this.play('idle');
  }

  canAcceptMove(): boolean {
    return this.alive && !this.moving && !this.turning;
  }

  beginMove(direction: Direction): GridPos {
    this.targetPos = addDir(this.gridPos, direction);
    const targetYaw = this.directionToYaw(direction);
    const yawDelta = Math.abs(THREE.MathUtils.euclideanModulo(targetYaw - this.visualRoot.rotation.y + Math.PI, Math.PI * 2) - Math.PI);
    this.facing = direction;
    if (yawDelta > 0.03) {
      this.queuedMoveDirection = direction;
      this.turnFromYaw = this.visualRoot.rotation.y;
      this.turnToYaw = targetYaw;
      this.turnProgress = 0;
      this.turning = true;
      this.play('idle');
      return this.targetPos;
    }

    this.startTranslation(direction);
    return this.targetPos;
  }

  private startTranslation(direction: Direction): void {
    this.facing = direction;
    this.moveFrom.copy(this.group.position);
    this.moveTo.copy(this.renderer.gridToWorld(this.targetPos));
    this.moveProgress = 0;
    this.moving = true;
    this.play('run');
  }

  teleport(pos: GridPos): void {
    this.gridPos = { ...pos };
    this.targetPos = { ...pos };
    this.group.position.copy(this.renderer.gridToWorld(pos));
  }

  update(delta: number): void {
    this.mixer.update(delta);
    if (this.turning) {
      this.turnProgress += delta / this.turnDuration;
      const alpha = clamp01(this.turnProgress);
      this.visualRoot.rotation.y = this.lerpYaw(this.turnFromYaw, this.turnToYaw, this.easeOutCubic(alpha));
      if (alpha >= 1) {
        this.turning = false;
        this.visualRoot.rotation.y = this.turnToYaw;
        this.startTranslation(this.queuedMoveDirection);
        this.queuedMoveDirection = DIRECTIONS.none;
      }
    }
    if (this.moving) {
      this.moveProgress += (delta * this.stats.moveSpeed) / 1.05;
      const alpha = clamp01(this.moveProgress);
      lerpVector(this.group.position, this.moveFrom, this.moveTo, alpha);
      if (alpha >= 1) {
        this.gridPos = { ...this.targetPos };
        this.moving = false;
        this.play('idle');
      }
    }
    if (!this.moving && !this.turning && !samePos(this.gridPos, this.targetPos)) this.teleport(this.targetPos);
  }

  kill(): void {
    if (!this.alive) return;
    this.alive = false;
    this.moving = false;
    this.turning = false;
    this.play('death', false);
  }

  celebrate(): void {
    if (this.alive) this.play('victory');
  }

  play(name: string, loop = true): void {
    const next = this.actions.get(name) ?? this.actions.get('idle');
    if (!next || next === this.currentAction) return;
    next.reset();
    next.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
    next.clampWhenFinished = !loop;
    next.enabled = true;
    if (this.currentAction) next.crossFadeFrom(this.currentAction, 0.12, true);
    next.play();
    this.currentAction = next;
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.group.clear();
  }

  private directionToYaw(direction: Direction): number {
    return Math.atan2(direction.x, direction.y) + Math.PI;
  }

  private lerpYaw(from: number, to: number, alpha: number): number {
    const delta = THREE.MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI;
    return from + delta * alpha;
  }

  private easeOutCubic(value: number): number {
    return 1 - Math.pow(1 - value, 3);
  }
}
