"use client"

import { useActionState, useId } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Button } from "#components2/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components2/ui/dialog"
import { Field, FieldError, FieldLabel } from "#components2/ui/field"
import { Input } from "#components2/ui/input"

import { createOtmApprovalRouteAction } from "../actions/otm-approval-route.actions"
import type { CreateOtmApprovalRouteFormState } from "../../../types"
import { HRM_OTM_APPROVER_KINDS } from "../schemas/otm-approval-route.shared"

const SELECT_CLASS =
  "h-9 w-full rounded border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

export function OtmApprovalRouteCreateDialog() {
  const t = useTranslations("Dashboard.Hrm.overtime")
  const approverKindId = useId()
  const [state, formAction, pending] = useActionState<
    CreateOtmApprovalRouteFormState | undefined,
    FormData
  >(createOtmApprovalRouteAction, undefined)

  const error = state && !state.ok ? state.errors : null

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          {t("createApprovalRoute")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("createApprovalRouteTitle")}</DialogTitle>
          <DialogDescription>
            {t("createApprovalRouteDescription")}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="routeLabel">{t("fieldRouteLabel")}</FieldLabel>
            <Input id="routeLabel" name="label" disabled={pending} />
          </Field>
          <Field>
            <FieldLabel htmlFor="priority">{t("fieldRoutePriority")}</FieldLabel>
            <Input
              id="priority"
              name="priority"
              type="number"
              min={0}
              max={9999}
              defaultValue={100}
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="departmentId">
              {t("fieldDepartmentId")}
            </FieldLabel>
            <Input id="departmentId" name="departmentId" disabled={pending} />
          </Field>
          <Field>
            <FieldLabel htmlFor="costCenterCode">
              {t("fieldCostCenterCode")}
            </FieldLabel>
            <Input
              id="costCenterCode"
              name="costCenterCode"
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="workLocationCode">
              {t("fieldWorkLocationCode")}
            </FieldLabel>
            <Input
              id="workLocationCode"
              name="workLocationCode"
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="jobGradeId">{t("fieldJobGradeId")}</FieldLabel>
            <Input id="jobGradeId" name="jobGradeId" disabled={pending} />
          </Field>
          <Field>
            <FieldLabel htmlFor="minAmountCents">
              {t("fieldMinAmountCents")}
            </FieldLabel>
            <Input
              id="minAmountCents"
              name="minAmountCents"
              type="number"
              min={0}
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="maxAmountCents">
              {t("fieldMaxAmountCents")}
            </FieldLabel>
            <Input
              id="maxAmountCents"
              name="maxAmountCents"
              type="number"
              min={0}
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="requiresEligibilityException">
              {t("fieldRequiresEligibilityException")}
            </FieldLabel>
            <select
              id="requiresEligibilityException"
              name="requiresEligibilityException"
              className={SELECT_CLASS}
              defaultValue=""
              disabled={pending}
            >
              <option value="">{t("routeMatchAny")}</option>
              <option value="true">{t("yes")}</option>
              <option value="false">{t("no")}</option>
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="requiresPolicyException">
              {t("fieldRequiresPolicyException")}
            </FieldLabel>
            <select
              id="requiresPolicyException"
              name="requiresPolicyException"
              className={SELECT_CLASS}
              defaultValue=""
              disabled={pending}
            >
              <option value="">{t("routeMatchAny")}</option>
              <option value="true">{t("yes")}</option>
              <option value="false">{t("no")}</option>
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor={approverKindId}>
              {t("fieldApproverKind")}
            </FieldLabel>
            <select
              id={approverKindId}
              name="approverKind"
              className={SELECT_CLASS}
              required
              disabled={pending}
            >
              {HRM_OTM_APPROVER_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {t(`approverKindLabels.${kind}`)}
                </option>
              ))}
            </select>
            {error?.approverKind ? (
              <FieldError>{error.approverKind}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="managerChainDepth">
              {t("fieldManagerChainDepth")}
            </FieldLabel>
            <Input
              id="managerChainDepth"
              name="managerChainDepth"
              type="number"
              min={1}
              max={5}
              disabled={pending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="targetUserId">
              {t("fieldTargetUserId")}
            </FieldLabel>
            <Input id="targetUserId" name="targetUserId" disabled={pending} />
            {error?.targetUserId ? (
              <FieldError>{error.targetUserId}</FieldError>
            ) : null}
          </Field>
          {error?.form ? <FieldError>{error.form}</FieldError> : null}
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t("createApprovalRouteSubmitting")}
              </>
            ) : (
              t("createApprovalRouteSubmit")
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
