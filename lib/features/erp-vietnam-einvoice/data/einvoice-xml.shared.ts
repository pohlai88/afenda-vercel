import type { IssueEinvoiceFormInput } from "../schemas/issue-einvoice.schema"

function escapeXml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

/**
 * Minimal NĐ123-shaped XML body for persistence and provider adapters.
 * Not a full XSD validator — Zod owns the input contract at the action boundary.
 */
export function buildNd123EinvoiceXml(input: IssueEinvoiceFormInput): string {
  const buyerTax =
    input.buyerTaxCode && input.buyerTaxCode.length > 0
      ? `<BuyerTaxCode>${escapeXml(input.buyerTaxCode)}</BuyerTaxCode>`
      : ""
  return `<?xml version="1.0" encoding="UTF-8"?>
<HDon>
  <DLHDon>
    <TTChung>
      <PBan>1.0.0</PBan>
      <THDon>${escapeXml(input.templateCode)}</THDon>
      <KHMSHDon>${escapeXml(input.series)}</KHMSHDon>
      <SHDon>${escapeXml(input.invoiceNumber)}</SHDon>
      <NLap>${escapeXml(input.issueDate)}</NLap>
      <DVTTe>${escapeXml(input.currency)}</DVTTe>
      <TGia>${input.totalAmountVnd.toString()}</TGia>
      <TSuat>${input.vatRateBps}</TSuat>
    </TTChung>
    <NDHDon>
      <NMua>
        <Ten>${escapeXml(input.buyerName)}</Ten>
        ${buyerTax}
      </NMua>
    </NDHDon>
  </DLHDon>
</HDon>`
}
