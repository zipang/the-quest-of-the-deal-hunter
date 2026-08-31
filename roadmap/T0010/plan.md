# Implementation Plan: T0010 — Free sprite grid declaration

Spec: `roadmap/T0010/spec.md`

## Overview
Replace the Single/4×4/8×8 radio picker with a grid dropdown (presets +
"Custom…" dialog) and unify the single/sheet code paths into one grid model
`{ cols, rows }` that can be re-applied to the in-memory image at any time.

## Architecture decisions
- **One grid model:** `sheetGrid: number | null` + `currentGenMode()` +
  `SHEET_GRIDS` collapse into a single `{ cols, rows }` state. 1×1 is not a
  special branch: cell = whole image, nav hidden, pan inert (already the
  natural consequence of the generic slicing math).
- **Raw image stays in memory in every mode** (today only sheet mode keeps
  it): the sheet canvas holds the generated image at natural size; 1×1 renders
  it fully. Grid changes therefore never need the server.
- **Natural image size:** `sheetCanvas` takes the image's real
  width/height instead of the hardcoded 1024×1024 (sheets are not always 1:1).
- **Custom grid via styled dialog:** one `prompt("cols x rows")` call, parsed
  with a `^(\d+)\s*[x×]\s*(\d+)$` pattern, bounded 1–16 per axis; cancel keeps
  the previous grid.
- **No hint prefill:** removing `DEFAULT_HINTS` prefill entirely; the hint
  field keeps its placeholder and history.

## Task list

### Phase 1: Unified grid state
- [ ] Task 1: Replace the mode fieldset with the grid dropdown and wire the
      custom-grid dialog
  - Acceptance: dropdown shows 1×1…8×8 presets + "Custom…"; Custom opens the
    styled prompt, validates `cols x rows` (1–16), and the label reflects the
    active grid; hint is never auto-filled anymore.
  - Verify: manual UI check (dev server)
  - Files: `tools/sprite-manager.html`, `tools/sprite-manager-app.ts`
  - Scope: Small
- [ ] Task 2: Collapse single/sheet into the `{ cols, rows }` grid model
  - Acceptance: `sheetGrid`/`currentGenMode`/`SHEET_GRIDS` are gone; the raw
    image is kept in memory in every mode; 1×1 renders the full image; the
    128 master is always fed from the stored image via cell math; generation
    stores the image then renders cell 1.
  - Verify: manual check — generate in 1×1 and in 4×4, both render correctly
  - Files: `tools/sprite-manager-app.ts`
  - Scope: Medium

### Checkpoint: Foundation
- [ ] Generate (1×1 and 4×4) still works end-to-end after Tasks 1–2

### Phase 2: Re-slicing & non-square cells
- [ ] Task 3: Re-slice on grid change + natural-size sheets + adaptive nav/pan
  - Acceptance: changing the grid after a generation re-slices instantly
    (cell 1, pan reset, counter `N/cols*rows`); cells divide width AND height
    independently; pan clamps to ±half the actual cell size; works 1×1 ↔ N×M.
  - Verify: manual check — generate 4×4 while 1×1 is picked, then switch;
    try a custom 4×5; pan a cell edge
  - Files: `tools/sprite-manager-app.ts`, `tools/sprite-manager.html`
  - Scope: Small
- [ ] Task 4: Documentation
  - Acceptance: `tools/README.md` (Generate section) and `tools/AGENTS.md`
    describe the free grid declaration.
  - Verify: read-through
  - Files: `tools/README.md`, `tools/AGENTS.md`
  - Scope: XS

### Checkpoint: Complete
- [ ] All spec success criteria verified manually in the browser
- [ ] `bunx tsc --noEmit` clean (pre-commit only)
- [ ] Test sprites deleted from `references/images/items/`

## Risks and mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Background-removal interplay: re-slicing after removal must reuse the cleaned source | Med | Grid change re-renders from `sheetCanvas` (which `removeBackground` mutated in place) — same flow as cell navigation today |
| 1×1 regression (single mode is the most used path) | Med | Task 2 verifies 1×1 immediately; nav stays hidden, pan inert |
| Custom grid parsing abuse (0, huge, garbage) | Low | Regex + 1–16 bounds; invalid input keeps the previous grid |
| `renderCurrentCell` drawing into a wrongly sized master | Low | Master sizing stays inside the render function (already the case) |

## Open questions
- None.
