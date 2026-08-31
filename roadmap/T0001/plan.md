# Plan: Sprite Manager Utility

Spec: `roadmap/T0001/spec.md`

## Approach
Vertical slice through the API first, UI second — the UI is useless without a
working file API. Spritesheet generation is client-side canvas + one POST
route, so no Python invocation is needed.

## Components & order
1. `sprite-manager.ts` — Bun server: static serving of the HTML + PNGs,
   JSON list, DELETE, two-phase APPLY rename, spritesheet save.
   Risk: rename collisions on reorder → mitigated by two-phase temp names
   and strict filename validation.
2. `sprite-manager.html` — toolbar + grid UI: pixelated 4x tiles,
   multi-select, drag & drop reorder, inline rename, APPLY/DISCARD,
   spritesheet composition on canvas.
3. Verification — run server, `curl` each route, exercise UI with browser
   (agent-browser), confirm filesystem effects in both size folders.

Parallelizable: none meaningful (2 files, sequential is faster).

## Tasks
- [ ] Task: Bun API server (`sprite-manager.ts`)
  - Acceptance: serves HTML at `/`; GET /sprites lists files; DELETE removes
    from both folders; POST /sprites/apply two-phase renames both folders;
    POST /spritesheets saves decoded PNG; path traversal rejected.
  - Verify: `curl` each route; `ls 32x32 64x64` before/after.
  - Files: `references/images/items/sprite-manager.ts`
- [ ] Task: Manager UI (`sprite-manager.html`)
  - Acceptance: grid renders all sprites at 4x with pixelated rendering and
    checkerboard transparency; click multi-select; drag & drop reorder;
    inline rename; DELETE immediate w/ confirm; APPLY sends mapping, shows
    pending badge; DISCARD reloads; Generate spritesheet uploads PNG.
  - Verify: manual walkthrough + agent-browser screenshot.
  - Files: `references/images/items/sprite-manager.html`
- [ ] Task: End-to-end verification & cleanup
  - Acceptance: delete/rename/reorder/spritesheet flows verified against the
    real folders; server errors handled (404/400).
  - Verify: full manual pass; restore test sprites afterwards if mutated.
  - Files: none new.
