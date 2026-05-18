import { getFormatter, getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#features/governed-surface"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { requireOrgSession } from "#lib/auth"

import {
  submitArchiveTrainingCourse,
  submitCreateTrainingCategory,
  submitCreateTrainingCourse,
} from "../actions/training-course.actions"
import {
  submitRemoveTrainingPrerequisite,
  submitSetTrainingPrerequisite,
} from "../actions/training-prerequisite.actions"
import {
  submitAssignTraining,
  submitCancelTrainingAssignment,
  submitWaiveTrainingAssignment,
} from "../actions/training-assignment.actions"
import {
  submitCloseTrainingSession,
  submitCreateTrainingSession,
  submitRecordSessionAttendance,
} from "../actions/training-session.actions"
import {
  submitCompleteTrainingRecord,
} from "../actions/training-record.actions"
import { listActiveEmployeeChoicesForLeave } from "../../../time-attendance/leave-attendance-management/data/leave-request.queries.server"
import { listSkillsForOrg } from "../../competency-skills-framework/data/skill.queries.server"
import { listAllPrerequisitesForOrg } from "../data/training-prerequisite.server"
import {
  listTrainingAssignmentsForOrg,
  listTrainingCategoriesForOrg,
  listTrainingCoursesForOrg,
  listTrainingRecordsForOrg,
  listTrainingSessionsForOrg,
} from "../data/training.queries.server"

import { TrainingAnalyticsSection } from "./training-analytics-section"
import { TrainingAssignmentSection } from "./training-assignment-section"
import { TrainingCatalogSection } from "./training-catalog-section"
import { TrainingFeedbackSection } from "./training-feedback-section"
import { TrainingOrgRecordsListSection } from "./training-org-records-list-section"
import { TrainingPrerequisitesListSection } from "./training-prerequisites-list-section"
import { TrainingSessionRosterSection } from "./training-session-roster-section"

type HrmTrainingPageProps = {
  orgSlug: string
  isHrmAdmin: boolean
}

export async function HrmTrainingPage({
  orgSlug,
  isHrmAdmin,
}: HrmTrainingPageProps) {
  const session = await requireOrgSession()
  const organizationId = session.organizationId

  const [
    t,
    format,
    categories,
    courses,
    sessions,
    assignments,
    records,
    employees,
    skills,
    prerequisites,
  ] = await Promise.all([
    getTranslations("Dashboard.Hrm.training"),
    getFormatter(),
    listTrainingCategoriesForOrg(organizationId),
    listTrainingCoursesForOrg(organizationId),
    listTrainingSessionsForOrg(organizationId),
    listTrainingAssignmentsForOrg(organizationId, {
      states: ["assigned", "overdue"],
    }),
    listTrainingRecordsForOrg(organizationId),
    listActiveEmployeeChoicesForLeave(organizationId),
    listSkillsForOrg(organizationId, { includeArchived: false }),
    listAllPrerequisitesForOrg(organizationId),
  ])

  const courseNameById = Object.fromEntries(
    courses.map((c) => [c.id, `${c.code} — ${c.name}`])
  )

  const activeCourses = courses.filter((c) => c.state === "active")

  return (
    <div className="flex flex-col gap-6 p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      {isHrmAdmin ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">{t("categoryTitle")}</CardTitle>
              <CardDescription>{t("categoryDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={submitCreateTrainingCategory}
                className="grid max-w-md gap-3"
              >
                <input
                  type="hidden"
                  name="organizationId"
                  value={organizationId}
                />
                <input type="hidden" name="orgSlug" value={orgSlug} />
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">
                    {t("fieldCode")}
                  </span>
                  <input
                    name="code"
                    required
                    className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">
                    {t("fieldName")}
                  </span>
                  <input
                    name="name"
                    required
                    className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                  />
                </label>
                <button
                  type="submit"
                  className="inline-flex h-9 w-fit items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                  {t("createCategory")}
                </button>
              </form>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">{t("courseTitle")}</CardTitle>
              <CardDescription>{t("courseDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={submitCreateTrainingCourse}
                className="grid max-w-md gap-3"
              >
                <input
                  type="hidden"
                  name="organizationId"
                  value={organizationId}
                />
                <input type="hidden" name="orgSlug" value={orgSlug} />
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">
                    {t("fieldCode")}
                  </span>
                  <input
                    name="code"
                    required
                    className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">
                    {t("fieldName")}
                  </span>
                  <input
                    name="name"
                    required
                    className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">
                    {t("fieldCategory")}
                  </span>
                  <select
                    name="categoryId"
                    className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">{t("noCategory")}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">
                    {t("fieldDelivery")}
                  </span>
                  <select
                    name="deliveryMode"
                    defaultValue="classroom"
                    className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="classroom">{t("deliveryClassroom")}</option>
                    <option value="online">{t("deliveryOnline")}</option>
                    <option value="virtual">{t("deliveryVirtual")}</option>
                    <option value="external">{t("deliveryExternal")}</option>
                    <option value="self_paced">{t("deliverySelfPaced")}</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="statutoryFlag" />
                  {t("fieldStatutory")}
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">
                    {t("fieldAuthority")}
                  </span>
                  <input
                    name="statutoryAuthorityCode"
                    placeholder="MY-DOSH"
                    className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">
                    {t("fieldRecertMonths")}
                  </span>
                  <input
                    name="recertificationIntervalMonths"
                    type="number"
                    min={0}
                    className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">
                    {t("fieldGrantsSkill")}
                  </span>
                  <select
                    name="grantsSkillId"
                    className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">{t("noGrantsSkill")}</option>
                    {skills.map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.code} — {skill.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  className="inline-flex h-9 w-fit items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                  {t("createCourse")}
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {isHrmAdmin ? (
        <>
          <TrainingAnalyticsSection organizationId={organizationId} />
          <TrainingFeedbackSection organizationId={organizationId} />
        </>
      ) : null}

      <TrainingCatalogSection
        courses={courses}
        orgSlug={orgSlug}
        organizationId={organizationId}
        isHrmAdmin={isHrmAdmin}
        archiveAction={submitArchiveTrainingCourse}
        labels={{
          catalogTitle: t("catalogTitle"),
          catalogDescription: t("catalogDescription"),
          colCode: t("colCode"),
          colName: t("colName"),
          colDelivery: t("colDelivery"),
          colStatutory: t("colStatutory"),
          colState: t("colState"),
          empty: t("catalogEmpty"),
          archive: t("archiveCourse"),
        }}
      />

      {isHrmAdmin ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">
              {t("prerequisiteTitle")}
            </CardTitle>
            <CardDescription>{t("prerequisiteDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <TrainingPrerequisitesListSection
              prerequisites={prerequisites}
              courseNameById={courseNameById}
              organizationId={organizationId}
              orgSlug={orgSlug}
              isHrmAdmin={isHrmAdmin}
              removeAction={submitRemoveTrainingPrerequisite}
            />

            {/* Add prerequisite form */}
            <form
              action={submitSetTrainingPrerequisite}
              className="grid max-w-2xl gap-3 md:grid-cols-2"
            >
              <input
                type="hidden"
                name="organizationId"
                value={organizationId}
              />
              <input type="hidden" name="orgSlug" value={orgSlug} />
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">
                  {t("prerequisiteCourse")}
                </span>
                <select
                  name="courseId"
                  required
                  className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {activeCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} — {course.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">
                  {t("prerequisiteRequires")}
                </span>
                <select
                  name="prerequisiteCourseId"
                  required
                  className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {activeCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} — {course.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="inline-flex h-9 w-fit items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground md:col-span-2"
              >
                {t("prerequisiteAdd")}
              </button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {isHrmAdmin ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">{t("sessionTitle")}</CardTitle>
            <CardDescription>{t("sessionDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <form
              action={submitCreateTrainingSession}
              className="grid max-w-2xl gap-3 md:grid-cols-2"
            >
              <input
                type="hidden"
                name="organizationId"
                value={organizationId}
              />
              <input type="hidden" name="orgSlug" value={orgSlug} />
              <label className="grid gap-1 text-sm md:col-span-2">
                <span className="text-muted-foreground">
                  {t("fieldCourse")}
                </span>
                <select
                  name="courseId"
                  required
                  className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {activeCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} — {course.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">{t("fieldCode")}</span>
                <input
                  name="code"
                  required
                  className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">
                  {t("fieldSessionTitle")}
                </span>
                <input
                  name="title"
                  required
                  className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">{t("fieldStart")}</span>
                <input
                  name="scheduledStartAt"
                  type="datetime-local"
                  required
                  className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">{t("fieldEnd")}</span>
                <input
                  name="scheduledEndAt"
                  type="datetime-local"
                  required
                  className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
              </label>
              <label className="grid gap-1 text-sm md:col-span-2">
                <span className="text-muted-foreground">
                  {t("fieldLocation")}
                </span>
                <input
                  name="location"
                  required
                  className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
              </label>
              <button
                type="submit"
                className="inline-flex h-9 w-fit items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground md:col-span-2"
              >
                {t("scheduleSession")}
              </button>
            </form>

            <TrainingSessionRosterSection
              sessions={sessions}
              assignments={assignments}
              orgSlug={orgSlug}
              organizationId={organizationId}
              employees={employees}
              formatDateTime={(value) =>
                format.dateTime(value, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              }
              assignAction={submitAssignTraining}
              attendanceAction={submitRecordSessionAttendance}
              closeAction={submitCloseTrainingSession}
              labels={{
                colEmployee: t("colEmployee"),
                colAttendance: t("colRoster"),
                colState: t("colState"),
                closeSession: t("closeSession"),
                markPresent: t("markPresent"),
                assignToSession: t("assignToSession"),
                empty: t("sessionsEmpty"),
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      <TrainingAssignmentSection
        assignments={assignments}
        courses={activeCourses}
        employees={employees}
        orgSlug={orgSlug}
        organizationId={organizationId}
        isHrmAdmin={isHrmAdmin}
        assignAction={submitAssignTraining}
        waiveAction={submitWaiveTrainingAssignment}
        cancelAction={submitCancelTrainingAssignment}
        completeAction={submitCompleteTrainingRecord}
        formatDate={(value) =>
          value ? format.dateTime(value, { dateStyle: "medium" }) : "—"
        }
        labels={{
          boardTitle: t("assignmentTitle"),
          boardDescription: t("assignmentDescription"),
          colEmployee: t("colEmployee"),
          colCourse: t("colCourse"),
          colDue: t("colDue"),
          colState: t("colState"),
          colPriority: t("colPriority"),
          assign: t("assignTraining"),
          waive: t("waiveAssignment"),
          cancel: t("cancelAssignment"),
          complete: t("completeTraining"),
          empty: t("assignmentsEmpty"),
        }}
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("recordsTitle")}</CardTitle>
          <CardDescription>{t("recordsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <TrainingOrgRecordsListSection
            records={records}
            orgSlug={orgSlug}
            organizationId={organizationId}
            isHrmAdmin={isHrmAdmin}
            formatDate={(value) =>
              format.dateTime(value, { dateStyle: "medium" })
            }
            labels={{
              empty: t("recordsEmpty"),
              colEmployee: t("colEmployee"),
              colCourse: t("colCourse"),
              colCompleted: t("colCompleted"),
              colVerification: t("colState"),
              colExpires: t("expires"),
              verifyRecord: t("verifyRecord"),
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
