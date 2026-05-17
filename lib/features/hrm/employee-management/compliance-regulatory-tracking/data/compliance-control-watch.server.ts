import "server-only"

import { and, eq, inArray, isNull, lt } from "drizzle-orm"

import { writeIamAuditEvent } from "#lib/auth"
import { db } from "#lib/db"
import {
  hrmComplianceFiling,
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
import type { CronTickScannedEmittedSummary } from "#lib/erp/cron-tick.shared"

import { deriveEffectiveDocumentVerificationStatus } from "../../documents-management/data/hrm-document-governance.shared"
import { HRM_COMPLIANCE_REGULATORY_AUDIT } from "../compliance-regulatory.contract"
import {
  upsertAutoComplianceException,
} from "./compliance-exception.mutations.server"
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
} from "./compliance-status.shared"

export type ComplianceControlWatchTickSummary =
  CronTickScannedEmittedSummary & {
    readonly scannedOrganizations: number
    readonly overdueFilings: number
  }

function readLegalEntityCode(extras: unknown): string | null {
  if (typeof extras !== "object" || extras === null || Array.isArray(extras)) {
    return null
  }
  const raw = (extras as Record<string, unknown>).legalEntityCode
  return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null
}

async function writeExceptionAudit(params: {
  readonly action: string
  readonly organizationId: string
  readonly resourceId: string
  readonly metadata?: Record<string, unknown>
}) {
  await writeIamAuditEvent({
    action: params.action,
    actorUserId: null,
    actorSessionId: null,
    organizationId: params.organizationId,
    resourceType: "hrm_compliance_exception",
    resourceId: params.resourceId,
    metadata: params.metadata,
  })
}

export async function runComplianceControlWatchTick(): Promise<ComplianceControlWatchTickSummary> {
  const organizations = await db
    .selectDistinct({ organizationId: hrmEmployee.organizationId })
    .from(hrmEmployee)

  let scanned = 0
  let emitted = 0
  let overdueFilings = 0

  for (const { organizationId } of organizations) {
    const employees = await db
      .select({
        id: hrmEmployee.id,
        legalName: hrmEmployee.legalName,
        currentDepartmentId: hrmEmployee.currentDepartmentId,
        employmentType: hrmEmployee.employmentType,
        workerCategory: hrmEmployee.workerCategory,
        countryCode: hrmEmployee.countryCode,
      })
      .from(hrmEmployee)
      .where(
        and(
          eq(hrmEmployee.organizationId, organizationId),
          isNull(hrmEmployee.archivedAt)
        )
      )

    const employeeIds = employees.map((employee) => employee.id)
    if (employeeIds.length === 0) {
      continue
    }

    scanned += employees.length

    const [
      assignments,
      payrollProfiles,
      workAuthorizations,
      documents,
      requirements,
      trainingRows,
      acknowledgements,
      policyObligations,
      overdueOpenFilings,
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
          id: hrmEmployeeWorkAuthorization.id,
          employeeId: hrmEmployeeWorkAuthorization.employeeId,
          authorizationType: hrmEmployeeWorkAuthorization.authorizationType,
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
          id: hrmDocument.id,
          employeeId: hrmDocument.employeeId,
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
          name: hrmDocumentRequirement.name,
          documentType: hrmDocumentRequirement.documentType,
          employmentType: hrmDocumentRequirement.employmentType,
          legalEntityId: hrmDocumentRequirement.legalEntityId,
          isMandatory: hrmDocumentRequirement.isMandatory,
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
          assignmentId: hrmTrainingAssignment.id,
          employeeId: hrmTrainingAssignment.employeeId,
          courseId: hrmTrainingAssignment.courseId,
          dueAt: hrmTrainingAssignment.dueAt,
          assignmentState: hrmTrainingAssignment.state,
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
      listActivePolicyAcknowledgementObligations({ organizationId }),
      db
        .select({
          id: hrmComplianceFiling.id,
          title: hrmComplianceFiling.title,
          dueDate: hrmComplianceFiling.dueDate,
        })
        .from(hrmComplianceFiling)
        .where(
          and(
            eq(hrmComplianceFiling.organizationId, organizationId),
            eq(hrmComplianceFiling.status, "pending"),
            lt(hrmComplianceFiling.dueDate, new Date())
          )
        ),
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

    const acknowledgementByEmployee = new Map<string, typeof acknowledgements>()
    for (const row of acknowledgements) {
      const bucket = acknowledgementByEmployee.get(row.employeeId) ?? []
      bucket.push(row)
      acknowledgementByEmployee.set(row.employeeId, bucket)
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

    for (const filing of overdueOpenFilings) {
      const [updated] = await db
        .update(hrmComplianceFiling)
        .set({ status: "overdue", updatedAt: new Date() })
        .where(
          and(
            eq(hrmComplianceFiling.organizationId, organizationId),
            eq(hrmComplianceFiling.id, filing.id),
            eq(hrmComplianceFiling.status, "pending")
          )
        )
        .returning({ id: hrmComplianceFiling.id })

      if (updated) {
        overdueFilings += 1
        await writeIamAuditEvent({
          action: HRM_COMPLIANCE_REGULATORY_AUDIT.filing.overdue,
          actorUserId: null,
          actorSessionId: null,
          organizationId,
          resourceType: "hrm_compliance_filing",
          resourceId: filing.id,
          metadata: { dueDate: filing.dueDate.toISOString(), title: filing.title },
        })
        const exception = await db.transaction((tx) =>
          upsertAutoComplianceException(tx, {
            organizationId,
            employeeId: null,
            complianceArea: "filing",
            itemType: "overdue_filing",
            sourceReferenceId: filing.id,
            title: `Overdue filing: ${filing.title}`,
            severity: "overdue",
          })
        )
        if (exception.created) {
          emitted += 1
          await writeExceptionAudit({
            action: HRM_COMPLIANCE_REGULATORY_AUDIT.exception.created,
            organizationId,
            resourceId: exception.id,
            metadata: { complianceArea: "filing", sourceReferenceId: filing.id },
          })
        }
      }
    }

    for (const employee of employees) {
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

      for (const authorization of workAuthorizations.filter(
        (row) => row.employeeId === employee.id
      )) {
        const status = deriveWorkAuthorizationComplianceStatus({
          status: authorization.status,
          expiresAt: authorization.expiresAt,
        })
        if (!["expired", "non_compliant"].includes(status)) continue

        const exception = await db.transaction((tx) =>
          upsertAutoComplianceException(tx, {
            organizationId,
            employeeId: employee.id,
            complianceArea: "work_authorization",
            itemType: authorization.authorizationType,
            sourceReferenceId: authorization.id,
            title: `Work authorization requires attention: ${authorization.authorizationType}`,
            severity: status === "expired" ? "expired" : "non_compliant",
          })
        )
        if (exception.created) {
          emitted += 1
          await writeExceptionAudit({
            action: HRM_COMPLIANCE_REGULATORY_AUDIT.exception.created,
            organizationId,
            resourceId: exception.id,
            metadata: { complianceArea: "work_authorization" },
          })
        }
      }

      const employeeDocs = docsByEmployee.get(employee.id) ?? []
      const employeeDocumentTypes = new Set(
        employeeDocs.map((document) => document.documentType)
      )
      for (const requirement of requirements) {
        if (
          !requirement.isMandatory ||
          (requirement.employmentType &&
            requirement.employmentType !== employee.employmentType) ||
          (requirement.legalEntityId &&
            requirement.legalEntityId !== legalEntityCode) ||
          employeeDocumentTypes.has(requirement.documentType)
        ) {
          continue
        }

        const exception = await db.transaction((tx) =>
          upsertAutoComplianceException(tx, {
            organizationId,
            employeeId: employee.id,
            complianceArea: "document",
            itemType: requirement.documentType,
            sourceReferenceId: `${employee.id}:${requirement.id}`,
            title: `Missing mandatory document: ${requirement.name}`,
            severity: "missing",
          })
        )
        if (exception.created) {
          emitted += 1
          await writeExceptionAudit({
            action: HRM_COMPLIANCE_REGULATORY_AUDIT.exception.created,
            organizationId,
            resourceId: exception.id,
            metadata: { complianceArea: "document" },
          })
        }
      }

      for (const document of employeeDocs) {
        const status = deriveDocumentComplianceStatus({
          verificationStatus: deriveEffectiveDocumentVerificationStatus({
            verificationStatus: document.verificationStatus,
            documentLifecycleStatus: document.documentLifecycleStatus,
            effectiveTo: document.effectiveTo,
            now: new Date(),
          }),
          effectiveTo: document.effectiveTo,
        })
        if (!["expired", "non_compliant"].includes(status)) continue

        const exception = await db.transaction((tx) =>
          upsertAutoComplianceException(tx, {
            organizationId,
            employeeId: employee.id,
            complianceArea: "document",
            itemType: document.documentType,
            sourceReferenceId: document.id,
            title: `Expired or rejected document: ${document.documentType}`,
            severity: status === "expired" ? "expired" : "non_compliant",
          })
        )
        if (exception.created) {
          emitted += 1
          await writeExceptionAudit({
            action: HRM_COMPLIANCE_REGULATORY_AUDIT.exception.created,
            organizationId,
            resourceId: exception.id,
            metadata: { complianceArea: "document" },
          })
        }
      }

      for (const training of trainingByEmployee.get(employee.id) ?? []) {
        const status = deriveTrainingComplianceStatus({
          completedAt:
            training.recordCompletedAt ??
            (training.assignmentState === "completed" ? training.dueAt : null),
          certificationExpiryDate: training.recordExpiresAt,
          dueDate: training.dueAt,
        })
        if (!["overdue", "expired"].includes(status)) continue

        const exception = await db.transaction((tx) =>
          upsertAutoComplianceException(tx, {
            organizationId,
            employeeId: employee.id,
            complianceArea: "training",
            itemType: "mandatory_training",
            sourceReferenceId: training.assignmentId,
            title: "Mandatory training is overdue or certification expired",
            severity: status,
          })
        )
        if (exception.created) {
          emitted += 1
          await writeExceptionAudit({
            action: HRM_COMPLIANCE_REGULATORY_AUDIT.exception.created,
            organizationId,
            resourceId: exception.id,
            metadata: { complianceArea: "training" },
          })
        }
      }

      const ackMap = new Map(
        (acknowledgementByEmployee.get(employee.id) ?? []).map((row) => [
          row.policyId,
          row,
        ])
      )
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
        })
        if (status === "compliant") continue

        const sourceReferenceId = `${employee.id}:${obligation.id}`
        const exception = await db.transaction((tx) =>
          upsertAutoComplianceException(tx, {
            organizationId,
            employeeId: employee.id,
            complianceArea: "acknowledgement",
            itemType: obligation.policyId ?? obligation.code,
            sourceReferenceId,
            title: `Missing policy acknowledgement: ${obligation.title}`,
            severity: status === "overdue" ? "overdue" : "pending",
          })
        )
        if (exception.created) {
          emitted += 1
          await writeExceptionAudit({
            action: HRM_COMPLIANCE_REGULATORY_AUDIT.exception.created,
            organizationId,
            resourceId: exception.id,
            metadata: { complianceArea: "acknowledgement" },
          })
        }
      }
    }
  }

  return {
    scanned,
    emitted,
    scannedOrganizations: organizations.length,
    overdueFilings,
  }
}
