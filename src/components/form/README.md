# `src/components/form/` — Form-field family

Self-contained facades over Radix UI's
[`@radix-ui/react-form`](https://www.radix-ui.com/primitives/docs/components/form).
One component renders a complete field — label (with required marker), control,
validation messages — in a single tag, styled only from Design System tokens
(see `DESIGN.md → Form fields` for the visual contract).

## Components

| Component   | Purpose                                                    |
| ----------- | ---------------------------------------------------------- |
| `Form`      | The single `<form>` element; marks children as "inside a form" |
| `TextField` | Text-like input (`text/email/password/search/tel/url`)     |
| `NumberField` | Numeric input; `onValueChange(number \| undefined)`, `decimals` support |
| `SliderRange` | Dual-thumb `[min, max]` range picker (Radix Slider); `format` callback for the readout |

Future fields (`CheckboxField`, `SelectField`, `RadioGroupField`, …) follow the
same contract: shared props from `utils/field-types.ts`, standalone/composed
root detection from `utils/field-context.ts`.

## Usage

```tsx
// Standalone — the field renders its own <form> element.
<TextField name="title" label="Item" required placeholder="Nikon F3…" />

// Composed — one <form>, native constraint validation, no nested forms.
<Form onSubmit={save}>
	<TextField name="title" label="Item" required />
	<NumberField name="budget" label="Budget" min={0} step={100} />
	<SliderRange
		name="priceRange"
		label="Price range"
		min={0}
		max={5000}
		step={100}
		format={([min, max]) => `¥${min} - ¥${max}`}
	/>
</Form>
```

## Rules

- Validation comes from native constraint attributes; Radix renders matched
  messages. Override texts via `validationMessages`, force server errors via
  `serverError`.
- Radix value naming: `value` / `defaultValue` / `onValueChange`.
- Only this directory (and `ui/`) may import `@radix-ui/*`.
- Styles are colocated (`*.css`), class names repeat the component name in
  kebab-case, colors/spacing use `var(--*)` tokens only.
