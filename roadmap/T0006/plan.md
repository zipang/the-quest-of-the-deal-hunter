# Plan: Sprite Manager review hardening (fixes + simplification)

Spec: `roadmap/T0006/spec.md`

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
See `roadmap/T0006/todo.md`.
