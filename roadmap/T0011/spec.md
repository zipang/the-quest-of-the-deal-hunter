# Spec: T0011 — Split the Generate tab into "Generate" and "Extract"

Status: **DRAFT — awaiting human review.**
Intent interview: confirmed 2026-08-31 (restate approved by the user).

## Objective

Today the Generate tab mixes two concerns: producing an image (prompt/hint/
model) and working it (grid declaration, cell navigation, background removal,
save). Split it into two tabs of an explicit pipeline:

- **Generate** — model + prompt + hint + Generate button, plus a **full-size
  preview** of the generated image (natural pixel size in a scrollable
  container; pixel-level inspection of what the model returned). No grid, no
  slicing, no save UI.
- **Extract** — the slicing workspace: the grid dropdown (1×1…8×8 presets +
  Custom…, unchanged behavior), `< previous` / `next >` cell navigation with
  the `N/cols*rows` counter, the 128/64/32 displays with drag-to-recenter,
  Remove background (with undo), size checkboxes + Save.

**Shared source canvas:** both tabs work on one in-memory source canvas.
Generation stores the image there; Extract also gains a **"Load spritesheet"**
button (top toolbar) that fills the same canvas from a local PNG/JPG file
(client-side `<input type="file">` → canvas), so a user can skip Generate
entirely and extract sprites from an existing file — no server change.

**Success message:** on generation success, the status line (same spot as
errors) says the image was generated and auto-saved at its full-size path
under `<SPRITESHEET_ROOT>/originals/`, and invites the user to proceed to the
Extract tab (or re-generate). No auto tab switch.

**Tab selector as a radio group:** with three tabs (Generate / Extract /
Organize) the selector must read as "one of several, exactly one active":
the three tab buttons are grouped into a single segmented control with
radio-button semantics — `role="radiogroup"` wrapper, buttons as
`aria-checked` radios (visually segmented, one highlighted), keyboard
arrow-key navigation between them. Only the selected tab's panel is visible.

Confirmed intent:
- Full split — every inspection/slicing/save control moves to Extract.
- Grid dropdown lives in Extract only; hints stay user-owned (no autofill).
- Full-size preview at natural size, scrollable.
- 1×1 stays the "whole image" case inside Extract (nav hidden, no drag).
- Extract must be usable with no image loaded: controls disabled + an
  empty-state hint ("Generate an image or load a spritesheet file").

## Tech Stack

Unchanged: Bun + TypeScript, vanilla DOM. No new dependencies, **no server
change** (file loading is client-side; the existing `/generate/save` route
already writes PNGs).

## Commands

```
Dev:   setsid bun --hot sprite-manager.ts > ../tmp/gen-server.log 2>&1 < /dev/null & disown   (from tools/)
Kill:  pkill -9 -f "^bun sprite-manager"   (anchored pattern)
Check: bunx tsc --noEmit && bunx biome check tools/
Smoke: agent-browser walkthrough (screenshots in tmp/)
```

## Project Structure

```
tools/
├── sprite-manager.html      ← third tab button (#tab-extract) + #extract-panel;
│                              Generate panel slimmed to model/prompt/hint/preview;
│                              Extract panel: toolbar (Load spritesheet, grid dropdown,
│                              cell nav), displays, save bar
├── sprite-manager-app.ts    ← tab routing gains #extract; shared source-canvas
│                              state; file-input loading; UI-state sync (disabled
│                              controls when no image)
├── README.md                ← docs: the two-tab pipeline
└── AGENTS.md                ← conventions note (shared source canvas, tab split)
roadmap/T0011/               ← this spec (+ plan.md, todo.md)
```

## Code Style

Follow `tools/AGENTS.md`: tabs, named functions with a JSDoc explaining the
*why*, styled async `confirm()`/`prompt()` from `dialog.ts`; re-read HTML/app
files before editing (user edits between sessions).

```ts
// Both tabs read/write the same source canvas; the grid only decides how
// it is sliced.
async function storeImageFromBlob(blob: Blob) { ... }
```

## Testing Strategy

Manual/agent-browser only (canvas needs a real page): tsc + biome clean;
walkthroughs — generate → success message with path → Extract shows the
image; Load spritesheet with a local PNG and a JPG; grid changes re-slice;
save still writes all checked sizes; delete test sprites afterwards.

## Boundaries

- **Always:** keep the shared source canvas as the single image holder;
  keep the styled dialog modals; keep the hint field user-owned.
- **Ask first:** any server route change; any new dependency.
- **Never:** reintroduce native blocking modals; edit `./prototype/`;
  auto-switch tabs after generation; leave test sprites on disk.

## Success Criteria

- [ ] Generate tab: model/prompt/hint + full-size scrollable preview; no
      grid/nav/save controls; success message shows the originals/ path and
      invites extraction.
- [ ] Extract tab: Load spritesheet loads a local PNG **and** JPG into the
      shared source canvas; grid dropdown, cell nav, drag-to-recenter,
      Remove background, size checkboxes + Save all work exactly as today.
- [ ] Generate → Extract hand-off works with zero re-render cost (same
      canvas); re-generating refreshes the shared image.
- [ ] Extract with no image: controls disabled, empty-state hint visible.
- [ ] Saved sprites are byte-equivalent to today's output for the same
      source (same grid, same cell).
- [ ] tsc + biome clean for touched code.

## Open Questions

- None blocking.
