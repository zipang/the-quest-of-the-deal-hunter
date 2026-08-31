# Todo: [T0007] Spritesheet generation mode (4×4 / 8×8)

Spec: `roadmap/T0007/spec.md`. One commit per task, in order.
Gate for every task: `bunx tsc --noEmit` and `bunx biome check tools/` stay
clean. Re-read `sprite-manager.html` / `sprite-manager-app.ts` before editing
(the user edits them between sessions).

- [x] Task 1: mode picker + hint field (HTML/CSS)
  - Acceptance: segmented Single / 4×4 / 8×8 control in `#gen-panel`
    (default Single); a hint input visible in **all** modes, styled like
    `#gen-prompt`, labeled so its role is clear (rendition details: grid
    dimensions, background, style…); switching mode prefills the hint with
    that mode's default (grid hint for 4×4 / 8×8, rendition hint for
    Single); hint placeholder differs per mode.
  - Verify: browser look-over all three modes; tsc + biome.
  - Files: tools/sprite-manager.html
- [x] Task 2: hint history + client-side prompt combination (app.ts)
  - Acceptance: the ↑/↓ shell-style recall mechanics are extracted into a
    helper reusable by both inputs; the hint field has its own 10-entry
    localStorage history (`generate-hint-history`), independent of the
    prompt's; on Generate the submitted prompt is `"<prompt>. <hint>"`
    (trimmed, no trailing dot duplication) — empty hint → today's exact
    request body; `ADD_PROMPT_CONTEXT`/server unchanged; the pushed
    histories are the raw field values (subject in prompt history, hint in
    hint history).
  - Verify: manual + curl (request body logged server-side shows the
    combined prompt); ↑/↓ in both inputs; tsc + biome.
  - Files: tools/sprite-manager-app.ts
- [x] Task 3: sheet slicing & cell rendering (app.ts)
  - Acceptance: in sheet mode, Generate stores the returned PNG in an
    offscreen sheet canvas, slices the current cell row-major (256 px for
    4×4, 128 px for 8×8) into the 128×128 master `genDown` (nearest-
    neighbor) so the existing three-grid derivation fills the canvases;
    single mode keeps today's exact path (no slicing); a new generation
    resets the sheet and the cell index.
  - Verify: generate a 4×4 sheet with a fixture prompt — cell 1 renders in
    all three grids; tsc + biome.
  - Files: tools/sprite-manager-app.ts
- [x] Task 4: prev/next cycle + position counter
  - Acceptance: `< previous` / `next >` buttons cycle the cell index with
    wrap-around in sheet mode; a `N/16` (or `N/64`) counter shows the
    current position; buttons and counter are hidden in single mode; Save
    still saves the checked sizes of the displayed cell; keyboard ←/→
    optional (only if trivial).
  - Verify: agent-browser walkthrough — cycle through all 16 cells
    (wrap-around both directions), counter updates, Save one cell per
    size; tsc + biome.
  - Files: tools/sprite-manager.html, tools/sprite-manager-app.ts
- [x] Task 5: docs + end-to-end verification & cleanup
  - Acceptance: `tools/README.md` documents the mode picker, the hint field
    (own history, client-side combination), and the slicing behavior; full
    checklist passes (single mode unchanged modulo the hint input, 4×4 and
    8×8 generate → navigate → save per size); test sprites deleted from the
    real asset folders; `tmp/` cleaned.
  - Verify: agent-browser end-to-end for both modes; `ls` the size folders
    for leftovers; `rm -rf tmp/*` after the final commit.
  - Files: tools/README.md, roadmap/T0007/todo.md (checkboxes)

## Checkpoints

- After Task 2: tsc + biome clean, prompt + hint combination verified with
  single mode, both histories recall independently — review with human
  before sheet logic.
- After Task 4: sheet flow works end-to-end — review with human.
