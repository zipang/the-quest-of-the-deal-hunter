# Implementation Plan: [T0008] Drag-to-recenter the viewport on the 128×128 display (sheet mode)

## Overview

Add pointer-drag panning of the sampling viewport in sheet mode (4×4 / 8×8).
The viewport is the source rect `renderCurrentCell()` cuts from the 1024×1024
`sheetCanvas` (`tools/sprite-manager-app.ts:643`). A module-level clamped
offset `(offX, offY)` shifts that rect; dragging moves the offset opposite to
the cursor (grab metaphor: content follows the cursor). Because the 64/32
renditions and Save all derive from the 128 master `genDown`, a single
`renderCurrentCell()` call during `pointermove` updates everything live.

## Architecture Decisions

- **Offset lives in the source rect, not the display** — the spec's viewport
  model; `deriveRenditions()` and Save keep reading `genDown`, so no other
  code path changes.
- **Grab mapping** — `dx = e.clientX - startX`; the source rect moves
  `-dx * scale` where `scale = side / 128cssPx` maps CSS pixels to sheet
  pixels, so the sprite visually follows the cursor.
- **Clamp at ±half cell** — `max = SHEET_SIDE / grid / 2` (±128 px in 4×4,
  ±64 px in 8×8), applied on every move.
- **Reset points** — `loadSheet()` (new generation / mode change) and
  `cycleCell()` (previous/next). No per-cell persistence, no reset button
  (spec). Background-removal re-render keeps the current offset.
- **Sheet mode only** — handlers attach to `#gen-canvas-128` but no-op unless
  `sheetGrid !== null`; cursor switches to `grab`/`grabbing` via a CSS class
  toggled by the same guard.
- **Pointer Events** with `setPointerCapture` on the 128 canvas only — first
  pointer handlers in the file (convention: plain `addEventListener` arrows).

## Task List

### Phase 1: Core (single slice — one code path end to end)

- [ ] Task 1: Pointer-drag panning with clamp + reset + cursor
      (`sprite-manager-app.ts`, `sprite-manager.html`)
      - Module state `panX/panY`, reset in `loadSheet`/`cycleCell`
      - `pointerdown/move/up` on `#gen-canvas-128` (sheet mode guard,
        pointer capture, grab mapping, ±half-cell clamp)
      - `renderCurrentCell()` on each move → 64/32 grids update live
      - CSS `cursor: grab` / `.panning { cursor: grabbing }` in
        `sprite-manager.html`

### Checkpoint: Core

- [ ] `bunx tsc --noEmit` (new code clean) and `bunx biome check tools/` pass
- [ ] agent-browser walkthrough: synthetic numbered sheet, drag shifts the
      128 display and 64/32 follow, clamp respected, reset on cell change

### Phase 2: Docs & close

- [ ] Task 2: Document drag-to-recenter in `tools/README.md` (Generate tab
      section)

### Checkpoint: Complete

- [ ] Real generation + drag recenter + Save + delete test sprites
- [ ] Spec success criteria all checked

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Canvas CSS size (256px) ≠ MASTER (128) — mapping bugs | Med | Multiply CSS delta by `side / canvas.clientWidth` |
| Drag leaks into single mode | Low | Early return when `sheetGrid === null` |
| Undo/clean interplay (clean re-renders) | Low | Offset persists; only `loadSheet`/`cycleCell` reset |

## Open Questions

- None blocking (spec reviewed by user).
