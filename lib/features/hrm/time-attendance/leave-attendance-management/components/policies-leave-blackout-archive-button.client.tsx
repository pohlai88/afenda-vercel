"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components2/ui/button"

import { archiveLeaveBlackoutAction } from "../actions/org-calendar.actions"

type PoliciesLeaveBlackoutArchiveButtonProps = {
  blackoutId: string
}

export function PoliciesLeaveBlackoutArchiveButton({
  blackoutId,
}: PoliciesLeaveBlackoutArchiveButtonProps) {
  const t = useTranslations("Dashboard.Hrm.policies")
  const [, formAction, pending] = useActionState(
    archiveLeaveBlackoutAction,
    undefined
  )

  return (
    <form action={formAction}>
      <input type="hidden" name="blackoutId" value={blackoutId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? t("blackout.archiving") : t("blackout.archive")}
      </Button>
    </form>
  )
}
