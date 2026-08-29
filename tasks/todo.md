# Todo: Sprite Manager Utility

- [ ] Task: Bun API server (`sprite-manager.ts`)
  - Acceptance: serves HTML at `/`; GET /sprites lists files; DELETE removes
    from both folders; POST /sprites/apply two-phase renames both folders;
    POST /spritesheets saves decoded PNG; path traversal rejected.
  - Verify: curl each route; ls 32x32 64x64 before/after.
  - Files: references/images/items/sprite-manager.ts
- [ ] Task: Manager UI (sprite-manager.html)
  - Acceptance: grid renders all sprites at 4x pixelated with checkerboard
    transparency; click multi-select; drag & drop reorder; inline rename;
    DELETE immediate w/ confirm; APPLY sends mapping with pending badge;
    DISCARD reloads; Generate spritesheet uploads PNG.
  - Verify: manual walkthrough + agent-browser screenshot.
  - Files: references/images/items/sprite-manager.html
- [ ] Task: End-to-end verification & cleanup
  - Acceptance: delete/rename/reorder/spritesheet flows verified against the
    real folders; server errors handled (404/400).
  - Verify: full manual pass; restore any mutated test sprites.
  - Files: none new.
