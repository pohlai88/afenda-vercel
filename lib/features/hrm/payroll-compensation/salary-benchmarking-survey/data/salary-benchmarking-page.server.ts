import "server-only"

import { requireOrgSession } from "#lib/auth"

import { buildSalaryBenchmarkPayEquityGroups } from "./salary-benchmarking-engine.shared"
import {
  listEmployeeCompensationForBenchmarking,
  listSalaryBenchmarkAnalysisForOrganization,
  listSalaryBenchmarkMappingsForOrganization,
  listSalaryBenchmarkRowsForOrganization,
  listSalaryBenchmarkSurveysForOrganization,
} from "./salary-benchmarking.queries.server"

export async function loadSalaryBenchmarkingPageData() {
  const session = await requireOrgSession()
  const organizationId = session.organizationId

  const [surveys, marketRows, mappings, analyses, employees] =
    await Promise.all([
      listSalaryBenchmarkSurveysForOrganization(organizationId),
      listSalaryBenchmarkRowsForOrganization(organizationId),
      listSalaryBenchmarkMappingsForOrganization(organizationId),
      listSalaryBenchmarkAnalysisForOrganization(organizationId),
      listEmployeeCompensationForBenchmarking(organizationId),
    ])

  const payEquityGroups = buildSalaryBenchmarkPayEquityGroups(
    employees,
    "department"
  )

  return {
    surveys,
    marketRows,
    mappings,
    analyses,
    payEquityGroups,
  }
}
