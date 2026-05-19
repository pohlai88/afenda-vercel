"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import { HRM_SALARY_BENCHMARKING_AUDIT } from "../salary-benchmarking.contract"
import {
  approveSalaryBenchmarkMappingMutation,
  generateSalaryBenchmarkAnalysisMutation,
  handoffSalaryBenchmarkRecommendationMutation,
  uploadSalaryBenchmarkRowMutation,
  uploadSalaryBenchmarkSurveyMutation,
  upsertSalaryBenchmarkMappingMutation,
} from "../data/salary-benchmarking.mutations.server"
import { resolveLatestAnalysisVersion } from "../data/salary-benchmarking.queries.server"
import {
  generateSalaryBenchmarkAnalysisFormSchema,
  handoffSalaryBenchmarkRecommendationFormSchema,
  salaryBenchmarkMappingDecisionFormSchema,
  uploadSalaryBenchmarkRowFormSchema,
  uploadSalaryBenchmarkSurveyFormSchema,
  upsertSalaryBenchmarkMappingFormSchema,
} from "../schemas/salary-benchmarking-action.schema"
import { salaryBenchmarkThresholdsSchema } from "../schemas/salary-benchmarking.schema"

export type SalaryBenchmarkingFormState =
  | { ok: true }
  | { ok: false; errors: { form?: string } }

function revalidateSalaryBenchmarking() {
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern("/hrm/salary-benchmarking"),
    "page"
  )
}

function audit(input: {
  readonly action: string
  readonly actorUserId: string
  readonly actorSessionId: string | null
  readonly organizationId: string
  readonly resourceType: string
  readonly resourceId: string
  readonly metadata?: Record<string, unknown>
}) {
  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: input.action,
      actorUserId: input.actorUserId,
      actorSessionId: input.actorSessionId,
      organizationId: input.organizationId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: input.metadata,
    })
  )
}

export async function uploadSalaryBenchmarkSurveyAction(
  formData: FormData
): Promise<SalaryBenchmarkingFormState> {
  const gate = await requireHrmPermission({
    object: "salary_benchmarking",
    function: "create",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const parsed = uploadSalaryBenchmarkSurveyFormSchema.safeParse({
    provider: formData.get("provider"),
    surveyYear: Number(formData.get("surveyYear")),
    surveyName: formData.get("surveyName"),
    industry: formData.get("industry"),
    companySizeSegment: formData.get("companySizeSegment"),
    revenueSegment: formData.get("revenueSegment"),
    countryCode: formData.get("countryCode"),
    location: formData.get("location"),
    currency: formData.get("currency"),
    effectiveDate: formData.get("effectiveDate"),
    sourceVersion: formData.get("sourceVersion"),
    confidenceLevel: formData.get("confidenceLevel"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Survey fields are invalid." })
  }

  const { id } = await uploadSalaryBenchmarkSurveyMutation({
    organizationId: gate.session.organizationId,
    actorUserId: gate.session.userId,
    survey: parsed.data,
  })

  audit({
    action: HRM_SALARY_BENCHMARKING_AUDIT.surveyUploaded,
    actorUserId: gate.session.userId,
    actorSessionId: gate.session.sessionId,
    organizationId: gate.session.organizationId,
    resourceType: "salary_benchmark_survey",
    resourceId: id,
    metadata: { sourceVersion: parsed.data.sourceVersion },
  })

  revalidateSalaryBenchmarking()
  return { ok: true }
}

export async function uploadSalaryBenchmarkRowAction(
  formData: FormData
): Promise<SalaryBenchmarkingFormState> {
  const gate = await requireHrmPermission({
    object: "salary_benchmarking",
    function: "create",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const parsed = uploadSalaryBenchmarkRowFormSchema.safeParse({
    surveyId: formData.get("surveyId"),
    benchmarkVersion: formData.get("benchmarkVersion"),
    jobFamily: formData.get("jobFamily"),
    benchmarkJobCode: formData.get("benchmarkJobCode"),
    benchmarkJobTitle: formData.get("benchmarkJobTitle"),
    benchmarkLevel: formData.get("benchmarkLevel"),
    industry: formData.get("industry"),
    countryCode: formData.get("countryCode"),
    location: formData.get("location"),
    currency: formData.get("currency"),
    minimum: formData.get("minimum") || undefined,
    midpoint: formData.get("midpoint") || undefined,
    median: formData.get("median") || undefined,
    average: formData.get("average") || undefined,
    maximum: formData.get("maximum") || undefined,
    p25: formData.get("p25") || undefined,
    p50: formData.get("p50") || undefined,
    p75: formData.get("p75") || undefined,
    p90: formData.get("p90") || undefined,
    sampleSize: formData.get("sampleSize") || undefined,
    effectiveDate: formData.get("effectiveDate"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Benchmark row fields are invalid." })
  }

  const { id } = await uploadSalaryBenchmarkRowMutation({
    organizationId: gate.session.organizationId,
    actorUserId: gate.session.userId,
    row: parsed.data,
  })

  audit({
    action: HRM_SALARY_BENCHMARKING_AUDIT.surveyUploaded,
    actorUserId: gate.session.userId,
    actorSessionId: gate.session.sessionId,
    organizationId: gate.session.organizationId,
    resourceType: "salary_benchmark_row",
    resourceId: id,
    metadata: { benchmarkVersion: parsed.data.benchmarkVersion },
  })

  revalidateSalaryBenchmarking()
  return { ok: true }
}

export async function upsertSalaryBenchmarkMappingAction(
  formData: FormData
): Promise<SalaryBenchmarkingFormState> {
  const gate = await requireHrmPermission({
    object: "salary_benchmarking",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const mappingId = formData.get("mappingId")
  const parsed = upsertSalaryBenchmarkMappingFormSchema.safeParse({
    benchmarkId: formData.get("benchmarkId"),
    internalJobId: formData.get("internalJobId"),
    internalJobTitle: formData.get("internalJobTitle"),
    internalJobFamily: formData.get("internalJobFamily"),
    internalGrade: formData.get("internalGrade"),
    legalEntityCode: formData.get("legalEntityCode"),
    countryCode: formData.get("countryCode"),
    location: formData.get("location"),
    employmentCategory: formData.get("employmentCategory"),
    sourceVersion: formData.get("sourceVersion"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Mapping fields are invalid." })
  }

  const { id } = await upsertSalaryBenchmarkMappingMutation({
    organizationId: gate.session.organizationId,
    actorUserId: gate.session.userId,
    mappingId:
      typeof mappingId === "string" && mappingId ? mappingId : undefined,
    mapping: parsed.data,
  })

  audit({
    action: HRM_SALARY_BENCHMARKING_AUDIT.benchmarkMapped,
    actorUserId: gate.session.userId,
    actorSessionId: gate.session.sessionId,
    organizationId: gate.session.organizationId,
    resourceType: "salary_benchmark_mapping",
    resourceId: id,
    metadata: { benchmarkId: parsed.data.benchmarkId },
  })

  revalidateSalaryBenchmarking()
  return { ok: true }
}

export async function approveSalaryBenchmarkMappingAction(
  formData: FormData
): Promise<SalaryBenchmarkingFormState> {
  const gate = await requireHrmPermission({
    object: "salary_benchmarking",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const parsed = salaryBenchmarkMappingDecisionFormSchema.safeParse({
    mappingId: formData.get("mappingId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Mapping id is required." })
  }

  await approveSalaryBenchmarkMappingMutation({
    organizationId: gate.session.organizationId,
    mappingId: parsed.data.mappingId,
    actorUserId: gate.session.userId,
  })

  audit({
    action: HRM_SALARY_BENCHMARKING_AUDIT.mappingApproved,
    actorUserId: gate.session.userId,
    actorSessionId: gate.session.sessionId,
    organizationId: gate.session.organizationId,
    resourceType: "salary_benchmark_mapping",
    resourceId: parsed.data.mappingId,
    metadata: {},
  })

  revalidateSalaryBenchmarking()
  return { ok: true }
}

export async function generateSalaryBenchmarkAnalysisAction(
  formData: FormData
): Promise<SalaryBenchmarkingFormState> {
  const gate = await requireHrmPermission({
    object: "salary_benchmarking",
    function: "predict",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const parsed = generateSalaryBenchmarkAnalysisFormSchema.safeParse({
    compensationScope: formData.get("compensationScope") ?? "base_salary",
    analysisVersion: formData.get("analysisVersion") || undefined,
    currencyConversionReference:
      formData.get("currencyConversionReference") || undefined,
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Analysis parameters are invalid." })
  }

  const analysisVersion =
    parsed.data.analysisVersion ??
    (await resolveLatestAnalysisVersion(gate.session.organizationId)) ??
    `analysis-${new Date().toISOString().slice(0, 10)}`

  const thresholds = salaryBenchmarkThresholdsSchema.parse(
    parsed.data.thresholds ?? {}
  )

  const { snapshotCount } = await generateSalaryBenchmarkAnalysisMutation({
    organizationId: gate.session.organizationId,
    actorUserId: gate.session.userId,
    compensationScope: parsed.data.compensationScope,
    analysisVersion,
    thresholds,
    currencyConversionReference: parsed.data.currencyConversionReference,
  })

  audit({
    action: HRM_SALARY_BENCHMARKING_AUDIT.comparisonCalculated,
    actorUserId: gate.session.userId,
    actorSessionId: gate.session.sessionId,
    organizationId: gate.session.organizationId,
    resourceType: "salary_benchmark_analysis",
    resourceId: analysisVersion,
    metadata: { snapshotCount },
  })

  revalidateSalaryBenchmarking()
  return { ok: true }
}

export async function handoffSalaryBenchmarkRecommendationAction(
  formData: FormData
): Promise<SalaryBenchmarkingFormState> {
  const gate = await requireHrmPermission({
    object: "salary_benchmarking",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const parsed = handoffSalaryBenchmarkRecommendationFormSchema.safeParse({
    snapshotId: formData.get("snapshotId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Snapshot id is required." })
  }

  await handoffSalaryBenchmarkRecommendationMutation({
    organizationId: gate.session.organizationId,
    snapshotId: parsed.data.snapshotId,
    actorUserId: gate.session.userId,
  })

  audit({
    action: HRM_SALARY_BENCHMARKING_AUDIT.recommendationGenerated,
    actorUserId: gate.session.userId,
    actorSessionId: gate.session.sessionId,
    organizationId: gate.session.organizationId,
    resourceType: "salary_benchmark_analysis_snapshot",
    resourceId: parsed.data.snapshotId,
    metadata: { handoffState: "submitted" },
  })

  revalidateSalaryBenchmarking()
  return { ok: true }
}
