# Plan — T0009 Sprite background removal

Spec: `roadmap/T0009/spec.md`

## Components & dependencies
1. **`tools/background-removal.ts`** (new, standalone) — pure pixel logic:
   corner sampling → background color clustering → automatic tolerance →
   border flood-fill → `undo()` closure. Depends only on DOM canvas APIs.
2. **Generate tab wiring** — button in `sprite-manager.html` savebar; click
   handler in `sprite-manager-app.ts`: apply to `genDown` master, re-derive
   renditions, enable undo. Depends on 1.

## Implementation order
1 → 2 (strictly sequential; wiring is trivial once the utility exists).

## Risks & mitigations
- *Corner sampling misreads when the sprite fills a corner* → cluster only
  corners that are mutually near-equal; if too few agree, flood-fill uses the
  single most common corner color with a wider tolerance.
- *Flood-fill leaks into sprite through anti-aliased edge gradients* →
  tolerance derived from the corner spread, not a hardcoded constant; leak
  worst-case is fixed by undo + regeneration.
- *Checker tones beyond 2* → clustering handles N tones via near-equality
  chaining.

## Parallel work
None — three small sequential tasks.

## Verification checkpoints
- Only the final task is verified: manual UI check with a checker-prone model
  (live debugging in a real browser — the feature needs a real canvas element,
  no unit tests); delete any test sprite. Typecheck (`bunx tsc --noEmit`)
  runs once, before committing.
