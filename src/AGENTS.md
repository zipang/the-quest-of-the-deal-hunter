# TypeScript Rules — `src/`

These rules apply to **every** TypeScript file under `src/`. They define how we
write TypeScript in this project: documentation, function style, naming, and
typing discipline.

React component conventions live in [`src/components/AGENTS.md`](./components/AGENTS.md).
Read that file too when working inside `src/components/`.

## 1. JSDoc is mandatory

- Every **exported** class and function declaration MUST have full formal JSDoc:
  - A one-line description of what it does.
  - `@param` for every parameter, with a short usage indication.
  - `@defaultValue` for every optional parameter that has one.
  - An `@example` (or an equivalent usage note) showing how to call it.
- Private functions, helpers, and internal closures may use lightweight JSDoc:
  a one-line description plus per-param notes when useful.
- Object parameters: see §3 — the interface carries most of the weight, but the
  `@param` tag must still reference it with a usage hint.

```ts
/**
 * Formats a price as a localized currency string.
 * Use it everywhere a deal price is displayed.
 *
 * @param amount - Price in the smallest currency unit (e.g. cents).
 * @param currency - ISO 4217 code shown to the user.
 * @param locale - BCP 47 locale used for formatting.
 * @returns The formatted price string.
 * @example
 * formatPrice(1099, "EUR", "fr-FR") // "10,99 €"
 */
const formatPrice = (
  amount: number,
  currency = "EUR",
  locale = "fr-FR",
): string =>
  new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    amount / 100,
  );
```

## 2. Arrow functions only

- Define every function with arrow syntax: `() => {}`. The `function` keyword
  is forbidden.
- Narrow exceptions are allowed only where arrows cannot exist (e.g. generator
  functions). Document the reason with a short comment if you ever need one.
- Because arrows are not hoisted, order declarations so that a symbol exists
  before its first use at module evaluation time. Declaration order flexibility
  is acceptable — no need to contort code, but do not rely on hoisting.

Components follow the same rule via `React.FC` (see
[`src/components/AGENTS.md`](./components/AGENTS.md)).

## 3. Interfaces for object parameters

- When a parameter is an object, do NOT inline its shape in the signature.
  Create a named `interface` (or `type` alias) and use it.
- Name parameter-object interfaces after their role: `<Thing>Params`,
  `<Thing>Options`, `<Thing>Props` (for components).

```ts
/** Options accepted by the quest loader. */
interface LoadQuestsOptions {
  /** Only load quests started after this timestamp. */
  startedAfter?: Date;
  /** Maximum number of quests returned. */
  limit?: number;
}

/**
 * Loads quests from localStorage.
 *
 * @param options - Filters and limits applied to the stored quests.
 * @defaultValue `limit` is 20; all quests are loaded without filters.
 */
const loadQuests = (options: LoadQuestsOptions = {}): Quest[] => {
  /* ... */
};
```

## 4. Naming

- Choose variable names that read well at the call site and make the content of
  the variable obvious. The name is documentation; re-read your line aloud.
- Keep consistent suffixes/prefixes across similar elements:
  - DOM elements end with `Elt`: `headerElt`, `formElt`.
  - In a loop or as a generic parameter, a single element may simply be `elt`.
  - React components are `PascalCase`; everything else is `camelCase`;
    types/interfaces use `PascalCase`.
- Reuse the exact same name for the same concept across files (a "quest" is
  always `quest`, never sometimes `q`, `mission`, or `item`).

## 5. Comments and control flow

- Leave an empty line before every non-obvious loop or conditional, and add a
  comment explaining *why* the branch or iteration exists, so control flow is
  obvious when scanning:

```ts
const rewards = deals.filter((deal) => deal.isClaimed);

// Skip already-claimed rewards: they would inflate progress twice.
if (claimedSeen.has(reward.id)) {
  continue;
}
```

- Obvious one-liners (`deals.map((deal) => deal.price)`) stay uncommented.
- The comment explains intent, never restates the syntax.

## 6. Typing discipline

- No `any`. Use `unknown` plus narrowing when the runtime type is unclear.
- Let TypeScript infer obvious return types; annotate exported functions' return
  types explicitly so the public API stays honest.
- Never suppress the compiler with `@ts-ignore` unless you also write a comment
  explaining why it is safe.
