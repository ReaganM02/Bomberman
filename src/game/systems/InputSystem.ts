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
  private gamepadConnected = false;
  private previousButtons: boolean[] = [];
  private readonly gamepadDeadzone = 0.35;

  constructor(private readonly root: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('gamepadconnected', this.onGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected);
  }

  getIntent(): MoveIntent {
    this.pollGamepad();
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
    window.removeEventListener('gamepadconnected', this.onGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected);
  }

  isGamepadConnected(): boolean {
    this.pollGamepad();
    return this.gamepadConnected;
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

  private readonly onGamepadConnected = (): void => {
    this.gamepadConnected = true;
  };

  private readonly onGamepadDisconnected = (): void => {
    this.gamepadConnected = this.getPrimaryGamepad() !== undefined;
    this.previousButtons = [];
  };

  private pollGamepad(): void {
    const gamepad = this.getPrimaryGamepad();
    this.gamepadConnected = gamepad !== undefined;
    if (!gamepad) return;

    const pressed = gamepad.buttons.map((button) => button.pressed);
    if (this.wasPressed(pressed, 0) || this.wasPressed(pressed, 2) || this.wasPressed(pressed, 5)) {
      this.bombBuffered = true;
    }
    if (this.wasPressed(pressed, 9)) this.pauseBuffered = true;
    if (this.wasPressed(pressed, 8)) this.debugBuffered = true;

    const direction = this.readGamepadDirection(gamepad);
    if (direction.name !== 'none') this.bufferedDirection = direction;

    this.previousButtons = pressed;
  }

  private getPrimaryGamepad(): Gamepad | undefined {
    const pads = navigator.getGamepads?.() ?? [];
    return pads.find((gamepad): gamepad is Gamepad => Boolean(gamepad?.connected));
  }

  private wasPressed(current: boolean[], index: number): boolean {
    return Boolean(current[index]) && !Boolean(this.previousButtons[index]);
  }

  private readGamepadDirection(gamepad: Gamepad): Direction {
    const x = gamepad.axes[0] ?? 0;
    const y = gamepad.axes[1] ?? 0;

    if (gamepad.buttons[12]?.pressed) return DIRECTIONS.up;
    if (gamepad.buttons[13]?.pressed) return DIRECTIONS.down;
    if (gamepad.buttons[14]?.pressed) return DIRECTIONS.left;
    if (gamepad.buttons[15]?.pressed) return DIRECTIONS.right;

    if (Math.abs(x) < this.gamepadDeadzone && Math.abs(y) < this.gamepadDeadzone) return DIRECTIONS.none;
    if (Math.abs(x) > Math.abs(y)) return x > 0 ? DIRECTIONS.right : DIRECTIONS.left;
    return y > 0 ? DIRECTIONS.down : DIRECTIONS.up;
  }
}
