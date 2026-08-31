# AGENTS.md — tools/

Read `README.md` first for what each tool does. Rules below are specific to the
tools in this directory.

## Sprite Manager shell quirks

- `pkill -9 -f sprite-manager` matches its own `bash -c` wrapper and hangs.
  Use an anchored pattern: `pkill -9 -f "^bun sprite-manager"`.
- Launch the detached dev server from this directory (`tools/`, so Bun picks up
  `tools/.env.local`):
  `setsid bun sprite-manager.ts > ../tmp/gen-server.log 2>&1 < /dev/null & disown`
- Combined kill+restart commands hang → run them as separate commands.
- The server may also be run by the user as `bun --hot ./sprite-manager.ts`;
  file edits are then hot-reloaded, and its logs go to the user's terminal
  (not to `tmp/gen-server.log`).
- Editing the HTML/app files while a plain (non-`--hot`) server is running
  can crash its bundler on the next request (`Failed to load bundled module
  './sprite-manager-app.ts'`). Restart the server, or prefer launching it
  with `bun --hot` when agent edits are expected.

## Sprite Manager conventions

- The Sprite Manager UI is `sprite-manager.html` (markup + tab CSS) plus
  extracted modules bundled by Bun's HTML import at serve time:
  `sprite-manager-app.ts` (client logic), `dialog.ts` + `dialog.css` (styled
  promise-based `confirm()` / `prompt()` modals). The user edits these files
  between agent sessions: always re-read/grep them before editing.
- Grid declaration (Generate tab) is one `{ cols, rows }` model: the dropdown
  (presets + "Custom…" styled prompt) may change at any time and re-slices the
  in-memory source canvas — 1×1 is the full image, not a special branch. Never
  reintroduce a mode state (`single`/`sheet`) or auto-fill the hint from the
  grid: the hint field is user-owned.
- `background-removal.ts` is a standalone, canvas-agnostic module
  (`removeBackground(canvas): () => void` returning an undo). Keep it free of
  Sprite Manager references (no `genDown`, no tab names) so other tabs/tools
  can reuse it.
- Client modals: always use the styled `confirm()` / `prompt()` from
  `dialog.ts` — they are async (await them) and accept `{ okText, level }`
  with `level: "danger" | "warning"`. Never reintroduce the native blocking
  modals.
- Server routes follow the canonical Bun form: every handler is a dedicated
  named function telling what it DOES (`listSprites`, `applyRenames`,
  `deleteSprite`, `generateSprite`, `saveSprite` — never HTTP-verb names like
  `postGenerate`), typed with `RequestHandler` (static path) or
  `RouteHandler<Path>` (dynamic path, typed `params`) from `shared.ts`, then
  assembled into the `Bun.serve` routes object. `fetch` is only the JSON
  catch-all; do not inline handlers inside the routes declaration.
- Provider options in `/generate` hard-fail for providers that do not know them
  (e.g. `prodia`); `width`/`height` is only sent to providers in the
  `PROVIDER_OPTIONS` table (`sprite-generator.ts`).
- `bfl/flux-2-flex` intermittently returns Gateway 500s — retry or switch to
  `prodia/flux-fast-schnell` before suspecting the code.
- Test sprites land in the real asset folders (`references/images/items/`):
  delete the ones created during test sessions.
