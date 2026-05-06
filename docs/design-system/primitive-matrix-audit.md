# Primitive Matrix Audit

Audit target from upgrade plan:

- button
- input
- select
- textarea
- badge
- card
- dialog
- table
- sidebar
- tooltip

## Matrix criteria

- variant contract consistency
- size contract consistency
- slot naming via `data-slot`
- focus/invalid state consistency
- semantic color token usage

## Current audit snapshot

| Primitive | Variant/Size | Slots | Focus/Invalid | Semantic tokens | Notes |
| --- | --- | --- | --- | --- | --- |
| button | pass | pass | pass | pass | Uses `uiRadius` + `uiTracking` |
| input | pass | pass | pass | pass | Consistent invalid states |
| select | pass | pass | pass | pass | Uses semantic background/foreground tokens |
| textarea | pass | pass | pass | pass | Matches input focus/invalid behavior |
| badge | pass | pass | pass | pass | Includes status variants (`success`, `warning`, `info`, `critical`) |
| card | pass | pass | pass | pass | Uses surface radii and title contract |
| dialog | pass | pass | pass | pass | Overlay/content follow token contract |
| table | pass | pass | pass | pass | Added `density` support (`comfortable`/`compact`) |
| sidebar | pass | pass | pass | pass | Comprehensive slot model + semantic tokens |
| tooltip | pass | pass | pass | pass | Aligned to shared radius/tracking |

## Remaining plan-related blocker

- Browser validation for authenticated dashboard flows remains partially blocked by sign-in requirement in local runtime.
- Code Connect execution remains blocked by Figma Developer seat permissions (deferred by request).
