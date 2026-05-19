"use client"

import { useTranslations } from "next-intl"

import { useRouteEnvelope } from "#components2/route-envelope-context.client"
import { RouteErrorDebugPanel } from "#components2/dev/route-error-debug-panel"
import { RouteErrorRetryButton } from "#components2/route-error/route-error-retry-button"
import { useReportRouteError } from "#components2/route-error/use-report-route-error"
import { Button } from "#components2/ui/button"
import { Link } from "#i18n/navigation"
import { organizationNexusPath } from "#features/nexus"
import {
  resolveErrorBoundaryRetryCallbacks,
  type NextAppErrorPageProps,
} from "#components2/route-error/error-page-props.shared"

export default function OrgIamProfileError(props: NextAppErrorPageProps) {
  const { error } = props
  const t = useTranslations("IamProfileSurface.errors")
  const { retryAction, resetAction } = resolveErrorBoundaryRetryCallbacks(props)
  const envelope = useRouteEnvelope()
  const orgSlug = envelope?.orgSlug
  const segment = orgSlug ? `iam-profile/${orgSlug}` : "org/iam-profile"
  useReportRouteError({ segment, error })

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-lg font-medium text-foreground">{t("loadTitle")}</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {t("loadDescription")}
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-2">
        <RouteErrorRetryButton
          retryAction={retryAction}
          resetAction={resetAction}
        >
          {t("retry")}
        </RouteErrorRetryButton>
        {orgSlug ? (
          <Button variant="outline" asChild>
            <Link href={organizationNexusPath(orgSlug)}>
              {t("openWorkspace")}
            </Link>
          </Button>
        ) : null}
      </div>
      <RouteErrorDebugPanel segment={segment} error={error} />
    </div>
  )
}