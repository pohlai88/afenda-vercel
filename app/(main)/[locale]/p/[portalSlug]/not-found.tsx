import { getTranslations } from "next-intl/server"

export default async function PortalNotFound() {
  const t = await getTranslations("Portal.Root")

  return (
    <div className="rounded-md border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">{t("notFoundTitle")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t("notFoundDescription")}
      </p>
    </div>
  )
}
