---
name: Afenda utility icon (Lucide)
overview: "Replace raster ERP avatar chip with a compact Lucide glyph for the Nexus/Console identity control. No Apple HIG pipeline—only a generic, sharp-at-small-size mark that reads cleanly inside the existing 33px circular trigger."
todos:
  - id: pick-glyph
    content: "Use Lucide **`UserRound`** (~18–20px inside the 33px ring) for Nexus + Console identity triggers"
    status: completed
  - id: wire-nexus-console
    content: "Swap `next/image` + `ERP_UTILITY_AVATAR_PNG` for `<LucideIcon className=\"size-[…] text-muted-foreground\" />` in `nexus-control-menu.tsx` and `console-control-menu.tsx`; keep full-bleed circular button + focus styles"
    status: pending
  - id: cleanup-constants
    content: "Remove `ERP_UTILITY_AVATAR_PNG` from `lib/site.ts` if unused; keep `public/erp-icon/avatar.png` or delete only if nothing references it (grep)"
    status: pending
  - id: verify-gates
    content: "`pnpm typecheck && pnpm lint` after edits"
    status: pending
---

# Afenda utility icon — Lucide, not Apple

## Scope revision (per product intent)

- **Not** Apple App Store icon compliance, Icon Composer, or `.appiconset` pipelines.
- **Afenda**: small **generic identity chip** in the L1 utility bar (Nexus + Console control menus).
- **Implementation preference**: **Lucide** SVG — crisp at small sizes, no raster scaling, aligns with existing shell patterns (`lucide-react` already in Nexus chrome).

## Design constraints

- **Geometry**: Keep current **33px** circular trigger; icon visually centered with **no faux padding** (flex stretch already used — inner content becomes a centered SVG).
- **Semantics**: Menu opens account/org/sign-out — locked choice: **`UserRound`** (per selection); avoid noisy multi-path icons.
- **Tokens**: Use **`text-muted-foreground`** (or `text-foreground` if contrast fails in dark mode) — no raw hex; matches design-system discipline.

## Files to touch (when executing)

- [`components/nexus/nexus-control-menu.tsx`](components/nexus/nexus-control-menu.tsx) — replace `Image` + fill layout with Lucide.
- [`components/console/console-control-menu.tsx`](components/console/console-control-menu.tsx) — same for parity.
- [`lib/site.ts`](lib/site.ts) — drop `ERP_UTILITY_AVATAR_PNG` if nothing else imports it.
- Optional: remove unused asset [`public/erp-icon/avatar.png`](public/erp-icon/avatar.png) after grep confirms no references.

## Out of scope

- Master **1024×1024** marketing icons, Xcode catalogs, GitHub icon-generator CLIs (unless you later ship native apps).

## Reference (historical)

Earlier note about [Apple HIG app icons](https://developer.apple.com/design/human-interface-guidelines/app-icons) was **context only** (“compatible” ≈ reads OK in a rounded iOS-like control). **Afenda does not adopt Apple’s icon delivery pipeline** for this UI affordance.
