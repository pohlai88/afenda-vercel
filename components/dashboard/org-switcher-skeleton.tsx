import { Building2, ChevronsUpDown } from "lucide-react"

/**
 * Placeholder rendered while OrgSwitcherSlot streams in.
 * Geometry matches the OrgSwitcher pill to prevent layout shift.
 * aria-hidden — purely presentational; no interactive role.
 */
export function OrgSwitcherSkeleton() {
  return (
    <div
      aria-hidden
      className="flex h-8 max-w-[200px] items-center gap-1.5 rounded-md px-2 text-muted-foreground/60"
    >
      <Building2 className="size-4 shrink-0" />
      <span className="h-3 w-20 animate-pulse rounded bg-muted" />
      <ChevronsUpDown className="ml-auto size-3.5 shrink-0" />
    </div>
  )
}
