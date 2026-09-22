# Assets and attribution

This document describes the files shipped by the current MAYA city game. Removed island-game assets and their former source modules are not part of this distribution.

## Kenney Nature Kit — CC0

- Author/source: [Kenney Nature Kit](https://kenney.nl/assets/nature-kit).
- Used files: `public/assets/nature/tree_blocks.glb`, `tree_blocks_dark.glb`, and `stone_largeC.glb`.
- Use: trees and rocks, with runtime scale/material adjustments.
- Original license: [`public/assets/nature/LICENSE.txt`](public/assets/nature/LICENSE.txt), retained alongside the three models.

## Original visuals and audio

- `public/assets/generated/pine.glb`, `pine-frost.glb`, and `lantern.glb` contain original procedural geometry retained from the earlier project. Their provenance is in [`public/assets/generated/README.md`](public/assets/generated/README.md).
- `public/assets/maya-emblem.svg` is the existing project elephant emblem. `scripts/brand-assets.mjs` derives the social card and PNG icons from it. The palette uses ivory, charcoal, burgundy and olive.
- Buildings, furniture, characters, animals, birds, vehicles, aircraft, weapons, particles and weather are constructed in repository code with Three.js geometry. Resident names, biographies, dialogue and missions are fictional and original to this game.
- All current sound effects, weather ambience and club rhythms are synthesized in `src/audio.js` with Web Audio. No recorded music, downloaded sound samples, external font files or GTA assets are bundled. UI fonts use browser/system Arial and Georgia.

## Cleanup audit

[`docs/asset-audit.json`](docs/asset-audit.json) lists every retained public file and the 19 files removed in the 0.11 update (198,603 bytes). Those files had no active runtime references: the unused Pixelify Sans font and its OFL notice, five unused Kenney models, and unused original generated models/manifest. The Kenney license remains because three of its models are still loaded. The original generated-model README was updated to match the three retained files. Earlier audio/source deletions remain unchanged.

## Dependencies

- [Three.js — MIT](https://github.com/mrdoob/three.js/blob/dev/LICENSE).
- [Vite — MIT](https://github.com/vitejs/vite/blob/main/LICENSE).
- [Playwright — Apache-2.0](https://github.com/microsoft/playwright/blob/main/LICENSE).

Installed packages retain their upstream license files; versions are locked in `package-lock.json`.

## Mission-design reference

The user requested a review of Vice City’s activity structure. [Rockstar’s completion guide](https://support.rockstargames.com/articles/3HYqnUoR8fjHGGg9NdTbzm/gta-vice-city-ps2-100-completion) describes story progress alongside vehicle jobs, checkpoint events and property activities. MAYA uses original taxi, medical transport, courier and escort scenarios with route stages, time limits and condition-based rewards. No Rockstar text, dialogue, characters, models, maps or recordings are redistributed.

## Phone, shops and sound truck (0.12)

The clothing mannequins, sound-truck speaker geometry, interaction scenes and phone-game visuals are authored in this repository. Vehicle-radio melodies and beats are synthesized with Web Audio; no commercial songs, external voice recordings, new fonts or downloaded art were added. The public asset inventory remains unchanged from the cleanup audit.
