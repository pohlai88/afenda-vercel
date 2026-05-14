import { getTranslations } from "next-intl/server"

import { GovernedSurface } from "#features/governed-surface"
import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"
import { requireOrgSession } from "#lib/tenant"

import { buildGovernedHrmWorkbenchHeader } from "../data/hrm-governed-page-header.server"
import {
  advanceApplicationStageFormAction,
  createCandidateApplicationFormAction,
  createJobRequisitionFormAction,
  publishJobRequisitionFormAction,
  scheduleInterviewFormAction,
} from "../actions/recruitment.actions"
import { HRM_APPLICATION_STAGES } from "../schemas/recruitment.schema"
import {
  listApplicationsForOrg,
  getInterviewCountsForOrg,
  listJobRequisitionsForOrg,
} from "../data/recruitment.queries.server"

type RecruitmentPageProps = {
  orgSlug: string
}

export async function RecruitmentPage({ orgSlug }: RecruitmentPageProps) {
  const { organizationId, userId } = await requireOrgSession()
  const [t, reqs, apps, interviewCounts, header] = await Promise.all([
    getTranslations("Dashboard.Hrm.recruitment"),
    listJobRequisitionsForOrg(organizationId),
    listApplicationsForOrg(organizationId),
    getInterviewCountsForOrg(organizationId),
    buildGovernedHrmWorkbenchHeader(orgSlug, "Dashboard.Hrm.recruitment", {
      eyebrow: "eyebrow",
      title: "title",
      description: "description",
    }),
  ])

  const byStage = HRM_APPLICATION_STAGES.reduce(
    (acc, s) => {
      acc[s] = apps.filter((a) => a.stage === s)
      return acc
    },
    {} as Record<(typeof HRM_APPLICATION_STAGES)[number], typeof apps>
  )

  return (
    <GovernedSurface header={header} className="flex flex-col gap-6 p-6">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">
            {t("newRequisitionTitle")}
          </CardTitle>
          <CardDescription>{t("newRequisitionDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={createJobRequisitionFormAction}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <div className="grid flex-1 gap-2">
              <Label htmlFor="rq-title">{t("fieldTitle")}</Label>
              <Input id="rq-title" name="title" required maxLength={200} />
            </div>
            <div className="grid w-32 gap-2">
              <Label htmlFor="rq-hc">{t("fieldHeadcount")}</Label>
              <Input
                id="rq-hc"
                name="headcount"
                type="number"
                min={1}
                max={999}
                defaultValue={1}
              />
            </div>
            <Button type="submit" variant="secondary">
              {t("createDraft")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("requisitionsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {reqs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("requisitionsEmpty")}
            </p>
          ) : (
            reqs.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
              >
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.departmentName ?? t("noDepartment")} ·{" "}
                    {t("headcountLabel", { count: r.headcount })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{r.status}</Badge>
                  {r.status === "draft" ? (
                    <form action={publishJobRequisitionFormAction}>
                      <input type="hidden" name="orgSlug" value={orgSlug} />
                      <input type="hidden" name="requisitionId" value={r.id} />
                      <Button type="submit" size="sm" variant="secondary">
                        {t("publish")}
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">
            {t("newApplicationTitle")}
          </CardTitle>
          <CardDescription>{t("newApplicationDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={createCandidateApplicationFormAction}
            className="grid gap-3 sm:grid-cols-2"
          >
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="app-req">{t("fieldRequisition")}</Label>
              <select
                id="app-req"
                name="requisitionId"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <option value="">{t("selectRequisition")}</option>
                {reqs
                  .filter((x) => x.status === "open" || x.status === "draft")
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.title} ({x.status})
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="app-name">{t("fieldCandidateName")}</Label>
              <Input id="app-name" name="legalName" required maxLength={200} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="app-email">{t("fieldEmail")}</Label>
              <Input id="app-email" name="email" type="email" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="app-phone">{t("fieldPhone")}</Label>
              <Input id="app-phone" name="phone" maxLength={64} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="app-src">{t("fieldSource")}</Label>
              <Input id="app-src" name="source" maxLength={120} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">{t("createApplication")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {t("pipelineTitle")}
        </h2>
        <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {HRM_APPLICATION_STAGES.map((stage) => (
            <Card key={stage} size="sm" className="min-h-[120px]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{stage}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {byStage[stage].length === 0 ? (
                  <p className="text-xs text-muted-foreground">—</p>
                ) : (
                  byStage[stage].map((a) => {
                    const interviewN = interviewCounts.get(a.id) ?? 0
                    return (
                      <div
                        key={a.id}
                        className="rounded border border-border bg-muted/30 p-2 text-xs"
                      >
                        <p className="font-medium">{a.candidateName}</p>
                        <p className="text-muted-foreground">
                          {a.requisitionTitle}
                        </p>
                        {interviewN > 0 ? (
                          <p className="text-muted-foreground">
                            {t("interviewCount", { count: interviewN })}
                          </p>
                        ) : null}
                        {stage === "interview" ? (
                          <form
                            action={scheduleInterviewFormAction}
                            className="mt-2 flex flex-col gap-1 border-t border-border pt-2"
                          >
                            <input
                              type="hidden"
                              name="orgSlug"
                              value={orgSlug}
                            />
                            <input
                              type="hidden"
                              name="applicationId"
                              value={a.id}
                            />
                            <input
                              type="hidden"
                              name="interviewerUserId"
                              value={userId}
                            />
                            <Label htmlFor={`iv-${a.id}`} className="text-xs">
                              {t("fieldInterviewWhen")}
                            </Label>
                            <Input
                              id={`iv-${a.id}`}
                              name="scheduledAt"
                              type="datetime-local"
                              required
                              className="h-8 text-xs"
                            />
                            <p className="text-[10px] text-muted-foreground">
                              {t("interviewerSelfNote")}
                            </p>
                            <Button
                              type="submit"
                              size="sm"
                              variant="secondary"
                              className="h-7 text-xs"
                            >
                              {t("scheduleInterview")}
                            </Button>
                          </form>
                        ) : null}
                        <form
                          action={advanceApplicationStageFormAction}
                          className="mt-2 flex flex-col gap-1"
                        >
                          <input type="hidden" name="orgSlug" value={orgSlug} />
                          <input
                            type="hidden"
                            name="applicationId"
                            value={a.id}
                          />
                          <select
                            name="stage"
                            defaultValue={stage}
                            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                          >
                            {HRM_APPLICATION_STAGES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                          >
                            {t("moveStage")}
                          </Button>
                        </form>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </GovernedSurface>
  )
}
