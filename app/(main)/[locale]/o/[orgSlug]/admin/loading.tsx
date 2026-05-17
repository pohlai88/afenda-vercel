import { Spinner } from "#components2/ui/spinner"

export default function OrgAdminLoading() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center gap-3 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Spinner className="size-6" />
      <span className="text-sm">Loading admin…</span>
    </div>
  )
}
