# Plan: Sprite Manager Utility

Spec: `tasks/sprite-manager-spec.md`

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

---

# Plan: Sprite Generator tab (Sprite Manager + Vercel AI Gateway)

Spec: `tasks/spec-sprite-generator.md`

## Approach
Extend the existing Bun tool vertically: server routes first
(`sprite-generator.ts` mounted by `sprite-manager.ts`), then the Generate tab
UI, then end-to-end verification. The AI Gateway call is server-side only
(`AI_GATEWAY_API_KEY` in `process.env`); `generateImage()` from the `ai` package
accepts Gateway model IDs directly.

## Components & order
1. Dependencies + `/generate/models` route — `bun install ai`;
   shortlist from `FAVORITE_IMAGE_MODELS` (favorites flagged) + Gateway image
   models from `https://ai-gateway.vercel.sh/v1/models` (in-memory cache).
   Risk: no API key → degrade gracefully (shortlist only, 503 on generate).
2. `POST /generate` route — `generateImage({ model, prompt, size })` with the
   best supported size passed to the model when its docs allow. The route
   returns the model's native PNG; **downscale to the exact grid happens
   client-side on the preview canvas** (nearest-neighbor, and the saved PNG
   comes from the canvas) — no server-side image dependency.
   Risk: per-model size support varies → centralize the size-map in one
   helper; the client downscale is the safety net.
3. Generate tab UI in `sprite-manager.html` — size picker (32/64/128), model
   dropdown (favorites first), prompt input, canvas grid preview, Generate +
   Save buttons, mini `dialog()` for the name (number auto gapless).
4. `sprite-manager.ts` mounts the routes; logging (`[generate]`,
   `[save-sprite]`), `join()` everywhere, `tools/README.md` updated.
5. End-to-end verification with fixture folders; biome + tsc clean for `tools/`.

Parallelizable: none meaningful (sequential, 4 files max).

## Tasks
See `tasks/todo.md`.

---

# Plan: Sprite Manager review hardening (fixes + simplification)

Spec: `tasks/spec-sprite-manager-review.md`

## Approach
Fixes before refactor before docs-in-code, one reviewable commit per phase:
server correctness first (its bugs corrupt on-disk state), then client UX
unification, then shared-module extraction, then JSDoc. Behavior-preserving
throughout; no new features.

## Components & order
1. Planning artifacts — this spec + plan/todo sections, committed.
2. `sprite-manager.ts` — `applyRenames`/DELETE via `node:fs/promises`
   (atomic two-phase rename, real moved count, JSON errors). Risk: error
   semantics change from swallowed-shell to JSON — verify 4xx/5xx bodies.
3. `sprite-generator.ts` (+ 2-line client change) — drop the dead `size`
   param; `PROVIDER_OPTIONS` lookup replaces Sets + nested ternary; cache
   model list only on success + timeout on the models fetch; save numbering
   stays per-folder (user correction 2026-08-30 — size folders are
   independent). Risk: `bfl/flux-2-flex` Gateway 500s are a known external
   quirk (tools/AGENTS.md), not a code bug.
4. Docs — `tools/README.md` (`AI_GATEWAY_API_KEY`, `128x128/` layout,
   `/generate` row, timeout cap) + `tools/AGENTS.md` (modal convention).
5. Extract `tools/shared.ts` + folder-scoped server — naming constants,
   `sanitizeName`, `json` deduped; single `ASSET_SIZES` (`32x32`, `64x64`,
   `128x128`); `/sprites`, file serving, DELETE and `/sprites/apply` all take
   a `size` and target exactly one folder (no cross-folder sync). Risk: low;
   mechanical import rewiring + size validation.
6. `sprite-manager.html` — folder selector in the Organize toolbar
   (list/images/rename/delete/spritesheet all target the selected folder) +
   modal unification (`askText`/`askConfirm` on one styled dialog, remove
   `#gen-dialog`, `confirm()`, `prompt()`) + render dedup (`refresh()`, pure
   `toggleSelect`, `loadImage()`, `allSettled` deletes, guard dedup, dup
   comment). Risk: dialog focus/submit flow — smoke-test all three call
   sites. Re-read the file first (user edits it between sessions).
7. JSDoc pass — both TS files + non-trivial inline-JS functions.
8. Full verification + cleanup (smoke checklist, delete test sprites,
   `rm -rf tmp/*` after the final commit).

Parallelizable: none (single working tree, sequential commits).

## Tasks
See `tasks/todo.md` — section "Sprite Manager review hardening".
