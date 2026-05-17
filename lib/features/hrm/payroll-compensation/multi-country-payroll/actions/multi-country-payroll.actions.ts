"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { requirePayrollMutationGate } from "../../payroll-processing/data/payroll-action-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import {
  insertPayrollExchangeRateMutation,
  upsertLegalEntityPayrollConfigMutation,
  upsertPayComponentCountryTreatmentMutation,
} from "../data/multi-country-payroll.mutations.server"
import { HRM_MULTI_COUNTRY_PAYROLL_AUDIT } from "../multi-country-payroll.contract"
import { recordPayrollExchangeRateFormSchema } from "../schemas/exchange-rate.schema"
import { upsertLegalEntityPayrollFormSchema } from "../schemas/legal-entity-payroll.schema"
import { upsertPayComponentTreatmentFormSchema } from "../schemas/pay-component-treatment.schema"
import type { MultiCountryPayrollMutationFormState } from "../multi-country-payroll-form-states"

function revalidatePayrollLayout() {
  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern("/hrm/payroll"),
    "layout"
  )
}

function firstFieldError(
  fieldErrors: Record<string, string[] | undefined>
): string | undefined {
  for (const messages of Object.values(fieldErrors)) {
    const message = messages?.[0]
    if (message) return message
  }
  return undefined
}

function parseCheckbox(raw: FormDataEntryValue | null): boolean {
  return raw === "1" || raw === "on" || raw === "true"
}

export async function upsertLegalEntityPayrollConfigAction(
  _prev: MultiCountryPayrollMutationFormState | undefined,
  formData: FormData
): Promise<MultiCountryPayrollMutationFormState> {
  const gate = await requirePayrollMutationGate(formData, "update")
  if (!gate.ok) return gate.response

  const parsed = upsertLegalEntityPayrollFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    legalEntityCode: formData.get("legalEntityCode"),
    countryCode: formData.get("countryCode"),
    registrationNumber: formData.get("registrationNumber") || undefined,
    defaultPayrollCurrency: formData.get("defaultPayrollCurrency"),
    payrollCountryCode: formData.get("payrollCountryCode"),
    isActive: formData.has("isActive")
      ? parseCheckbox(formData.get("isActive"))
      : true,
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form:
        firstFieldError(parsed.error.flatten().fieldErrors) ??
        "Missing or invalid legal entity payroll fields.",
    })
  }

  const { orgSlug: _orgSlug, ...config } = parsed.data
  const result = await upsertLegalEntityPayrollConfigMutation({
    organizationId: gate.organizationId,
    userId: gate.userId,
    config,
  })

  const auditAction = result.created
    ? HRM_MULTI_COUNTRY_PAYROLL_AUDIT.legal_entity.create
    : HRM_MULTI_COUNTRY_PAYROLL_AUDIT.legal_entity.update

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: auditAction,
      actorUserId: gate.userId,
      actorSessionId: gate.sessionId,
      organizationId: gate.organizationId,
      resourceType: "hrm_payroll_legal_entity_config",
      resourceId: result.id,
      metadata: {
        legalEntityCode: config.legalEntityCode,
        countryCode: config.countryCode,
      },
    })
  )

  revalidatePayrollLayout()
  return { ok: true }
}

export async function recordPayrollExchangeRateAction(
  _prev: MultiCountryPayrollMutationFormState | undefined,
  formData: FormData
): Promise<MultiCountryPayrollMutationFormState> {
  const gate = await requirePayrollMutationGate(formData, "create")
  if (!gate.ok) return gate.response

  const parsed = recordPayrollExchangeRateFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    fromCurrency: formData.get("fromCurrency"),
    toCurrency: formData.get("toCurrency"),
    rate: formData.get("rate"),
    effectiveDate: formData.get("effectiveDate"),
    source: formData.get("source") ?? "manual",
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form:
        firstFieldError(parsed.error.flatten().fieldErrors) ??
        "Missing or invalid exchange rate fields.",
    })
  }

  const { orgSlug: _orgSlug, ...rate } = parsed.data
  const result = await insertPayrollExchangeRateMutation({
    organizationId: gate.organizationId,
    userId: gate.userId,
    rate,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_MULTI_COUNTRY_PAYROLL_AUDIT.exchange_rate.create,
      actorUserId: gate.userId,
      actorSessionId: gate.sessionId,
      organizationId: gate.organizationId,
      resourceType: "hrm_payroll_exchange_rate",
      resourceId: result.id,
      metadata: {
        fromCurrency: rate.fromCurrency,
        toCurrency: rate.toCurrency,
        effectiveDate: rate.effectiveDate,
      },
    })
  )

  revalidatePayrollLayout()
  return { ok: true }
}

export async function upsertPayComponentTreatmentAction(
  _prev: MultiCountryPayrollMutationFormState | undefined,
  formData: FormData
): Promise<MultiCountryPayrollMutationFormState> {
  const gate = await requirePayrollMutationGate(formData, "update")
  if (!gate.ok) return gate.response

  const effectiveToRaw = formData.get("effectiveTo")
  const parsed = upsertPayComponentTreatmentFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    countryCode: formData.get("countryCode"),
    componentCode: formData.get("componentCode"),
    taxable: parseCheckbox(formData.get("taxable")),
    contributable: parseCheckbox(formData.get("contributable")),
    pensionable: parseCheckbox(formData.get("pensionable")),
    effectiveFrom: formData.get("effectiveFrom"),
    effectiveTo:
      effectiveToRaw == null || String(effectiveToRaw).trim() === ""
        ? null
        : String(effectiveToRaw),
  })
  if (!parsed.success) {
    return hrmActionFailure({
      form:
        firstFieldError(parsed.error.flatten().fieldErrors) ??
        "Missing or invalid pay component treatment fields.",
    })
  }

  const { orgSlug: _orgSlug, ...treatment } = parsed.data
  const result = await upsertPayComponentCountryTreatmentMutation({
    organizationId: gate.organizationId,
    userId: gate.userId,
    treatment,
  })

  const auditAction = result.created
    ? HRM_MULTI_COUNTRY_PAYROLL_AUDIT.pay_component_treatment.create
    : HRM_MULTI_COUNTRY_PAYROLL_AUDIT.pay_component_treatment.update

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: auditAction,
      actorUserId: gate.userId,
      actorSessionId: gate.sessionId,
      organizationId: gate.organizationId,
      resourceType: "hrm_payroll_pay_component_treatment",
      resourceId: result.id,
      metadata: {
        countryCode: treatment.countryCode,
        componentCode: treatment.componentCode,
      },
    })
  )

  revalidatePayrollLayout()
  return { ok: true }
}
