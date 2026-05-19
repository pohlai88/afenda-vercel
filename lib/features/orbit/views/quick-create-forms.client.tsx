"use client"

import { useTranslations } from "next-intl"

import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"
import { Textarea } from "#components2/ui/textarea"

import { capturePlannerItemAction } from "../commands/capture-planner-item"
import { createPlannerSignalAction } from "../commands/create-planner-signal"
import { startPlannerSessionAction } from "../commands/start-planner-session"
import { OrbitCaptureInput } from "./orbit-capture-input.client"

type QuickCreateFormProps = {
  orgSlug: string
  onSuccess?: () => void
}

function PlannerHiddenFields({ orgSlug }: { orgSlug: string }) {
  return (
    <>
      <input type="hidden" name="scopeKind" value="organization" />
      <input type="hidden" name="surface" value="queue" />
      <input type="hidden" name="orgSlug" value={orgSlug} />
    </>
  )
}

export function QuickCreateSignalForm({ orgSlug }: QuickCreateFormProps) {
  const t = useTranslations("Dashboard.Orbit.quickCreate")

  return (
    <form action={createPlannerSignalAction} className="flex flex-col gap-3">
      <PlannerHiddenFields orgSlug={orgSlug} />
      <Input
        name="title"
        aria-label={t("signalTitle")}
        placeholder={t("signalPlaceholder")}
        required
      />
      <Textarea
        name="description"
        aria-label={t("signalDescriptionPlaceholder")}
        placeholder={t("signalDescriptionPlaceholder")}
        rows={3}
      />
      <Button type="submit" size="sm">
        {t("signalButton")}
      </Button>
    </form>
  )
}

export function QuickCreateItemForm({ orgSlug }: QuickCreateFormProps) {
  const t = useTranslations("Dashboard.Orbit.quickCreate")

  return (
    <form action={capturePlannerItemAction} className="flex flex-col gap-3">
      <PlannerHiddenFields orgSlug={orgSlug} />
      <OrbitCaptureInput />
      <Button type="submit" size="sm" variant="outline">
        {t("itemButton")}
      </Button>
    </form>
  )
}

export function QuickCreateSessionForm({ orgSlug }: QuickCreateFormProps) {
  const t = useTranslations("Dashboard.Orbit.quickCreate")

  return (
    <form action={startPlannerSessionAction} className="flex flex-col gap-3">
      <input type="hidden" name="scopeKind" value="organization" />
      <input type="hidden" name="surface" value="sessions" />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <p className="text-[11px] leading-snug text-muted-foreground">
        {t("sessionHint")}
      </p>
      <Button type="submit" size="sm">
        {t("sessionButton")}
      </Button>
    </form>
  )
}
