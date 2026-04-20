# Changelog

## Current

- Renamed app to BooMax.
- Added `.gitignore`.
- Added Stage 1, Stage 2, and Stage 3.
- Stage 1 is free-for-all.
- Stage 2 makes bots hunt only the player.
- Stage 3 makes bots hunt the player with individual respawns.
- Stage 3 respawns a killed bot immediately on a random safe tile.
- Stage 3 respawn pool is `starting bot count x 2`.
- Stage 2 and Stage 3 bot bombs do not kill other bots.
- Player bombs can kill bots and the player in every stage.
- Added Xbox-style controller support.
- Fixed gamepad movement so released stick direction does not get stuck.
- Added mobile/touch controls.
- Added power-up guide to the menu.
- Added selected stage/difficulty identifiers to the menu.
- Menu defaults to Stage 1 and Easy.
- Added soft helper robot character model.
- Added rounded hands and arm swing animation to the generated robot model.
- Removed orange backpack from the robot model.
- Added distinct bot color variants.
- Added realistic explosion effect with fire, shockwave, sparks, smoke, scorch marks, and flash light.
- Added synthesized placeholder audio hooks.
- Added README architecture and asset replacement notes.

## Notes

- `npm run build` currently passes.
- Vite may warn that the Three.js bundle is larger than 500 KB. This is expected for now.
- The project is intended for desktop browsers and mobile/tablet landscape.
- The project has no backend and no heavy game engine dependency.
