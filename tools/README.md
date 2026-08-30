# Tools

Standalone developer tools for the project. They are not part of the shipped PWA;
each one runs locally with Bun and talks to files on disk.

## Sprite Manager

A local web UI to curate the game's sprite assets: view, rename, reorder, delete,
and export them as spritesheets — one size folder at a time (32x32, 64x64 or
128x128, selected in the Organize tab; folders are independent, nothing is
synced between them). A second tab, **Generate**, creates new sprites with AI
image models through the Vercel AI Gateway (via the `ai` package).

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
| `AI_GATEWAY_API_KEY` | AI Gateway auth token — required to generate, stays server-side |
| `FAVORITE_IMAGE_MODELS` | Comma-separated model ids shown first (★) in the Generate tab |
| `ADD_PROMPT_CONTEXT` | Prompt complement appended to every prompt (pixel-art style hint, has a default) |
| `REQUEST_TIMEOUT` | Generation timeout in ms (default `30000`; values outside 1–59999 fall back to `30000`) |
| `SAVE_FULLSIZE_IMAGES` | When set to a directory (resolved like `SPRITESHEET_ROOT`), saves every original model image there as `<timestamp>-<model>.png`, before downscaling |

The model dropdown lists favorites plus image-generation models fetched from
the Gateway (`https://ai-gateway.vercel.sh/v1/models`, cached in memory).

### Generate tab

One request produces all three grids at once: the model returns a large square
image (1024×1024), downscaled to 128×128 client-side (nearest-neighbor), then
64×64 and 32×32 are derived from it — each grid has its own **Save**. While
generating, an hourglass loader replaces the grids; errors show in a bar at the
bottom of the page. The last 10 prompts are kept in `localStorage` and recalled
with ↑/↓ inside the prompt input (shell-style history).

Because size support differs per model (OpenAI only knows `size`, bfl prefers
`width`/`height`, spacexai wants `aspectRatio`), the server always requests a
square 1024×1024 plus the provider's own options — but only for providers
known to accept them (see `PROVIDER_OPTIONS` in `sprite-generator.ts`), since
unknown provider options hard-fail (e.g. `prodia`); the others warn about
`size` (harmless). `REQUEST_TIMEOUT` (ms, default `30000`; values outside
1–59999 fall back to `30000`) bounds each generation.

### Asset layout (relative to `SPRITESHEET_ROOT`)

```
32x32/     managed sprite folder
64x64/     managed sprite folder
128x128/   managed sprite folder (full-size generated masters land here)
export/    generated spritesheets (created on first export)
```

### Naming convention

Sprites: `NNN-kebab-name.png` — a 3-digit index (`001`–`999`) plus a kebab-case
name. Indices are unique and gapless **per folder**: each size folder is
independent, may hold a different set of sprites, and keeps its own numbering.
The Organize tab renumbers the selected folder's series after every change and
Reorder commits the renames to disk. Spritesheets: `kebab-name-spritesheet.png`.

### API (served on port 3000)

Every sprite route takes a `size` (`32x32`, `64x64` or `128x128`; `64x64` when
omitted) and targets exactly that one folder:

| Entry point                          | Description                                        |
| ------------------------------------ | -------------------------------------------------- |
| GET    `/sprites?size=<size>`        | List sprite names of one size folder               |
| GET    `/:size/:name`                | Serve one sprite file                              |
| DELETE `/sprites/:name?size=<size>`  | Delete one sprite from that size folder         |
| POST   `/sprites/apply`              | Commit renames: `{ size, order: [{ from, to }] }`  |
| POST   `/spritesheets`               | Save a PNG data URL to `export/<name>`             |
| GET    `/generate/models`            | Favorite + Gateway image-generation models         |
| POST   `/generate`                   | `{ model, prompt }` → native PNG (base64)          |
| POST   `/generate/save`              | `{ size, name, dataUrl }` → `NNN-<name>.png`       |

Every JSON response shares one envelope, built by the `success()` / `error()`
helpers in `shared.ts`: successes are `{ "ok": true, ...data }`, errors are
`{ "ok": false, "error": "<message>" }`.

All responses are `cache-control: no-store` because renames can reuse a filename
with different content.
