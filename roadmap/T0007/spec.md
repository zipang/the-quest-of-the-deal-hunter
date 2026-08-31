# Spec: [T0007] Spritesheet generation mode (4×4 / 8×8) in the Generate tab

Status: **APPROVED — 2026-08-31 (intent interview + plan review).**
Intent interview: confirmed 2026-08-31 (restate approved by the user).

## Objective

Add a **generation-mode picker** to the Sprite Manager's Generate tab:
**Single / 4×4 / 8×8** (segmented control). Today the tab generates one sprite
per 1024×1024 generation — the model wastes most of its mandatory square
canvas. Certain models produce notably better results when asked for a full
spritesheet, so in sheet mode one generation yields 16 (4×4, 256 px cells) or
64 (8×8, 128 px cells) sprites.

In sheet mode the returned 1024×1024 PNG is **sliced client-side** into cells
(row-major, top-left first) and held in memory (offscreen canvas). The UI adds
**`< previous`** / **`next >`** buttons that cycle through the cells (wrap
around) with a position counter (e.g. `5/16`). The existing size picker
(32/64/128) downscales the **current cell** to the grid (nearest-neighbor,
as today), and **Save** saves the current cell through today's flow: styled
`prompt()` for the name, gapless `NNN-` numbering in the selected size folder.

The Generate panel gains a second input, the **hint** field, available in
**all modes** (Single, 4×4, 8×8) and treated exactly like the main prompt
input: shell-style ↑/↓ recall over its **own** history (10 entries,
localStorage), distinct from the prompt history. The **prompt describes the
subject**; the **hint carries practical rendition details** — spritesheet
grid dimensions in sheet modes, background, style constraints, etc. The
final prompt submitted to `/generate` is `"<prompt>. <hint>"`, combined
**client-side**; the server is unchanged (`ADD_PROMPT_CONTEXT` still applies
server-side on top).

Success: pick `4×4`, type a subject and adjust the prefilled grid hint, hit
Generate, see sprite `1/16`, cycle with the buttons, pick size 64x64, hit
Save, and the sprite lands in `SPRITES_ROOT/64x64/` with the next gapless
number — repeatable per cell. In Single mode the hint field recalls past
rendition hints with ↑/↓ the same way.

## Tech Stack

Unchanged: Bun server (`sprite-manager.ts` + `sprite-generator.ts`), vanilla
TS client (`sprite-manager-app.ts`, `dialog.ts`), AI Gateway via the `ai`
package. No new dependencies.

## Commands

```
Dev:   setsid bun sprite-manager.ts > ../tmp/gen-server.log 2>&1 < /dev/null & disown   (from tools/)
Check: bunx tsc --noEmit && bunx biome check tools/
Smoke: agent-browser walkthrough of the Generate tab (screenshots in tmp/)
```

## Project Structure

```
tools/
├── sprite-manager.html      ← mode picker, hint field, prev/next controls, counter
├── sprite-manager-app.ts    ← prompt+hint combination, histories, slicing, navigation
└── README.md                ← docs: new mode, hint field, client-side combination
roadmap/T0007/               ← this spec (+ plan.md, todo.md)
```

## Code Style

Follow `tools/AGENTS.md` conventions: named route handlers typed
`RequestHandler` from `shared.ts`; styled async `confirm()`/`prompt()` modals
only; re-read the HTML/app files before editing (the user edits them between
sessions).

```ts
// row-major cell extraction, held in memory
const cell = document.createElement("canvas");
cell.width = cellSide; cell.height = cellSide;
cell.getContext("2d")!.drawImage(sheet, col * cellSide, row * cellSide, cellSide, cellSide, 0, 0, cellSide, cellSide);
```

## Testing Strategy

Manual/agent-browser only (local tool, no test framework): tsc + biome clean,
then an end-to-end walkthrough per mode — generate a 4×4 sheet with a fixture
prompt, cycle through all 16 cells, save one per size folder, delete the test
sprites afterwards.

## Boundaries

- **Always:** keep single-sprite mode working exactly as today; keep slicing
  and downscale client-side; re-read HTML/app files before editing.
- **Ask first:** any new env var or server route; changing the save dialog.
- **Never:** server-side image slicing; breaking the Organize/Curate tabs;
  touching the `export/` spritesheets flow; leaving test sprites on disk.

## Success Criteria

- [ ] Segmented mode picker Single / 4×4 / 8×8; default Single; switching
      modes resets any in-memory sheet.
- [ ] A hint input is present in **all** modes, styled and behaving like the
      prompt input: ↑/↓ shell-style recall over its own 10-entry localStorage
      history (distinct key from the prompt history).
- [ ] The submitted prompt is `"<prompt>. <hint>"` combined client-side;
      empty hint → today's exact request body; the server `/generate` route
      is unchanged.
- [ ] In sheet mode, Generate returns one 1024×1024 image sliced row-major
      into 16 (4×4) or 64 (8×8) cells held in memory.
- [ ] `< previous` / `next >` cycle with wrap-around; counter shows the
      current position (`N/16` or `N/64`).
- [ ] The hint field is prefilled per mode with a default rendition hint
      (grid dimensions for 4×4 / 8×8) that the user can freely edit.
- [ ] Size picker (32/64/128) downscales the current cell nearest-neighbor;
      Save writes it as `NNN-<name>.png` in the selected size folder via
      today's gapless numbering.
- [ ] Single mode behavior is unchanged (modulo the hint input); tsc + biome
      clean for `tools/`.

## Open Questions

- None blocking. Exact wording of the grid hint to be drafted during
  implementation and shown for review.
