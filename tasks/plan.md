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
(`VERCEL_API_KEY` in `process.env`); `generateImage()` from the `ai` package
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
