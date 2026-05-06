# Afenda ERP Design System Governance

## Scope

This repository uses a shadcn+luma primitive layer in `components/ui` and ERP module composition in `lib/features/<module>/components`.

## Source of truth

- Tokens: `app/globals.css`
- Primitive API contracts: `lib/design-system.ts`
- Primitive implementations: `components/ui`
- Drift checks: `scripts/check-design-contract.mjs`

## Non-negotiable rules

- Use semantic color tokens only.
- Reuse `uiRadius`, `uiTracking`, and schema guards from `lib/design-system.ts`.
- Keep primitive anatomy discoverable with stable `data-slot` attributes.
- Build ERP patterns in feature modules; do not fork primitives inside modules.

## Variant lifecycle

When adding a new variant/size/state:

1. Update primitive CVA definition
2. Update `lib/design-system.ts` type/schema exports
3. Add or update usage example in feature components
4. Ensure Figma naming parity in `docs/design-system/figma-code-connect-mapping.md`

## Accessibility baseline

- All interactive controls require visible focus styles.
- Invalid form state must use `aria-invalid` + semantic destructive styles.
- Icon-only actions need screen-reader text or `aria-label`.

## ERP composition guidance

Preferred reusable ERP blocks:

- filters toolbar
- stats cards
- bulk actions bar
- empty states
- status badges

Keep them under each module boundary (`lib/features/<module>/components`) and export via module `index.ts`.

## Verification

Before merge:

- `pnpm lint`
- `pnpm typecheck`

For visual checks, test dashboard contacts flows in both light and dark themes.
