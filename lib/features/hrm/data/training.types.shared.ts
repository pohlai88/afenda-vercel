export type HrmTrainingCategoryRow = {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly description: string | null
  readonly archivedAt: Date | null
}

export type HrmTrainingCourseRow = {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly description: string | null
  readonly categoryId: string | null
  readonly categoryName: string | null
  readonly deliveryMode: string
  readonly defaultDurationHours: string | null
  readonly defaultCreditUnits: string | null
  readonly statutoryFlag: boolean
  readonly statutoryAuthorityCode: string | null
  readonly recertificationIntervalMonths: number | null
  readonly defaultRequired: boolean
  readonly grantsSkillId: string | null
  readonly state: string
}

export type HrmTrainingSessionRow = {
  readonly id: string
  readonly courseId: string
  readonly courseCode: string
  readonly courseName: string
  readonly code: string
  readonly title: string
  readonly scheduledStartAt: Date
  readonly scheduledEndAt: Date
  readonly location: string
  readonly meetingUrl: string | null
  readonly trainerName: string | null
  readonly state: string
  readonly rosterCount: number
}

export type HrmTrainingAssignmentRow = {
  readonly id: string
  readonly courseId: string
  readonly courseCode: string
  readonly courseName: string
  readonly sessionId: string | null
  readonly sessionTitle: string | null
  readonly employeeId: string
  readonly employeeNumber: string
  readonly employeeName: string
  readonly assignedAt: Date
  readonly dueAt: Date | null
  readonly required: boolean
  readonly state: string
  readonly attendance: string | null
  readonly priority: string
  readonly sourceKind: string
}

export type HrmTrainingRecord = {
  readonly id: string
  readonly organizationId: string
  readonly assignmentId: string | null
  readonly sessionId: string | null
  readonly courseId: string
  readonly courseCode: string
  readonly courseName: string
  readonly employeeId: string
  readonly employeeNumber: string
  readonly employeeName: string
  readonly completedAt: Date
  readonly expiresAt: Date | null
  readonly verificationState: string
  readonly statutoryFlag: boolean
  readonly statutoryAuthorityCode: string | null
  readonly recertificationIntervalMonths: number | null
  readonly certificateDocumentId: string | null
  readonly feedbackRating: number | null
  readonly feedbackText: string | null
}

export type TrainingMutationFormState =
  | { ok: true; id?: string }
  | {
      ok: false
      errors: {
        form?: string
        courseId?: string
        sessionId?: string
        assignmentId?: string
        recordId?: string
        employeeId?: string
      }
    }
