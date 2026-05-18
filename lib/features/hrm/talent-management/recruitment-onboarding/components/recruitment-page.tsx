import { getTranslations } from "next-intl/server"

import { GovernedComponentRenderer } from "#components2/metadata"
import { GovernedSurface } from "#features/governed-surface"
import { Button } from "#components2/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Input } from "#components2/ui/input"
import { Label } from "#components2/ui/label"
import { requireOrgSession } from "#lib/auth"

import {
  createCandidateApplicationFormAction,
  createJobRequisitionFormAction,
} from "../actions/recruitment.actions"
import { buildGovernedHrmWorkbenchHeader } from "../../../_module-governance/hrm-governed-page-header.server"
import {
  listApplicationsForOrg,
  getInterviewCountsForOrg,
  listInterviewQueueForOrg,
  listJobOffersForOrg,
  listRecruitmentOperationalReportForOrg,
  listJobRequisitionsForOrg,
  listRecentRecruitmentEventsForOrg,
} from "../data/recruitment.queries.server"
import { buildRecruitmentPipelineStatConfiguration } from "../data/recruitment-surface-builders.server"

import { RecruitmentApplicationsListSection } from "./recruitment-applications-list-section"
import { RecruitmentInterviewsListSection } from "./recruitment-interviews-list-section"
import { RecruitmentOffersListSection } from "./recruitment-offers-list-section"
import { RecruitmentOperationalReportSection } from "./recruitment-operational-report-section"
import { RecruitmentPipelineKanbanSection } from "./recruitment-pipeline-kanban-section"
import { RecruitmentRecentEventsListSection } from "./recruitment-recent-events-list-section"
import { RecruitmentRequisitionsListSection } from "./recruitment-requisitions-list-section"

type RecruitmentPageProps = {
  orgSlug: string
}

export async function RecruitmentPage({ orgSlug }: RecruitmentPageProps) {
  const { organizationId, userId } = await requireOrgSession()
  const [
    t,
    reqs,
    apps,
    interviewCounts,
    interviews,
    offers,
    events,
    reportRows,
    header,
  ] = await Promise.all([
    getTranslations("Dashboard.Hrm.recruitment"),
    listJobRequisitionsForOrg(organizationId),
    listApplicationsForOrg(organizationId),
    getInterviewCountsForOrg(organizationId),
    listInterviewQueueForOrg(organizationId),
    listJobOffersForOrg(organizationId),
    listRecentRecruitmentEventsForOrg(organizationId),
    listRecruitmentOperationalReportForOrg(organizationId),
    buildGovernedHrmWorkbenchHeader(orgSlug, "Dashboard.Hrm.recruitment", {
      eyebrow: "eyebrow",
      title: "title",
      description: "description",
    }),
  ])

  const openRequisitions = reqs.filter((x) => x.status === "open")
  const offerInFlightCount = offers.filter(
    (o) =>
      o.status === "draft" || o.status === "approved" || o.status === "sent"
  ).length
  const activeApplicationCount = apps.filter(
    (a) =>
      a.stage !== "hired" &&
      a.stage !== "rejected" &&
      a.stage !== "withdrawn" &&
      a.stage !== "archived"
  ).length

  const pipelineStatConfiguration = buildRecruitmentPipelineStatConfiguration({
    openRequisitionCount: openRequisitions.length,
    activeApplicationCount,
    interviewQueueCount: interviews.length,
    offerInFlightCount,
    copy: {
      openRequisitions: t("requisitionsTitle"),
      activeApplications: t("pipelineTitle"),
      interviewsQueued: t("interviewsTitle"),
      offersInFlight: t("offersTitle"),
    },
  })

  return (
    <GovernedSurface header={header} className="flex flex-col gap-5 p-6">
      <GovernedComponentRenderer
        component={{
          type: "governed:stat-card",
          serverType: "governed:stat-card",
          configuration: pipelineStatConfiguration,
        }}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">
              {t("requisitionsTitle")}
            </CardTitle>
            <CardDescription>{t("newRequisitionDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <RecruitmentRequisitionsListSection orgSlug={orgSlug} rows={reqs} />
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">{t("pipelineTitle")}</CardTitle>
            <CardDescription>{t("newApplicationDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <RecruitmentApplicationsListSection orgSlug={orgSlug} rows={apps} />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
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
              className="grid gap-3"
            >
              <input type="hidden" name="orgSlug" value={orgSlug} />
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                <div className="grid gap-2">
                  <Label htmlFor="rq-title">{t("fieldTitle")}</Label>
                  <Input id="rq-title" name="title" required maxLength={200} />
                </div>
                <div className="grid gap-2">
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
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rq-skills">
                  {t("fieldRequiredSkillCodes")}
                </Label>
                <Input
                  id="rq-skills"
                  name="requiredSkillCodes"
                  maxLength={500}
                  placeholder="typescript, react"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  {t("fieldRequiredSkillCodesHelp")}
                </p>
              </div>
              <Button type="submit" variant="secondary" className="w-fit">
                {t("createDraft")}
              </Button>
            </form>
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
              className="grid gap-3 lg:grid-cols-5"
            >
              <input type="hidden" name="orgSlug" value={orgSlug} />
              <div className="grid gap-2 lg:col-span-2">
                <Label htmlFor="app-req">{t("fieldRequisition")}</Label>
                <select
                  id="app-req"
                  name="requisitionId"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">{t("selectRequisition")}</option>
                  {openRequisitions.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2 lg:col-span-2">
                <Label htmlFor="app-name">{t("fieldCandidateName")}</Label>
                <Input
                  id="app-name"
                  name="legalName"
                  required
                  maxLength={200}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="app-email">{t("fieldEmail")}</Label>
                <Input id="app-email" name="email" type="email" />
              </div>
              <div className="grid gap-2 lg:col-span-2">
                <Label htmlFor="app-phone">{t("fieldPhone")}</Label>
                <Input id="app-phone" name="phone" maxLength={64} />
              </div>
              <div className="grid gap-2 lg:col-span-2">
                <Label htmlFor="app-src">{t("fieldSource")}</Label>
                <Input id="app-src" name="source" maxLength={120} />
              </div>
              <Button type="submit" className="self-end">
                {t("createApplication")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <RecruitmentPipelineKanbanSection
        orgSlug={orgSlug}
        userId={userId}
        rows={apps}
        interviewCounts={interviewCounts}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <RecruitmentInterviewsListSection
          orgSlug={orgSlug}
          interviews={interviews}
        />
        <RecruitmentOffersListSection orgSlug={orgSlug} offers={offers} />
      </div>

      <RecruitmentRecentEventsListSection events={events} />
      <RecruitmentOperationalReportSection rows={reportRows} />
    </GovernedSurface>
  )
}
