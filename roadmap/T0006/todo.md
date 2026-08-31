# Todo: Sprite Manager review hardening

Spec: `roadmap/T0006/spec.md`. One commit per task, in order.
Gate for every task: `bunx tsc --noEmit` adds zero new `tools/` errors.

- [x] Task 0: Commit planning artifacts
  - Acceptance: spec + plan/todo sections committed (docs commit).
  - Verify: git log shows the docs commit; files present in roadmap/T0006/.
  - Files: roadmap/T0006/spec.md, roadmap/T0006/plan.md, roadmap/T0006/todo.md
- [x] Task 1: fix — rename/delete correctness (`sprite-manager.ts`)
  - Acceptance: `applyRenames` uses two-phase `fs/promises.rename` (no
    Bun.write copy, no `Bun.$`), returns the real moved count, returns JSON
    errors on failure; DELETE uses `fs.rm`; no `.tmp-*.png` left on success.
  - Verify: restart server; curl a chained rename (001-a→002-b swap) on a
    fixture pair; assert folders + response; curl missing-source and invalid-
    name paths → JSON 4xx/5xx.
  - Files: tools/sprite-manager.ts
- [x] Task 2: fix — generator dead param, provider opts, cache
  - Acceptance: save numbering stays **per-folder** gapless (each size folder
    independent — user correction); `/generate` body is `{ model, prompt }`
    (client stops sending `size`); `PROVIDER_OPTIONS` lookup hoisted to
    module scope; `listModels()` caches only successful Gateway merges;
    models fetch has `AbortSignal.timeout`.
  - Verify: save 32x32 twice → 002 then 003 in 32x32 regardless of 64x64
    content; delete the test sprites afterwards; curl /generate/models twice
    with network unchanged.
  - Files: tools/sprite-generator.ts, tools/sprite-manager.html (client send only)
- [x] Task 3: docs — README + AGENTS truthfulness
  - Acceptance: `AI_GATEWAY_API_KEY` documented (bridge noted);
    `128x128/` in the asset layout as unmanaged scratch; `/generate` row
    shows `{ model, prompt }`; `REQUEST_TIMEOUT` cap (<60s) noted; naming
    convention clarified: APPLY keeps sprite names in sync across folders
    that hold the sprite, while numbering is per folder; AGENTS.md notes the
    modal convention if it changes agent guidance.
  - Verify: read-through against code; grep for stale `VERCEL_API_KEY`-only
    instructions.
  - Files: tools/README.md, tools/AGENTS.md
- [x] Task 4: refactor — extract `tools/shared.ts` + folder-scoped server
  - Acceptance: `NAME_RE`, `SPRITE_GLOB`, `ASSET_SIZES` (`32x32`, `64x64`,
    `128x128` — all managed), `sanitizeName`, `json` defined once in
    `shared.ts`; both TS files import them; no duplicate definitions remain.
    `/sprites?size=`, file serving, `DELETE /sprites/<name>?size=` and
    `POST /sprites/apply { size, order }` target exactly one folder (default
    `64x64` when absent, for a smooth client transition); no cross-folder
    sync; behavior otherwise unchanged.
  - Verify: grep for duplicate definitions; tsc; server smoke — list/save/
    apply/delete against two different size folders in the fixture, proving
    the other folder is untouched.
  - Files: tools/shared.ts (new), tools/sprite-manager.ts, tools/sprite-generator.ts, tools/sprite-manager.html (send `size`, no selector yet)
- [x] Task 5: refactor — client folder selector + native-named modals + render dedup
  - Acceptance (as amended 2026-08-30): `dialog.ts` + `dialog.css` export
    native-named, promise-based `confirm()` / `prompt()` (options `okText`,
    `level: "danger" or "warning"`) backed by one styled `<dialog>`; app logic
    extracted from the HTML into `sprite-manager-app.ts` (Bun HTML import
    bundles it with its imports); `confirm()` and `prompt()` and the old
    `#gen-dialog` gone from the HTML; folder selector (32x32 / 64x64 /
    128x128) in the Organize toolbar — switching reloads that folder (asks
    before discarding unapplied edits) and every operation targets the
    selected folder; `refresh()` helper; pure `toggleSelect`; `loadImage()`
    helper; deletes via `Promise.allSettled`; `loadModels` guard dedup.
  - Verify: re-read files before editing; tsc clean for tools/;
    agent-browser walkthrough — delete (danger modal), folder switch,
    spritesheet export (prompt modal), generate tab render; screenshots in
    tmp/ (modal-confirm-danger.png, modal-prompt-export.png).
  - Files: tools/dialog.ts, tools/dialog.css, tools/sprite-manager-app.ts, tools/sprite-manager.html, tools/sprite-manager.ts, tools/AGENTS.md
- [x] Task 6: docs-in-code — JSDoc pass
  - Acceptance: formal JSDoc (`@param`/`@returns`/`@example`) on the exported
    `handleGenerateRoutes`; one-line + per-param JSDoc on every non-trivial
    function in both TS files; JSDoc on non-trivial inline-JS functions in
    the HTML; existing why-comments kept.
  - Verify: tsc; read-through against `src/AGENTS.md` §1.
  - Files: tools/sprite-manager.ts, tools/sprite-generator.ts, tools/sprite-manager.html
- [x] Task 7: verify — full smoke + cleanup
  - Acceptance: full checklist passes (load, rename+apply, delete,
    spritesheet, generate+save, models list, both tabs); test sprites deleted
    from `references/images/items/`; `tmp/` cleaned after the final commit.
  - Verify: agent-browser end-to-end walkthrough; `ls` both size folders;
    grep for leftover `NNN`-test files; server stopped.
  - Files: none new.
