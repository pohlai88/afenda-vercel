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
import { Textarea } from "#components/ui/textarea"
import { requireOrgSession } from "#lib/tenant"

import {
  acceptJobOfferAction,
  advanceApplicationStageFormAction,
  approveJobOfferAction,
  cancelJobRequisitionFormAction,
  convertAcceptedOfferToEmployeeFormAction,
  createCandidateApplicationFormAction,
  createJobOfferFormAction,
  createJobRequisitionFormAction,
  publishJobRequisitionFormAction,
  rejectJobOfferAction,
  scheduleInterviewFormAction,
  sendJobOfferAction,
  submitInterviewFeedbackFormAction,
  withdrawJobOfferAction,
} from "../actions/recruitment.actions"
import { buildGovernedHrmWorkbenchHeader } from "../data/hrm-governed-page-header.server"
import {
  listApplicationsForOrg,
  getInterviewCountsForOrg,
  listInterviewQueueForOrg,
  listJobOffersForOrg,
  listJobRequisitionsForOrg,
  listRecentRecruitmentEventsForOrg,
} from "../data/recruitment.queries.server"
import { nextApplicationStageLabel } from "../data/recruitment-workflow.shared"
import {
  HRM_APPLICATION_STAGES,
  HRM_INTERVIEW_OUTCOMES,
} from "../schemas/recruitment.schema"

type RecruitmentPageProps = {
  orgSlug: string
}

function dateLabel(value: Date): string {
  return value.toISOString().slice(0, 16).replace("T", " ")
}

function dateOnlyLabel(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "Not set"
}

function statusTone(status: string): "default" | "secondary" | "outline" {
  if (
    status === "open" ||
    status === "sent" ||
    status === "accepted" ||
    status === "hired"
  ) {
    return "default"
  }
  if (status === "cancelled" || status === "rejected" || status === "withdrawn") {
    return "secondary"
  }
  return "outline"
}

export async function RecruitmentPage({ orgSlug }: RecruitmentPageProps) {
  const { organizationId, userId } = await requireOrgSession()
  const [t, reqs, apps, interviewCounts, interviews, offers, events, header] =
    await Promise.all([
      getTranslations("Dashboard.Hrm.recruitment"),
      listJobRequisitionsForOrg(organizationId),
      listApplicationsForOrg(organizationId),
      getInterviewCountsForOrg(organizationId),
      listInterviewQueueForOrg(organizationId),
      listJobOffersForOrg(organizationId),
      listRecentRecruitmentEventsForOrg(organizationId),
      buildGovernedHrmWorkbenchHeader(orgSlug, "Dashboard.Hrm.recruitment", {
        eyebrow: "eyebrow",
        title: "title",
        description: "description",
      }),
    ])

  const openRequisitions = reqs.filter((x) => x.status === "open")
  const byStage = HRM_APPLICATION_STAGES.reduce(
    (acc, s) => {
      acc[s] = apps.filter((a) => a.stage === s)
      return acc
    },
    {} as Record<(typeof HRM_APPLICATION_STAGES)[number], typeof apps>
  )

  return (
    <GovernedSurface header={header} className="flex flex-col gap-5 p-6">
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
              className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto]"
            >
              <input type="hidden" name="orgSlug" value={orgSlug} />
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
              <Button type="submit" variant="secondary" className="self-end">
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
            <CardDescription>
              {t("newApplicationDescription")}
            </CardDescription>
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
                <Input id="app-name" name="legalName" required maxLength={200} />
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

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("requisitionsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
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
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusTone(r.status)}>{r.status}</Badge>
                  {r.status === "draft" ? (
                    <form action={publishJobRequisitionFormAction}>
                      <input type="hidden" name="orgSlug" value={orgSlug} />
                      <input type="hidden" name="requisitionId" value={r.id} />
                      <Button type="submit" size="sm" variant="secondary">
                        {t("publish")}
                      </Button>
                    </form>
                  ) : null}
                  {r.status === "draft" || r.status === "open" ? (
                    <form action={cancelJobRequisitionFormAction}>
                      <input type="hidden" name="orgSlug" value={orgSlug} />
                      <input type="hidden" name="requisitionId" value={r.id} />
                      <Button type="submit" size="sm" variant="outline">
                        {t("cancel")}
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {t("pipelineTitle")}
        </h2>
        <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {HRM_APPLICATION_STAGES.map((stage) => (
            <Card key={stage} size="sm" className="min-h-[140px]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{stage}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {byStage[stage].length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("pipelineEmpty")}
                  </p>
                ) : (
                  byStage[stage].map((a) => {
                    const interviewN = interviewCounts.get(a.id) ?? 0
                    const nextStage = nextApplicationStageLabel(stage)
                    return (
                      <div
                        key={a.id}
                        className="rounded border border-border bg-muted/30 p-2 text-xs"
                      >
                        <p className="font-medium">{a.candidateName}</p>
                        <p className="text-muted-foreground">
                          {a.requisitionTitle}
                        </p>
                        {a.convertedEmployeeId ? (
                          <p className="text-muted-foreground">
                            {t("convertedEmployee")}: {a.convertedEmployeeId}
                          </p>
                        ) : null}
                        {interviewN > 0 ? (
                          <p className="text-muted-foreground">
                            {t("interviewCount", { count: interviewN })}
                          </p>
                        ) : null}

                        {nextStage === "screening" ? (
                          <StageForm
                            orgSlug={orgSlug}
                            applicationId={a.id}
                            stage="screening"
                            label={t("moveToScreening")}
                          />
                        ) : null}
                        {nextStage === "interview" ? (
                          <StageForm
                            orgSlug={orgSlug}
                            applicationId={a.id}
                            stage="interview"
                            label={t("moveToInterview")}
                          />
                        ) : null}
                        {stage === "interview" ? (
                          <>
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
                              <Label
                                htmlFor={`iv-${a.id}`}
                                className="text-xs"
                              >
                                {t("fieldInterviewWhen")}
                              </Label>
                              <Input
                                id={`iv-${a.id}`}
                                name="scheduledAt"
                                type="datetime-local"
                                required
                                className="h-8 text-xs"
                              />
                              <Button
                                type="submit"
                                size="sm"
                                variant="secondary"
                                className="h-7 text-xs"
                              >
                                {t("scheduleInterview")}
                              </Button>
                            </form>
                            <OfferCreateForm
                              orgSlug={orgSlug}
                              applicationId={a.id}
                              t={t}
                            />
                          </>
                        ) : null}
                        {stage !== "hired" && stage !== "rejected" ? (
                          <StageForm
                            orgSlug={orgSlug}
                            applicationId={a.id}
                            stage="rejected"
                            label={t("reject")}
                            variant="outline"
                          />
                        ) : null}
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">{t("interviewsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {interviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("interviewsEmpty")}
              </p>
            ) : (
              interviews.map((interview) => (
                <div
                  key={interview.id}
                  className="rounded-md border border-border p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{interview.candidateName}</p>
                      <p className="text-xs text-muted-foreground">
                        {interview.requisitionTitle} ·{" "}
                        {dateLabel(interview.scheduledAt)}
                      </p>
                    </div>
                    {interview.outcome ? (
                      <Badge variant="outline">{interview.outcome}</Badge>
                    ) : null}
                  </div>
                  {!interview.outcome ? (
                    <form
                      action={submitInterviewFeedbackFormAction}
                      className="mt-3 grid gap-2"
                    >
                      <input type="hidden" name="orgSlug" value={orgSlug} />
                      <input
                        type="hidden"
                        name="interviewId"
                        value={interview.id}
                      />
                      <Label htmlFor={`outcome-${interview.id}`}>
                        {t("fieldOutcome")}
                      </Label>
                      <select
                        id={`outcome-${interview.id}`}
                        name="outcome"
                        required
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {HRM_INTERVIEW_OUTCOMES.map((outcome) => (
                          <option key={outcome} value={outcome}>
                            {outcome}
                          </option>
                        ))}
                      </select>
                      <Label htmlFor={`feedback-${interview.id}`}>
                        {t("fieldFeedback")}
                      </Label>
                      <Textarea
                        id={`feedback-${interview.id}`}
                        name="feedback"
                        rows={3}
                        maxLength={4000}
                      />
                      <Button type="submit" size="sm" variant="secondary">
                        {t("submitFeedback")}
                      </Button>
                    </form>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">{t("offersTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {offers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("offersEmpty")}
              </p>
            ) : (
              offers.map((offer) => (
                <div
                  key={offer.id}
                  className="rounded-md border border-border p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{offer.candidateName}</p>
                      <p className="text-xs text-muted-foreground">
                        {offer.requisitionTitle} ·{" "}
                        {offer.compensationAmount ?? "0"}{" "}
                        {offer.compensationCurrency} ·{" "}
                        {dateOnlyLabel(offer.proposedStartDate)}
                      </p>
                    </div>
                    <Badge variant={statusTone(offer.status)}>
                      {t("offerStatus", { status: offer.status })}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {offer.status === "draft" ? (
                      <OfferStatusForm
                        orgSlug={orgSlug}
                        offerId={offer.id}
                        action={approveJobOfferAction}
                        label={t("approveOffer")}
                      />
                    ) : null}
                    {offer.status === "approved" ? (
                      <OfferStatusForm
                        orgSlug={orgSlug}
                        offerId={offer.id}
                        action={sendJobOfferAction}
                        label={t("sendOffer")}
                      />
                    ) : null}
                    {offer.status === "sent" ? (
                      <>
                        <OfferStatusForm
                          orgSlug={orgSlug}
                          offerId={offer.id}
                          action={acceptJobOfferAction}
                          label={t("acceptOffer")}
                        />
                        <OfferStatusForm
                          orgSlug={orgSlug}
                          offerId={offer.id}
                          action={rejectJobOfferAction}
                          label={t("rejectOffer")}
                          variant="outline"
                        />
                      </>
                    ) : null}
                    {offer.status === "draft" ||
                    offer.status === "approved" ||
                    offer.status === "sent" ? (
                      <OfferStatusForm
                        orgSlug={orgSlug}
                        offerId={offer.id}
                        action={withdrawJobOfferAction}
                        label={t("withdrawOffer")}
                        variant="outline"
                      />
                    ) : null}
                  </div>
                  {offer.status === "accepted" && !offer.convertedEmployeeId ? (
                    <form
                      action={convertAcceptedOfferToEmployeeFormAction}
                      className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <input type="hidden" name="orgSlug" value={orgSlug} />
                      <input type="hidden" name="offerId" value={offer.id} />
                      <div className="grid gap-2">
                        <Label htmlFor={`emp-${offer.id}`}>
                          {t("fieldEmployeeNumber")}
                        </Label>
                        <Input
                          id={`emp-${offer.id}`}
                          name="employeeNumber"
                          required
                          maxLength={64}
                        />
                      </div>
                      <Button type="submit" className="self-end">
                        {t("convertHire")}
                      </Button>
                    </form>
                  ) : null}
                  {offer.convertedEmployeeId ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("converted")}: {offer.convertedEmployeeId}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">
            {t("recentEventsTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("recentEventsEmpty")}
            </p>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span>
                  {event.eventType}
                  {event.fromState || event.toState ? (
                    <span className="text-muted-foreground">
                      {" "}
                      {event.fromState ?? "-"}{" → "}{event.toState ?? "-"}
                    </span>
                  ) : null}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {dateLabel(event.createdAt)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </GovernedSurface>
  )
}

function StageForm({
  orgSlug,
  applicationId,
  stage,
  label,
  variant = "secondary",
}: {
  orgSlug: string
  applicationId: string
  stage: string
  label: string
  variant?: "secondary" | "outline"
}) {
  return (
    <form action={advanceApplicationStageFormAction} className="mt-2">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="stage" value={stage} />
      <Button type="submit" size="sm" variant={variant} className="h-7 text-xs">
        {label}
      </Button>
    </form>
  )
}

function OfferCreateForm({
  orgSlug,
  applicationId,
  t,
}: {
  orgSlug: string
  applicationId: string
  t: Awaited<ReturnType<typeof getTranslations>>
}) {
  return (
    <form
      action={createJobOfferFormAction}
      className="mt-2 grid gap-1 border-t border-border pt-2"
    >
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="applicationId" value={applicationId} />
      <Label htmlFor={`offer-amount-${applicationId}`} className="text-xs">
        {t("fieldAmount")}
      </Label>
      <Input
        id={`offer-amount-${applicationId}`}
        name="compensationAmount"
        inputMode="decimal"
        className="h-8 text-xs"
      />
      <div className="grid grid-cols-2 gap-1">
        <div className="grid gap-1">
          <Label htmlFor={`offer-currency-${applicationId}`} className="text-xs">
            {t("fieldCurrency")}
          </Label>
          <Input
            id={`offer-currency-${applicationId}`}
            name="compensationCurrency"
            defaultValue="MYR"
            maxLength={3}
            className="h-8 text-xs"
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`offer-start-${applicationId}`} className="text-xs">
            {t("fieldStartDate")}
          </Label>
          <Input
            id={`offer-start-${applicationId}`}
            name="proposedStartDate"
            type="date"
            className="h-8 text-xs"
          />
        </div>
      </div>
      <Button type="submit" size="sm" variant="secondary" className="h-7 text-xs">
        {t("createOffer")}
      </Button>
    </form>
  )
}

function OfferStatusForm({
  orgSlug,
  offerId,
  action,
  label,
  variant = "secondary",
}: {
  orgSlug: string
  offerId: string
  action: (formData: FormData) => Promise<void>
  label: string
  variant?: "secondary" | "outline"
}) {
  return (
    <form action={action}>
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="offerId" value={offerId} />
      <Button type="submit" size="sm" variant={variant}>
        {label}
      </Button>
    </form>
  )
}

