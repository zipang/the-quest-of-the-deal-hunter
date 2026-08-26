# React Component Rules — `src/components/`

These rules apply to every React component under `src/components/`.
The TypeScript rules in [`../AGENTS.md`](../AGENTS.md) apply here too and are
not repeated — read that file first.

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
