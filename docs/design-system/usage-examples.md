# Afenda Design System Usage Examples

Practical usage patterns for the most-used primitives and ERP compositions.

Preferred naming follows **Primitive + intent + state**. Use normal primitive words from `#lib/design-system` (`ui.radius.card`, `ui.padding.card`, `ui.tone.warning`) instead of inventing product-specific visual nouns.

## Buttons

Use semantic variants and sizes from `components/ui/button.tsx`. Default size uses token-backed padding (`py-surface-xs`, `px-3.5`) and solid hover fills (`bg-primary-hover`).

```tsx
import { Button } from "#components/ui/button"

<Button>Save</Button>
<Button variant="outline">Cancel</Button>
<Button variant="destructive">Delete</Button>
<Button size="sm">Small action</Button>
```

## Badge status tones

Use semantic status variants instead of hardcoded color classes.

```tsx
import { Badge } from "#components/ui/badge"

<Badge>Default</Badge>
<Badge variant="success">Paid</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="info">Draft</Badge>
<Badge variant="critical">Overdue</Badge>
```

## Form controls

```tsx
import { Input } from "#components/ui/input"
import { Textarea } from "#components/ui/textarea"
import { Label } from "#components/ui/label"

<Label htmlFor="contact-name">Name</Label>
<Input id="contact-name" name="name" />

<Label htmlFor="contact-note">Note</Label>
<Textarea id="contact-note" name="note" />
```

## Density (stack rhythm)

Use `ui.gap` for vertical/horizontal gaps that must track the density tokens in `app/globals.css`:

```tsx
import { cn } from "#lib/utils"
import { ui } from "#lib/design-system"

export function StackedFields({ compact }: { compact?: boolean }) {
  const density = compact ? ui.gap.compact : ui.gap.comfortable
  return <div className={cn("flex flex-col", density)}>{/* fields */}</div>
}
```

For a roomier reading surface, use `ui.gap.relaxed`.

## Surface inset scale

Prefer `p-surface-*` / `px-surface-*` / `gap-surface-*` over magic `p-4` / `p-6` for cards, panels, and scaffolds. Optional: use literals from `lib/design-system.ts`:

```tsx
import { cn } from "#lib/utils"
import { ui } from "#lib/design-system"
;<section className={cn("border border-border bg-card", ui.padding.normal)}>
  {/* compact panel = 1rem inset */}
</section>
```

Parse untrusted layout keys from CMS/API:

```tsx
import { parseUiSurfaceSpaceKey } from "#lib/design-system"

const key = parseUiSurfaceSpaceKey(payload.inset) // "xs" | "sm" | … | "2xl"
```

## Table density

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table"
;<Table density="compact">
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>{/* rows */}</TableBody>
</Table>
```

## Familiar UI aliases

Use the `ui` object when composing primitive-adjacent classes directly:

```tsx
import { cn } from "#lib/utils"
import { ui } from "#lib/design-system"
;<article
  className={cn(
    "border border-border bg-card text-card-foreground",
    ui.radius.card,
    ui.padding.card,
    ui.elevation.card
  )}
>
  <span className={cn(ui.radius.chip, ui.tone.warning, "px-2 py-1 text-xs")}>
    Needs review
  </span>
</article>
```

## Post-login app shell composition

Post-login ERP chrome — covering workbench URLs (`/{locale}/o/{orgSlug}/apps/*`), org admin, IAM profile, and platform admin — lives under **`#app-shell`** (`components2/app-shell/`). The shell exposes `AppShell`, `AppSubLayout`, the utility bar, primary left rail, command layer, and dock. Lynx summon lives in the Nexus field (`components2/nexus/`) and mounts inside the shell via the `enableLynxSummon` prop. Do not recreate utility bar / command / dock in feature modules — compose inside the route tree mounted under [`app/[locale]/o/[orgSlug]/layout.tsx`](../../app/[locale]/o/[orgSlug]/layout.tsx).

```tsx
import { AppShell, buildAppShellOrgUtilityBarSlots } from "#app-shell"
// Feature routes render as children; utility bar + palette + Lynx mount inside AppShell.
```

The retired `WorkbenchShell` / `WorkbenchUtilityBar` symbols and the `#components/workbench/*` import path no longer exist — see ADR-0005 (canonical post-login shell unification) and `.cursor/rules/never-restore-deleted-components.mdc`.

## Contacts ERP composition examples

Use module compositions from `lib/features/contacts/components`.

- `ContactsFiltersToolbar` for query/mode filtering
- `ContactsStatCards` for key metrics
- `ContactsBulkActions` for selected-row actions
- `ContactsEmptyState` for first-time or empty datasets
- `ContactsListPanel` as composed list screen building block

## Rule of thumb

- Prefer `#components/ui/*` primitives first
- Keep feature-specific composition in `lib/features/<module>/components`
- Avoid hardcoded palette colors in primitives; use semantic tokens from `app/globals.css`
- Prefer `ui.*` aliases for direct class composition; legacy `uiRadius` / `uiSurfaceInset` exports remain supported
- Editorial headings: use semantic `h1–h4` (globals `@layer base`); in-card titles: `uiTitle.sm` from `#lib/design-system`
