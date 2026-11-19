# NIXELUNE - project guide for agents

A calm hex-grid puzzle game: mineral clusters fall, the player joins five or more
same-colour tiles into a light path, the path activates and disappears. Target:
Android first, iOS port later, web for development.

The creator's game design input is in `docs/brand-kit/05_game_design/` (GDD, player
instructions, microcopy). The kit's visuals (`02_visuals/`, `03_logo/`,
`04_design_system/`) were rejected by the creator (D-15) and are not a visual brief.
Decisions are recorded in `docs/decisions.md`.

## Stack

- TypeScript (strict), Vite, Vitest. No game engine, no UI framework.
- Board rendering: Canvas 2D, vector only. HUD and screens: semantic HTML + CSS
  built on the kit's tokens, so screen readers and text scaling work.
- Android / iOS shell: Capacitor. Native APIs only through `src/services` adapters.
- `npm run typecheck`, `npm test`, `npm run build`, `npm run android:debug`.
- There is no ESLint (typescript-eslint does not support TypeScript 7 yet);
  `tsc` strict flags are the lint.

## Layout

```
src/game/       pure simulation: grid, pieces, groups, scoring, stages, challenges
src/platform/   service contracts (types only)
src/services/   save, audio, haptics, lifecycle, i18n engine + fakes
src/i18n/       message catalogues pl.ts, en.ts
src/render/     canvas drawing of board, pieces, effects
src/ui/         screens, HUD, input, app state machine, styles
tests/          mirrors src/
android/        Capacitor Android project
tools/          scripts (each with tests)
docs/           decisions, roadmap, research, specs in progress, brand kit
```

## Rules

- Talk to the creator in Polish. Code identifiers and code comments in English.
- `src/game` has no DOM, no timers, no platform APIs, no `Math.random`. All gameplay
  randomness comes from the seeded generator; visual effects use their own.
- Simulation produces state and events; presentation turns them into picture and
  sound. Flashes, pulses and easing never live in the simulation model.
- The contracts in `src/game/types.ts` and `src/platform/types.ts` are stable:
  add to them, do not rename or remove.
- Tuning constants live in one place (`src/game/tuning.ts`), each with its unit and
  the reason for its value.
- Every player-visible text goes through `i18n.t`; a new key is added to every
  catalogue in the same change. Text with a number uses plural forms.
- Accessibility is required: screen reader labels and live regions, text scaling,
  focus visible, touch targets at least 48x48 CSS px, never colour alone.
- Saves are versioned, validated before use, written atomically; never break
  existing keys. Persist enums by stable string keys.
- Tests first; tests mirror `src/`. Run the narrowest scope while working and the
  full suite before handing over.
- Third-party code: latest stable versions only, pinned exactly; record every
  licence in `docs/licences.md` (shown on the in-game licences screen).
- No network SDKs, analytics, ads or extra permissions without the creator's approval.
- No secrets, signing keys or build outputs (APK, AAB, IPA) in git.
- Commits: English, `feat:` / `fix:` / `docs:` / `ci:` style, ASCII first line,
  no `Co-Authored-By` line and no session link.
- Split files by responsibility before they grow into a place where everything lives.

## Art direction (D-15, D-17: being chosen)

The creator rejected the brand kit's look as AI slop (space background, pastel-on-navy
with brass, thin wide-tracked capitals in Inter, bevelled hexagons, rounded outlined
panels) and then three flat graphic proposals (print, engraving, flat toy blocks).
What the creator asked for instead, in their own choices:

- Production level and character of Candy Crush / Royal Match: rich, glossy, objects
  that look three-dimensional, shading and highlights, lots of life in motion.
- Depth and material: pieces must look like real objects, not flat polygons.
- A world and a mood: a theme and a place, not an abstract board on a plain ground.
- Elegance: grown-up and composed, still colourful; not childish, not garish.
- Life in motion: bounce, squash, sparkle, satisfying joins; judged in play.

Skins live in `src/render/skins/<name>/` with a matching `src/ui/themes/<name>.css`;
the creator picks one from playable candidates, the others are then deleted.

Still binding whatever the skin:
- Effects serve game state and never hide the board; the falling piece, its landing
  spot and the free space read at a glance.
- Honour reduced motion; no full-screen flashing.
- Not a Tetris look-alike, and no copying of another game's art, characters or UI.
- Never colour alone: every tile colour also differs by shape or mark.
- No raster art from unknown sources; everything is drawn in code or from assets with
  a recorded licence.
