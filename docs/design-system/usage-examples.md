# Afenda Design System Usage Examples

Practical usage patterns for the most-used primitives and ERP compositions.

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

Use `uiDensity` for vertical/horizontal gaps that must track `--density-comfortable` / `--density-compact` in `app/globals.css`:

```tsx
import { cn } from "#lib/utils"
import { uiDensity } from "#lib/design-system"

export function StackedFields({ compact }: { compact?: boolean }) {
  const density = compact ? uiDensity.compact : uiDensity.comfortable
  return <div className={cn("flex flex-col", density)}>{/* fields */}</div>
}
```

## Surface inset scale

Prefer `p-surface-*` / `px-surface-*` / `gap-surface-*` over magic `p-4` / `p-6` for cards, sections, and scaffolds. Optional: use literals from `lib/design-system.ts`:

```tsx
import { cn } from "#lib/utils"
import { uiSurfaceInset } from "#lib/design-system"

;<section className={cn("border border-border bg-card", uiSurfaceInset.md)}>
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

## Dashboard composition

Use shared dashboard compositions rather than rebuilding shell/layout.

```tsx
import { DashboardTopBar } from "#components/dashboard/top-bar"
import { DashboardModuleNav } from "#components/dashboard/module-nav"
```

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
- Editorial headings: use semantic `h1–h4` (globals `@layer base`); in-card titles: `uiTitle.sm` from `#lib/design-system`
