# Implementation Plan: SliderRange (`src/components/form/`)

Spec: `tasks/spec-slider-range.md` (approved — `minStepsBetweenThumbs` removed,
thumbs may touch; `format` receives the `[min, max]` tuple).

## Architecture Decisions (summary)

- AD1: `@radix-ui/react-slider` is the only new dependency.
- AD2: form participation via `Slider.Root name` — inside a form Radix renders
  one hidden input per thumb; `FormData.getAll(name)` → `[min, max]`.
- AD3: family contract — shared facade props, Radix value naming with
  `[number, number]` tuples, standalone/composed root detection.
- AD4: tokens-only CSS; segmented range via `repeating-linear-gradient`;
  `.slider-range` kebab-case classes.

## Task List

- [ ] **Task 0: Dependency**
  `bun install @radix-ui/react-slider`. Verify: `bun run typecheck`.

- [ ] **Task 1: `SliderRange.tsx/.css` + tests**
  Facade per spec interface: label row (label left, `__value` readout right),
  Radix Root/Track/Range/Thumb ×2, family states, format default
  `` ([min, max]) => `${min} - ${max}` ``. Tests per spec testing strategy.

  Verify: `bun test src/components/form`, `bun run typecheck`, `bun run check`.

- [ ] **Task 2: Docs + checkpoint**
  `DESIGN.md` form-fields section: SliderRange anatomy notes.
  `src/components/form/README.md`: table row + usage example.
  Full `bun test`; human visual review vs `SlideRange.png` at 430 px.
