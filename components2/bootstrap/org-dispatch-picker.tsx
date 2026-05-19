import { AfendaBrandLockup } from "#components2/afenda-brand"
import { Button } from "#components2/ui/button"
import { switchActiveOrgAction } from "#features/org-admin/client"

export type OrgDispatchPickerOrg = {
  id: string
  name: string
  role: string
}

export function OrgDispatchPicker({
  orgs,
  labels,
}: {
  orgs: readonly OrgDispatchPickerOrg[]
  labels: {
    subtitle: string
    orgsLabel: string
    open: string
  }
}) {
  return (
    <div className="flex flex-1 flex-col items-center px-4 py-16">
      <div className="w-full max-w-xl space-y-10">
        <div className="space-y-2">
          <AfendaBrandLockup className="h-8 w-auto" />
          <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
        </div>
        <section aria-label={labels.orgsLabel}>
          <h1 className="mb-4 text-lg font-semibold">{labels.orgsLabel}</h1>
          <ul className="space-y-3">
            {orgs.map((org) => (
              <li
                key={org.id}
                className="flex items-center justify-between rounded-xl border border-border/80 bg-card px-5 py-4 shadow-elevation-1"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{org.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                    {org.role}
                  </p>
                </div>
                <form action={switchActiveOrgAction.bind(null, org.id)}>
                  <Button type="submit" variant="outline" size="sm">
                    {labels.open}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
