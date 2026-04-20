# TODO

## Polish

- Add real audio files for bombs, explosions, pickups, menu, and death.
- Consider Howler.js if the project needs file-based audio, volume sliders, music, or sound sprites.
- Add controller connection status indicator.
- Add menu navigation using controller buttons.
- Add a settings menu for volume and controls.
- Add round countdown before gameplay starts.
- Add stage transition animations.
- Add a clearer respawn visual effect for Stage 3.
- Add local high score or best clear time per stage and difficulty.

## Gameplay

- Tune Stage 3 respawn pool if it feels too hard.
- Improve Hard bot trap logic.
- Add temporary shield power-up.
- Add remote bomb power-up.
- Add bomb kick power-up.
- Add more arena themes.
- Add destructible crate destruction animation.
- Add more spawn safety checks for Stage 3 respawns if needed.

## Technical

- Add automated tests for stage damage rules.
- Add automated tests for Stage 3 respawn pool behavior.
- Consider code splitting Three.js to reduce the Vite chunk-size warning.
- Add persistent settings in localStorage.
- Add a small diagnostics overlay for connected controller name and axes.
- Add asset replacement examples for custom GLB characters.
- Remove generated `dist/` before committing or transferring if not needed.
