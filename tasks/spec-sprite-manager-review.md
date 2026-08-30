# Spec: Sprite Manager review hardening (fixes + simplification pass)

Status: **APPROVED — intent confirmed 2026-08-30** (code-review + code-simplification
pass over `tools/`, then interview; decisions table below).
Amended 2026-08-30 during implementation: save numbering stays **per-folder**
(each size folder is independent); the review's "index desync" concern was
rejected by the user.
Supersedes two details of `tasks/spec-sprite-generator.md`: the env var is
`AI_GATEWAY_API_KEY` everywhere (the old name was removed, no fallback), and
`POST /generate` takes `{ model, prompt }` (the `size` param was validated but
never used).

## Objective

Land the concrete defects found in the review of the Sprite Manager tool and
the agreed behavior-preserving simplifications, so the tool stays maintainable
as it grows:

1. Doc/config mismatch — the README documented an outdated env-var name;
   `.env.local` and the code use `AI_GATEWAY_API_KEY`.
2. `128x128/` is written by saves but absent from the documented asset
   layout. (The review's "index desync between sizes" concern was rejected:
   each size folder is independent and may hold different sprites.)
3. `POST /sprites/apply` reports `moved: order.length` even when sources were
   silently skipped, uses a non-atomic copy→rm→mv shell dance, swallows
   failures via `.quiet()`, and can strand `.tmp-*.png` files.
4. `NAME_RE` / `SPRITE_GLOB` / size lists / `sanitizeName` / the `json()`
   helper are duplicated across the two TS files (drift risk).
5. `POST /generate` takes a `size` param that is validated, echoed, never used.
6. Modal UX inconsistency: styled `<dialog>` for the Save name, but browser
   `confirm()` / `prompt()` for Delete and spritesheet naming.
7. Missing JSDoc discipline; the tool grew, the code must document itself.

User: the developer, alone. Success = findings fixed, modal UX unified,
docs truthful, `tsc` clean, browser smoke test green, zero new features.

## Confirmed Decisions (interview 2026-08-30)

| Topic | Decision |
| :--- | :--- |
| Env var docs | Standardize on `AI_GATEWAY_API_KEY` in README + messages; remove `VERCEL_API_KEY` references |
| 128x128 masters | Keep saving them; document `128x128/` in the README layout as an **unmanaged scratch folder** (renames/deletes never touch it) |
| Save numbering | **Per-folder** gapless numbering, unchanged — each size folder is independent and may hold different sprites (user correction 2026-08-30; the "derive from `64x64/`" idea was rejected) |
| Renames | `node:fs/promises` two-phase rename (atomic, no copies); report the real moved count; JSON errors instead of swallowed shell failures |
| Dialogs | One styled `<dialog>` + `askText()` / `askConfirm()` promise helpers replacing `confirm()`, `prompt()`, **and** the existing `#gen-dialog` |
| Tests | None in `tools/` — verification is `tsc` + browser smoke test |
| Commits | Separate commits per phase (fixes / refactor / docs / JSDoc) via the git-commit skill |
| Artifacts | This spec + sections in `tasks/plan.md` and `tasks/todo.md`, committed first |

## Tech Stack

- Bun runtime + TypeScript (`Bun.serve`, `Bun.Glob`, `Bun.write` where apt).
- `node:fs/promises` (`rename`, `rm`) + `node:path` (`join`) — stdlib only.
- `ai` ^7.0.84 + Vercel AI Gateway (unchanged).
- Client: single-file vanilla HTML/CSS/JS (`sprite-manager.html`), unchanged stack.
- No test framework in `tools/` (decided); no new dependencies.

## Commands

```
Typecheck:  bunx tsc --noEmit          # gate: zero NEW errors for tools/ files
Run:        cd tools && setsid bun sprite-manager.ts > ../tmp/gen-server.log 2>&1 < /dev/null & disown
Kill:       pkill -9 -f "^bun sprite-manager"     # anchored — plain -f hangs (tools/AGENTS.md)
Smoke:      agent-browser against http://localhost:3000; screenshots to tmp/
Cleanup:    rm -rf tmp/* once fixes are committed; delete test sprites from the real folders
```

## Project Structure

```
tools/
├── shared.ts              ← NEW: single source of truth (see Code Style)
├── sprite-manager.ts      ← fixes: rename/delete correctness
├── sprite-generator.ts    ← fixes: numbering, dead param, provider opts, cache
├── sprite-manager.html    ← refactor: modal unification, render dedup, JSDoc
├── README.md              ← docs: env var, layout, API row
└── AGENTS.md              ← docs: modal convention note if it changes guidance
tasks/
└── spec-sprite-manager-review.md (+ sections in plan.md, todo.md)
```

`shared.ts` defines once: `NAME_RE`, `SPRITE_GLOB`, `ASSET_SIZES`
(`32x32`, `64x64`), `GENERATED_SIZES` (adds `128x128`), `sanitizeName()`,
`json()`. The HTML client keeps its local `kebab()` / `parts()` (plain-JS
module cannot import TS — accepted duplication, documented).

## Code Style

JSDoc per `src/AGENTS.md` §1, applied to `tools/`:

- Exported `handleGenerateRoutes`: full formal JSDoc — one-line description,
  `@param` for every parameter, `@returns`, `@example`.
- Internal functions: one-line description + per-param notes when useful.
- Existing *why* comments are kept; non-obvious branches get why-comments.
- Keep the current `function`-declaration style in `tools/` (arrow-only
  conversion is out of scope — the review flagged JSDoc, not style).
- No `any`; ad-hoc `as { ... }` request bodies stay only where the JSON
  boundary makes them unavoidable, and are validated immediately after.

## Testing Strategy

No colocated tests (decided). Verification ladder per task:

1. `bunx tsc --noEmit` — no new `tools/` errors (pre-existing `src/` errors ignored).
2. Server-touching tasks: restart the detached server (commands above) and
   exercise the changed route with `curl` or the UI.
3. Client tasks: `agent-browser` walkthrough of the affected flows,
   screenshots into `tmp/`.
4. Final: full smoke checklist (load, rename+apply, delete, spritesheet,
   generate+save, model list); then delete test sprites from the real asset
   folders (`references/images/items/`) per `tools/AGENTS.md`.

## Boundaries

- **Always:** re-read/grep `sprite-manager.html` before editing (the user
  edits it between sessions); `cache-control: no-store` on JSON responses;
  keep the API key server-side; two-phase atomic rename preserved; server-side
  name validation preserved; Bun toolset.
- **Ask first:** changing the port; renaming the real env vars in
  `tools/.env.local`; dropping 128x128 saves; splitting `sprite-manager.html`
  into multiple files (single-file convention is documented in `tools/AGENTS.md`).
- **Never:** commit `.env.local` or any secret; edit `prototype/`; touch
  `src/`; let the naming constants exist in more than one place; remove error
  handling to simplify; leave test sprites behind in the real asset folders.

## Success Criteria

- [ ] `tools/README.md` documents `AI_GATEWAY_API_KEY`; no instruction fails when followed verbatim.
- [ ] README layout documents `128x128/` as unmanaged scratch; save numbering stays per-folder gapless (behavior unchanged).
- [ ] `POST /sprites/apply` returns the real moved count, returns JSON errors on failure, uses `fs.rename` (no `Bun.$` in rename/delete paths), leaves no `.tmp-*.png` after success.
- [ ] `NAME_RE`, `SPRITE_GLOB`, size lists, `sanitizeName`, `json` defined exactly once in `tools/shared.ts`; no duplicate definitions remain.
- [ ] `/generate` accepts `{ model, prompt }` only; client sends no `size`; README API row updated.
- [ ] No `confirm()` / `prompt()` calls in the HTML; delete, spritesheet name, and save name all flow through `askConfirm()` / `askText()` with the styled dialog.
- [ ] One render per selection interaction (`refresh()` helper; `toggleSelect` pure); `loadImage()` helper shared; deletes use `Promise.allSettled`; duplicated comment gone.
- [ ] `listModels()` caches only successful Gateway merges; models fetch has a timeout.
- [ ] JSDoc present as specified; exported API formally documented.
- [ ] `bunx tsc --noEmit`: zero new `tools/` errors.
- [ ] Full smoke checklist passes; test sprites deleted; `tmp/` cleaned after the final commit.

## Open Questions

None — all decisions locked (table above).
