# Tools

Standalone developer tools for the project. They are not part of the shipped PWA;
each one runs locally with Bun and talks to files on disk.

## Sprite Manager

A local web UI to curate the game's sprite assets: view, rename, reorder, delete,
and export them as spritesheets.

### Run

```sh
bun tools/sprite-manager.ts
```

Then open http://localhost:3000.

`SPRITESHEET_ROOT` (optional) points to the asset root. It is resolved relative to
the `tools/` directory, so the server can be launched from any working directory:

```sh
SPRITESHEET_ROOT=../tmp/sprites bun tools/sprite-manager.ts
```

Default: the `tools/` directory itself. An empty `tools/.env.local` is the place to
keep a local value (git-ignored).

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

All responses are `cache-control: no-store` because renames can reuse a filename
with different content.
