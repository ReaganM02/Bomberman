import { DIRECTIONS } from '../config/GameConfig';
import type { Direction, MoveIntent } from '../core/Types';

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: DIRECTIONS.up,
  KeyW: DIRECTIONS.up,
  ArrowDown: DIRECTIONS.down,
  KeyS: DIRECTIONS.down,
  ArrowLeft: DIRECTIONS.left,
  KeyA: DIRECTIONS.left,
  ArrowRight: DIRECTIONS.right,
  KeyD: DIRECTIONS.right,
};

export class InputSystem {
  private keys = new Set<string>();
  private bufferedDirection: Direction = DIRECTIONS.none;
  private bombBuffered = false;
  private pauseBuffered = false;
  private debugBuffered = false;

  constructor(private readonly root: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  getIntent(): MoveIntent {
    let direction = this.bufferedDirection;
    if (direction.name === 'none') {
      for (const code of ['ArrowUp', 'KeyW', 'ArrowDown', 'KeyS', 'ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD']) {
        if (this.keys.has(code)) {
          direction = KEY_TO_DIRECTION[code];
          break;
        }
      }
    }

    const bomb = this.bombBuffered;
    this.bombBuffered = false;
    return { direction, bomb };
  }

  consumePause(): boolean {
    const value = this.pauseBuffered;
    this.pauseBuffered = false;
    return value;
  }

  consumeDebug(): boolean {
    const value = this.debugBuffered;
    this.debugBuffered = false;
    return value;
  }

  setMobileDirection(name: keyof typeof DIRECTIONS): void {
    this.bufferedDirection = DIRECTIONS[name];
  }

  bufferBomb(): void {
    this.bombBuffered = true;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat && event.code === 'Space') return;
    if (KEY_TO_DIRECTION[event.code]) {
      this.keys.add(event.code);
      this.bufferedDirection = KEY_TO_DIRECTION[event.code];
      event.preventDefault();
    }
    if (event.code === 'Space') {
      this.bombBuffered = true;
      event.preventDefault();
    }
    if (event.code === 'Escape' || event.code === 'KeyP') this.pauseBuffered = true;
    if (event.code === 'Backquote') this.debugBuffered = true;
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
    if (KEY_TO_DIRECTION[event.code] && this.bufferedDirection === KEY_TO_DIRECTION[event.code]) {
      this.bufferedDirection = DIRECTIONS.none;
    }
  };
}
