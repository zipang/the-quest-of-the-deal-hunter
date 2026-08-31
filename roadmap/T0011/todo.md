# Todo: T0011 — Split Generate into Generate + Extract tabs

- [x] Task 1: HTML re-partition — radio-group tab selector (Generate /
      Extract / Organize, `role="radiogroup"`, one active) + third tab
      `#tab-extract` + `#extract-panel`; move grid dropdown, cell nav,
      128/64/32 displays, save bar; slim the Generate panel (model/prompt/
      hint + full-size scrollable preview)
- [x] Task 2: App wiring — `#extract` tab routing, `syncExtractUi()` disabled
      states + empty-state hint, "Load spritesheet" file input (PNG/JPG →
      shared source canvas), success message with originals/ path + Extract link
- [ ] Task 3: Docs — two-tab pipeline in `tools/README.md` + note in
      `tools/AGENTS.md`
- [ ] Verify: spec success-criteria walkthrough (generate → extract; load PNG
      and JPG; grid/nav/drag/clean/save; empty state) + delete test sprites
