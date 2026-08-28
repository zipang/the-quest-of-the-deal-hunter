# Implementation Plan: Form Components Facade (`src/components/form/`)

Spec: `tasks/spec-form-components.md` (approved — FormRoot renamed `Form`; shared
utils live in `form/utils/`). Supersedes the "Component Foundation" plan in git
history; its remaining `ui/Button` task is intentionally out of scope here.

## Architecture Decisions (summary)

- AD1: `Form` renders Radix `Form.Root` and provides an internal context; fields
  render their own `Form.Root` only when standalone — never nested `<form>`.
- AD2: native constraint-validation attributes pass through; Radix `Form.Message`
  `match` renders styled messages; `validationMessages` overrides; `serverError`
  → `Form.Field serverInvalid` + `Form.Message forceMatch`.
- AD3: Radix value naming; `NumberField.onValueChange(value: number | undefined)`.
- AD4: colocated CSS, kebab-case classes, tokens only, `color-mix()` neon edges.

## Task List

- [ ] **Task 0: Dependency + utils**
  `bun install @radix-ui/react-form`. Create `form/utils/field-types.ts`
  (`ValidationMatch`, `FieldBaseProps`) and `form/utils/field-context.ts`
  (`FormContext` context + `useInsideForm()` hook).

  Verify: `bun run typecheck`. Files: 2 new + package.json. Scope: Small.

- [ ] **Task 1: `Form.tsx`**
  Wraps `Form.Root`, provides `FormContext`. Props: `onSubmit`,
  `onClearServerErrors`, `children`. Test: renders one `<form>`; children inside.

  Verify: `bun test Form.test`. Files: 1 + test. Scope: Small.

- [ ] **Task 2: `TextField.tsx/.css`**
  Facade per spec interface; standalone `Form.Root` when no parent context;
  messages for default matches; hint; serverError. Styles per spec recipe table.

  Verify: `bun test TextField.test`; `bun run dev` visual vs `InputField.png`.
  Files: 2 + test. Scope: Medium.

- [ ] **Task 3: `NumberField.tsx/.css`**
  Same shell, `type="number"`, spinner hidden, `number | undefined` semantics,
  min/max/step, placeholder "0". Shares `.text-field` base recipe via its own
  `.number-field` classes.

  Verify: `bun test NumberField.test`; visual vs `NumberInputField.png`.
  Files: 2 + test. Scope: Medium.

- [ ] **Task 4: Documentation + checkpoint**
  Update `DESIGN.md` (colocated CSS intro, `color-mix` border recipe, Form fields
  section), `src/components/README.md` (form/ tier row), add
  `src/components/form/README.md`. Full `bun test`, `bun run typecheck`,
  `bun run check` green; human visual review.

  Scope: Small.

## Risks

| Risk | Mitigation |
|------|------------|
| happy-dom constraint-validation gaps in tests | Assert attributes/state directly instead of relying on full submit validation |
| Radix default message texts too generic | `validationMessages` prop documented from day one |
| Context import cycles | `field-context.ts` has zero component imports |
