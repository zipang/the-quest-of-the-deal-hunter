# Spec: [T0008] Drag-to-recenter the viewport on the 128×128 display (sheet mode)

Status: **DRAFT — awaiting human review.**
Intent interview: confirmed 2026-08-31 (restate approved by the user).

## Objective

Models don't always align generated sprites to the spritesheet grid: some
sprites bleed across cell borders (horizontal bleed is the most common —
verified by pixel analysis of a real 4×4 sheet, see T0007). Add a **drag
feature** in sheet mode (4×4 / 8×8): pressing and dragging on the **128×128
display** pans the sampling viewport inside the offscreen 1024×1024 sheet, so
the user can recenter a misplaced sprite before saving.

Behavior:

- **Grab metaphor** — the user grabs the sprite and moves it inside the
  viewport; the viewport moves opposite to the drag (content follows cursor).
- **Half-cell clamp** — the offset is limited to ±half a cell in both axes
  (±128 px in 4×4, ±64 px in 8×8), so the user can pull back bleed from a
  neighboring cell.
- The offset feeds the 128×128 master canvas, so the 64×64/32×32 grids and
  every saved sprite reflect the recentering.
- **Moving to another cell** (`< previous` / `next >`) or generating a new
  sheet resets the offset to (0, 0). No per-cell persistence, no reset
  button, no double-click.
- Single mode is untouched (no drag).

Success: generate a 4×4 sheet whose sprites bleed, drag the 128×128 display
to recenter a bleeding sprite, and the saved sprite is clean.

## Tech Stack

Unchanged: vanilla TS client (`sprite-manager-app.ts`), no new dependencies,
no server change.

## Commands

```
Dev:   setsid bun --hot sprite-manager.ts > ../tmp/gen-server.log 2>&1 < /dev/null & disown   (from tools/)
Check: bunx tsc --noEmit && bunx biome check tools/
Smoke: agent-browser walkthrough (screenshots in tmp/)
```

## Project Structure

```
tools/
├── sprite-manager.html      ← cursor: grab/grabbing on the 128 display
├── sprite-manager-app.ts    ← pointer-drag panning + clamped offset in renderCurrentCell
└── README.md                ← docs: drag-to-recenter
roadmap/T0008/               ← this spec (+ plan.md, todo.md)
```

## Code Style

Follow `tools/AGENTS.md`: re-read HTML/app files before editing; Pointer
Events (pointerdown/pointermove/pointerup + setPointerCapture) on the 128
canvas only; no comments unless they explain why.

```ts
// clamp to ±half a cell so bleed from a neighbor can be pulled back
const max = SHEET_SIDE / grid / 2;
offX = Math.max(-max, Math.min(max, offX));
```

## Testing Strategy

Manual/agent-browser only: tsc + biome clean; synthetic sheet test (inject a
numbered grid into the offscreen sheet via eval, drag, assert the rendered
canvas shifted); one real generation + save + cleanup of test sprites.

## Boundaries

- **Always:** clamp the offset; reset on cell change / new generation;
  content-follows-cursor mapping (grab metaphor).
- **Ask first:** any server change; adding per-cell persistence.
- **Never:** drag on the 64/32 displays or in single mode; leaving test
  sprites on disk.

## Success Criteria

- [ ] In sheet mode, pointer-drag on the 128×128 display pans the viewport;
      content follows the cursor (grab metaphor); cursor shows grab/grabbing.
- [ ] Offset clamped to ±half a cell (±128 px in 4×4, ±64 px in 8×8).
- [ ] 64/32 grids update live during the drag; Save writes the recentered
      sprite.
- [ ] Offset resets when navigating to another cell or generating anew.
- [ ] Single mode and the 64/32 displays are not draggable; tsc + biome clean.

## Open Questions

- None blocking.
