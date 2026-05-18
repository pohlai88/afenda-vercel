import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildTrainingOrgRecordsListSurfaceConfiguration } from "../data/training-list-surface.server"
import type { HrmTrainingRecord } from "../data/training.types.shared"

import { TrainingRecordVerifyButton } from "./training-record-verify-button.client"

type TrainingOrgRecordsListSectionProps = {
  records: readonly HrmTrainingRecord[]
  orgSlug: string
  organizationId: string
  isHrmAdmin: boolean
  labels: {
    empty: string
    colEmployee: string
    colCourse: string
    colCompleted: string
    colVerification: string
    colExpires: string
    verifyRecord: string
  }
  formatDate: (value: Date) => string
}

export async function TrainingOrgRecordsListSection({
  records,
  orgSlug,
  organizationId,
  isHrmAdmin,
  labels,
  formatDate,
}: TrainingOrgRecordsListSectionProps) {
  const listConfiguration = buildTrainingOrgRecordsListSurfaceConfiguration(
    records,
    {
      ...labels,
      formatDate,
    }
  )

  const recordById = new Map(records.map((record) => [record.id, record]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:training:org-records"
      trailingColumn={
        isHrmAdmin
          ? {
              header: " ",
              render: (surfaceRow) => {
                const record = recordById.get(surfaceRow.id)
                if (!record || record.verificationState !== "self_attested") {
                  return null
                }
                return (
                  <TrainingRecordVerifyButton
                    organizationId={organizationId}
                    orgSlug={orgSlug}
                    recordId={record.id}
                    label={labels.verifyRecord}
                  />
                )
              },
            }
          : undefined
      }
    />
  )
}
