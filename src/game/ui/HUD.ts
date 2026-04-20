import type { Difficulty, RoundState, StageNumber } from '../core/Types';
import { STAGE_CONFIG } from '../config/GameConfig';

export interface HudSnapshot {
  state: RoundState;
  difficulty: Difficulty;
  stage: StageNumber;
  wavesRemaining: number;
  bombs: number;
  bombCapacity: number;
  range: number;
  speed: number;
  botsAlive: number;
  elapsed: number;
  debug: boolean;
}

export class HUD {
  private readonly root: HTMLDivElement;
  private onDifficulty?: (difficulty: Difficulty) => void;
  private onStage?: (stage: StageNumber) => void;
  private onStart?: () => void;
  private onNextStage?: () => void;
  private onRestart?: () => void;
  private onMenu?: () => void;
  private onPause?: () => void;
  private onMobileDirection?: (direction: 'up' | 'down' | 'left' | 'right' | 'none') => void;
  private onMobileBomb?: () => void;

  constructor(host: HTMLDivElement) {
    this.root = document.createElement('div');
    this.root.className = 'hud';
    host.appendChild(this.root);
  }

  bind(handlers: {
    difficulty: (difficulty: Difficulty) => void;
    stage: (stage: StageNumber) => void;
    start: () => void;
    nextStage: () => void;
    restart: () => void;
    menu: () => void;
    pause: () => void;
    mobileDirection: (direction: 'up' | 'down' | 'left' | 'right' | 'none') => void;
    mobileBomb: () => void;
  }): void {
    this.onDifficulty = handlers.difficulty;
    this.onStage = handlers.stage;
    this.onStart = handlers.start;
    this.onNextStage = handlers.nextStage;
    this.onRestart = handlers.restart;
    this.onMenu = handlers.menu;
    this.onPause = handlers.pause;
    this.onMobileDirection = handlers.mobileDirection;
    this.onMobileBomb = handlers.mobileBomb;
  }

  render(snapshot: HudSnapshot): void {
    this.root.innerHTML = `
      <div class="topbar">
        <div class="brand">
          <div class="brand-mark"></div>
          <h1 class="title">BooMax</h1>
        </div>
        <div class="stats">
          <div class="stat"><span class="stat-label">Bombs</span>${snapshot.bombCapacity - snapshot.bombs}/${snapshot.bombCapacity}</div>
          <div class="stat"><span class="stat-label">Range</span>${snapshot.range}</div>
          <div class="stat"><span class="stat-label">Speed</span>${snapshot.speed.toFixed(1)}</div>
          <div class="stat"><span class="stat-label">Bots</span>${snapshot.botsAlive}</div>
          <div class="stat"><span class="stat-label">Stage</span>${snapshot.stage}${snapshot.wavesRemaining > 0 ? ` +${snapshot.wavesRemaining}` : ''}</div>
          <div class="stat"><span class="stat-label">Mode</span>${snapshot.difficulty}</div>
          <button class="action-button" data-action="pause" type="button">Pause</button>
        </div>
      </div>
      ${this.renderCenter(snapshot)}
      <div class="toast-stack" data-toasts></div>
      <div class="mobile-pad">
        <span></span><button data-dir="up" type="button">↑</button><span></span>
        <button data-dir="left" type="button">←</button><button data-dir="none" type="button">•</button><button data-dir="right" type="button">→</button>
        <span></span><button data-dir="down" type="button">↓</button><span></span>
      </div>
      <button class="mobile-bomb" data-action="bomb" type="button">Bomb</button>
    `;
    this.attachEvents();
  }

  toast(message: string): void {
    const stack = this.root.querySelector('[data-toasts]');
    if (!stack) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    stack.appendChild(toast);
    window.setTimeout(() => toast.remove(), 1500);
  }

  dispose(): void {
    this.root.remove();
  }

  private renderCenter(snapshot: HudSnapshot): string {
    if (snapshot.state === 'playing') return '';
    if (snapshot.state === 'paused') {
      return `
        <div class="center-screen">
          <div class="panel">
            <h2>Paused</h2>
            <p>Resume the round or restart the arena.</p>
            <div class="difficulty-grid">
              <button class="difficulty-button" data-action="pause" type="button">Resume<span>Back to grid</span></button>
              <button class="difficulty-button" data-action="restart" type="button">Restart<span>Same difficulty</span></button>
              <button class="difficulty-button" data-action="menu" type="button">Menu<span>Choose mode</span></button>
            </div>
          </div>
        </div>`;
    }
    if (snapshot.state === 'won' || snapshot.state === 'lost') {
      const won = snapshot.state === 'won';
      return `
        <div class="center-screen">
          <div class="panel">
            <h2>${won ? 'Arena Cleared' : 'You Were Blasted'}</h2>
            <p>${won ? `Stage ${snapshot.stage} clear time: ${snapshot.elapsed.toFixed(1)}s.` : 'Watch danger lanes, chain reactions, and your escape route before dropping bombs.'}</p>
            <div class="difficulty-grid">
              ${won && snapshot.stage < 3 ? `<button class="difficulty-button" data-action="next-stage" type="button">Next Stage<span>Continue hunt</span></button>` : ''}
              <button class="difficulty-button" data-action="restart" type="button">Run It Back<span>Same setup</span></button>
              <button class="difficulty-button" data-action="menu" type="button">Menu<span>New difficulty</span></button>
            </div>
          </div>
        </div>`;
    }
    return `
      <div class="center-screen">
        <div class="panel menu-panel">
          <div class="menu-hero">
            <div>
              <h1>BooMax</h1>
              <p>Selected setup</p>
            </div>
            <div class="selection-badge">
              <strong>Stage ${snapshot.stage}</strong>
              <span>${snapshot.difficulty.toUpperCase()}</span>
            </div>
          </div>

          <div class="menu-section">
            <div class="section-heading">
              <span>Choose Stage</span>
              <strong>${STAGE_CONFIG[snapshot.stage].description}</strong>
            </div>
            <div class="option-grid">
              <button class="option-card ${snapshot.stage === 1 ? 'selected' : ''}" data-stage="1" type="button">
                <strong>Stage 1</strong><span>Free-for-all</span><small>Bots can fight anyone.</small>
              </button>
              <button class="option-card ${snapshot.stage === 2 ? 'selected' : ''}" data-stage="2" type="button">
                <strong>Stage 2</strong><span>Hunter squad</span><small>Bots focus only on you.</small>
              </button>
              <button class="option-card ${snapshot.stage === 3 ? 'selected' : ''}" data-stage="3" type="button">
                <strong>Stage 3</strong><span>Respawn hunt</span><small>Every bot kill triggers a replacement.</small>
              </button>
            </div>
          </div>

          <div class="menu-section">
            <div class="section-heading">
              <span>Choose Difficulty</span>
              <strong>${snapshot.difficulty.toUpperCase()}</strong>
            </div>
            <div class="option-grid">
              <button class="option-card difficulty-easy ${snapshot.difficulty === 'easy' ? 'selected' : ''}" data-difficulty="easy" type="button">
                <strong>Easy</strong><span>Random roamers</span><small>Slower reactions and mistakes.</small>
              </button>
              <button class="option-card difficulty-medium ${snapshot.difficulty === 'medium' ? 'selected' : ''}" data-difficulty="medium" type="button">
                <strong>Medium</strong><span>Pressure bots</span><small>Better chase and wall farming.</small>
              </button>
              <button class="option-card difficulty-hard ${snapshot.difficulty === 'hard' ? 'selected' : ''}" data-difficulty="hard" type="button">
                <strong>Hard</strong><span>Pathfinding threat</span><small>Fast cover seeking and trapping.</small>
              </button>
            </div>
          </div>

          <div class="powerup-guide">
            <div class="section-heading">
              <span>Power-Up Gems</span>
              <strong>Collect after crates break</strong>
            </div>
            <div class="gem-grid">
              <div class="gem-card">
                <div class="gem-icon gem-bomb"></div>
                <strong>Bomb +1</strong>
                <span>Carry one more bomb.</span>
              </div>
              <div class="gem-card">
                <div class="gem-icon gem-range"></div>
                <strong>Blast +1</strong>
                <span>Explosion reaches farther.</span>
              </div>
              <div class="gem-card">
                <div class="gem-icon gem-speed"></div>
                <strong>Speed Up</strong>
                <span>Move faster between tiles.</span>
              </div>
            </div>
          </div>

          <button class="action-button start-button" data-action="start" type="button">Start Stage ${snapshot.stage} - ${snapshot.difficulty.toUpperCase()}</button>
        </div>
      </div>`;
  }

  private attachEvents(): void {
    this.root.querySelectorAll<HTMLElement>('[data-difficulty]').forEach((button) => {
      button.addEventListener('click', () => this.onDifficulty?.(button.dataset.difficulty as Difficulty));
    });
    this.root.querySelectorAll<HTMLElement>('[data-stage]').forEach((button) => {
      button.addEventListener('click', () => this.onStage?.(Number(button.dataset.stage) as StageNumber));
    });
    this.root.querySelectorAll<HTMLElement>('[data-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.action;
        if (action === 'restart') this.onRestart?.();
        if (action === 'start') this.onStart?.();
        if (action === 'next-stage') this.onNextStage?.();
        if (action === 'menu') this.onMenu?.();
        if (action === 'pause') this.onPause?.();
        if (action === 'bomb') this.onMobileBomb?.();
      });
    });
    this.root.querySelectorAll<HTMLElement>('[data-dir]').forEach((button) => {
      const direction = button.dataset.dir as 'up' | 'down' | 'left' | 'right' | 'none';
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        this.onMobileDirection?.(direction);
      });
      button.addEventListener('pointerup', () => this.onMobileDirection?.('none'));
      button.addEventListener('pointercancel', () => this.onMobileDirection?.('none'));
    });
  }
}
