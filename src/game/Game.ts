import * as THREE from 'three';
import { AssetSystem } from './systems/AssetSystem';
import { RendererSystem } from './systems/RendererSystem';
import { MapGenerator } from './systems/MapGenerator';
import { InputSystem } from './systems/InputSystem';
import { AudioSystem } from './systems/AudioSystem';
import { BoardMeshes } from './entities/BoardMeshes';
import { Character } from './entities/Character';
import { Bomb } from './entities/Bomb';
import { Explosion } from './entities/Explosion';
import { Pickup } from './entities/Pickup';
import { BotAI } from './ai/BotAI';
import { DangerMap, computeBlastTiles } from './ai/DangerMap';
import { DIFFICULTY_CONFIG, DIRECTIONS, GAME_CONFIG, STAGE_CONFIG } from './config/GameConfig';
import type { Difficulty, Direction, GridPos, PickupKind, RoundState, StageNumber } from './core/Types';
import type { Grid } from './core/Grid';
import { keyOf, samePos } from './utils/MathUtils';
import { Rng } from './utils/Rng';
import { HUD } from './ui/HUD';

interface GameOptions {
  canvas: HTMLCanvasElement;
  hudRoot: HTMLDivElement;
}

const PICKUP_TYPES: PickupKind[] = ['bomb', 'range', 'speed'];
const BOT_SKINS = [
  { body: 0xfee2e2, accent: 0xef4444 },
  { body: 0xffedd5, accent: 0xf97316 },
  { body: 0xf3e8ff, accent: 0xa855f7 },
  { body: 0xdcfce7, accent: 0x22c55e },
  { body: 0xfef9c3, accent: 0xfacc15 },
];

export class Game {
  private readonly renderer: RendererSystem;
  private readonly assets = new AssetSystem();
  private readonly mapGenerator = new MapGenerator();
  private readonly input: InputSystem;
  private readonly audio = new AudioSystem();
  private readonly hud: HUD;
  private readonly clock = new THREE.Clock();
  private readonly danger = new DangerMap();
  private readonly rng = new Rng(Date.now() & 0xfffffff);

  private grid?: Grid;
  private board?: BoardMeshes;
  private state: RoundState = 'menu';
  private difficulty: Difficulty = 'easy';
  private stage: StageNumber = 1;
  private stageRespawnsRemaining = 0;
  private player?: Character;
  private bots: Character[] = [];
  private botBrains = new Map<string, BotAI>();
  private bombs: Bomb[] = [];
  private explosions: Explosion[] = [];
  private pickups: Pickup[] = [];
  private elapsed = 0;
  private debug = false;
  private animationFrame = 0;
  private bombSerial = 0;
  private pickupSerial = 0;
  private botSerial = 0;

  constructor(options: GameOptions) {
    this.renderer = new RendererSystem(options.canvas);
    this.input = new InputSystem(options.hudRoot);
    this.hud = new HUD(options.hudRoot);
    this.hud.bind({
      difficulty: (difficulty) => this.selectDifficulty(difficulty),
      stage: (stage) => this.selectStage(stage),
      start: () => this.startRound(this.difficulty),
      nextStage: () => this.nextStage(),
      restart: () => this.startRound(this.difficulty),
      menu: () => this.showMenu(),
      pause: () => this.togglePause(),
      mobileDirection: (direction) => this.input.setMobileDirection(direction),
      mobileBomb: () => this.input.bufferBomb(),
    });
    this.renderHud();
  }

  async start(): Promise<void> {
    await this.assets.load();
    this.loop();
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrame);
    this.input.dispose();
    this.audio.dispose();
    this.hud.dispose();
    this.renderer.dispose();
  }

  private startRound(difficulty: Difficulty): void {
    void this.requestMobileLandscape();
    this.audio.play('menu');
    this.clearRound();
    this.difficulty = difficulty;
    this.botSerial = 0;
    this.stageRespawnsRemaining = DIFFICULTY_CONFIG[difficulty].bots * STAGE_CONFIG[this.stage].respawnWaves;
    this.state = 'playing';
    this.elapsed = 0;
    this.grid = this.mapGenerator.generate(GAME_CONFIG.board.seed + Math.floor(this.rng.next() * 999999));
    this.renderer.centerCameraOnArena(this.grid.width, this.grid.height);
    this.board = new BoardMeshes(this.renderer, this.grid);
    this.board.build();
    this.createCharacters(difficulty);
    this.rebuildDebug();
    this.renderHud();
  }

  private showMenu(): void {
    this.audio.play('menu');
    this.clearRound();
    this.state = 'menu';
    this.renderHud();
  }

  private async requestMobileLandscape(): Promise<void> {
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    if (!coarsePointer) return;

    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      }
    } catch {
      // Fullscreen is best-effort on mobile browsers.
    }

    try {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: 'landscape') => Promise<void>;
      };
      await orientation.lock?.('landscape');
    } catch {
      // iOS Safari and some Android browsers do not allow orientation lock.
    }
  }

  private selectStage(stage: StageNumber): void {
    this.stage = stage;
    this.audio.play('menu');
    this.renderHud();
  }

  private selectDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
    this.audio.play('menu');
    this.renderHud();
  }

  private nextStage(): void {
    this.stage = Math.min(3, this.stage + 1) as StageNumber;
    this.startRound(this.difficulty);
  }

  private togglePause(): void {
    if (this.state === 'playing') this.state = 'paused';
    else if (this.state === 'paused') this.state = 'playing';
    this.audio.play('menu');
    this.renderHud();
  }

  private createCharacters(difficulty: Difficulty): void {
    if (!this.grid) return;
    const playerSpawn = this.grid.spawns.find((spawn) => spawn.team === 'player') ?? { x: 1, y: 1 };
    const playerAsset = this.assets.createCharacterModel(0x38bdf8, 0xf8fafc);
    this.player = new Character('player', playerAsset.model, playerAsset.animations, GAME_CONFIG.player, playerSpawn, this.renderer);
    this.renderer.world.add(this.player.group);

    this.spawnBots(difficulty);
  }

  private spawnBots(difficulty: Difficulty): void {
    if (!this.grid) return;
    const botCount = DIFFICULTY_CONFIG[difficulty].bots;
    const botSpawns = this.grid.spawns.filter((spawn) => spawn.team === 'bot').slice(0, botCount);
    botSpawns.forEach((spawn, index) => {
      this.spawnBot(difficulty, spawn, index);
    });
  }

  private spawnBot(difficulty: Difficulty, spawn: GridPos, index: number): void {
    if (!this.grid) return;
    const skin = BOT_SKINS[index % BOT_SKINS.length];
    const asset = this.assets.createCharacterModel(skin.accent, skin.body);
    const bot = new Character(
      `bot-${this.botSerial++}`,
      asset.model,
      asset.animations,
      {
        bombCapacity: 1,
        blastRange: difficulty === 'hard' ? 3 : 2,
        moveSpeed: difficulty === 'easy' ? 3.4 : difficulty === 'medium' ? 4.1 : 4.6,
      },
      spawn,
      this.renderer,
    );
    this.bots.push(bot);
    this.botBrains.set(bot.id, new BotAI(difficulty, () => this.rng.next()));
    this.renderer.world.add(bot.group);
  }

  private loop = (): void => {
    this.animationFrame = requestAnimationFrame(this.loop);
    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.update(delta);
    this.renderer.update(delta);
    this.renderer.render();
  };

  private update(delta: number): void {
    if (this.input.consumePause()) this.togglePause();
    if (this.input.consumeDebug()) {
      this.debug = this.renderer.toggleDebug();
      this.rebuildDebug();
      this.renderHud();
    }
    if (this.state !== 'playing' || !this.grid || !this.player) return;

    this.elapsed += delta;
    this.rebuildDangerMap();
    this.updateStageRespawn();
    this.updatePlayer(delta);
    this.updateBots(delta);
    this.updateBombs(delta);
    this.updateExplosions(delta);
    this.updatePickups(delta);
    this.checkWinLose();
  }

  private updatePlayer(delta: number): void {
    if (!this.player || !this.grid) return;
    this.player.update(delta);
    if (!this.player.alive) return;

    const intent = this.input.getIntent();
    if (intent.bomb) this.placeBomb(this.player);
    if (this.player.canAcceptMove() && intent.direction.name !== 'none') this.tryMove(this.player, intent.direction);
  }

  private updateBots(delta: number): void {
    if (!this.grid || !this.player) return;
    const blocked = this.blockedTiles();
    const ranges = this.characterRanges();
    for (const bot of this.bots) {
      bot.update(delta);
      if (!bot.alive) continue;
      const brain = this.botBrains.get(bot.id);
      if (!brain || !bot.canAcceptMove()) continue;
      const target = this.chooseBotTarget(bot);
      if (!target) continue;
      const decision = brain.update(delta, {
        bot,
        player: this.player,
        target,
        difficulty: this.difficulty,
        stageMode: STAGE_CONFIG[this.stage].mode,
        context: { grid: this.grid, blocked, dangerous: new Set([...this.danger.active, ...this.danger.predicted]) },
        pickups: this.pickups.map((pickup) => ({ kind: pickup.kind, gridPos: pickup.gridPos })),
        canPlaceBomb: bot.activeBombs < bot.stats.bombCapacity,
      });
      bot.aiState = decision.state;
      if (decision.placeBomb) this.placeBomb(bot);
      if (decision.direction.name !== 'none') this.tryMove(bot, decision.direction);
      ranges.set(bot.id, bot.stats.blastRange);
    }
  }

  private chooseBotTarget(bot: Character): Character | undefined {
    if (!this.player) return undefined;
    if (STAGE_CONFIG[this.stage].mode !== 'free-for-all') return this.player.alive ? this.player : undefined;

    const candidates = [this.player, ...this.bots].filter((character): character is Character => {
      return Boolean(character) && character.alive && character.id !== bot.id;
    });
    candidates.sort((a, b) => {
      const distanceA = Math.abs(a.gridPos.x - bot.gridPos.x) + Math.abs(a.gridPos.y - bot.gridPos.y);
      const distanceB = Math.abs(b.gridPos.x - bot.gridPos.x) + Math.abs(b.gridPos.y - bot.gridPos.y);
      return distanceA - distanceB;
    });
    return candidates[0];
  }

  private tryMove(character: Character, direction: Direction): void {
    if (!this.grid) return;
    const next = { x: character.gridPos.x + direction.x, y: character.gridPos.y + direction.y };
    if (!this.grid.isFloor(next)) return;
    if (this.isOccupied(next, character.id)) return;
    character.beginMove(direction);
  }

  private placeBomb(owner: Character): void {
    if (!this.grid || !owner.alive || owner.activeBombs >= owner.stats.bombCapacity) return;
    if (this.bombs.some((bomb) => samePos(bomb.gridPos, owner.gridPos))) return;
    const bomb = new Bomb(
      `bomb-${this.bombSerial++}`,
      owner.id,
      { ...owner.gridPos },
      GAME_CONFIG.bombs.fuseSeconds,
      this.renderer,
    );
    owner.activeBombs += 1;
    this.bombs.push(bomb);
    this.renderer.world.add(bomb.group);
    this.audio.play('bomb-place');
    this.renderHud();
  }

  private updateBombs(delta: number): void {
    for (const bomb of this.bombs) bomb.update(delta);
    const ready = this.bombs.filter((bomb) => bomb.timer <= 0 && !bomb.exploding);
    for (const bomb of ready) this.detonate(bomb);
  }

  private detonate(bomb: Bomb): void {
    if (!this.grid || bomb.exploding) return;
    bomb.exploding = true;
    const owner = this.getCharacter(bomb.ownerId);
    if (owner) owner.activeBombs = Math.max(0, owner.activeBombs - 1);
    const range = owner?.stats.blastRange ?? 2;
    const tiles = computeBlastTiles(this.grid, bomb.gridPos, range);
    this.bombs = this.bombs.filter((item) => item !== bomb);
    bomb.dispose();
    const explosion = new Explosion(tiles, bomb.ownerId, GAME_CONFIG.bombs.explosionSeconds, this.renderer);
    this.explosions.push(explosion);
    this.renderer.world.add(explosion.group);
    this.renderer.requestShake({ intensity: 0.34, duration: 0.24 });
    this.audio.play('explosion');

    for (const tile of tiles) {
      if (this.grid.isCrate(tile)) {
        this.grid.set(tile, 'floor');
        this.board?.destroyCrate(tile);
        this.maybeSpawnPickup(tile);
      }
      for (const other of this.bombs) {
        if (samePos(other.gridPos, tile)) other.detonateSoon(GAME_CONFIG.bombs.chainReactionDelay);
      }
    }
    this.applyExplosionDamage(tiles, bomb.ownerId);
    this.rebuildDebug();
    this.renderHud();
  }

  private updateExplosions(delta: number): void {
    const expired: Explosion[] = [];
    for (const explosion of this.explosions) {
      if (explosion.update(delta)) expired.push(explosion);
      else this.applyExplosionDamage(explosion.tiles, explosion.ownerId);
    }
    for (const explosion of expired) {
      explosion.dispose();
      this.explosions = this.explosions.filter((item) => item !== explosion);
    }
  }

  private applyExplosionDamage(tiles: GridPos[], ownerId: string): void {
    const killSet = new Set(tiles.map(keyOf));
    for (const character of [this.player, ...this.bots]) {
      if (character?.alive && killSet.has(keyOf(character.gridPos)) && this.canExplosionDamage(ownerId, character)) {
        character.kill();
        this.audio.play('death');
      }
    }
  }

  private canExplosionDamage(ownerId: string, target: Character): boolean {
    if (STAGE_CONFIG[this.stage].mode === 'free-for-all') return true;
    if (ownerId === 'player') return true;
    return target.id === 'player';
  }

  private maybeSpawnPickup(pos: GridPos): void {
    if (this.rng.next() > GAME_CONFIG.pickups.dropChance) return;
    const pickup = new Pickup(`pickup-${this.pickupSerial++}`, this.rng.pick(PICKUP_TYPES), { ...pos }, this.renderer);
    this.pickups.push(pickup);
    this.renderer.world.add(pickup.group);
  }

  private updatePickups(delta: number): void {
    for (const pickup of this.pickups) pickup.update(delta);
    if (!this.player?.alive) return;
    for (const character of [this.player, ...this.bots]) {
      if (!character?.alive) continue;
      const pickup = this.pickups.find((item) => samePos(item.gridPos, character.gridPos));
      if (!pickup) continue;
      this.applyPickup(character, pickup.kind);
      pickup.dispose();
      this.pickups = this.pickups.filter((item) => item !== pickup);
      this.audio.play('pickup');
      this.renderHud();
      if (character.id === 'player') this.hud.toast(this.pickupLabel(pickup.kind));
    }
  }

  private applyPickup(character: Character, kind: PickupKind): void {
    if (kind === 'bomb') character.stats.bombCapacity += 1;
    if (kind === 'range') character.stats.blastRange += 1;
    if (kind === 'speed') character.stats.moveSpeed = Math.min(character.stats.moveSpeed + 0.45, 7.2);
  }

  private checkWinLose(): void {
    if (!this.player) return;
    if (!this.player.alive) {
      this.state = 'lost';
      this.renderHud();
      return;
    }
    if (this.bots.every((bot) => !bot.alive)) {
      this.state = 'won';
      this.player.celebrate();
      const best = Number(localStorage.getItem('blastgrid-best') ?? Number.POSITIVE_INFINITY);
      if (this.elapsed < best) localStorage.setItem('blastgrid-best', String(this.elapsed));
      this.renderHud();
    }
  }

  private updateStageRespawn(): void {
    if (this.stage !== 3 || this.stageRespawnsRemaining <= 0 || !this.grid) return;
    const defeated = this.bots.filter((bot) => !bot.alive);
    if (defeated.length === 0) return;

    for (const bot of defeated) {
      if (this.stageRespawnsRemaining <= 0) break;
      const spawn = this.findRandomRespawnTile();
      if (!spawn) return;

      bot.dispose();
      this.botBrains.delete(bot.id);
      this.bots = this.bots.filter((item) => item !== bot);
      this.stageRespawnsRemaining -= 1;
      this.spawnBot(this.difficulty, spawn, this.botSerial);
      this.hud.toast(`Bot respawned: ${this.stageRespawnsRemaining} left`);
    }
    this.renderHud();
  }

  private findRandomRespawnTile(): GridPos | undefined {
    if (!this.grid || !this.player) return undefined;
    const candidates: GridPos[] = [];
    this.grid.forEach((pos, kind) => {
      if (kind !== 'floor') return;
      if (this.isOccupied(pos, 'respawn')) return;
      if (this.danger.isDanger(pos)) return;
      if (Math.abs(pos.x - this.player!.gridPos.x) + Math.abs(pos.y - this.player!.gridPos.y) <= 1) return;
      candidates.push({ ...pos });
    });
    if (candidates.length === 0) return undefined;
    return this.rng.pick(candidates);
  }

  private rebuildDangerMap(): void {
    if (!this.grid) return;
    this.danger.rebuild(this.grid, this.bombs, this.explosions, this.characterRanges());
    if (this.debug) this.rebuildDebug();
  }

  private blockedTiles(): Set<string> {
    const blocked = new Set<string>();
    for (const bomb of this.bombs) blocked.add(keyOf(bomb.gridPos));
    for (const character of [this.player, ...this.bots]) {
      if (character?.alive) blocked.add(keyOf(character.gridPos));
    }
    return blocked;
  }

  private isOccupied(pos: GridPos, moverId: string): boolean {
    if (this.bombs.some((bomb) => samePos(bomb.gridPos, pos))) return true;
    return [this.player, ...this.bots].some((character) => character?.alive && character.id !== moverId && samePos(character.gridPos, pos));
  }

  private characterRanges(): Map<string, number> {
    const ranges = new Map<string, number>();
    for (const character of [this.player, ...this.bots]) {
      if (character) ranges.set(character.id, character.stats.blastRange);
    }
    return ranges;
  }

  private getCharacter(id: string): Character | undefined {
    return [this.player, ...this.bots].find((character) => character?.id === id);
  }

  private rebuildDebug(): void {
    if (!this.grid) return;
    this.renderer.debugGroup.clear();
    const material = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.28 });
    const geometry = new THREE.PlaneGeometry(0.92, 0.92);
    const danger = new Set([...this.danger.active, ...this.danger.predicted]);
    for (const value of danger) {
      const [x, y] = value.split(',').map(Number);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.copy(this.renderer.gridToWorld({ x, y }));
      mesh.position.y = 0.025;
      this.renderer.debugGroup.add(mesh);
    }
  }

  private renderHud(): void {
    this.hud.render({
      state: this.state,
      difficulty: this.difficulty,
      stage: this.stage,
      wavesRemaining: this.stageRespawnsRemaining,
      bombs: this.player?.activeBombs ?? 0,
      bombCapacity: this.player?.stats.bombCapacity ?? GAME_CONFIG.player.bombCapacity,
      range: this.player?.stats.blastRange ?? GAME_CONFIG.player.blastRange,
      speed: this.player?.stats.moveSpeed ?? GAME_CONFIG.player.moveSpeed,
      botsAlive: this.bots.filter((bot) => bot.alive).length,
      elapsed: this.elapsed,
      debug: this.debug,
    });
  }

  private pickupLabel(kind: PickupKind): string {
    if (kind === 'bomb') return '+1 Bomb Capacity';
    if (kind === 'range') return '+1 Blast Range';
    return 'Speed Up';
  }

  private clearRound(): void {
    this.player?.dispose();
    for (const bot of this.bots) bot.dispose();
    for (const bomb of this.bombs) bomb.dispose();
    for (const explosion of this.explosions) explosion.dispose();
    for (const pickup of this.pickups) pickup.dispose();
    this.renderer.clearWorld();
    this.player = undefined;
    this.bots = [];
    this.botBrains.clear();
    this.bombs = [];
    this.explosions = [];
    this.pickups = [];
    this.grid = undefined;
    this.board = undefined;
  }
}
