export default function PortalLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-card p-6">
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="mt-4 h-7 w-64 rounded bg-muted" />
        <div className="mt-5 h-4 w-full max-w-2xl rounded bg-muted" />
        <div className="mt-2 h-4 w-3/4 max-w-xl rounded bg-muted" />
      </div>
      <div className="rounded-md border border-border p-6">
        <div className="h-5 w-40 rounded bg-muted" />
        <div className="mt-4 h-4 w-72 rounded bg-muted" />
      </div>
    </div>
  )
}
