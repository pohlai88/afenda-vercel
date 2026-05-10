# Afenda ERP Design System Governance

**Contract anchor:** Product-wide policy for structure, enforcement, and primitives is **[`AGENTS.md`](../../AGENTS.md)** (especially **§4**, **§6**, **§7**). This doc is the design-system playbook and Figma handoff; it must not contradict `AGENTS.md`. **Cursor:** when editing files here, `.cursor/rules/design-system-docs-enforcement.mdc` attaches (single glob, no comma pattern).

## Doctrine

**Code is truth. Figma is the visual mirror. CI is the enforcement layer.**

Naming doctrine: **Primitive + intent + state**. Keep product philosophy in behavior; code-facing names should stay familiar (`card`, `panel`, `dialog`, `toolbar`, `table`) and route through the governed `ui.*` aliases in `#lib/design-system`.

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

| Layer                   | Location                             | Responsibility                                                                                                                                                                                                               |
| ----------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Semantic tokens**     | `app/globals.css` (`:root`, `.dark`) | OKLCH palette, elevation, motion, density, surface spacing scale, `color-scheme`                                                                                                                                             |
| **Tailwind bridge**     | `app/globals.css` (`@theme inline`)  | Maps CSS variables → utilities (`bg-primary`, `p-surface-md`, `shadow-elevation-*`, `gap-density-*`, …)                                                                                                                      |
| **Primitive contracts** | `lib/design-system.ts`               | Preferred `ui.*` aliases, allowlisted radii, elevations, density/surface class strings, Zod parsers, button/badge/card keys                                                                                                  |
| **Primitives**          | `components/ui`                      | CVA variants, `data-slot`, hover/focus behavior                                                                                                                                                                              |
| **Drift gate**          | `scripts/check-design-contract.mjs`  | Scans `app/`, `components/`, `hooks/`, `lib/features/`, `lib/design-system.ts`; `@theme` ↔ `:root`/`.dark` parity; primitive hover/radius/shadow rules; arbitrary spacing rhythm rule (`p-[…]`, `gap-[…]`, `space-[xy]-[…]`) |

## Non-negotiable rules

- Use semantic color tokens only (no raw palette utilities in `components/ui/*`).
- Prefer the `ui.*` aliases from `lib/design-system.ts` for primitive class composition. Legacy exports (`uiRadius`, `uiSurfaceElevation`, `uiDensity`, `uiSurfaceInset`, `uiStatusToneClasses`) remain supported for compatibility and direct parser/schema work.
- On filled primary/secondary controls in `components/ui`, use `bg-primary-hover` / `bg-secondary-hover` — not `hover:bg-primary/…` or `hover:bg-secondary/…` (CI enforces).
- Spacing rhythm (`p-*`, `m*`, `gap-*`, `space-[xy]-*`) must come from the token scale: Tailwind's spacing scale, `p-surface-*` / `gap-surface-*` (`--space-surface-*`), or `gap-density-*` (`--density-*`). Arbitrary literals (`p-[12px]`, `gap-[7px]`) are forbidden; CSS-variable references (`var(--…)` / `--spacing(var(--…))`) remain allowed for primitives that drive spacing dynamically.
- Keep primitive anatomy discoverable with stable `data-slot` attributes.
- Build ERP patterns in feature modules; do not fork primitives inside modules.

## Token inventory (reference)

Authoritative values are only in `app/globals.css`. Summary for orientation:

- **Radius:** base `--radius` (`0.625rem`); scale in `@theme` (`--radius-sm` … `--radius-4xl`).
- **Surface inset scale:** `--space-surface-xs` … `--space-surface-2xl` → utilities `p-surface-*`, `gap-surface-*`, `px-surface-*`, etc.
- **Stack rhythm:** `--density-compact` / `--density-comfortable` / `--density-relaxed` → `gap-density-*` utilities (aligned with `uiDensity` in `lib/design-system.ts`).
- **Motion:** `--motion-duration-*`, `--motion-ease-*` → `duration-*` / easing utilities where referenced in theme.
- **Interaction:** `@custom-variant hover (&:hover)` — real `:hover`, not coarse-pointer-only.
- **Typography:** Editorial `h1–h4` and `p` live in `@layer base` in `app/globals.css`; component titles use `uiTitle.sm` (matches h3 scale).

## Variant lifecycle

When adding a new variant/size/state:

1. Update primitive CVA (or props) in `components/ui`
2. Update `lib/design-system.ts` type/schema exports (`ui`, `uiPrimitiveKeys`, `buttonVariantKeys`, `badgeVariantKeys`, `cardSizeKeys`, `uiSurfaceSpaceKeys`, etc.)
3. Add or update usage in feature components as needed
4. Record Figma / Code Connect naming parity when the team maintains a library — e.g. canonical **Figma file URL** and variant notes in **this file** (below), or **Figma Code Connect** templates colocated with primitives (`*.figma.ts` / `*.figma.js` under `components/ui/` when introduced)
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
- `lib/design-system.ts` — preferred `ui.*` aliases; `uiDensity` uses token-backed `gap-density-*`; `uiSurfaceSpaceKeys`, `uiSurfaceInset`, `parseUiSurfaceSpaceKey`
- `docs/design-system/*` — this file, usage examples aligned with the above
- `scripts/check-design-contract.mjs` — scans `app/`, `components/`, `hooks/`, `lib/features/`, `lib/design-system.ts`; `@theme` variable parity
- `eslint.config.mjs` — `lib/features/**` may not import `radix-ui` / `@radix-ui/*` / `@base-ui/react` (primitives only via `#components/ui/*`)

**Next (product process):**

- **Figma:** Create/publish `afenda/semantic` (variables light/dark + primitives). Paste the canonical **Figma file URL** under **Figma library** below (or in Code Connect repo/docs your team uses).
- **Code Connect:** After the library is stable and access allows, publish mappings; keep variant names and `data-slot` anatomy aligned with shipped primitives (see `.cursor/rules/figma-code-connect-workflow.mdc`).

**CI:** `format:check` runs in GitHub Actions when enabled in `.github/workflows/ci.yml`.

## Figma library (optional anchor)

_Add canonical file URL and short naming notes here when a shared Figma library exists._
