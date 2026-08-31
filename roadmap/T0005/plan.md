# Plan: Sprite Generator tab (Sprite Manager + Vercel AI Gateway)

Spec: `roadmap/T0005/spec.md`

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
See `roadmap/T0005/todo.md`.
