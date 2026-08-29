# Tools

Standalone developer tools for the project. They are not part of the shipped PWA;
each one runs locally with Bun and talks to files on disk.

## Sprite Manager

A local web UI to curate the game's sprite assets: view, rename, reorder, delete,
and export them as spritesheets. A second tab, **Generate**, creates new sprites
with AI image models through the Vercel AI Gateway (via the `ai` package).

### Run

```sh
bun install            # one-time: brings in the `ai` package
bun tools/sprite-manager.ts
```

Then open http://localhost:3000.

Environment variables (keep them in the git-ignored `tools/.env.local`; when set
there, launch the server from `tools/` so Bun picks them up):

| Variable | Purpose |
| :--- | :--- |
| `SPRITESHEET_ROOT` | Asset root, resolved relative to `tools/` (default: `tools/`) |
| `VERCEL_API_KEY` | AI Gateway auth token — required to generate, stays server-side |
| `FAVORITE_IMAGE_MODELS` | Comma-separated model ids shown first (★) in the Generate tab |

The model dropdown lists favorites plus image-generation models fetched from
the Gateway (`https://ai-gateway.vercel.sh/v1/models`, cached in memory).

### Generate tab

One request produces all three grids at once: the model returns a large square
image (1024×1024), downscaled to 128×128 client-side (nearest-neighbor), then
64×64 and 32×32 are derived from it — each grid has its own **Save**. While
generating, an hourglass loader replaces the grids; errors show in a bar at the
bottom of the page. The last 10 prompts are kept in `localStorage` and offered
in a dropdown under the prompt input.

Because size support differs per model (OpenAI only knows `size`, bfl prefers
`width`/`height`, spacexai wants `aspectRatio`), the server passes `size` plus
the provider's `width`/`height` — but only for providers known to accept them
(whitelist in `sprite-generator.ts`), since unknown provider options hard-fail
(e.g. `prodia`); the others warn about `size` (harmless). `REQUEST_TIMEOUT`
(ms, default `30000`) bounds each generation.

### Asset layout (relative to `SPRITESHEET_ROOT`)

```
32x32/    small sprite variants
64x64/    large sprite variants
export/   generated spritesheets (created on first export)
```

### Naming convention

Sprites: `NNN-kebab-name.png` — a 3-digit index (`001`–`999`) plus a kebab-case
name. Indices are unique and gapless: the UI renumbers the series after every
change and APPLY commits the renames to disk (both sizes are kept in sync).
Spritesheets: `kebab-name-spritesheet.png`.

### API (served on port 3000)

| Method | Path              | Description                                        |
| ------ | ----------------- | -------------------------------------------------- |
| GET    | `/sprites`        | List sprite names (from `64x64/`)                  |
| GET    | `/64x64/<name>`   | Serve one sprite file (same for `/32x32/`)         |
| DELETE | `/sprites/<name>` | Delete one sprite from both sizes                  |
| POST   | `/sprites/apply`  | Commit renames: `{ order: [{ from, to }] }`        |
| POST   | `/spritesheets`   | Save a PNG data URL to `export/<name>`             |
| GET    | `/generate/models` | Favorite + Gateway image-generation models        |
| POST   | `/generate`       | `{ model, prompt, size }` → native PNG (base64)    |
| POST   | `/generate/save`  | `{ size, name, dataUrl }` → `NNN-<name>.png`       |

All responses are `cache-control: no-store` because renames can reuse a filename
with different content.
