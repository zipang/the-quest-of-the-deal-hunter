# Spec: Form Components Facade (`src/components/form/`)

Status: **DRAFT — awaiting human review.**

## Objective

Create the form-component family of the Design System: a thin, simple facade over
Radix UI's [Form primitive](https://www.radix-ui.com/primitives/docs/components/form)
that renders complete, accessible fields (label + control + validation messages) in
one tag each, styled exclusively from Design System tokens (see `DESIGN.md`).

This first increment delivers `Form`, `TextField` and `NumberField`. The facade
contract defined here applies to all future field components (`CheckboxField`,
`SelectField`, `RadioGroupField`, …), which will live in the same directory.

Visual reference: `references/components/InputField.png` and
`references/components/NumberInputField.png`.

### User stories

- As an app developer I write `<TextField name="email" label="Email" required />`
  and get a fully styled, labelled, validation-wired input.
- As an app developer I compose several fields inside a single `<Form>` and get
  one `<form>` element with native constraint validation and focus management.
- As an app developer I use each field standalone (no `Form`) and it still works.

## Tech Stack

| Concern     | Choice                                   |
| ----------- | ---------------------------------------- |
| Runtime     | Bun (`bun install`, `bun test`, `bun run`) |
| Framework   | React 19                                 |
| Primitives  | `@radix-ui/react-form` (new dependency)  |
| Styling     | Pure colocated CSS, token variables only |
| Test        | `bun test` + `@testing-library/react`    |
| Lint/format | Biome (`bun run check`)                  |

## Commands

```sh
bun install @radix-ui/react-form   # add dependency
bun run dev                        # manual visual check
bun test                           # run component tests
bun run typecheck                  # tsc --noEmit
bun run check                      # biome lint + format check
```

## Project Structure

```
src/components/form/
├── README.md            ← directory purpose + facade rules (short)
├── Form.tsx             ← <form> wrapper + "inside a form" context provider
├── TextField.tsx        ← text/email/password/… field facade
├── TextField.css        ← colocated styles (.text-field)
├── NumberField.tsx      ← numeric field facade (number | undefined semantics)
├── NumberField.css      ← colocated styles (.number-field)
├── utils/
│   ├── utils/field-context.ts ← internal React context flagging a parent Form
│   └── utils/field-types.ts   ← shared facade types (FieldBaseProps, ValidationMessages)
├── Form.test.tsx
├── TextField.test.tsx
└── NumberField.test.tsx
```

Imports flow downward only: `pages → app → form / ui / base → layout`. Feature
components never import `@radix-ui/*` directly — only `src/components/form/` (and
`ui/`) may.

## Architecture Decisions

### AD1 — Root detection via our own context

`Form.Root` renders a real `<form>` element; forms cannot nest. A field that always
rendered its own `Root` would break multi-field forms and submit semantics.

- `Form` renders `Form.Root` **and** provides `field-context`'s
  `FormContext = true`.
- Each field reads the context: inside a `Form` it renders only
  `Form.Field` + parts; standalone it wraps itself in its own `Form.Root`.
- Result: zero boilerplate single-tag usage **and** correct composition.

### AD2 — Native constraint validation, Radix message matching

Validation rules are expressed with the standard HTML attributes (`required`,
`minLength`, `maxLength`, `pattern`, `min`, `max`, `step`, `type="email"`…) passed
through to the control. Radix maps them to `ValidityState` matches; the facade
renders styled `Form.Message` elements for the common matches. Custom messages come
from a `validationMessages` prop; unspecified matches fall back to Radix's defaults.

Server-side errors are supported with `serverError?: string` →
`Form.Field serverInvalid` + `Form.Message forceMatch`.

### AD3 — Value semantics, Radix naming

Uncontrolled by default (`defaultValue`); opt-in controlled with
`value` + `onValueChange`:

- `TextField`: `value?: string`, `onValueChange?(value: string)`.
- `NumberField`: `value?: number`, `onValueChange?(value: number | undefined)` —
  an empty or unparseable field yields `undefined`; consumers never parse strings.
  Internally the control keeps a string buffer; conversion happens at the boundary.

### AD4 — Styling contract

- Class naming: component name in kebab-case (`.text-field`), elements with
  `__element` suffixes (`.text-field__label`, `__control`, `__message`).
- States come from Radix data attributes (`[data-invalid]`, `[data-valid]`) plus
  `:hover`, `:focus-visible`, `:disabled`, `:user-invalid`.
- Colors/borders/elevation only via `var(--*)` tokens; the 15 % neon resting edge
  is expressed as `color-mix(in srgb, var(--color-brand-accent) 15%, transparent)`
  — no raw literals (per `DESIGN.md` Don'ts).
- `NumberField` hides the native spinner (`appearance: none` on
  `::-webkit-outer/inner-spin-button`, `appearance: textfield`); the Figma ring on
  the right is **not** reproduced as an active control (decision from the earlier
  interview: no +/− buttons, native `type="number"` behavior, CSS-only focus/error
  ring). The right-aligned ring element from the Figma is dropped for now.

## Proposed Interfaces

Shared (`utils/field-types.ts`):

```ts
/** ValidityState matches the facade renders messages for by default. */
export type ValidationMatch =
	| "valueMissing"
	| "typeMismatch"
	| "patternMismatch"
	| "tooShort"
	| "tooLong"
	| "rangeUnderflow"
	| "rangeOverflow"
	| "stepMismatch";

/** Props shared by every field of the form family. */
export interface FieldBaseProps {
	/** Field name; also wires label/control accessibility. */
	name: string;
	/** Visible label text. */
	label: string;
	/** Server-side error message; forces the invalid state. */
	serverError?: string;
	/** Custom texts overriding Radix's default validation messages. */
	validationMessages?: Partial<Record<ValidationMatch, string>>;
	/** Disables the control. @defaultValue false */
	disabled?: boolean;
}
```

`TextField.tsx`:

```ts
/** Text-like input types accepted by TextField (no date/number/file). */
export type TextFieldType = "text" | "email" | "password" | "search" | "tel" | "url";

export interface TextFieldProps extends FieldBaseProps {
	/** Input type. @defaultValue "text" */
	type?: TextFieldType;
	/** Controlled value. */
	value?: string;
	/** Uncontrolled initial value. @defaultValue "" */
	defaultValue?: string;
	/** Change callback (controlled usage). */
	onValueChange?: (value: string) => void;
	/** Placeholder text. */
	placeholder?: string;
	/** Makes the field mandatory (native constraint). @defaultValue false */
	required?: boolean;
	/** Minimum length (native constraint). */
	minLength?: number;
	/** Maximum length (native constraint). */
	maxLength?: number;
	/** Pattern the value must match (native constraint). */
	pattern?: string;
	/** Native autocomplete hint. */
	autoComplete?: string;
}
// export const TextField: FC<TextFieldProps>
```

`NumberField.tsx`:

```ts
export interface NumberFieldProps extends FieldBaseProps {
	/** Controlled numeric value; `undefined` = empty field. */
	value?: number;
	/** Uncontrolled initial value. @defaultValue undefined */
	defaultValue?: number;
	/** Change callback; empty/unparseable input yields `undefined`. */
	onValueChange?: (value: number | undefined) => void;
	/** Placeholder text. @defaultValue "0" */
	placeholder?: string;
	/** Makes the field mandatory (native constraint). @defaultValue false */
	required?: boolean;
	/** Minimum value (native constraint). */
	min?: number;
	/** Maximum value (native constraint). */
	max?: number;
	/** Increment/decrement step (native constraint). */
	step?: number;
	/**
	 * Maximum number of decimal places allowed. Values reported through
	 * `onValueChange` are rounded to this precision, and `step` defaults to
	 * `10 ** -decimals` when `step` itself is not provided.
	 * @defaultValue 0 (integers only)
	 */
	decimals?: number;
}
// export const NumberField: FC<NumberFieldProps>
```

`Form.tsx`:

```ts
export interface FormProps {
	/** Submit handler; only fires when client validation passes. */
	onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
	/** Resets server errors (see Radix docs). */
	onClearServerErrors?: () => void;
	children: ReactNode;
}
// export const Form: FC<FormProps>
```

Usage examples:

```tsx
// Standalone
<TextField name="title" label="Item" required placeholder="Nikon F3…" />

// Composed
<Form onSubmit={save}>
	<TextField name="title" label="Item" required />
	<NumberField name="budget" label="Budget" min={0} step={100} placeholder="In ¥" />
</Form>
```

## Styling Recipe (from the Figma exports + DESIGN.md)

Anatomy (both fields): label row → control → message row.

| Part / state           | Recipe                                                                    |
| ---------------------- | ------------------------------------------------------------------------- |
| Label                  | VT323, `--font-size-sm`, `--font-weight-medium`, `--color-text`; required marker `*` in `--color-action-danger` (rendered from `required`) |
| Control resting        | bg `--color-surface-card`, border `--border-sm` `color-mix(accent 15%)`, radius `--rounded-base`, padding `--space-sm --space-md`, text `--color-text`, placeholder `--color-text-muted` |
| Control hover          | border `color-mix(var(--color-brand-accent-muted) 40%)`                   |
| Control focus-visible  | border `--border-md` `--color-brand-accent` + `box-shadow: var(--elevation-md)` |
| Control invalid        | border `--border-md` `--color-action-danger` (via `[data-invalid]`)       |
| Control disabled       | bg `--color-surface-alt`, text/border `--color-text-muted`, shadow none   |
| (removed)             | No hint prop; `placeholder` covers helper text                             |
| Validation message     | `--font-size-xs`, `--color-action-danger`                                 |
| Number control         | same recipe; native spinner hidden; `inputMode="numeric"`                 |

## Testing Strategy

Framework: `bun test` + `@testing-library/react` (happy-dom), colocated
`*.test.tsx`. Behavior-focused assertions:

- TextField/NumberField: label–control association (`getByLabelText`),
  constraint attributes reach the input (`required`, `min`, `pattern`…),
  `validationMessages`/`serverError` render styled messages,
  controlled round-trip (`onValueChange` receives `string` / `number | undefined`),
  standalone renders exactly one `<form>`.
- `Form`: N fields inside one Form render exactly **one** `<form>`;
  submit fires only after native validity passes (happy-dom supports
  `checkValidity`); context prevents nested `<form>` elements.

## Documentation Updates

- `DESIGN.md`:
  - Fix the Components intro: stylesheets are **colocated** next to components
    (not `src/styles/components/`); UI primitives live in `src/components/ui/`,
    form fields in `src/components/form/`.
  - Borders section: express the default edge as a `color-mix()` of
    `--color-brand-accent` so component CSS can stay literal-free.
  - New `### Form fields` subsection documenting the facade contract, anatomy and
    the state recipe table above.
- `src/components/README.md`: add the `form/` row to the tier map and placement
  decision table.
- New `src/components/form/README.md`: short directory guide + usage examples.

## Boundaries

- **Always** — colocated tests per component; tokens only in CSS; JSDoc per rules
  in `src/AGENTS.md`; run `bun test`, `bun run typecheck`, `bun run check` before
  declaring done.
- **Ask first** — adding Radix packages other than `@radix-ui/react-form`;
  changing token values; deviating from the shared `FieldBaseProps` contract.
- **Never** — import `@radix-ui/*` outside `form/`/`ui/`; raw color/spacing
  literals in component CSS; nested `<form>` elements; Tailwind.

## Success Criteria

1. `tasks/spec-form-components.md` reviewed and approved (this document).
2. The three components implement the proposed interfaces above; `bun run
   typecheck` passes.
3. All colocated tests pass (`bun test`); Form composition renders exactly one
   `<form>` element for any number of fields.
4. `bun run check` reports no lint/format issues.
5. Visual check against `InputField.png` / `NumberInputField.png` states (default,
   hover, focus, filled, disabled, error) in the running app.
6. Documentation updates listed above are merged in the same change.

## Open Questions

- None blocking. Deferred by decision: the decorative stepper ring of
  `NumberInputField.png` (revisit if native spinners prove insufficient on mobile).
