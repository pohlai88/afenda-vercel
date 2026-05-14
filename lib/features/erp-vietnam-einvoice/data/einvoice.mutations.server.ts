import "server-only"

import { eq } from "drizzle-orm"

import { db } from "#lib/db"
import { eInvoice, eInvoiceTransmission } from "#lib/db/schema"

import type { IssueEinvoiceFormInput } from "../schemas/issue-einvoice.schema"
import { issueMockEinvoice } from "./mock-einvoice-provider.server"

export async function insertIssuedEinvoiceWithMockTransmission(input: {
  readonly organizationId: string
  readonly createdByUserId: string
  readonly body: IssueEinvoiceFormInput
  readonly xmlPayload: string
}): Promise<{ invoiceId: string; transmissionId: string }> {
  return await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(eInvoice)
      .values({
        organizationId: input.organizationId,
        status: input.body.status,
        provider: "mock",
        templateCode: input.body.templateCode,
        series: input.body.series,
        invoiceNumber: input.body.invoiceNumber,
        issueDate: new Date(`${input.body.issueDate}T00:00:00.000Z`),
        buyerName: input.body.buyerName,
        buyerTaxCode: input.body.buyerTaxCode,
        currency: input.body.currency,
        totalAmountVnd: input.body.totalAmountVnd,
        vatRateBps: input.body.vatRateBps,
        xmlPayload: input.xmlPayload,
        createdByUserId: input.createdByUserId,
        updatedByUserId: input.createdByUserId,
      })
      .returning({ id: eInvoice.id })

    const invoiceId = row?.id
    if (!invoiceId) {
      throw new Error("e_invoice insert did not return an id.")
    }

    const mock = issueMockEinvoice(invoiceId, input.body)

    const [txRow] = await tx
      .insert(eInvoiceTransmission)
      .values({
        organizationId: input.organizationId,
        eInvoiceId: invoiceId,
        channel: "mock",
        state: "delivered",
        requestXml: mock.requestXml,
        responseXml: mock.responseXml,
        attemptCount: 1,
        lastAttemptAt: new Date(),
      })
      .returning({ id: eInvoiceTransmission.id })

    const transmissionId = txRow?.id
    if (!transmissionId) {
      throw new Error("e_invoice_transmission insert did not return an id.")
    }

    await tx
      .update(eInvoice)
      .set({
        providerReference: mock.providerReference,
        updatedAt: new Date(),
        updatedByUserId: input.createdByUserId,
      })
      .where(eq(eInvoice.id, invoiceId))

    return { invoiceId, transmissionId }
  })
}
