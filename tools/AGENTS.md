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

## Sprite Manager conventions

- The Sprite Manager UI is `sprite-manager.html` (markup + tab CSS) plus
  extracted modules bundled by Bun's HTML import at serve time:
  `sprite-manager-app.ts` (client logic), `dialog.ts` + `dialog.css` (styled
  promise-based `confirm()` / `prompt()` modals). The user edits these files
  between agent sessions: always re-read/grep them before editing.
- Client modals: always use the styled `confirm()` / `prompt()` from
  `dialog.ts` — they are async (await them) and accept `{ okText, level }`
  with `level: "danger" | "warning"`. Never reintroduce the native blocking
  modals.
- Provider options in `/generate` hard-fail for providers that do not know them
  (e.g. `prodia`); `width`/`height` is only sent to providers in the
  `PROVIDER_OPTIONS` table (`sprite-generator.ts`).
- `bfl/flux-2-flex` intermittently returns Gateway 500s — retry or switch to
  `prodia/flux-fast-schnell` before suspecting the code.
- Test sprites land in the real asset folders (`references/images/items/`):
  delete the ones created during test sessions.
