# Todo: Sprite Generator tab

- [ ] Task: Install `ai` + models route (`sprite-generator.ts`)
  - Acceptance: `bun install ai`; GET /generate/models returns favorites
    (from FAVORITE_IMAGE_MODELS, flagged favorite) + Gateway image models
    (fetched, filtered, cached); no VERCEL_API_KEY → favorites only, no crash.
  - Verify: curl /generate/models with and without key.
  - Files: tools/sprite-generator.ts, tools/sprite-manager.ts (mount), package.json
- [ ] Task: POST /generate route
  - Acceptance: body {model, prompt, size}; generateImage via AI Gateway;
    returns the model's native PNG as base64 (downscale is client-side);
    503 with clear error if no key; logs [generate].
  - Verify: curl POST with fixture prompt; missing-key path.
  - Files: tools/sprite-generator.ts
- [ ] Task: Generate tab UI (sprite-manager.html)
  - Acceptance: third tab; size picker 32/64/128; model select (favorites
    first); prompt input; canvas draws the returned PNG downscaled to the
    exact grid with nearest-neighbor (imageSmoothingEnabled = false);
    Generate POSTs and renders; Save opens mini dialog (name only), re-encodes
    the downscaled canvas via toDataURL, computes gapless NNN, POSTs the PNG;
    new sprite visible in Curate tab.
  - Verify: manual walkthrough with fixture folder + agent-browser screenshot.
  - Files: tools/sprite-manager.html
- [ ] Task: Docs, logging & cleanup
  - Acceptance: [generate]/[save-sprite] logs on every action; all paths via
    join(); tools/README.md documents new tab, routes and env vars; sprite
    fixtures cleaned; biome + tsc clean for tools/.
  - Verify: bunx biome check tools/ && bunx tsc --noEmit; rm -rf tmp fixtures.
  - Files: tools/README.md, tools/sprite-generator.ts
