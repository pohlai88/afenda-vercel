import "server-only"

import type { IssueEinvoiceFormInput } from "../schemas/issue-einvoice.schema"
import { buildNd123EinvoiceXml } from "./einvoice-xml.shared"

export type MockEinvoiceIssueResult = {
  readonly providerReference: string
  readonly requestXml: string
  readonly responseXml: string
}

/**
 * Deterministic mock gateway — no network I/O; suitable for dev + unit tests.
 */
export function issueMockEinvoice(
  invoiceId: string,
  input: IssueEinvoiceFormInput
): MockEinvoiceIssueResult {
  const requestXml = buildNd123EinvoiceXml(input)
  const responseXml = `<?xml version="1.0" encoding="UTF-8"?>
<MockEinvoiceResponse>
  <InvoiceId>${invoiceId}</InvoiceId>
  <Status>ACCEPTED</Status>
</MockEinvoiceResponse>`
  return {
    providerReference: `mock:${invoiceId}`,
    requestXml,
    responseXml,
  }
}
