# Spec: Sprite Manager Utility

## Objective
A local, throwaway web utility to curate the 215 extracted sprites in
`references/images/items/{32x32,64x64}/`:

1. View all sprites in a grid, zoomed so each pixel is apparent.
2. Multi-select sprites to (a) delete them or (b) generate a spritesheet.
3. Re-order (drag & drop) and rename sprites virtually; an APPLY button
   commits all pending changes to disk at once.
4. Delete is immediate (with confirm), not staged.

User: the developer, alone. Success: junk sprites removed, remaining files
renumbered gapless in both size folders, custom spritesheets exportable.

## Tech Stack
- Bun runtime HTTP server (`Bun.serve`, static file serving + JSON API,
  per https://bun.com/docs/runtime/http/routing)
- Vanilla JS + CSS inline in a single `sprite-manager.html` (no build step)
- Spritesheet composition via HTML canvas (client-side), saved through the API
- No dependencies beyond Bun

## Commands
```
Run:    bun run references/images/items/sprite-manager.ts
Open:   http://localhost:3000
```

## API (sprite-manager.ts)
Served from the sprites directory (`references/images/items/`).

| Method | Path                  | Body / Query                  | Effect |
|--------|-----------------------|-------------------------------|--------|
| GET    | `/`                   | —                             | Serve sprite-manager.html |
| GET    | `/sprites`            | —                             | JSON list `{ name, order }` sorted by filename |
| GET    | `/32x32/:file`        | —                             | Serve PNG (also `/64x64/:file`) |
| DELETE | `/sprites/:name`      | —                             | Delete `sprite` from BOTH size folders; 404 if absent |
| POST   | `/sprites/apply`      | `{ order: [{ from, to }] }`   | Two-phase rename of files in both folders per mapping |
| POST   | `/spritesheets`       | `{ name, dataUrl }`           | Decode base64 PNG data URL, save to `references/images/items/` |

Rename safety: APPLY uses a two-phase commit (rename all to temp `.tmp-<n>`
names first, then to final names) to avoid collisions when indices shift.
Server path validation: reject any file name not matching `^sprite-[A-Za-z0-9-]*\.png$`.

## UI (sprite-manager.html)
- Toolbar: selection count, "Delete selected", "Generate spritesheet",
  APPLY (badge with pending-changes count), DISCARD.
- Grid of 64px tiles rendered at 4x (256px) with `image-rendering: pixelated`,
  checkerboard background to show transparency; filename under each tile.
- Click = select/deselect (multi-select). Drag & drop to reorder (virtual).
- Inline rename: pencil action per sprite -> custom name stem
  (e.g. `trophy` -> `sprite-trophy.png`).
- DELETE calls the API immediately after a `confirm()`.
- Pending renames/reorders tracked in a JS map; APPLY sends one mapping.
- DISCARD resets virtual state and reloads.

## Project Structure
```
references/images/items/
  sprite-manager.html   # the whole UI (inline CSS/JS)
  sprite-manager.ts     # Bun HTTP server + file API
  32x32/ 64x64/         # sprite files (managed by the utility)
```

## Code Style
Plain TypeScript, no framework. Example of the server shape:
```ts
Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/sprites") return Response.json(listSprites());
    // ...
  },
});
```

## Testing Strategy
Manual verification (throwaway utility): run server, exercise every API route
with the UI and `curl`, verify file system effects. No test suite.

## Boundaries
- Always: validate file names server-side; operate on BOTH folders atomically
- Ask first: changing the port or the sprites directory
- Never: touch anything outside `references/images/items/`; allow `..` in paths

## Success Criteria
- [ ] `bun run references/images/items/sprite-manager.ts` serves the UI on :3000
- [ ] All sprites listed, rendered crisply at 4x zoom with transparency visible
- [ ] Delete removes the PNG from both `32x32/` and `64x64/` immediately
- [ ] Drag & drop reorder + inline rename stay virtual until APPLY
- [ ] APPLY renames files gaplessly in both folders, surviving index shifts
- [ ] Multi-select -> Generate spritesheet writes a transparent PNG
      (auto square grid of 64px tiles) into `references/images/items/`
- [ ] DISCARD reverts any unapplied virtual changes

## Open Questions
None.
