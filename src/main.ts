import './styles.css';
import { Game } from './game/Game';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
const hudRoot = document.querySelector<HTMLDivElement>('#hud-root');

if (!canvas || !hudRoot) {
  throw new Error('BooMax failed to find its canvas or HUD root.');
}

const game = new Game({ canvas, hudRoot });
game.start();

window.addEventListener('beforeunload', () => game.dispose());
