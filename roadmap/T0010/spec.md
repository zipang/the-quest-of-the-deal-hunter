# Spec: T0010 — Free sprite grid declaration (Sprite Manager)

## Objective
The Generate tab locks the grid declaration to the mode chosen BEFORE generating:
leave "Single" selected while the model returns a 4×4 sheet and the result is
unusable — there is no way to re-declare the grid. Worse, only 1×1 / 4×4 / 8×8
exist, so unusual grids (4×5, 2×3…) are impossible.

We replace the segmented Single/4×4/8×8 picker with a free grid declaration:
common presets in a dropdown plus a "Custom…" dialog for arbitrary columns×rows.
The declaration stays changeable at any time — including AFTER a generation,
re-slicing the already-generated image in memory for free (no new paid call).
1×1 is the "Single" special case, unified into the same grid model.

## Confirmed intent
- **Outcome:** a wrong or missing grid declaration is always recoverable; any
  W×H grid is possible.
- **UI:** dropdown of presets — 1×1, 2×2, 3×3, 4×4, 6×6, 8×8 — plus a
  "Custom…" entry that opens the styled `prompt()` dialog (dialog.ts) asking
  for `cols x rows` (e.g. `4x5`), validated. The dropdown label reflects the
  active grid.
- **Unified model:** one grid state `{ cols, rows }` replaces the single/sheet
  split. 1×1 renders the full image (today's single mode); N×M slices the
  in-memory image into cells of `width/cols × height/rows`, row-major.
- **Non-square tolerance:** the raw image keeps its natural dimensions (sheets
  are not always 1:1); cells are computed by dividing width and height
  independently. No squareness assumption, no stretching logic — if the user's
  grid does not match the sheet, the pan viewport and their eyes handle it.
- **Changeable after generation:** changing the grid re-slices the stored image
  immediately (cell 1 selected, pan reset). Works from 1×1 → N×M and back.
- **Hints:** the hint field is NOT auto-filled when the grid changes; it stays
  editable with its history recall. (An autofill button may come later.)
- **Out of scope:** hint autofill, loading pre-existing spritesheet files from
  disk, changes to Save or background-removal behavior, new server routes.

## Tech stack
Bun + TypeScript, vanilla DOM. No new dependencies, no server changes.

## Commands
- Dev server (from `tools/`):
  `setsid bun sprite-manager.ts > ../tmp/gen-server.log 2>&1 < /dev/null & disown`
- Kill server: `pkill -9 -f "^bun sprite-manager"` (anchored pattern)
- Typecheck (before commit only): `bunx tsc --noEmit`

## Project structure
- `tools/sprite-manager.html` — dropdown markup replacing the radio fieldset;
  minor CSS.
- `tools/sprite-manager-app.ts` — grid state unification, re-slicing logic,
  custom-dialog handling.
- `tools/README.md`, `tools/AGENTS.md` — document the free grid declaration.

## Code style
Existing `tools/` conventions: tabs, named functions with JSDoc explaining the
*why*, styled async `confirm()`/`prompt()` from `dialog.ts` (never native
modals). No comments beyond rationale.

## Testing strategy
No unit tests: the feature needs a real canvas element in a real HTML page.
Live-debugged in the browser (dev server + manual checks).

## Boundaries
- Always: keep the styled dialog modals; keep the hint field user-owned;
  re-read `sprite-manager-app.ts` before editing (user edits between sessions).
- Ask first: any new dependency; any server route change.
- Never: reintroduce native blocking modals; edit `./prototype/`.

## Success criteria
- Generating with grid X while the model returns a Y×Z sheet is recoverable:
  pick the right grid afterwards and the cells re-slice instantly.
- Custom grids like 4×5 slice correctly (cells = width/cols × height/rows).
- 1×1 behaves exactly like today's single mode (full image as the sprite).
- Sheet nav counter and pan clamping adapt to the active grid and cell size.
- Changing the grid after generation costs no new generation.

## Open questions
- None — all resolved during the interview.
