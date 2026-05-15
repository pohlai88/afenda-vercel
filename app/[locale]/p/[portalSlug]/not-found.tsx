export default function PortalNotFound() {
  return (
    <div className="rounded-md border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Portal not found</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        The portal is unavailable or your account does not have access.
      </p>
    </div>
  )
}
