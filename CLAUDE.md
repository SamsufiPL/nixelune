# NIXELUNE - project guide for agents

A calm hex-grid puzzle game: mineral clusters fall, the player joins five or more
same-colour tiles into a light path, the path activates and disappears. Target:
Android first, iOS port later, web for development.

The creator's design input is the brand kit in `docs/brand-kit/` (read
`00_START/START_HERE_PL.md`, `04_design_system/`, `05_game_design/`, and look at
`02_visuals/*.png`). Decisions are recorded in `docs/decisions.md`.

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

## Art direction (zero AI slop)

From `docs/brand-kit/04_design_system/ZASADY_STYLU_ZERO_AI_SLOP.md`; it is binding.

- More silence than effects. Ink-navy background, at most one faint orbit / horizon.
- Light has meaning: teal = active connection, coral = piece in motion accents,
  brass = main call to action / reward, ice = preview, lilac = rarer modules.
- A tile is one flat hexagon with a micro-bevel and one reflection surface.
- No glow on every element, no glass panels, no random gradients, no blur,
  no cards for the sake of cards: separate with space, a thin line and hierarchy.
- At most two heading sizes per view; wide tracking only in the logo and micro-labels.
- One radius family per row of interface (8 px and 16 px tokens).
- The signature moment is the path activation: tiles light in sequence along the
  path in 200-260 ms, then disperse in silence. Nothing else competes with it.
- Motion 120-260 ms, no flashing, no camera shake; honour reduced motion.
- Not a Tetris look-alike: no rectangular well, no tetrominoes, no row clearing.
