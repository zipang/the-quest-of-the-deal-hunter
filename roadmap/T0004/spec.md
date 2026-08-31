# Spec: SliderRange — dual-thumb range field (`src/components/form/`)

Status: **DRAFT — awaiting human review.**

## Objective

Add `SliderRange` to the form-field family: a dual-thumb slider selecting a
`[min, max]` number range inside one field, per
`references/components/SlideRange.png`:

- Label top-left (same recipe as the other fields, with required marker).
- Live value readout top-right in `--color-brand-accent`, formatted through a
  consumer-provided `format` callback (default: raw `"<min> - <max>"`).- Dark track with thin neon edge; selected range in bright accent green with a
  segmented/stepped block look; square thumbs taller than the track.

### User stories

- As an app developer I write
  `<SliderRange name="budget" label="Budget" min={0} max={5000} step={100} format={([min, max]) => `¥${min} - ¥${max}`} />`
  and get a complete, labelled, form-wired range picker.
- As an app developer I read the submitted range from
  `FormData.getAll("budget")` → `[min, max]`, or from React state via
  `onValueChange`.

## Tech Stack

| Concern    | Choice                                    |
| ---------- | ----------------------------------------- |
| Runtime    | Bun (`bun install`, `bun test`, `bun run`) |
| Framework  | React 19                                  |
| Primitives | `@radix-ui/react-slider` (new dependency — ask-first honored: approved in this spec) |
| Styling    | Pure colocated CSS, token variables only  |
| Test       | `bun test` + `@testing-library/react`     |

## Commands

```sh
bun install @radix-ui/react-slider
bun run dev          # manual visual check vs SlideRange.png
bun test             # component tests
bun run typecheck    # tsc --noEmit
bun run check        # biome
```

## Project Structure

```
src/components/form/
├── SliderRange.tsx       ← the facade component
├── SliderRange.css       ← colocated styles (.slider-range)
├── SliderRange.test.tsx  ← colocated tests
└── (existing files unchanged; utils/ reused as-is)
```

## Architecture Decisions

### AD1 — Radix Slider as the only new dependency
`@radix-ui/react-slider` gives dual thumbs, keyboard a11y (WAI-ARIA
slider-multithumb), touch/pointer support and form bubble inputs. No other
package is added.

### AD2 — Form participation via `Slider.Root name` (stable behavior)
Inside a `<form>`, `Slider.Root` renders **one hidden input per thumb** —
documented stable behavior, no `unstable_*` parts needed. `SliderRange` passes
its `name` through, so `FormData.getAll(name)` yields `[min, max]`.
Deviation from the interview sketch (`{name}`/`{name}Max`): one shared name is
simpler and stable; the spec supersedes it.

### AD3 — Facade contract (identical to TextField/NumberField)
- Shared props from `utils/field-types.ts`: `name`, `label`, `serverError`,
  `validationMessages`, `disabled`.
- Radix value naming: `value`/`defaultValue` are `[number, number]` tuples;
  `onValueChange(value: [number, number])`.
- Standalone usage wraps itself in its own Radix `Form.Root`; inside `Form`
  (via `useInsideForm`) it reuses the parent form element. Never nested forms.

### AD4 — Styling contract
- Classes: `.slider-range`, `__label`, `__value`, `__track`, `__range`,
  `__thumb`.
- Row 1: label left, readout right (HStack-like flex, gap tokens).
- Track: bg `--color-surface-dark` (darker than fields, per mock), `--border-sm`
  neon 15 % edge, height token-scaled (`--space-sm`).
- Range (selected): `--color-brand-accent`, segmented look via
  `repeating-linear-gradient` with token spacing — pure CSS, no extra DOM.
- Thumb: `--color-brand-accent` block, slightly taller than the track, radius
  `--rounded-sm`, `--elevation-md` glow on `:focus-visible`/active; hover uses
  `--color-brand-accent-muted`; disabled per family recipe (surface-alt/muted).
- Readout: `--font-family-display` (pixel font per mock), `--font-size-sm`,
  `--color-brand-accent`.
- Tokens only; no raw literals; Radix `[data-disabled]` for state styling.

## Proposed Interface

```ts
/** Props accepted by the `SliderRange` facade. */
export interface SliderRangeProps {
	/** Field name; wires the label and the submitted FormData entry. */
	name: string;
	/** Visible label text. */
	label: string;
	/** Lower bound of the range. @defaultValue 0 */
	min?: number;
	/** Upper bound of the range. @defaultValue 100 */
	max?: number;
	/** Stepping interval (also the visual segment size). @defaultValue 1 */
	step?: number;
	/** Controlled `[min, max]` value. */
	value?: [number, number];
	/** Uncontrolled initial `[min, max]`. @defaultValue [min, max] */
	defaultValue?: [number, number];
	/** Change callback (controlled or uncontrolled usage). */
	onValueChange?: (value: [number, number]) => void;
	/**
	 * Formats the readout; receives the current `[min, max]` tuple.
	 * @defaultValue `([min, max]) => `${min} - ${max}``
	 */
	format?: (value: [number, number]) => ReactNode;
	/** Server-side error message; forces the invalid state. */
	serverError?: string;
	/** Disables both thumbs. @defaultValue false */
	disabled?: boolean;
}
// export const SliderRange: FC<SliderRangeProps>
```

Usage:

```tsx
<Form onSubmit={save}>
	<SliderRange
		name="budget"
		label="Budget"
		min={0}
		max={5000}
		step={100}
		format={([min, max]) => `¥${min} - ¥${max}`}
	/>
</Form>
```

## Testing Strategy

`bun test` + `@testing-library/react`, colocated `SliderRange.test.tsx`:

- Label association and required marker rendering.
- Constraint pass-through: `min`, `max`, `step`, `aria-disabled`/disabled on
  thumbs; two thumbs render.
- `onValueChange` receives `[number, number]` after keyboard interaction
  (`ArrowRight` on a thumb — works in happy-dom).
- Controlled value renders; `format` output appears in the readout (e.g. `¥800 - ¥2500`).
- Standalone renders exactly one `<form>`; inside `Form` exactly one.
- `serverError` → `[data-invalid]` on the field + message rendered.

Note: hidden bubble inputs only exist inside a real form submission context;
assert `Slider.Root` receives `name` (via bubble inputs in the DOM where
possible) — do not fight happy-dom gaps.

## Documentation Updates

- `DESIGN.md`: extend the "Form fields" section with a `SliderRange` row/notes
  (anatomy: label + readout row, segmented range, square thumbs).
- `src/components/form/README.md`: add `SliderRange` to the components table
  and a usage example.
- `src/components/README.md`: no change needed (form/ row already generic).

## Boundaries

- **Always** — colocated tests; tokens-only CSS; JSDoc per `src/AGENTS.md`;
  run `bun test`, `bun run typecheck`, `bun run check` before done.
- **Ask first** — any dependency beyond `@radix-ui/react-slider`; token value
  changes; deviations from the family contract (`FieldBaseProps`).
- **Never** — import `@radix-ui/*` outside `form/`/`ui/`; raw literals in CSS;
  nested `<form>`; use of Radix `unstable_*` slider parts.

## Success Criteria

1. This spec approved by the human.
2. `SliderRange` implements the interface above; `bun run typecheck` clean for
   `src/components/form/`.
3. Colocated tests pass (`bun test`); 19 existing form tests stay green.
4. `bun run check` clean for `src/components/form/`.
5. Visual check vs `references/components/SlideRange.png` at 430 px viewport.
6. Documentation updates merged in the same change.

## Open Questions

- None blocking.
