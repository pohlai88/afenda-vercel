import { describe, expect, it } from "vitest"

import {
  buildNd123EinvoiceXml,
  issueEinvoiceFormSchema,
} from "#features/erp-vietnam-einvoice"

describe("buildNd123EinvoiceXml", () => {
  it("escapes XML special characters in buyer fields", () => {
    const input = issueEinvoiceFormSchema.parse({
      orgSlug: "acme",
      templateCode: "1",
      series: "C",
      invoiceNumber: "12",
      issueDate: "2024-04-15",
      buyerName: 'A & B <C> "D"',
      buyerTaxCode: "0&1",
      totalAmountVnd: 1_234_567n,
      vatRateBps: 1000,
      status: "issued",
    })
    const xml = buildNd123EinvoiceXml(input)
    expect(xml).toContain("A &amp; B &lt;C&gt; &quot;D&quot;")
    expect(xml).toContain("0&amp;1")
    expect(xml).toContain("<TGia>1234567</TGia>")
  })
})
