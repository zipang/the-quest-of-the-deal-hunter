# Tools

Standalone developer tools for the project. They are not part of the shipped PWA;
each one runs locally with Bun and talks to files on disk.

## Sprite Manager

A local web UI to curate the game's sprite assets: view, rename, reorder, delete,
and export them as spritesheets — one size folder at a time (32x32, 64x64 or
128x128, selected in the Organize tab; folders are independent, nothing is
synced between them). Two more tabs form a pipeline: **Generate** creates new
sprites with AI image models through the Vercel AI Gateway (via the `ai`
package), and **Extract** slices an image — freshly generated or loaded from
disk — into individual sprites.

### Run

```sh
cd tools && bun sprite-manager.ts
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

Generation only: model, prompt, and hint (each with its own 10-entry
`localStorage` history, recalled with ↑/↓, shell-style). The prompt describes
the subject, the hint carries practical rendition details (grid
layout, background, style). Both are combined client-side into the submitted
prompt (`"<prompt>. <hint>"`; an empty hint sends the subject alone).

After a successful generation the status line shows the **full-size path**
(the original model image is auto-saved under `originals/` when
`SAVE_FULLSIZE_IMAGES` is set) and invites you to the Extract tab — the
generated image is also previewed there at full size (natural pixels in a
scrollable container, checkerboard behind alpha).

### Extract tab

The slicing workspace; it works on the **shared source canvas** — the image
you just generated, or a local file loaded with **Load spritesheet…**
(PNG/JPG file picker, purely client-side: no server call, no paid
generation). With nothing loaded, the controls are disabled and an
empty-state hint points to Generate or the file loader.

**Grid declaration** (dropdown): presets **1×1, 2×2, 3×3, 4×4, 6×6, 8×8**
plus **Custom…**, which opens the styled `cols x rows` prompt (e.g. `4x5`,
1–16 per axis). The declaration is changeable at any time — including after
a generation — and re-slices the in-memory image instantly (no new paid
call): 1×1 shows the full image, any N×M slices it row-major into cells of
`width/cols × height/rows` (the raw image keeps its natural size; sheets are
not always 1:1). The grid does not touch the hint field — write the desired
grid into the hint yourself when you want the model to lay one out.
`< previous` / `next >` cycle through the cells (wrap-around) with an
`N/cols*rows` counter, and Save writes the displayed cell. **Drag-to-recenter**:
models don't always align sprites to the grid — press and drag on the
128×128 display to pan the sampling viewport inside the image (grab metaphor:
the sprite follows the cursor). The offset is clamped to ±half a cell
(independently per axis, so non-square cells clamp correctly) so bleed from a
neighbor can be pulled back; the 64/32 grids follow live, Save writes the
recentered cell, and the offset resets when you move to another cell, change
the grid, or generate anew. 1×1 is not draggable. Known
limitation: models sometimes let a sprite
straddle two cells (horizontal bleed is the most common) — check a sheet in
Gimp or the previews before saving, and retry with a sharper hint if needed.

Because size support differs per model (OpenAI only knows `size`, bfl prefers
`width`/`height`, spacexai wants `aspectRatio`), the server always requests a
square 1024×1024 plus the provider's own options — but only for providers
known to accept them (see `PROVIDER_OPTIONS` in `sprite-generator.ts`), since
unknown provider options hard-fail (e.g. `prodia`); the others warn about
`size` (harmless). `REQUEST_TIMEOUT` (ms, default `30000`; values outside
1–59999 fall back to `30000`) bounds each generation.

**Remove background**: AI models rarely emit real alpha transparency (they
flatten the background or paint a fake checker pattern). The **Remove
background** button in the save bar cleans the image at its source — the
in-memory source canvas when the grid slices it (every cell is then
re-rendered clean), the hidden 128×128 master for a 1×1 image — before the
three renditions are (re-)derived, so the transparency shows in
every grid and in the saved PNGs. It is fully automatic: the corner pixels
are clustered into background tones (handles solid and checkered backdrops),
the tolerance is derived from the corner spread, and a border flood-fill
clears only background-connected pixels (same-colored pixels inside the
sprite are protected). Clicking the button again (**Undo background
removal**) restores the exact original pixels; the undo does not survive a
new generation or a cell navigation. The logic lives in
`background-removal.ts`, a standalone canvas-agnostic module (no Generate-tab
references), reusable by the Organize tab later.

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
| POST   `/generate`                   | `{ model, prompt }` → native PNG (base64); `prompt` is the client-combined subject + hint |
| POST   `/generate/save`              | `{ size, name, dataUrl }` → `NNN-<name>.png`       |

Every JSON response shares one envelope, built by the `success()` / `error()`
helpers in `shared.ts`: successes are `{ "ok": true, ...data }`, errors are
`{ "ok": false, "error": "<message>" }`.

All responses are `cache-control: no-store` because renames can reuse a filename
with different content.
