# Todo — Sprite background removal

- [x] Task: `tools/background-removal.ts` — reusable `removeBackground(canvas): () => void`
  - Acceptance: corner-sampled background clustering (solid + checkered), automatic
    tolerance, border flood-fill, `undo()` restores exact original pixels. No
    references to the Generate tab.
  - Verify: `bunx tsc --noEmit`
  - Files: `tools/background-removal.ts`
- [ ] Task: Generate tab wiring
  - Acceptance: "Remove background" button in `#gen-savebar` cleans the `genDown`
    master and re-derives the three renditions; undo re-renders originals;
    disabled while generating/no image.
  - Verify: manual UI check (dev server), delete test sprites afterwards
  - Files: `tools/sprite-manager.html`, `tools/sprite-manager-app.ts`
- [x] Task: docs
  - Acceptance: `tools/README.md` mentions the new module; `tools/AGENTS.md`
    conventions updated if needed.
  - Verify: read-through
  - Files: `tools/README.md`, `tools/AGENTS.md`
