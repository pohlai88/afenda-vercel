"use client"

import type { Route } from "next"
import { useRouter } from "#i18n/navigation"
import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#components2/ui/alert-dialog"
import { Button } from "#components2/ui/button"
import { Link } from "#i18n/navigation"
import { Spinner } from "#components2/ui/spinner"
import {
  leaveOrganizationAction,
  setActiveOrganizationAction,
} from "#features/iam-profile/client"

export type IamProfileMembershipOrgRow = {
  id: string
  name: string
  slug: string
  role: string
  isActive: boolean
  nexusHref: Route
}

export function IamProfileMembershipPanels({
  organizations,
}: {
  organizations: IamProfileMembershipOrgRow[]
}) {
  const t = useTranslations("IamProfileSurface.membership")
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [leaveTarget, setLeaveTarget] = useState<IamProfileMembershipOrgRow | null>(
    null
  )

  function run(
    fn: () => Promise<{ ok: boolean; error?: string }>,
    onSuccess?: () => void
  ) {
    setErr(null)
    startTransition(() => {
      void fn().then((result) => {
        if (!result.ok) {
          setErr(result.error ?? t("errorGeneric"))
          return
        }
        onSuccess?.()
        router.refresh()
      })
    })
  }

  if (organizations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("empty")}</p>
    )
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {organizations.map((org) => (
          <li
            key={org.id}
            className="flex flex-col gap-2 rounded-md border border-border/60 bg-background/55 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-foreground">
                {org.name}
                {org.isActive ? (
                  <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">
                    {t("activeBadge")}
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("roleLabel", { role: org.role })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href={org.nexusHref}>{t("openWorkspace")}</Link>
              </Button>
              {!org.isActive ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(() => setActiveOrganizationAction(org.id))
                  }
                >
                  {t("setActive")}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => setLeaveTarget(org)}
              >
                {t("leave")}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {err ? (
        <p className="text-sm text-destructive" role="alert">
          {err}
        </p>
      ) : null}

      <AlertDialog
        open={leaveTarget !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setLeaveTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("leaveDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {leaveTarget
                ? t("leaveDialogDescription", { name: leaveTarget.name })
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {t("leaveDialogCancel")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pending || !leaveTarget}
              onClick={() => {
                const target = leaveTarget
                if (!target) return
                run(
                  () => leaveOrganizationAction(target.id),
                  () => setLeaveTarget(null)
                )
              }}
            >
              {pending ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  {t("leaveConfirming")}
                </span>
              ) : (
                t("leaveConfirm")
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
