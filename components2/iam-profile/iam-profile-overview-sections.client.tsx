"use client"

import type { Route } from "next"
import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"

import { Link } from "#i18n/navigation"
import { Button } from "#components2/ui/button"
import { sendVerificationEmailAction } from "#features/iam-profile/client"

import { IamProfileContextBand } from "./iam-profile-context-band"
import { IamProfileDangerPanels } from "./iam-profile-danger-panels.client"
import {
  IamProfileMembershipPanels,
  type IamProfileMembershipOrgRow,
} from "./iam-profile-membership-panels.client"

export function IamProfileOverviewNextSection({
  emailVerified,
  sessionCount,
  activeOrgName,
  identityHref,
  securityHref,
  nexusHref,
}: {
  emailVerified: boolean
  sessionCount: number
  activeOrgName: string | null
  identityHref: Route
  securityHref: Route
  nexusHref: Route
}) {
  const tSurface = useTranslations("IamProfileSurface")
  const t = useTranslations("IamProfileSurface.overview.next")
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const sessionLabel =
    sessionCount > 1 ? t("reviewSessions") : t("confirmSessions")

  return (
    <IamProfileContextBand label={tSurface("overview.nextLabel")}>
      <ul className="space-y-2 text-sm leading-6 text-foreground">
        {!emailVerified ? (
          <li className="pl-4 -indent-4">
            <span>{t("verifyEmail")} </span>
            <Button
              type="button"
              variant="link"
              className="h-auto px-1"
              disabled={pending}
              onClick={() => {
                setErr(null)
                setMsg(null)
                startTransition(() => {
                  void sendVerificationEmailAction().then((result) => {
                    if (!result.ok) {
                      setErr(result.error)
                      return
                    }
                    setMsg(t("verifyEmailSent"))
                  })
                })
              }}
            >
              {t("verifyEmailAction")}
            </Button>
          </li>
        ) : null}
        <li className="pl-4 -indent-4">
          <Link href={securityHref} className="underline">
            {sessionLabel}
          </Link>
        </li>
        <li className="pl-4 -indent-4">
          <Link href={identityHref} className="underline">
            {t("updateDisplayName")}
          </Link>
        </li>
        <li className="pl-4 -indent-4">
          {activeOrgName ? (
            <Link href={nexusHref} className="underline">
              {t("returnWorkspace", { workspace: activeOrgName })}
            </Link>
          ) : (
            <Link href={nexusHref} className="underline">
              {t("openWorkspace")}
            </Link>
          )}
        </li>
      </ul>
      {err ? (
        <p className="text-sm text-destructive" role="alert">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="text-sm text-muted-foreground" role="status">
          {msg}
        </p>
      ) : null}
    </IamProfileContextBand>
  )
}

export function IamProfileOverviewMembershipSection({
  organizations,
}: {
  organizations: IamProfileMembershipOrgRow[]
}) {
  const t = useTranslations("IamProfileSurface")
  return (
    <IamProfileContextBand label={t("membership.sectionLabel")}>
      <IamProfileMembershipPanels organizations={organizations} />
    </IamProfileContextBand>
  )
}

export function IamProfileOverviewDangerSection({ email }: { email: string }) {
  const t = useTranslations("IamProfileSurface")
  return (
    <IamProfileContextBand label={t("danger.sectionLabel")}>
      <IamProfileDangerPanels email={email} />
    </IamProfileContextBand>
  )
}
