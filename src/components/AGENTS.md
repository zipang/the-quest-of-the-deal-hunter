# React Component Rules — `src/components/`

These rules apply to every React component under `src/components/`.
The TypeScript rules in [`../AGENTS.md`](../AGENTS.md) apply here too and are
not repeated — read that file first.

## 0. Where does this component belong to?

Tiers follow Atomic Design (full map in [`README.md`](./README.md)):

- `layout/` — app-agnostic structural **atoms** (VStack, HStack, Grid)
- `base/` — **typography primitives** enforcing the Design System: `Heading`,
  `Text`. They exist so that raw text tags are never used directly.
- `ui/` — **molecules**: every reusable styled control — Radix-backed
  (Dialog, Select…) as well as advanced HTML composites with ARIA wiring
  (Button, TextField, Card…)
- `app/` — **app-specific compositions** expressing product concepts
  (PageLayout/PageHeader/PageBody/PageFooter live here)
- `pages/` — routed screens

**There is no `base/` tier for re-declaring HTML behavior.** Pure HTML elements
are never redeclared — except typography: `h1`–`h6`, `p`, and other text tags
MUST NOT be used directly in pages or components. Use `base/Heading` and
`base/Text` exclusively; the Design System typography is enforced there.
Structural styling goes to `layout/`, anything with real behavior (ARIA,
variants, states) is a molecule → `ui/`.

**Before creating any component, place it by asking what it *is*, not where it
is used.** A component named after a product concept (`Page*`, `Deal*`,
`Quest*`) NEVER goes into `layout/` or `ui/`. Dependencies only flow downward:
`layout ← ui ← app ← pages`.

## 1. Components are APIs

A component's signature is a public API. Apply good API design: simple,
predictable, self-documented.

- One props interface per component, named `<Component>Props`.
- Type the component with `React.FC<Props>` (a great helper for binding the
  props interface to the component) and destructure the props in the signature:
```tsx
export interface DealCardProps {
  /** The deal displayed by the card. */
  deal: Deal;
  /** Visual emphasis of the card. @defaultValue "normal" */
  variant?: "normal" | "highlighted";
}

/** Renders one deal as a tappable card. Used inside quest lists. */
export const DealCard: React.FC<DealCardProps> = ({ deal, variant = "normal" }) => (
  <article className="deal-card deal-card--highlighted">{/* ... */}</article>
);
```

- Document every prop with JSDoc (exported components get full formal JSDoc on
  the const itself; props get a comment each).
- Optional props must declare a sensible default value.

## 2. File and folder layout

- One component per file; the file name matches the component name
  (`DealCard.tsx` exports `DealCard`).
- Respect the tier placement from §0 (details in [`README.md`](./README.md)).
- **The stylesheet MUST be the last import of a `.tsx` component file** —
  colocated CSS comes after all code imports so the component's own styles
  override anything they interact with, and the visual dependency is stated
  last.
- **One test file per source file.** `VStack.tsx` is tested by `VStack.test.tsx`
  and nothing else; never group tests of several sources into one shared test
  file.
- **Tests must not be trivial.** Every test asserts observable behavior that
  would fail if the implementation regressed (rendered tag/class, computed
  style, wiring between props and output). Tests that only restate the type
  system or assert constants add noise, not safety.
- Radix primitives are re-exposed as our own styled library under
  `src/components/ui/`, one stylesheet per component. Feature components import
  from `ui/`, never directly from `@radix-ui/*`.
- Reusable custom hooks live in `src/hooks/`, one hook per file, named
  `useThing.ts`. They follow the same JSDoc rules as exported functions.

## 3. Styling

- Pure CSS files only; no Tailwind, no inline style objects except truly dynamic
  values.
- Never write raw color literals. Use CSS variables from the Design System
  (`src/styles/theme.css`) — read the `design-system-tokens` skill before any
  styling work.
- Component states use the derived `-muted` / `-active` variants defined in
  `src/styles/color-variants.css`.

## 4. Hooks discipline

- Respect the Rules of Hooks: unconditional order, top level only.
- **Minimal memoization:** do not add `useMemo` / `useCallback` unless there is
  a measured need or an obvious referential-identity requirement. Comment why
  when you use them.
- **State discipline:**
  - Never store derived values in state — compute them during render.
  - Colocate state close to where it is used; lift it only when shared.
- Effects (`useEffect`) exist to synchronize with external systems, never to
  derive render output.

## 5. Mobile-first and local-first

- Every screen-level component is designed for a phone viewport first; test at
  small widths before large ones.
- No backend calls, no auth assumptions. Data comes from localStorage modules;
  device capabilities (camera, geolocation) are accessed through their dedicated
  modules.
