# Implementation Plan: Component Foundation (layout / base / ui)

## Overview

Build the component foundation of the SPA inside `src/components/`, organized by the
agreed Atomic-Design-like tiers: `layout/` (structural primitives: VStack, HStack,
Grid), `base/` (app-agnostic atoms: Button, TextField, Card) and `ui/` (app
molecules: PageHeader, PageBody, PageFooter). All components are styled with pure,
colocated CSS consuming only design tokens from `src/styles/theme.css`. Just-in-time
inventory: this seed set only; more components land when screens need them.

## Architecture Decisions

- **Directory tiers express hierarchy**: `layout/` → `base/` → `ui/` → `pages/`.
  No `organisms/`; routed screens live in `pages/` and are out of scope here.
- **Spacing props accept token names only** (`"xs" | "sm" | "md" | "base" | "lg" |
  "xl" | "xxl" | "none"`), mapped to `var(--space-*)`. Raw CSS values are rejected —
  keeps DESIGN.md / theme.css authoritative.
- **Semantic `as` prop with allowlist**: layout elements accept any meaningful block
  HTML element (`div, section, article, aside, header, footer, nav, main, ul, ol,
  form, figure, fieldset`). Inline/void/list-item-only tags (`span, a, i, b, hr,
  img, br, li, p…`) are deliberately excluded via the type — a layout container must
  be a grouping element. The allowlist is one shared type used by all three layout
  components.
- **No Radix yet**: Button, TextField and Card need no behavior primitives. Radix
  wrappers (Dialog, Select…) come later per-screen.
- **One stylesheet per component**, colocated (`Button.tsx` + `Button.css`),
  imported by the component module itself.

## Task List

### Phase 1: Shared foundation

- [ ] **Task 1: Spacing type system + token mapper**
  Create `src/components/utils/spacing.ts` (reusable beyond layout, per the utils-location rule): `SpaceToken` union, `SpacingProps`
  (margin/padding + all side variants), `GapProps`, and helpers
  (`spaceVar(t)` returning `0` or `var(--space-${t})`,
  `buildSpacingStyle(props): CSSProperties`).

  **Acceptance criteria:**
  - [ ] Every prop value is a compile-time-checked `SpaceToken`.
  - [ ] `buildSpacingStyle({ margin: "md", paddingTop: "xl" })` produces
        `{ margin: "var(--space-md)", paddingTop: "var(--space-xl)" }`.
  - [ ] `"none"` maps to literal `0`.

  **Verification:** focused unit test; `bun run check`; `bun run typecheck`.
  **Dependencies:** None. **Files:** `layout/spacing.ts`, spacing test.
  **Scope:** Small.

### Phase 2: Layout primitives (vertical slice — layout usable end-to-end)

- [ ] **Task 2: Semantic element allowlist**
  Create `src/components/utils/tag.ts` (reusable beyond layout): `LayoutTag` union
  (`"div" | "section" | "article" | "aside" | "header" | "footer" | "nav" | "main" |
  "ul" | "ol" | "form" | "figure" | "fieldset"`). Export nothing else; the union is
  the enforcement — TS rejects `span`, `a`, `i`, `b`, `hr`, etc. at call sites.

  **Acceptance criteria:**
  - [ ] `as="span"` on any layout component fails to typecheck.
  - [ ] `as="section"` typechecks and renders the real tag.
  - [ ] Default remains `"div"`.

  **Verification:** type-level test (expect-error snippet); `bun run typecheck`.
  **Dependencies:** None. **Files:** `layout/tag.ts`.
  **Scope:** Small.

- [ ] **Task 3: VStack & HStack** *(APPROVED API — implemented)*
  Flex containers: `VStack.tsx/.css`, `HStack.tsx/.css` sharing a common stack
  stylesheet approach. Props = `SpacingProps & GapProps & StackBaseProps`
  (`children`, `wrap`, `inline`) plus a shared `as?: LayoutTag`. Alignment uses
  **intuitive axis-explicit keywords instead of CSS `align/justify`**:
  - HStack: `stackItems?: "left" | "right" | "center" | "justify"` (row flow,
    default `"left"`), `alignItems?: "top" | "bottom" | "center" | "baseline"`
    (across the row, default `"center"`).
  - VStack: `stackItems?: "top" | "bottom" | "center" | "justify"` (column
    flow, default `"top"`), `alignItems?: "left" | "right" | "center"`
    (across the column, default unset/left).
  `gap` defaults to `"base"`; placement keywords are mapped to CSS internally.

  **Acceptance criteria:**
  - [ ] Rendered element is `<as> display:flex; flex-direction:column|row`.
  - [ ] All spacing/gap props emit `var(--space-*)` references only.
  - [ ] No raw literals in the `.css` files beyond token `var()` usage.

  **Verification:** unit test (tag, class, style output); `bun run check`.
  **Dependencies:** Tasks 1–2. **Files:** 4 new + test. **Scope:** Medium.

- [x] **Task 4: Grid** *(implemented — columns + templates + dev warning; `minChildWidth` postponed until width tokens exist)*
  `Grid.tsx/.css` on top of Tasks 1–2: SimpleGrid mode (`columns?: number`,
  `minChildWidth?: string`) plus escape hatches (`templateColumns`, `templateRows`,
  `autoRows`), gap overrides (`rowGap`, `columnGap`), `SpacingProps`, `as?`.
  Runtime dev-warning when both SimpleGrid mode and template are given.

  **Acceptance criteria:**
  - [ ] `columns={3}` renders `grid-template-columns: repeat(3, 1fr)`.
  - [ ] `minChildWidth="10rem"` renders `repeat(auto-fit, minmax(10rem, 1fr))`.
  - [ ] `rowGap`/`columnGap` override `gap`.
  - [ ] Mixing SimpleGrid mode + template logs a console warning in dev.

  **Verification:** unit tests for each mode; `bun run check`.
  **Dependencies:** Tasks 1–2. **Files:** 2 new + test. **Scope:** Medium.

- [ ] **Checkpoint A** — layout complete
  - [ ] All layout tests pass; `bun run check` && `bun run typecheck` clean.
  - [ ] Demo composition temporarily rendered from `App.tsx`, reviewed visually
        (Stacks and Grid of Cards on dark arcade theme), then reverted before commit.
  - [ ] Human review of layout DX before proceeding.

### Phase 3: base atoms

- [ ] **Task 5: Button**
  `base/Button.tsx/.css`. Native `<button>`; props extend
  `React.ButtonHTMLAttributes<HTMLButtonElement>` adding `variant?:
  "primary" | "secondary" | "danger" | "ghost"`, `size?: "sm" | "md" | "lg"`,
  `fullWidth?: boolean`. States use `-muted`/`-active` derived variants;
  focus ring per DESIGN.md (neon green, `--border-md`).

  **Acceptance criteria:**
  - [ ] All variants/sizes styled from tokens; hover/focus/disabled states defined.
  - [ ] No raw color literals in `Button.css`.
  - [ ] Typecheck: passes native button attributes through (`type`, `onClick`, …).

  **Verification:** unit test (variant classes); visual via App demo; checks clean.
  **Dependencies:** Phase 1 patterns established (no code dependency).
  **Files:** 2 + test. **Scope:** Small.

- [ ] **Task 6: TextField**
  `base/TextField.tsx/.css`. Label + input + optional `hint`/`error`; error state
  colors action-danger token; props extend input attributes minus `size`.

  **Acceptance criteria:**
  - [ ] Controlled and uncontrolled usage work (plain attribute pass-through).
  - [ ] `error` shows danger border + message tied to input via `aria-describedby`.
  - [ ] Label linked via generated/id (`id` overridable).

  **Verification:** unit test; accessibility assertions; checks clean.
  **Dependencies:** none. **Files:** 2 + test. **Scope:** Small-Medium.

- [ ] **Task 7: Card**
  `base/Card.tsx/.css`. Surface panel: `elevation?: "sm" | "md" | "lg"`,
  `variant?: "solid" | "outlined"` (outlined uses the rgba recipe from
  DESIGN.md § Borders; recipe lives in Card.css only — no new global tokens).

  **Acceptance criteria:**
  - [ ] Solid uses `--color-surface-card`; outlined uses documented recipe.
  - [ ] Rounded via `--rounded-*`; elevation via `--elevation-*`.

  **Verification:** unit test; checks clean.
  **Dependencies:** none. **Files:** 2 + test. **Scope:** Small.

- [ ] **Checkpoint B** — base atoms complete; visual review with human.

### Phase 4: ui molecules

- [ ] **Task 8: PageHeader**
  `ui/PageHeader.tsx/.css`. Display-font title (`--font-family-display`),
  optional `onBack` (button using base/Button ghost variant), optional right
  `action` slot. Composes HStack for the row.

  **Acceptance criteria:**
  - [ ] Composed from layout/base components, not raw divs (where sensible).
  - [ ] Back button wired only when `onBack` provided.

  **Dependencies:** Tasks 3, 5. **Files:** 2 + test. **Scope:** Small.

- [ ] **Task 9: PageBody & PageFooter**
  PageBody: scrollable main region with token page padding; PageFooter: bottom bar
  (`--border-sm` top edge recipe) hosting actions. Both simple div-classed sections.

  **Acceptance criteria:**
  - [ ] Together with PageHeader they compose a full screen shell:
        header fixed top, body scrolls, footer sticks at bottom.
  - [ ] Shell demo verified in browser at mobile viewport (390×844).

  **Dependencies:** Tasks 3, 5, 7. **Files:** 4 + test. **Scope:** Medium.

- [ ] **Checkpoint C** — final
  - [ ] Full `bun run check` + `bun run typecheck` green.
  - [ ] Screen-shell demo reviewed by human; then all tasks committed
        (one commit per phase, per repo convention, human confirms messages).

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Token gaps discovered (e.g. missing focus ring token) | Low | Document recipe in component CSS per DESIGN.md rule; propose new tokens separately if truly needed |
| Allowlist too restrictive later | Low | Union is additive; widen it without breaking anything |
| PageHeader/Footer over-build | Med | Keep strictly to prototype needs; revisit per screen |

## Open Questions

1. `line-height`/typography presets — leave fully to consumers, or expose heading
   atoms later? (Assumed: consumers.)
2. Commit granularity: one commit per phase (recommended) vs per task?
