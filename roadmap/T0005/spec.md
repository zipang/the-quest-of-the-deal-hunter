# Spec: Sprite Generator tab (Sprite Manager + Vercel AI Gateway)

Status: **APPROVED — intent confirmed 2026-08-29 (interview, see below).**
Superseded 2026-08-30 by `spec-sprite-manager-review.md`: the env var is
`AI_GATEWAY_API_KEY` (the old name was removed, no fallback) and `POST
/generate` takes `{ model, prompt }`.
Inspiration: https://github.com/vercel-labs/vercel-fal-image-generator (archived,
`lib/provider-config.ts`, `lib/image-helpers.ts`) + AI SDK docs
https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-image

## Objective

Add a **Generate** tab to the local Sprite Manager tool (`tools/`) so the
developer can create new game sprites with AI image models through the Vercel
AI Gateway, preview them at native sprite resolution, and save them into the
sprite folders following the existing `NNN-kebab-name.png` gapless convention.

Success = pick size (32x32, 64x64, 128x128), type a prompt, pick a model,
click Generate, see the sprite in the canvas grid, click Save, and the file
lands in `SPRITES_ROOT/<size>/` with the next gapless number.

## Confirmed Decisions (interview 2026-08-29)

| Topic | Decision |
| :--- | :--- |
| Sizes | `32x32`, `64x64`, `128x128` (62x62 was a typo) |
| Resolution | Pass a `size` param to the model when its docs allow it; **always downscale** the result to the exact grid with nearest-neighbor (pixel-art friendly) |
| Model list | `FAVORITE_IMAGE_MODELS=model1,model2` env var (priority, shown first) **+** fetch the Gateway model list filtered to image generation as complement |
| Save UX | Mini `dialog()` asks for the name; number is auto-incremented (gapless next of the selected size); saved **only** in the selected size folder |
| Scope | 1 image per Generate click, replaces the preview, no session history |
| Architecture | New API routes live in a new file `tools/sprite-generator.ts`, mounted by `sprite-manager.ts`; `AI_GATEWAY_API_KEY` read from `process.env` server-side only |

## Tech Stack

- **`ai`** (AI SDK v7+) — `generateImage({ model, prompt, size })`; AI Gateway
  model IDs (`provider/model`) work directly as the model string (Gateway is
  the default provider).
- **Bun runtime** — same server as the Sprite Manager (`Bun.serve`), routes
  split into `tools/sprite-generator.ts`.
- **Canvas 2D** (client) — preview grid + nearest-neighbor downscale, same
  rendering style as the existing tabs.
- No new frontend framework; the tab is HTML/JS inside `sprite-manager.html`
  (or a colocated template) following the existing single-file pattern.

## API (new routes, all server-side)

| Route | Method | Purpose |
| :--- | :--- | :--- |
| `/generate/models` | GET | Shortlist from `FAVORITE_IMAGE_MODELS` (flagged `favorite: true`) + Gateway image models fetched from `https://ai-gateway.vercel.sh/v1/models` filtered on image generation; cached in-memory for the server lifetime |
| `/generate` | POST | Body `{ model, prompt, size }` → calls `generateImage`, downscales to `size`, returns `{ image: base64-png, model, size }` |

Notes:

- `AI_GATEWAY_API_KEY` is read from `process.env` in `sprite-generator.ts` only.
  If missing, `/generate/models` returns the shortlist with an empty gateway
  section and `/generate` returns `503 { error }`.
- **Downscale is client-side**: the `/generate` route returns the model's
  native PNG; the browser downscales to the exact grid on the preview canvas
  (nearest-neighbor, `imageSmoothingEnabled = false`) and the saved PNG is
  produced by the canvas (`toDataURL`) — no server-side image dependency.

## Project Structure

```
tools/
├── sprite-manager.ts      ← mounts generator routes (import from sprite-generator.ts)
├── sprite-generator.ts    ← NEW: /generate + /generate/models routes, AI SDK calls
├── sprite-manager.html    ← NEW: third tab "Generate" (size picker, model select,
│                             prompt input, canvas grid, Generate + Save buttons,
│                             mini dialog for the name)
└── README.md              ← updated: new tab, env vars, routes
```

## Commands

```
Install:  bun install ai
Run:      SPRITESHEET_ROOT=../assets/items bun tools/sprite-manager.ts
Open:     http://localhost:3000 (Generate tab)
Env:      AI_GATEWAY_API_KEY=...    # AI Gateway auth (server-side)
          FAVORITE_IMAGE_MODELS=google/gemini-2.5-flash-image,openai/gpt-image-1
Check:    bunx biome check tools/ && bunx tsc --noEmit
```

## Testing Strategy

- The tool is a throwaway dev utility: **manual verification** through the UI
  (fixture folder under `tmp/`) for the happy path + error path (no API key,
  invalid model).
- Pure helpers (gapless number computation, name sanitization, gateway model
  filtering) can be tested with `bun test` in colocated `*.test.ts` if they
  live in separate functions — cheap and expected.
- `bunx biome check tools/` and `bunx tsc --noEmit` must stay clean for `tools/`.

## Boundaries

- **Always:** keep the key server-side; keep gapless numbering; log every
  action (`[generate]`, `[save-sprite]`); use `path.join()` for paths.
- **Ask first:** adding runtime dependencies beyond `ai`; changing the
  existing Sprite Manager tabs' behavior.
- **Never:** expose `AI_GATEWAY_API_KEY` to the browser; commit `.env.local`;
  edit `prototype/`.

## Success Criteria

- [ ] Generate tab renders the 3 sizes and a populated model dropdown (favorites first).
- [ ] Generate with a valid prompt + model returns a downscaled sprite drawn in the canvas grid.
- [ ] Missing `AI_GATEWAY_API_KEY` degrades gracefully (clear error, no crash).
- [ ] Save opens the mini dialog, computes the next gapless NNN, and writes `SPRITES_ROOT/<size>/NNN-name.png`.- [ ] Saved sprites appear in the existing Curate tab list.
- [ ] Logs emitted for list, generate, and save actions; all paths via `join()`.

## Open Questions

- None — downscale decided: client-side canvas.
