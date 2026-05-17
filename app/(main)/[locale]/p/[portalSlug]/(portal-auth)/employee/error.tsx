"use client"

import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"

import { useRouteEnvelope } from "#components/route-envelope-context"
import { RouteErrorDebugPanel } from "#components/dev/route-error-debug-panel"
import {
  RouteErrorActions,
  RouteErrorDigest,
  RouteErrorShell,
} from "#components/route-error-primitives"
import { RouteErrorRetryButton } from "#components/route-error-retry-button"
import { useReportRouteError } from "#components/use-report-route-error"
import { Button } from "#components/ui/button"
import { Link } from "#i18n/navigation"
import { employeePortalPath } from "#lib/portal"
import {
  resolveErrorBoundaryRetryCallbacks,
  type NextAppErrorPageProps,
} from "#lib/next-app-error-page-props.shared"

/**
 * Employee portal segment error — PortalShell stays mounted; recovery stays in
 * self-service context.
 */
export default function EmployeePortalError(props: NextAppErrorPageProps) {
  const t = useTranslations("Portal.Employee")
  const { error } = props
  const { retryAction, resetAction } = resolveErrorBoundaryRetryCallbacks(props)
  const envelope = useRouteEnvelope()
  const params = useParams<{ portalSlug?: string | string[] }>()
  const portalSlugParam = params?.portalSlug
  const portalSlug =
    typeof portalSlugParam === "string"
      ? portalSlugParam
      : Array.isArray(portalSlugParam)
        ? portalSlugParam[0]
        : envelope?.portalSlug

  const segment = portalSlug
    ? `portal/${portalSlug}/employee`
    : "portal/employee"
  useReportRouteError({ segment, error })

  return (
    <RouteErrorShell variant="embedded">
      <h1 className="text-2xl font-semibold text-foreground">
        {t("errorTitle")}
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {t("errorDescription")}
      </p>
      <RouteErrorDigest digest={error.digest} />
      <RouteErrorActions>
        <RouteErrorRetryButton
          retryAction={retryAction}
          resetAction={resetAction}
        >
          {t("retry")}
        </RouteErrorRetryButton>
        {portalSlug ? (
          <Button asChild variant="outline" size="sm">
            <Link
              href={employeePortalPath(portalSlug, "leave")}
              prefetch={false}
            >
              {t("backToLeave")}
            </Link>
          </Button>
        ) : null}
      </RouteErrorActions>
      <RouteErrorDebugPanel segment={segment} error={error} />
    </RouteErrorShell>
  )
}
