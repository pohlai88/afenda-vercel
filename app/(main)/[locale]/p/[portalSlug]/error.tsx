"use client"

import { useTranslations } from "next-intl"

import { useRouteEnvelope } from "#components2/route-envelope-context.client"
import { RouteErrorDebugPanel } from "#components2/dev/route-error-debug-panel"
import {
  RouteErrorActions,
  RouteErrorDigest,
  RouteErrorShell,
} from "#components2/route-error/route-error-primitives"
import { RouteErrorRetryButton } from "#components2/route-error/route-error-retry-button"
import { useReportRouteError } from "#components2/route-error/use-report-route-error"
import {
  resolveErrorBoundaryRetryCallbacks,
  type NextAppErrorPageProps,
} from "#components2/route-error/error-page-props.shared"

/**
 * Portal-tier error boundary — keeps PortalShell mounted while content recovers.
 */
export default function PortalError(props: NextAppErrorPageProps) {
  const t = useTranslations("Portal.Root")
  const { error } = props
  const { retryAction, resetAction } = resolveErrorBoundaryRetryCallbacks(props)
  const envelope = useRouteEnvelope()
  const segment = envelope?.portalSlug
    ? `portal/${envelope.portalSlug}`
    : "portal"
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
          {t("errorRetry")}
        </RouteErrorRetryButton>
      </RouteErrorActions>
      <RouteErrorDebugPanel segment={segment} error={error} />
    </RouteErrorShell>
  )
}
