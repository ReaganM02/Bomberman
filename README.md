# BooMax

BooMax is a production-minded, browser-based 3D Bomberman-style arcade game built with Vite, TypeScript, and Three.js. The gameplay is tile/grid based for clarity and deterministic logic, while presentation uses a real Three.js scene with GLTF/GLB character loading, lighting, shadows, animation mixers, VFX, UI screens, audio hooks, and bot AI tiers.

## Run

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The default development server uses port `5173`.

## Build

```bash
npm run build
npm run preview
```

`npm install` runs `scripts/generate-assets.mjs`, which creates `public/assets/models/blastgrid-runner.glb`. The runtime loads that GLB through `GLTFLoader` and drives its `idle`, `run`, `death`, and `victory` clips with `AnimationMixer`. If the GLB is missing, the game uses a runtime fallback mesh so local development is not blocked.

## Controls

- Move: `WASD` or arrow keys
- Place bomb: `Space`
- Pause/resume: `P` or `Escape`
- Debug overlay: backtick key
- Touch/tablet landscape: on-screen movement pad and bomb button

## Gameplay

- Move on a classic Bomberman-style grid with smooth interpolation.
- Place bombs with fuse timers and cardinal blast propagation.
- Explosions stop on hard blocks, destroy crates, chain-detonate bombs, and defeat characters.
- Destroyed crates can drop bomb capacity, blast range, and speed pickups.
- Win by eliminating all bots. Lose when the player is caught in a blast.
- Difficulty select changes bot count, reaction speed, aggression, awareness, and decision quality.

## Architecture

```text
src/
  main.ts
  game/
    Game.ts
    config/        Tunable gameplay, camera, board, and difficulty values
    core/          Shared grid, event, and type primitives
    systems/       Rendering, assets, input, audio, map generation
    entities/      Characters, board meshes, bombs, explosions, pickups
    ai/            Danger maps, BFS pathfinding, difficulty AI
    ui/            HUD, menus, pause, win/lose flow
    utils/         RNG and math helpers
  assets/          Source-side asset placeholder folder
public/assets/
  models/          Generated or replacement GLB assets
  audio/           Drop-in audio files for future sound implementation
```

The main loop stays in `Game.ts`, but the systems and entities are separated so additional arenas, multiplayer synchronization, alternative characters, or richer power-ups can be added without rewriting the core loop.

## Asset Replacement

Replace `public/assets/models/blastgrid-runner.glb` with a character GLB containing animation clips named:

- `idle`
- `run`
- `death`
- `victory`

The current `AssetSystem` clones the model per character and tints the mesh named `Body` for team readability. If your model uses different mesh names, update `src/game/systems/AssetSystem.ts`.

Audio files can be dropped into `public/assets/audio/`. The current `AudioSystem` uses lightweight synthesized placeholder cues and exposes named hooks for:

- `bomb-place`
- `explosion`
- `pickup`
- `death`
- `menu`

## Notes

- Collision and gameplay stay on the hidden grid layer; no physics engine is used.
- AI only reads visible arena state, active objects, and predicted blast lanes.
- Hard bots use faster decisions and stronger path/danger reasoning rather than hidden information.
- Rendering favors readable silhouettes and stable performance over heavy post-processing.
