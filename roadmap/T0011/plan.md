# Implementation Plan: [T0011] Split Generate into Generate + Extract tabs

Spec: `roadmap/T0011/spec.md`

## Overview

Turn the single Generate tab into a two-step pipeline: **Generate**
(model/prompt/hint + full-size preview, generation-only) and **Extract**
(grid, cell nav, drag-to-recenter, background removal, save) with a new
**Load spritesheet** file-picker entry point. Both tabs share the in-memory
source canvas introduced by T0010 (`sourceCanvas` + `hasImage`), so the
hand-off costs nothing and local files skip the paid generation entirely.

## Architecture Decisions

- **Shared state stays module-level** — `sourceCanvas`/`hasImage`/`genGrid`
  are already tab-agnostic; the split is a DOM re-partition + tab routing
  change, not a state refactor.
- **Tab routing**: `showTab()` gains `#extract` (tab button, panel, hash
  support), keeping the existing `#generate` / `#organize` anchors working.
- **Tab selector = radio group**: the three `.tab` buttons are wrapped in a
  `role="radiogroup"` segmented control — one active at all times, arrow-key
  navigation, `aria-checked` on the active button (replaces the free-standing
  `.tab.active` pattern).
- **File loading** — hidden `<input type="file" accept="image/png,image/jpeg">`
  triggered by the toolbar button; `URL.createObjectURL` → `loadImage` →
  drawn into `sourceCanvas` at natural size → `storeGeneratedImage`-equivalent
  flow (cell 1, pan reset, undo invalidated). Shared helper
  `storeImage(img)` used by both the generation path and the file path.
- **UI-state sync** — one `syncExtractUi()` sets disabled states + empty-state
  hint from `hasImage`; called on tab activation, generation, load.
- **Generate panel** — loses the grid dropdown/nav/displays/save bar; gains a
  `#gen-preview` scroll container fed by a natural-size `<img>` (data URL from
  the same stored image).
- **Success message** — the existing status/error line gains the
  originals/ path (returned by `/generate` or derived) + "Extract" invitation
  with an inline link that activates the Extract tab.

## Task List

### Phase 1: Tab skeleton + state split

- [x] Task 1: Third tab + panel re-partition in `sprite-manager.html`
      (`#tab-extract`, `#extract-panel`, move displays/save bar/grid dropdown/
      nav; slim `#generate-panel` to controls + `#gen-preview`)
- [x] Task 2: App routing + `syncExtractUi()` (disabled controls, empty-state
      hint), file-input loading via `storeImage(img)`, success message with
      originals/ path + extract link

### Checkpoint: Foundation

- [x] `bunx tsc --noEmit` clean for touched code; walkthrough: generate →
      message → Extract shows cells; Load spritesheet (PNG + JPG) → extract

### Phase 2: Docs & close

- [x] Task 3: `tools/README.md` (two-tab pipeline section) + `tools/AGENTS.md`
- [x] Verify: full spec success-criteria walkthrough; delete test sprites

### Checkpoint: Complete

- [x] All spec success criteria checked; sprites cleaned from items folders

## Risks and Mitigations

| Risk | Impact | Med |
|------|--------|-----|
| Splitting the panel breaks T0008/T0010 wiring (selectors by id) | High | Ids move with their elements; only container markup changes — verify nav/drag/save after Task 1 |
| JPG spritesheets (no alpha) + Remove background interplay | Low | `removeBackground` is format-agnostic (works on canvas pixels) |
| `URL.createObjectURL` leaks | Low | `URL.revokeObjectURL` after the image loads |

## Open Questions

- None.
