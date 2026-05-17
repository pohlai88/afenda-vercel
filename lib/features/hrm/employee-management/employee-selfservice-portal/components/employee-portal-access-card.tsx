"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"
import { ExternalLink, Loader2 } from "lucide-react"

import type { Route } from "next"

import { Link } from "#i18n/navigation"
import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Badge } from "#components2/ui/badge"
import { Button } from "#components2/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import {
  grantEmployeePortalAccessAction,
  revokeEmployeePortalAccessAction,
  type EmployeePortalAccessFormState,
} from "#features/hrm/client"
import { employeePortalPath } from "#lib/portal"

import type { EmployeePortalAccessSnapshot } from "../data/employee-portal-access.shared"

type EmployeePortalAccessCardProps = {
  orgSlug: string
  employeeId: string
  linkedUserId: string | null
  archived: boolean
  access: EmployeePortalAccessSnapshot
}

export function EmployeePortalAccessCard({
  orgSlug,
  employeeId,
  linkedUserId,
  archived,
  access,
}: EmployeePortalAccessCardProps) {
  const t = useTranslations("Dashboard.Hrm.workforce.employeePortal")
  const [grantState, grantAction, grantPending] = useActionState<
    EmployeePortalAccessFormState | undefined,
    FormData
  >(grantEmployeePortalAccessAction, undefined)
  const [revokeState, revokeAction, revokePending] = useActionState<
    EmployeePortalAccessFormState | undefined,
    FormData
  >(revokeEmployeePortalAccessAction, undefined)

  const revokedByAction = revokeState?.ok && revokeState.status === "revoked"
  const active =
    !revokedByAction &&
    (access.accessStatus === "active" ||
      Boolean(grantState?.ok && grantState.status === "active"))
  const revoked =
    revokedByAction || (access.accessStatus === "revoked" && !active)
  const portalSlug =
    access.portalSlug ??
    (grantState?.ok && grantState.status === "active"
      ? grantState.portalSlug
      : null)
  const portalHref =
    portalSlug && !revoked
      ? (employeePortalPath(portalSlug, "leave") as Route)
      : null
  const error =
    grantState && !grantState.ok
      ? (grantState.errors.form ?? grantState.errors.employeeId)
      : revokeState && !revokeState.ok
        ? (revokeState.errors.form ?? revokeState.errors.employeeId)
        : null
  const success =
    grantState?.ok && grantState.status === "active"
      ? t("grantSuccess")
      : revokeState?.ok && revokeState.status === "revoked"
        ? t("revokeSuccess")
        : null

  return (
    <Card id="employee-portal-access" size="sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <PortalAccessStatusBadge active={active} revoked={revoked} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!linkedUserId ? (
          <Alert>
            <AlertTitle>{t("linkedUserRequiredTitle")}</AlertTitle>
            <AlertDescription>{t("linkedUserRequired")}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>{t("errorTitle")}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {success ? (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}

        {portalHref ? (
          <Button asChild variant="outline" size="sm" className="self-start">
            <Link href={portalHref}>
              <ExternalLink
                className="size-4"
                data-icon="inline-start"
                aria-hidden
              />
              {t("openPortal")}
            </Link>
          </Button>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <form action={grantAction}>
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <input type="hidden" name="employeeId" value={employeeId} />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={!linkedUserId || archived || grantPending || active}
            >
              {grantPending ? (
                <>
                  <Loader2
                    className="size-4 animate-spin"
                    data-icon="inline-start"
                    aria-hidden
                  />
                  {t("granting")}
                </>
              ) : (
                t("grant")
              )}
            </Button>
          </form>

          <form action={revokeAction}>
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <input type="hidden" name="employeeId" value={employeeId} />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={archived || revokePending || !active}
            >
              {revokePending ? (
                <>
                  <Loader2
                    className="size-4 animate-spin"
                    data-icon="inline-start"
                    aria-hidden
                  />
                  {t("revoking")}
                </>
              ) : (
                t("revoke")
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}

function PortalAccessStatusBadge({
  active,
  revoked,
}: {
  active: boolean
  revoked: boolean
}) {
  const t = useTranslations("Dashboard.Hrm.workforce.employeePortal")
  if (active) {
    return <Badge variant="outline">{t("statusActive")}</Badge>
  }
  if (revoked) {
    return <Badge variant="secondary">{t("statusRevoked")}</Badge>
  }
  return <Badge variant="secondary">{t("statusNotGranted")}</Badge>
}
