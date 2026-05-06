# Afenda ERP Design System Governance

## Doctrine

**Code is truth. Figma is the visual mirror. CI is the enforcement layer.**

Ship order when evolving the design system:

1. **Code + schemas** (`app/globals.css`, `lib/design-system.ts`, `components/ui`)
2. **Documentation** (`docs/design-system/*`) so Figma has a spec
3. **Local stability** — `pnpm lint`, `pnpm typecheck`, `pnpm build`, and (when enforced) `pnpm format:check`
4. **ERP product work** in `lib/features/` using tokens and primitives
5. **Figma + Code Connect last** — only after the above are stable; Figma mirrors code, it does not lead it

Do not let Figma or docs define variant names that code does not yet implement.

## Scope

This repository uses a shadcn-style primitive layer in `components/ui` and ERP module composition in `lib/features/<module>/components`.

## Source of truth (finalized stack)

| Layer                   | Location                             | Responsibility                                                                                          |
| ----------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| **Semantic tokens**     | `app/globals.css` (`:root`, `.dark`) | OKLCH palette, elevation, motion, density, surface spacing scale, `color-scheme`                        |
| **Tailwind bridge**     | `app/globals.css` (`@theme inline`)  | Maps CSS variables → utilities (`bg-primary`, `p-surface-md`, `shadow-elevation-*`, `gap-density-*`, …) |
| **Primitive contracts** | `lib/design-system.ts`               | Allowlisted radii, elevations, density/surface class strings, Zod parsers, button/badge/card keys       |
| **Primitives**          | `components/ui`                      | CVA variants, `data-slot`, hover/focus behavior                                                         |
| **Drift gate**          | `scripts/check-design-contract.mjs`  | Scans `app/`, `components/`, `hooks/`, `lib/features/`                                                  |

## Non-negotiable rules

- Use semantic color tokens only (no raw palette utilities in `components/ui/*`).
- Reuse `uiRadius`, `uiTracking`, `uiSurfaceElevation`, `uiDensity`, `uiSurfaceInset` / `uiSurfaceSpaceKeys`, and schema guards from `lib/design-system.ts`.
- Prefer solid semantic hovers (`bg-primary-hover`, `bg-secondary-hover`) over opacity-only hover on filled controls (see `components/ui/button.tsx`).
- Keep primitive anatomy discoverable with stable `data-slot` attributes.
- Build ERP patterns in feature modules; do not fork primitives inside modules.

## Token inventory (reference)

Authoritative values are only in `app/globals.css`. Summary for orientation:

- **Radius:** base `--radius` (`0.625rem`); scale in `@theme` (`--radius-sm` … `--radius-4xl`).
- **Surface inset scale:** `--space-surface-xs` … `--space-surface-2xl` → utilities `p-surface-*`, `gap-surface-*`, `px-surface-*`, etc.
- **Stack rhythm:** `--density-comfortable` / `--density-compact` → `gap-density-comfortable`, `gap-density-compact` (aligned with `uiDensity` in `lib/design-system.ts`).
- **Motion:** `--motion-duration-*`, `--motion-ease-*` → `duration-*` / easing utilities where referenced in theme.
- **Interaction:** `@custom-variant hover (&:hover)` — real `:hover`, not coarse-pointer-only.
- **Typography:** Editorial `h1–h4` and `p` live in `@layer base` in `app/globals.css`; component titles use `uiTitle.sm` (matches h3 scale).

## Variant lifecycle

When adding a new variant/size/state:

1. Update primitive CVA (or props) in `components/ui`
2. Update `lib/design-system.ts` type/schema exports (`buttonVariantKeys`, `badgeVariantKeys`, `cardSizeKeys`, `uiSurfaceSpaceKeys`, etc.)
3. Add or update usage in feature components as needed
4. Update `docs/design-system/figma-code-connect-mapping.md` for Figma naming parity
5. Update Figma library properties **after** local stability — same release train as code, never Figma-first

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
- `pnpm format:check` (also enforced in CI)

For visual checks, test dashboard and sign-in flows in both light and dark themes.

## Status — code sync (pre–Figma slice)

**Synchronized for finalization:**

- `app/globals.css` — structured `:root` / `.dark`, `@theme inline` bridge, surface + density tokens, hover variant
- `lib/design-system.ts` — `uiDensity` uses token-backed `gap-density-*`; `uiSurfaceSpaceKeys`, `uiSurfaceInset`, `parseUiSurfaceSpaceKey`
- `docs/design-system/*` — this file, mapping doc, primitive audit, usage examples aligned with the above
- `scripts/check-design-contract.mjs` — scans `app/`, `components/`, `hooks/`, `lib/features/`

**Next (product process):**

- **Figma:** Create/publish `afenda/semantic` (variables light/dark + primitives). Paste the canonical **Figma file URL** into `figma-code-connect-mapping.md`.
- **Code Connect:** After the library is stable and access allows, publish mappings; refresh `primitive-matrix-audit.md`.

**CI:** `format:check` runs in GitHub Actions when enabled in `.github/workflows/ci.yml`.
