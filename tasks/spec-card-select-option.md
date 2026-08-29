# Spec: Card + SelectOption (`src/components/ui/` + `src/components/form/`)

Status: **DRAFT — awaiting human review.**
Intent interview: confirmed 2026-08-28 (see `tasks/plan.md` for the restate).

Visual references: `references/components/Card.png` (Card states × theme colors),
`references/components/SelectOption.png` (category picker using Cards as options).

## Objective

Add two components to the Design System:

1. **`Card`** (`ui/`) — a presentational container styled per the theme: a
   surface block with a 1 px colored edge; when `selected`, the edge goes full
   width accent and the background gets a subtle tint of the same color.
   Supports one accent color per instance so lists like the category picker can
   give each option its own color.
2. **`SelectOption`** (`form/`) — a single-selection form field in the existing
   Radix-form facade family. There is **no native `<select>`**: the field renders
   an ARIA `radiogroup` of clickable options. The consumer supplies the visual
   for each option through a `renderOption(value, { selected })` callback —
   typically returning a `Card`. `SelectOption` owns selection state, ARIA
   semantics, keyboard navigation, and form participation.

### User stories

- As an app developer I write `<Card color="brand-secondary">…</Card>` and get a
  themed surface block; adding `selected` highlights it without extra CSS.
- As an app developer I write a category picker as
  `<SelectOption name="category" label="Category" options={["electronics", …]}
  renderOption={(v, { selected }) => <Card color={colors[v]} selected={selected}>…</Card>} />`
  and get a fully accessible, keyboard-navigable, form-wired single-select group.
- As with every field, `SelectOption` works standalone (own `Form.Root`) or
  composed inside `Form`.

## Tech Stack

| Concern    | Choice                                       |
| ---------- | -------------------------------------------- |
| Runtime    | Bun (`bun install`, `bun test`, `bun run`)   |
| Framework  | React 19                                     |
| Primitives | `@radix-ui/react-form` (existing) — **no new dependency**; radiogroup ARIA is hand-rolled |
| Styling    | Pure colocated CSS, token variables only     |
| Test       | `bun test` + `@testing-library/react`        |
| Lint       | Biome (`bun run check`)                      |

## Commands

```sh
bun run dev        # manual visual check
bun test           # component tests
bun run typecheck  # tsc --noEmit
bun run check      # biome lint + format
```

## Project Structure

```
src/components/ui/
├── Card.tsx           ← presentational card, color + selected props
├── Card.css           ← colocated styles (.card)
└── Card.test.tsx
src/components/form/
├── SelectOption.tsx   ← radiogroup field facade (.select-option)
├── SelectOption.css
└── SelectOption.test.tsx
```

Imports flow downward only: `form → ui` is allowed (`SelectOption` docs may
reference `Card`; the field itself does not depend on it).

## Code Style

Follows `src/AGENTS.md` (arrows, JSDoc, `FC<Props>`) and
`src/components/AGENTS.md` (one file per component, colocated CSS + tests,
kebab-case class names, tokens only). Example:

```tsx
export interface CardProps {
	/** Accent color token driving the card edge and selected tint. @default "brand-accent" */
	color?: CardColor;
	/** Highlights the card with a full accent edge and tinted background. @default false */
	selected?: boolean;
	/** Card content. */
	children: ReactNode;
}
export const Card: FC<CardProps> = ({ color = "brand-accent", selected = false, children }) => (
	<div className={`card${selected ? " card--selected" : ""}`} data-color={color}>
		{children}
	</div>
);
```

## Architecture Decisions

### AD1 — Card colors map to the seven base action/brand tokens

`CardColor = "brand-primary" | "brand-accent" | "brand-secondary" | "action-success" | "action-info" | "action-warning" | "action-danger"`.
Each maps to `data-color` on the root; CSS resolves `var(--color-<name>)`,
`-muted` / `-active` variants from `src/styles/color-variants.css`, and
`color-mix()` for the selected tint (no literals, per DESIGN.md).

### AD2 — SelectOption is a hand-rolled ARIA radiogroup

No `role="listbox"` trickery and no native `<select>`: container
`role="radiogroup"` + `aria-labelledby` the label; each option is
`role="radio"`, `aria-checked`, roving `tabindex` (selected option tabbable;
arrow keys move selection, Space/Enter select). Rationale confirmed in the
interview: options are always visible, single selection, full styling freedom.

### AD3 — Facade contract reuse

`SelectOptionProps extends FieldBaseProps` (`name`, `label`, `serverError`,
`validationMessages`, `disabled`) and follows the family value naming:
`value?: string` / `defaultValue?: string` / `onValueChange?(value: string)`.
Standalone → own `Form.Root`; inside `Form` → reuse parent (existing
`useInsideForm` context). Form participation: Radix `Form.Field` wraps the
group; selection is submitted via a hidden input carrying `name=value`
(hand-rolled, since there is no native control). `required` renders the danger
marker and blocks submit with an empty value via the hidden input's
constraint.

### AD4 — Rendering is delegated: `renderOption`

```ts
options: string[];
renderOption: (value: string, state: { selected: boolean }) => ReactNode;
```

`SelectOption` renders the radiogroup chrome and wires click/focus/ARIA onto
each option wrapper; the returned node is the option's visual. This keeps
`Card` completely decoupled — the consumer chooses any node.

## Interfaces

`Card.tsx` — see Code Style snippet.

`SelectOption.tsx`:

```ts
export interface SelectOptionProps extends FieldBaseProps {
	/** Option values, in display order. */
	options: string[];
	/** Renders the visual of one option; `selected` drives highlight styling. */
	renderOption: (value: string, state: { selected: boolean }) => ReactNode;
	/** Controlled selected value. */
	value?: string;
	/** Uncontrolled initial value. @defaultValue "" (nothing selected) */
	defaultValue?: string;
	/** Change callback with the newly selected value. */
	onValueChange?: (value: string) => void;
	/** Makes the field mandatory. @defaultValue false */
	required?: boolean;
}
// export const SelectOption: FC<SelectOptionProps>
```

Usage:

```tsx
<SelectOption
	name="category"
	label="Category"
	options={["electronics", "cameras", "clothes", "figurines"]}
	renderOption={(value, { selected }) => (
		<Card color={COLORS[value]} selected={selected}>
			<Text>{EMOJI[value]} {value.toUpperCase()}</Text>
		</Card>
	)}
/>
```

## Styling Recipe

Card (matches `Card.png`):

| State    | Recipe                                                                                                    |
| -------- | --------------------------------------------------------------------------------------------------------- |
| Resting  | bg `--color-surface-card`, `--border-sm` `color-mix(var(--color-<name>) 15%, transparent)`, radius `--rounded-base`, padding `--space-md` |
| Hover    | edge `color-mix(var(--color-<name>-muted) 40%, transparent)`                                              |
| Selected | bg `color-mix(var(--color-<name>) 15%, var(--color-surface-card))`, `--border-md` `var(--color-<name>)`, `--elevation-md` glow |
| Disabled | bg `--color-surface-alt`, muted edge/text, no shadow                                                      |

SelectOption: label row identical to other fields (`--font-size-sm`,
uppercase, danger `*` when required); options laid out in a 2-column grid
(`--space-sm` gap; single column under ~360 px). Option wrapper gets
`:focus-visible` ring per the shared recipe; `aria-checked` drives the
`selected` flag handed to `renderOption`.

## Testing Strategy

`bun test`, colocated, behavior-focused:

- Card: renders `.card` with `data-color`; `selected` toggles `card--selected`.
- SelectOption: role=radiogroup + labelled by the label; N `role="radio"` with
  `aria-checked` reflecting `value`/`defaultValue`; click selects and fires
  `onValueChange`; arrow keys move selection; standalone renders exactly one
  `<form>` and composed N fields render one; hidden input carries
  `name`/value; `required` blocks submit when empty.

## Boundaries

- **Always** — tokens-only CSS, colocated tests, full JSDoc, run
  `bun test` + `bun run typecheck` + `bun run check` before done.
- **Ask first** — new dependencies (none expected); new color tokens; changes
  to `FieldBaseProps`.
- **Never** — native `<select>` inside SelectOption; raw color literals in CSS;
  imports bypassing `ui/` for Radix; nested `<form>`.

## Success Criteria

1. This spec approved.
2. `Card` and `SelectOption` implement the interfaces above; typecheck passes.
3. All colocated tests pass; `bun run check` clean.
4. Visual review at 430 px vs `Card.png` / `SelectOption.png` (resting,
   selected, focus, disabled).
5. Docs updated: `DESIGN.md` (Card section + Form fields entry),
   `src/components/form/README.md` (table row + example).

## Open Questions

- None blocking. `Card.png` shows more color chips than the seven token
  families; we scope to the seven base tokens (AD1) — extra chips map later if
  new tokens are added to the theme.
