# BooMax Project Context

## Game Summary

BooMax is a browser-based 3D Bomberman-style arcade game built with Vite, TypeScript, and Three.js.

The visual theme is an original soft helper robot direction: rounded white/player body, calm minimal face, rounded hands, and colored bot variants. It is inspired by soft healthcare-helper robots in spirit, but it should remain visually distinct and not copy any existing character directly.

## Tech Stack

- Vite
- TypeScript
- Three.js
- GLTFLoader for character model loading
- AnimationMixer for idle, run, death, and victory animations
- Browser Gamepad API for Xbox-style controller support
- Web Audio API for placeholder sound effects
- No backend
- No physics engine
- Hidden grid-based gameplay logic with fully 3D presentation

## Current App Name

BooMax

## Main Commands

```bash
npm install
npm run dev
npm run build
```

If port `5173` is already in use:

```bash
npm run dev -- --port 5174
```

## Controls

Keyboard:

- WASD or Arrow keys: move
- Space: place bomb
- P or Escape: pause/resume
- Backtick: debug overlay

Mobile/tablet:

- On-screen D-pad: move
- Bomb button: place bomb

Xbox-style controller:

- Left stick or D-pad: move
- A, X, or RB: place bomb
- Menu/Start: pause/resume
- View/Back: debug overlay

## Gameplay Rules

- Movement is tile/grid based with visual interpolation.
- Character turns before moving.
- Character faces the movement direction.
- Player can place bombs on the current tile.
- Bombs have fuse timers.
- Bomb explosions propagate up, down, left, and right.
- Explosions stop at hard blocks.
- Explosions destroy crates.
- Explosions chain-detonate other bombs.
- Player dies from their own bombs.
- Player bombs can kill bots.
- Bot bombs can kill the player.
- Power-ups can spawn from destroyed crates.

## Stages

### Stage 1

Free-for-all.

- Bots can target the player or other bots.
- Bot bombs can kill other bots.
- Everyone can damage everyone.

### Stage 2

Player hunt.

- Bots target only the player.
- Bot bombs do not kill other bots.
- Player bombs kill bots.
- Player bombs can also kill the player.

### Stage 3

Respawn hunt.

- Bots target only the player.
- Bot bombs do not kill other bots.
- When any bot dies, it respawns immediately on a random safe floor tile.
- Respawn pool is `starting bot count x 2`.
- Easy: 2 bots, 4 respawns.
- Medium: 3 bots, 6 respawns.
- Hard: 4 bots, 8 respawns.
- Win only when all active bots are dead and the respawn pool is empty.

## Power-Ups

Power-ups spawn from destroyed crates.

- Orange diamond: Bomb +1
  - Increases bomb capacity.
- Yellow diamond: Blast +1
  - Increases explosion range.
- Green diamond: Speed Up
  - Increases movement speed.

## Visual Design

- Modern arcade look.
- Near-isometric orthographic camera.
- Bright, readable arena.
- Strong silhouettes.
- Soft rounded robot characters.
- Different bot body/accent colors.
- Explosion effect includes heated blast tiles, flame columns, shockwave, sparks, smoke, scorch marks, and light flash.
- Default explosion quality is `balanced` for live performance.
- `balanced` keeps readable heat tiles, flame columns, shockwave, limited sparks, and limited scorch marks.
- `high` enables heavier smoke and point-light flash effects.

## Important Files

- `src/game/Game.ts`
  - Main game loop, stage rules, win/loss, damage filtering, respawns.
- `src/game/entities/Character.ts`
  - Character movement, facing, animation state, turn-before-move.
- `src/game/entities/Bomb.ts`
  - Bomb entity, fuse, visual pulse.
- `src/game/entities/Explosion.ts`
  - Explosion visuals, owner tracking, tile list.
- `src/game/entities/Pickup.ts`
  - Power-up gem colors and bobbing visual.
- `src/game/ai/BotAI.ts`
  - Bot decision-making.
- `src/game/ai/DangerMap.ts`
  - Active and predicted blast danger tiles.
- `src/game/ai/Pathfinding.ts`
  - BFS pathfinding and nearest safe tile helpers.
- `src/game/systems/InputSystem.ts`
  - Keyboard, mobile, and Xbox-style controller input.
- `src/game/systems/AssetSystem.ts`
  - GLB loading and character color variants.
- `scripts/generate-assets.mjs`
  - Generates the current soft robot GLB.
- `src/game/ui/HUD.ts`
  - HUD, menu, stage/difficulty selection, power-up guide.
- `src/styles.css`
  - Full app and menu styling.

## Recent Design Decisions

- App name is BooMax.
- Menu defaults to Stage 1 and Easy.
- Menu uses a separate Start button after selecting stage and difficulty.
- Menu includes a Power-Up Gems guide.
- Removed the orange backpack from the robot.
- Kept colored body/accent variants for bots.
- Movement polish was reverted to the snappier older feel.
- Turn-before-move behavior remains.
- Controller input was fixed so analog direction does not get stuck after release.
- Stage 2 and Stage 3 bot bombs are safe for other bots.
- Player bombs can always kill the player.

## Transfer Notes

When moving to another PC, copy:

```text
package.json
package-lock.json
vite.config.ts
tsconfig.json
index.html
src/
scripts/
public/
README.md
.gitignore
PROJECT_CONTEXT.md
CHANGELOG.md
TODO.md
```

Do not copy unless needed:

```text
node_modules/
dist/
```

On the new machine:

```bash
npm install
npm run dev
```
