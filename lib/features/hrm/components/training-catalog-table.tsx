import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table"

import type {
  HrmTrainingCategoryRow,
  HrmTrainingCourseRow,
} from "../data/training.types.shared"
type TrainingCatalogTableProps = {
  courses: readonly HrmTrainingCourseRow[]
  categories: readonly HrmTrainingCategoryRow[]
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

export function TrainingCatalogTable({
  courses,
  orgSlug,
  organizationId,
  isHrmAdmin,
  archiveAction,
  labels,
}: TrainingCatalogTableProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">{labels.catalogTitle}</CardTitle>
        <CardDescription>{labels.catalogDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        {courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.colCode}</TableHead>
                <TableHead>{labels.colName}</TableHead>
                <TableHead>{labels.colDelivery}</TableHead>
                <TableHead>{labels.colStatutory}</TableHead>
                <TableHead>{labels.colState}</TableHead>
                {isHrmAdmin ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-mono text-xs">
                    {course.code}
                  </TableCell>
                  <TableCell>{course.name}</TableCell>
                  <TableCell>{course.deliveryMode}</TableCell>
                  <TableCell>
                    {course.statutoryFlag
                      ? (course.statutoryAuthorityCode ?? "yes")
                      : "—"}
                  </TableCell>
                  <TableCell>{course.state}</TableCell>
                  {isHrmAdmin && course.state === "active" ? (
                    <TableCell>
                      <form action={archiveAction}>
                        <input
                          type="hidden"
                          name="organizationId"
                          value={organizationId}
                        />
                        <input type="hidden" name="orgSlug" value={orgSlug} />
                        <input
                          type="hidden"
                          name="courseId"
                          value={course.id}
                        />
                        <button
                          type="submit"
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          {labels.archive}
                        </button>
                      </form>
                    </TableCell>
                  ) : isHrmAdmin ? (
                    <TableCell />
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
