import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#components/module-page-header"
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
import { requireOrgSession } from "#lib/tenant"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

import {
  HrmAcknowledgePerformanceReviewForm,
  HrmCreateReviewCycleForm,
  HrmSubmitPerformanceReviewForm,
} from "./hrm-performance-review-forms"
import {
  listPerformanceReviewsForOrg,
  listReviewCyclesForOrg,
} from "../data/performance.queries.server"
import { HRM_REVIEW_ROW_STATE } from "../schemas/performance.schema"

type HrmPerformancePageProps = {
  orgSlug: string
}

export async function HrmPerformancePage({ orgSlug }: HrmPerformancePageProps) {
  const session = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.performance")
  const isAdmin = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "performance",
    function: "update",
  })

  const [cycles, reviews] = await Promise.all([
    listReviewCyclesForOrg(session.organizationId),
    listPerformanceReviewsForOrg(session.organizationId),
  ])

  return (
    <div className="p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      {isAdmin ? (
        <Card className="mt-6 border-solid border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold tracking-tight">
              {t("createCycleTitle")}
            </CardTitle>
            <CardDescription>{t("createCycleDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <HrmCreateReviewCycleForm orgSlug={orgSlug} />
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6 border-solid border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold tracking-tight">
            {t("cyclesTitle")}
          </CardTitle>
          <CardDescription>{t("cyclesDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {cycles.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("cyclesEmpty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colCycleName")}</TableHead>
                  <TableHead>{t("colPeriod")}</TableHead>
                  <TableHead>{t("colState")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycles.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.periodStart.toISOString().slice(0, 10)} —{" "}
                      {c.periodEnd.toISOString().slice(0, 10)}
                    </TableCell>
                    <TableCell>{c.state}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 border-solid border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold tracking-tight">
            {t("reviewsTitle")}
          </CardTitle>
          <CardDescription>{t("reviewsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("reviewsEmpty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colCycle")}</TableHead>
                  <TableHead>{t("colEmployee")}</TableHead>
                  <TableHead>{t("colState")}</TableHead>
                  <TableHead className="min-w-[240px]">
                    {t("colActions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((r) => {
                  const canSubmit =
                    (r.state === HRM_REVIEW_ROW_STATE.selfPending ||
                      r.state === HRM_REVIEW_ROW_STATE.managerPending ||
                      r.state === HRM_REVIEW_ROW_STATE.hrPending) &&
                    (r.reviewerId === session.userId || isAdmin)
                  const canAcknowledge =
                    r.state === HRM_REVIEW_ROW_STATE.submitted &&
                    (isAdmin || r.employeeLinkedUserId === session.userId)
                  return (
                    <TableRow key={r.reviewId}>
                      <TableCell className="text-sm">{r.cycleName}</TableCell>
                      <TableCell className="font-medium">
                        {r.employeeLegalName}
                      </TableCell>
                      <TableCell>{r.state}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-3">
                          {canSubmit ? (
                            <HrmSubmitPerformanceReviewForm
                              orgSlug={orgSlug}
                              reviewId={r.reviewId}
                            />
                          ) : null}
                          {canAcknowledge ? (
                            <HrmAcknowledgePerformanceReviewForm
                              orgSlug={orgSlug}
                              reviewId={r.reviewId}
                            />
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
