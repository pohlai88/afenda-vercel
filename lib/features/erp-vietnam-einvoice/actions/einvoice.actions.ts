"use server"

import { requireRecentAuthStepUp, writeIamAuditEvent } from "#lib/auth"
import { organizationAppsPath } from "#lib/org-apps-module-paths"
import { requireErpPermission } from "#features/erp-rbac/server"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"

import { EINVOICE_AUDIT_ACTIONS } from "../erp-vietnam-einvoice.contract"
import { validateEinvoiceOrgSlugMatchesSession } from "../data/einvoice-org-guard.server"
import { insertIssuedEinvoiceWithMockTransmission } from "../data/einvoice.mutations.server"
import { buildNd123EinvoiceXml } from "../data/einvoice-xml.shared"
import { issueEinvoiceFormSchema } from "../schemas/issue-einvoice.schema"

export type IssueEinvoiceActionState =
  | { ok: true; invoiceId: string }
  | { ok: false; error: string }

/**
 * Tier A — e-invoice issuance (mock provider v1). `organizationId` is session-only.
 */
export async function issueEInvoiceAction(
  _prev: IssueEinvoiceActionState | undefined,
  formData: FormData
): Promise<IssueEinvoiceActionState> {
  const gate = await requireErpPermission({
    module: "einvoice",
    object: "invoice",
    function: "create",
  })
  if (!gate.ok) {
    return { ok: false, error: gate.error }
  }
  const session = gate.session

  const tenant = await validateEinvoiceOrgSlugMatchesSession(
    String(formData.get("orgSlug") ?? ""),
    session.organizationId
  )
  if (!tenant.ok) {
    return { ok: false, error: tenant.message }
  }

  const locale = await getRequestAppLocale()
  await requireRecentAuthStepUp({
    returnTo: toLocalePath(
      locale,
      organizationAppsPath(tenant.orgSlug, "home")
    ),
  })

  const parsed = issueEinvoiceFormSchema.safeParse({
    orgSlug: formData.get("orgSlug"),
    templateCode: formData.get("templateCode"),
    series: formData.get("series"),
    invoiceNumber: formData.get("invoiceNumber"),
    issueDate: formData.get("issueDate"),
    buyerName: formData.get("buyerName"),
    buyerTaxCode: formData.get("buyerTaxCode"),
    currency: formData.get("currency"),
    totalAmountVnd: formData.get("totalAmountVnd"),
    vatRateBps: formData.get("vatRateBps"),
    status: formData.get("status"),
  })

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input."
    return { ok: false, error: msg }
  }

  const body = parsed.data
  const xmlPayload = buildNd123EinvoiceXml(body)

  const { invoiceId } = await insertIssuedEinvoiceWithMockTransmission({
    organizationId: session.organizationId,
    createdByUserId: session.userId,
    body,
    xmlPayload,
  })

  await writeIamAuditEvent({
    action: EINVOICE_AUDIT_ACTIONS.INVOICE_CREATE,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "e_invoice",
    resourceId: invoiceId,
    metadata: {
      templateCode: body.templateCode,
      series: body.series,
      invoiceNumber: body.invoiceNumber,
      provider: "mock",
      status: body.status,
    },
  })

  return { ok: true, invoiceId }
}
