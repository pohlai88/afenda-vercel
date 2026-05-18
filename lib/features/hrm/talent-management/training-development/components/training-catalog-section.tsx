import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildTrainingCatalogListSurfaceConfiguration } from "../data/training-list-surface.server"
import type { HrmTrainingCourseRow } from "../data/training.types.shared"

import { TrainingCourseArchiveButton } from "./training-course-archive-button.client"

type TrainingCatalogSectionProps = {
  courses: readonly HrmTrainingCourseRow[]
  orgSlug: string
  organizationId: string
  isHrmAdmin: boolean
  archiveAction: (formData: FormData) => void | Promise<void>
  labels: {
    catalogTitle: string
    catalogDescription: string
    colCode: string
    colName: string
    colDelivery: string
    colStatutory: string
    colState: string
    empty: string
    archive: string
  }
}

export async function TrainingCatalogSection({
  courses,
  orgSlug,
  organizationId,
  isHrmAdmin,
  archiveAction,
  labels,
}: TrainingCatalogSectionProps) {
  const listConfiguration = buildTrainingCatalogListSurfaceConfiguration(
    courses,
    labels
  )
  const courseById = new Map(courses.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      title={labels.catalogTitle}
      description={labels.catalogDescription}
      listConfiguration={listConfiguration}
      surfaceKey="hrm:training:catalog"
      cardClassName="mt-0"
      trailingColumn={
        isHrmAdmin
          ? {
              header: "",
              render: (surfaceRow) => {
                const course = courseById.get(surfaceRow.id)
                if (!course || course.state !== "active") return null
                return (
                  <TrainingCourseArchiveButton
                    organizationId={organizationId}
                    orgSlug={orgSlug}
                    courseId={course.id}
                    archiveAction={archiveAction}
                    label={labels.archive}
                  />
                )
              },
            }
          : undefined
      }
    />
  )
}
