/**
 * Minimal XML envelope for monthly social/health/unemployment insurance
 * reconciliation (BHXH/BHYT/BHTN) — operator / bureau hand-off format.
 * Schema is Afenda-internal (`formatVersion`) until a named authority XSD is wired.
 */

export type VnInsuranceReportEmployeeRow = {
  readonly employeeId: string
  readonly employeeName: string
  readonly salaryVnd: number
  readonly bhxhVnd: number
  readonly bhytVnd: number
  readonly bhtnVnd: number
  readonly totalEmployeeInsuranceVnd: number
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function formatDdMmYyyyUtc(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, "0")
  const month = String(d.getUTCMonth() + 1).padStart(2, "0")
  const year = d.getUTCFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Build UTF-8 XML document for a monthly insurance report.
 */
export function buildVnInsuranceMonthlyReportXmlV202401(input: {
  readonly companyName: string
  readonly taxCode: string
  readonly reportPeriodYm: string
  readonly reportDate: Date
  readonly employees: readonly VnInsuranceReportEmployeeRow[]
}): string {
  const totals = input.employees.reduce(
    (acc, e) => ({
      salary: acc.salary + e.salaryVnd,
      bhxh: acc.bhxh + e.bhxhVnd,
      bhyt: acc.bhyt + e.bhytVnd,
      bhtn: acc.bhtn + e.bhtnVnd,
      total: acc.total + e.totalEmployeeInsuranceVnd,
    }),
    { salary: 0, bhxh: 0, bhyt: 0, bhtn: 0, total: 0 }
  )

  const rows = input.employees
    .map(
      (e) => `  <Employee>
    <EmployeeId>${escapeXml(e.employeeId)}</EmployeeId>
    <EmployeeName>${escapeXml(e.employeeName)}</EmployeeName>
    <SalaryVnd>${e.salaryVnd}</SalaryVnd>
    <BHXHVnd>${e.bhxhVnd}</BHXHVnd>
    <BHYTVnd>${e.bhytVnd}</BHYTVnd>
    <BHTNVnd>${e.bhtnVnd}</BHTNVnd>
    <TotalEmployeeInsuranceVnd>${e.totalEmployeeInsuranceVnd}</TotalEmployeeInsuranceVnd>
  </Employee>`
    )
    .join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<VnInsuranceMonthlyReport formatVersion="VN-BHXH-XML-2024-01" xmlns="https://afenda.local/schema/hrm/vn-insurance/2024-01">
  <CompanyName>${escapeXml(input.companyName)}</CompanyName>
  <TaxCode>${escapeXml(input.taxCode)}</TaxCode>
  <ReportPeriod>${escapeXml(input.reportPeriodYm)}</ReportPeriod>
  <ReportDate>${formatDdMmYyyyUtc(input.reportDate)}</ReportDate>
  <Employees>
${rows}
  </Employees>
  <Totals>
    <TotalSalaryVnd>${totals.salary}</TotalSalaryVnd>
    <TotalBHXHVnd>${totals.bhxh}</TotalBHXHVnd>
    <TotalBHYTVnd>${totals.bhyt}</TotalBHYTVnd>
    <TotalBHTNVnd>${totals.bhtn}</TotalBHTNVnd>
    <TotalEmployeeInsuranceVnd>${totals.total}</TotalEmployeeInsuranceVnd>
  </Totals>
</VnInsuranceMonthlyReport>
`
}
