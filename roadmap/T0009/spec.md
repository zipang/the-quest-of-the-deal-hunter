# Spec: T0009 — Sprite background removal (Sprite Manager)

## Objective
AI image models often generate sprites without real alpha transparency: either they
do not support PNG alpha, or they render a checkered pattern to *evoke* transparency.
Saved sprites must have genuine transparent backgrounds.

We add a reusable client-side `removeBackground(canvas)` utility that removes the
background from any canvas, and wire it into the Generate tab via a
"Remove background" button applied to the hidden master canvas before the size
renditions are derived.

## Confirmed intent
- **Outcome:** sprites generated without transparency can be cleaned with one click
  before saving.
- **Where:** Generate tab only (for now). The utility itself is canvas-agnostic so
  the Organize tab can reuse it later without rework.
- **Algorithm:** automatic, no user parameters:
  1. Sample the 4 corner pixels of the canvas.
  2. Cluster them into background colors (a checkered background yields 2+ tones,
     a solid background yields 1; near-identical corners merge).
  3. Derive the tolerance automatically from the corner color spread.
  4. Flood-fill transparency from the canvas borders: connected pixels matching a
     background color (within tolerance) become transparent. Interior pixels of the
     same color are protected by the flood-fill containment.
- **API:** `removeBackground(canvas): () => void` — returns an `undo()` function
  (same pattern as an event registration returning its cleanup). The utility keeps
  the original `ImageData`; `undo()` restores the canvas to its pre-removal state.
- **Flow:** button click → clean the hidden 128×128 master canvas (`genDown`) →
  re-derive the three size renditions (existing `drawDownscaled`-style redraw from
  the master). Undo → restore master → re-derive renditions.
- **Out of scope:** Organize-tab button/batch processing, tolerance slider,
  persistence of undo beyond the current generated image, server-side processing
  (no ImageMagick).

## Tech stack
- Bun + TypeScript, vanilla DOM. No new dependencies, no server changes.
- Pure CSS styling per the Design System (this is a dev tool page with its own
  inline styles — follow the existing `sprite-manager.html` conventions).

## Commands
- Dev server: `setsid bun sprite-manager.ts > ../tmp/gen-server.log 2>&1 < /dev/null & disown` (from `tools/`)
- Kill server: `pkill -9 -f "^bun sprite-manager"` (anchored pattern — see tools/AGENTS.md)
- Typecheck: `bunx tsc --noEmit`

## Project structure
- `tools/background-removal.ts` — new pure utility module (DOM-independent where
  possible: works on `ImageData`, exposes canvas helpers).
- `tools/sprite-manager-app.ts` — button wiring in the Generate tab.
- `tools/sprite-manager.html` — button markup + minimal CSS.
- `tools/README.md` / `tools/AGENTS.md` — document the new module.

## Code style
Follow existing `tools/` conventions: tabs, named functions with JSDoc explaining
the *why*, no comments unless they carry rationale. Example API shape:

```ts
/** Remove the canvas background, guessed from corner pixels …
 * Returns an undo() that restores the pre-removal pixels. */
export function removeBackground(canvas: HTMLCanvasElement): () => void
```

## Testing strategy
- No unit tests: the logic needs a real canvas element in a real HTML page.
  The feature is live-debugged in the browser instead.
- Manual verification: generate/checker-prone model in the UI, click the button,
  confirm checkerboard UI pattern shows through, save, inspect saved PNG.

## Boundaries
- Always: keep the utility canvas-agnostic (no `genDown` references inside it);
  run `bunx tsc --noEmit` once before committing; delete
  test sprites saved into `references/images/items/` after manual checks.
- Ask first: any new npm dependency; any server-side route change.
- Never: edit `./prototype/`; reintroduce native blocking modals; put raw color
  literals outside the existing style blocks' token pattern.

## Success criteria
- Clicking "Remove background" on a checkered-background generation makes the
  background genuinely transparent in all three renditions (UI checker shows
  through) and the saved PNG has an alpha channel there.
- Solid-background generations are cleaned equally well.
- `undo()` restores the canvas to the exact original pixels.
- The utility is reusable: it does not know about the Generate tab.
- No test sprites left on disk after manual checks.

## Open questions
- None — all resolved during the interview.
