"use client"

import { useActionState, useEffect, useId } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"
import { Label } from "#components2/ui/label"
import { Spinner } from "#components2/ui/spinner"
import { useRouter } from "#i18n/navigation"
import { ActionFormErrors } from "#features/governed-surface/client"

import {
  updateOrganizationSlugAction,
  type UpdateOrganizationSlugState,
} from "../actions/organization-slug.actions"
import { organizationAdminPath } from "../constants"

type OrganizationSlugSettingsFormProps = { orgSlug: string }

export function OrganizationSlugSettingsForm({
  orgSlug,
}: OrganizationSlugSettingsFormProps) {
  const t = useTranslations("OrgAdmin.settings.slug")
  const router = useRouter()
  const errId = useId()
  const [state, formAction, pending] = useActionState<
    UpdateOrganizationSlugState | null,
    FormData
  >(updateOrganizationSlugAction, null)

  useEffect(() => {
    if (state?.ok && state.newSlug && state.newSlug !== orgSlug) {
      router.replace(organizationAdminPath(state.newSlug, "settings"))
      router.refresh()
    }
  }, [orgSlug, router, state])

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="org-workspace-slug">{t("label")}</Label>
        <p className="text-xs text-muted-foreground">
          {t("hintBefore")}
          <span className="font-mono text-foreground">/o/{orgSlug}/</span>
          {t("hintAfter")}
        </p>
        <Input
          id="org-workspace-slug"
          name="newSlug"
          key={orgSlug}
          defaultValue={orgSlug}
          required
          minLength={1}
          maxLength={128}
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          disabled={pending}
          aria-invalid={state?.ok === false}
          aria-describedby={state?.ok === false ? errId : undefined}
        />
      </div>
      <div id={errId}>
        <ActionFormErrors
          title={t("errorTitle")}
          result={
            state?.ok === false ? { ok: false, error: state.error } : null
          }
        />
      </div>
      {state?.ok && state.newSlug === orgSlug ? (
        <p className="text-sm text-muted-foreground" role="status">
          {t("unchanged")}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        <span className="inline-flex items-center gap-2">
          {pending ? <Spinner className="size-4" /> : null}
          {pending ? t("saving") : t("save")}
        </span>
      </Button>
    </form>
  )
}
