"use client"

import { useTranslations } from "next-intl"

import { RouteErrorDebugPanel } from "#components2/dev/route-error-debug-panel"
import {
  RouteErrorActions,
  RouteErrorDigest,
  RouteErrorShell,
} from "#components2/route-error/route-error-primitives"
import { RouteErrorRetryButton } from "#components2/route-error/route-error-retry-button"
import { Button } from "#components2/ui/button"
import { Link } from "#i18n/navigation"
import { useReportRouteError } from "#components2/route-error/use-report-route-error"
import {
  resolveErrorBoundaryRetryCallbacks,
  type NextAppErrorPageProps,
} from "#components2/route-error/error-page-props.shared"

/**
 * Auth-shell error boundary — sign-in / sign-up / verify / reset flows.
 * Falls back to a clean recovery surface when an auth form/page errors out.
 */
export default function AuthError(props: NextAppErrorPageProps) {
  const t = useTranslations("AuthShell")
  const { error } = props
  const { retryAction, resetAction } = resolveErrorBoundaryRetryCallbacks(props)
  const segment = "auth"
  useReportRouteError({ segment, error })

  return (
    <RouteErrorShell variant="auth">
      <h1 className="text-2xl font-semibold text-foreground">
        {t("errorTitle")}
      </h1>
      <p className="text-sm text-muted-foreground">{t("errorDescription")}</p>
      <RouteErrorDigest digest={error.digest} />
      <RouteErrorActions>
        <RouteErrorRetryButton
          retryAction={retryAction}
          resetAction={resetAction}
        >
          {t("retry")}
        </RouteErrorRetryButton>
        <Button variant="outline" asChild>
          <Link href="/sign-in">{t("backToSignIn")}</Link>
        </Button>
      </RouteErrorActions>
      <RouteErrorDebugPanel segment={segment} error={error} />
    </RouteErrorShell>
  )
}
