import { requirePortalContext } from "#lib/portal/server"
import { employeePortalPath } from "#lib/portal"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { redirect } from "next/navigation"

type PortalHomePageProps = {
  params: Promise<{ locale: string; portalSlug: string }>
}

export default async function PortalHomePage({ params }: PortalHomePageProps) {
  const { locale: rawLocale, portalSlug } = await params
  const locale = ensureAppLocale(rawLocale)
  const context = await requirePortalContext(portalSlug)

  if (context.portalAudience === "employee" && context.subjectId) {
    redirect(
      toLocalePath(locale, employeePortalPath(context.portalSlug, "leave"))
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Portal access</p>
        <h2 className="mt-2 text-xl font-semibold">
          {context.portalDisplayName}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Your account has active access to this {context.portalAudience}{" "}
          portal. Portal services will appear here when they are enabled for
          this audience.
        </p>
      </section>

      <section className="rounded-md border border-border p-6">
        <h3 className="text-base font-semibold">Available services</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No services are enabled for this portal yet.
        </p>
      </section>
    </div>
  )
}
