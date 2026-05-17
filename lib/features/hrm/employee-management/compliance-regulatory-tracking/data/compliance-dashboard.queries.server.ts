import "server-only"

import { and, eq, inArray, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmComplianceException,
  hrmDocument,
  hrmDocumentRequirement,
  hrmEmployee,
  hrmEmployeeAssignment,
  hrmEmployeeWorkAuthorization,
  hrmPayrollProfile,
  hrmPolicyAcknowledgement,
  hrmTrainingAssignment,
  hrmTrainingRecord,
} from "#lib/db/schema"

import { deriveEffectiveDocumentVerificationStatus } from "../../documents-management/data/hrm-document-governance.shared"
import {
  appliesComplianceObligationToEmployee,
  type EmployeeComplianceScope,
} from "./compliance-obligation.shared"
import { listActivePolicyAcknowledgementObligations } from "./compliance-obligation.queries.server"
import {
  deriveAcknowledgementComplianceStatus,
  deriveDocumentComplianceStatus,
  deriveTrainingComplianceStatus,
  deriveWorkAuthorizationComplianceStatus,
  type HrmComplianceStatus,
} from "./compliance-status.shared"
import {
  deriveComplianceDashboardOverallStatus,
  type ComplianceDashboardFilterInput,
  type ComplianceDashboardRow,
} from "./compliance-dashboard.shared"

function readLegalEntityCode(extras: unknown): string | null {
  if (typeof extras !== "object" || extras === null || Array.isArray(extras)) {
    return null
  }
  const raw = (extras as Record<string, unknown>).legalEntityCode
  return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null
}

function matchesFilter(
  row: ComplianceDashboardRow,
  filter: ComplianceDashboardFilterInput
): boolean {
  return (
    (!filter.overallStatus || row.overallStatus === filter.overallStatus) &&
    (!filter.departmentId || row.departmentId === filter.departmentId) &&
    (!filter.workLocationCode ||
      row.workLocationCode === filter.workLocationCode) &&
    (!filter.legalEntityCode ||
      row.legalEntityCode === filter.legalEntityCode) &&
    (!filter.employmentType || row.employmentType === filter.employmentType) &&
    (!filter.workerCategory || row.workerCategory === filter.workerCategory) &&
    (!filter.employmentStatus ||
      row.employmentStatus === filter.employmentStatus)
  )
}

export async function listComplianceDashboardRowsForOrg(
  organizationId: string,
  filter: ComplianceDashboardFilterInput = {}
): Promise<ComplianceDashboardRow[]> {
  const employees = await db
    .select({
      id: hrmEmployee.id,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
      employmentStatus: hrmEmployee.employmentStatus,
      currentDepartmentId: hrmEmployee.currentDepartmentId,
      employmentType: hrmEmployee.employmentType,
      workerCategory: hrmEmployee.workerCategory,
      countryCode: hrmEmployee.countryCode,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        isNull(hrmEmployee.archivedAt),
        ...(filter.employmentStatus
          ? [eq(hrmEmployee.employmentStatus, filter.employmentStatus)]
          : [])
      )
    )

  if (employees.length === 0) {
    return []
  }

  const employeeIds = employees.map((employee) => employee.id)
  const now = new Date()

  const [
    assignments,
    payrollProfiles,
    workAuthorizations,
    documents,
    documentRequirements,
    trainingRows,
    acknowledgements,
    openExceptions,
    policyObligations,
  ] = await Promise.all([
    db
      .select({
        employeeId: hrmEmployeeAssignment.employeeId,
        workLocationCode: hrmEmployeeAssignment.workLocationCode,
        effectiveFrom: hrmEmployeeAssignment.effectiveFrom,
      })
      .from(hrmEmployeeAssignment)
      .where(
        and(
          eq(hrmEmployeeAssignment.organizationId, organizationId),
          inArray(hrmEmployeeAssignment.employeeId, employeeIds),
          eq(hrmEmployeeAssignment.status, "active")
        )
      ),
    db
      .select({
        employeeId: hrmPayrollProfile.employeeId,
        statutoryProfileExtras: hrmPayrollProfile.statutoryProfileExtras,
      })
      .from(hrmPayrollProfile)
      .where(
        and(
          eq(hrmPayrollProfile.organizationId, organizationId),
          inArray(hrmPayrollProfile.employeeId, employeeIds),
          isNull(hrmPayrollProfile.effectiveTo)
        )
      ),
    db
      .select({
        employeeId: hrmEmployeeWorkAuthorization.employeeId,
        status: hrmEmployeeWorkAuthorization.status,
        expiresAt: hrmEmployeeWorkAuthorization.expiresAt,
      })
      .from(hrmEmployeeWorkAuthorization)
      .where(
        and(
          eq(hrmEmployeeWorkAuthorization.organizationId, organizationId),
          inArray(hrmEmployeeWorkAuthorization.employeeId, employeeIds)
        )
      ),
    db
      .select({
        employeeId: hrmDocument.employeeId,
        id: hrmDocument.id,
        documentType: hrmDocument.documentType,
        verificationStatus: hrmDocument.verificationStatus,
        documentLifecycleStatus: hrmDocument.documentLifecycleStatus,
        effectiveTo: hrmDocument.effectiveTo,
      })
      .from(hrmDocument)
      .where(
        and(
          eq(hrmDocument.organizationId, organizationId),
          inArray(hrmDocument.employeeId, employeeIds),
          eq(hrmDocument.isLatestVersion, true)
        )
      ),
    db
      .select({
        id: hrmDocumentRequirement.id,
        documentType: hrmDocumentRequirement.documentType,
        employmentType: hrmDocumentRequirement.employmentType,
        legalEntityId: hrmDocumentRequirement.legalEntityId,
        isMandatory: hrmDocumentRequirement.isMandatory,
        status: hrmDocumentRequirement.status,
      })
      .from(hrmDocumentRequirement)
      .where(
        and(
          eq(hrmDocumentRequirement.organizationId, organizationId),
          eq(hrmDocumentRequirement.status, "active")
        )
      ),
    db
      .select({
        employeeId: hrmTrainingAssignment.employeeId,
        assignmentId: hrmTrainingAssignment.id,
        assignmentState: hrmTrainingAssignment.state,
        dueAt: hrmTrainingAssignment.dueAt,
        recordCompletedAt: hrmTrainingRecord.completedAt,
        recordExpiresAt: hrmTrainingRecord.expiresAt,
      })
      .from(hrmTrainingAssignment)
      .leftJoin(
        hrmTrainingRecord,
        and(
          eq(hrmTrainingRecord.assignmentId, hrmTrainingAssignment.id),
          eq(hrmTrainingRecord.organizationId, organizationId),
          eq(hrmTrainingRecord.employeeId, hrmTrainingAssignment.employeeId)
        )
      )
      .where(
        and(
          eq(hrmTrainingAssignment.organizationId, organizationId),
          inArray(hrmTrainingAssignment.employeeId, employeeIds),
          eq(hrmTrainingAssignment.required, true)
        )
      ),
    db
      .select({
        employeeId: hrmPolicyAcknowledgement.employeeId,
        policyId: hrmPolicyAcknowledgement.policyId,
        policyVersion: hrmPolicyAcknowledgement.policyVersion,
        acknowledgedAt: hrmPolicyAcknowledgement.acknowledgedAt,
      })
      .from(hrmPolicyAcknowledgement)
      .where(
        and(
          eq(hrmPolicyAcknowledgement.organizationId, organizationId),
          inArray(hrmPolicyAcknowledgement.employeeId, employeeIds)
        )
      ),
    db
      .select({
        employeeId: hrmComplianceException.employeeId,
        id: hrmComplianceException.id,
      })
      .from(hrmComplianceException)
      .where(
        and(
          eq(hrmComplianceException.organizationId, organizationId),
          inArray(hrmComplianceException.employeeId, employeeIds),
          isNull(hrmComplianceException.resolvedAt),
          isNull(hrmComplianceException.waivedAt)
        )
      ),
    listActivePolicyAcknowledgementObligations({ organizationId, now }),
  ])

  const workLocationByEmployee = new Map<string, string | null>()
  for (const assignment of assignments.sort(
    (left, right) =>
      right.effectiveFrom.getTime() - left.effectiveFrom.getTime()
  )) {
    if (!workLocationByEmployee.has(assignment.employeeId)) {
      workLocationByEmployee.set(
        assignment.employeeId,
        assignment.workLocationCode ?? null
      )
    }
  }

  const legalEntityByEmployee = new Map<string, string | null>()
  for (const profile of payrollProfiles) {
    legalEntityByEmployee.set(
      profile.employeeId,
      readLegalEntityCode(profile.statutoryProfileExtras)
    )
  }

  const workAuthByEmployee = new Map<string, typeof workAuthorizations>()
  for (const row of workAuthorizations) {
    const bucket = workAuthByEmployee.get(row.employeeId) ?? []
    bucket.push(row)
    workAuthByEmployee.set(row.employeeId, bucket)
  }

  const docsByEmployee = new Map<string, typeof documents>()
  for (const row of documents) {
    if (!row.employeeId) continue
    const bucket = docsByEmployee.get(row.employeeId) ?? []
    bucket.push(row)
    docsByEmployee.set(row.employeeId, bucket)
  }

  const trainingByEmployee = new Map<string, typeof trainingRows>()
  for (const row of trainingRows) {
    const bucket = trainingByEmployee.get(row.employeeId) ?? []
    bucket.push(row)
    trainingByEmployee.set(row.employeeId, bucket)
  }

  const acknowledgementByEmployee = new Map<string, typeof acknowledgements>()
  for (const row of acknowledgements) {
    const bucket = acknowledgementByEmployee.get(row.employeeId) ?? []
    bucket.push(row)
    acknowledgementByEmployee.set(row.employeeId, bucket)
  }

  const openExceptionCountByEmployee = new Map<string, number>()
  for (const row of openExceptions) {
    if (!row.employeeId) continue
    openExceptionCountByEmployee.set(
      row.employeeId,
      (openExceptionCountByEmployee.get(row.employeeId) ?? 0) + 1
    )
  }

  const rows: ComplianceDashboardRow[] = employees.map((employee) => {
    const legalEntityCode = legalEntityByEmployee.get(employee.id) ?? null
    const workLocationCode = workLocationByEmployee.get(employee.id) ?? null
    const scope: EmployeeComplianceScope = {
      countryCode: employee.countryCode,
      legalEntityCode,
      departmentId: employee.currentDepartmentId,
      workLocationCode,
      employmentType: employee.employmentType,
      workerCategory: employee.workerCategory,
    }

    const employeeWorkStatuses = (workAuthByEmployee.get(employee.id) ?? []).map(
      (row) =>
        deriveWorkAuthorizationComplianceStatus({
          status: row.status,
          expiresAt: row.expiresAt,
          now,
        })
    )

    const employeeDocs = docsByEmployee.get(employee.id) ?? []
    const employeeDocumentStatuses = employeeDocs.map((row) =>
      deriveDocumentComplianceStatus({
        verificationStatus: deriveEffectiveDocumentVerificationStatus({
          verificationStatus: row.verificationStatus,
          documentLifecycleStatus: row.documentLifecycleStatus,
          effectiveTo: row.effectiveTo,
          now,
        }),
        effectiveTo: row.effectiveTo,
        now,
      })
    )

    const documentTypes = new Set(employeeDocs.map((row) => row.documentType))
    const missingRequirementCount = documentRequirements.filter(
      (requirement) =>
        requirement.isMandatory &&
        (!requirement.employmentType ||
          requirement.employmentType === employee.employmentType) &&
        (!requirement.legalEntityId ||
          requirement.legalEntityId === legalEntityCode) &&
        !documentTypes.has(requirement.documentType)
    ).length

    const employeeTrainingStatuses = (
      trainingByEmployee.get(employee.id) ?? []
    ).map((row) =>
      deriveTrainingComplianceStatus({
        completedAt:
          row.recordCompletedAt ??
          (row.assignmentState === "completed" ? row.dueAt : null),
        certificationExpiryDate: row.recordExpiresAt,
        dueDate: row.dueAt,
        now,
      })
    )

    const ackMap = new Map(
      (acknowledgementByEmployee.get(employee.id) ?? []).map((row) => [
        row.policyId,
        row,
      ])
    )
    const acknowledgementStatuses: HrmComplianceStatus[] = []
    let missingAcknowledgementCount = 0
    for (const obligation of policyObligations) {
      if (!appliesComplianceObligationToEmployee(obligation, scope)) {
        continue
      }
      const acknowledged = obligation.policyId
        ? ackMap.get(obligation.policyId)
        : undefined
      const status = deriveAcknowledgementComplianceStatus({
        acknowledgedAt: acknowledged?.acknowledgedAt ?? null,
        acknowledgedPolicyVersion: acknowledged?.policyVersion ?? null,
        currentPolicyVersion: obligation.policyVersion ?? "current",
        acknowledgementDeadline: obligation.acknowledgementDeadline,
        now,
      })
      acknowledgementStatuses.push(status)
      if (status !== "compliant") {
        missingAcknowledgementCount += 1
      }
    }

    const openExceptionCount = openExceptionCountByEmployee.get(employee.id) ?? 0
    const overallStatus = deriveComplianceDashboardOverallStatus({
      workStatuses: employeeWorkStatuses,
      documentStatuses: [
        ...employeeDocumentStatuses,
        ...Array.from(
          { length: missingRequirementCount },
          (): HrmComplianceStatus => "non_compliant"
        ),
      ],
      trainingStatuses: employeeTrainingStatuses,
      acknowledgementStatuses,
      openExceptionCount,
    })

    return {
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
      legalName: employee.legalName,
      employmentStatus: employee.employmentStatus,
      departmentId: employee.currentDepartmentId,
      workLocationCode,
      legalEntityCode,
      employmentType: employee.employmentType,
      workerCategory: employee.workerCategory,
      overallStatus,
      workAuthorizationExpired: employeeWorkStatuses.filter(
        (status) => status === "expired" || status === "non_compliant"
      ).length,
      documentMissing: missingRequirementCount,
      documentExpired: employeeDocumentStatuses.filter(
        (status) => status === "expired" || status === "non_compliant"
      ).length,
      documentPendingVerification: employeeDocumentStatuses.filter(
        (status) => status === "pending"
      ).length,
      trainingOverdue: employeeTrainingStatuses.filter(
        (status) => status === "overdue"
      ).length,
      trainingExpired: employeeTrainingStatuses.filter(
        (status) => status === "expired"
      ).length,
      missingAcknowledgementCount,
      openExceptionCount,
    }
  })

  return rows
    .filter((row) => matchesFilter(row, filter))
    .sort((left, right) => right.openExceptionCount - left.openExceptionCount)
}
