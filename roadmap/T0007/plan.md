# Implementation Plan: [T0007] Spritesheet generation mode (4×4 / 8×8)

Spec: `roadmap/T0007/spec.md`

## Overview

Add a Single / 4×4 / 8×8 mode picker to the Generate tab. In sheet mode the
1024×1024 model image is sliced client-side into 16 or 64 row-major cells held
in an offscreen canvas; `< previous` / `next >` buttons cycle the current cell
(wrap-around) with an `N/16` counter; the existing size picker + Save flow
save the current cell. A new **hint** input — available in all modes, with its
own ↑/↓ history — carries the practical rendition details (grid dimensions,
background, style) and is combined client-side into the submitted prompt.

## Architecture Decisions

- **Slicing stays client-side, single code path.** The sheet is kept in one
  offscreen 1024×1024 canvas; `renderCurrentCell()` draws the current cell
  into the existing 128×128 `genDown` master canvas and the existing
  derivation loop fills the three grids. Single mode is just the degenerate
  case (one cell = the whole image) reusing the same path.
- **Prompt + hint are combined client-side; the server is untouched.**
  The submitted prompt is `"<prompt>. <hint>"` (empty hint → today's exact
  body). No `/generate` change, no new env var, no server state. The
  server-side `ADD_PROMPT_CONTEXT` still applies on top.
- **The hint field is a first-class prompt input.** Same shell-style ↑/↓
  history mechanics as the prompt (10 entries), with its own localStorage
  key (`generate-hint-history`), so prompt and hint histories stay
  independent. Prefilled per mode with a default rendition hint (grid
  dimensions for 4×4 / 8×8), freely editable in all modes.
- **No server-side slicing, no new dependencies.** The cell size is a
  constant per mode (1024/4 = 256, 1024/8 = 128); nearest-neighbor downscale
  is already in place (`imageSmoothingEnabled = false`).

## Dependency graph

```
Task 1: mode picker + hint field (HTML/CSS)
        │
        └── Task 2: hint history + client-side prompt combination (app.ts)
                │
                └── Task 3: sheet slicing + cell rendering (app.ts)
                        │
                        └── Task 4: navigation controls (prev/next/counter)
                                │
                                └── Task 5: docs + end-to-end verification
```

Strictly sequential (single working tree, one tab's UI).

## Task List

### Phase 1: Mode UI + hint input
- [ ] Task 1: mode picker + hint field (HTML/CSS)
- [ ] Task 2: hint history + prompt combination (app.ts)

### Checkpoint: UI + combination ready
- [ ] tsc + biome clean; single mode works with prompt + hint combined;
      hint history recalls independently — review before sheet logic.

### Phase 2: Slicing + navigation
- [ ] Task 3: sheet slicing & cell rendering (app.ts)
- [ ] Task 4: prev/next cycle + position counter

### Checkpoint: Sheet flow works
- [ ] 4×4 and 8×8 generation, navigation and save verified in the browser.

### Phase 3: Polish
- [ ] Task 5: docs + end-to-end verification & cleanup

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Model ignores the grid layout (cells not aligned to the 1024 grid) | Med | Hint wording is editable; failed sheet = retry with a better prompt; slicing stays deterministic |
| Duplicated history logic (prompt vs hint) drifts | Low | Extract the shared ↑/↓ recall mechanics into one helper keyed by storage key |
| User edits HTML/app files between sessions | Low | Re-read + grep both files before every task |
| Test sprites land in real asset folders | Low | Delete them after verification (same rule as previous tickets) |

## Open Questions

- None.
