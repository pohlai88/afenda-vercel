import { notFound } from "next/navigation"
import { eq } from "drizzle-orm"

import { GovernedComponentRenderer } from "#components2/metadata"
import { db } from "#lib/db"
import { hrmApplication, hrmJobRequisition } from "#lib/db/schema"

import { buildCandidateApplicationStatusStatConfiguration } from "../data/candidate-portal-surface-builders.server"
import { getCandidatePortalContextByMagicToken } from "../data/candidate-portal-access.server"
import { CandidatePortalWithdrawForm } from "./candidate-portal-withdraw-form.client"
import { CandidatePortalChrome } from "./candidate-portal-chrome"

type CandidatePortalStatusPageProps = {
  portalSlug: string
  token: string
}

const WITHDRAWABLE_STAGES = new Set([
  "applied",
  "screening",
  "shortlisted",
  "interview",
  "assessment",
  "offer",
])

export async function CandidatePortalStatusPage({
  portalSlug,
  token,
}: CandidatePortalStatusPageProps) {
  const context = await getCandidatePortalContextByMagicToken({
    portalSlug,
    token,
  })
  if (!context) {
    notFound()
  }

  const [application] = await db
    .select({
      stage: hrmApplication.stage,
      requisitionTitle: hrmJobRequisition.title,
    })
    .from(hrmApplication)
    .innerJoin(
      hrmJobRequisition,
      eq(hrmJobRequisition.id, hrmApplication.requisitionId)
    )
    .where(eq(hrmApplication.id, context.applicationId))
    .limit(1)

  if (!application) {
    notFound()
  }

  const stageLabel = application.stage.replaceAll("_", " ")
  const statConfiguration = buildCandidateApplicationStatusStatConfiguration({
    requisitionTitle: application.requisitionTitle,
    stageLabel,
  })

  return (
    <CandidatePortalChrome portal={context.portal}>
      <ApplicationStatusPanel
        portalSlug={portalSlug}
        token={token}
        candidateName={context.candidate.legalName}
        candidateEmail={context.candidate.email}
        stage={application.stage}
        statConfiguration={statConfiguration}
      />
    </CandidatePortalChrome>
  )
}

function ApplicationStatusPanel({
  portalSlug,
  token,
  candidateName,
  candidateEmail,
  stage,
  statConfiguration,
}: {
  portalSlug: string
  token: string
  candidateName: string
  candidateEmail: string | null
  stage: string
  statConfiguration: ReturnType<
    typeof buildCandidateApplicationStatusStatConfiguration
  >
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Application status
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {candidateName}
          {candidateEmail ? ` · ${candidateEmail}` : null}
        </p>
      </div>

      <GovernedComponentRenderer
        component={{
          type: "governed:stat-card",
          serverType: "governed:stat-card",
          configuration: statConfiguration,
        }}
      />

      <CandidatePortalWithdrawForm
        portalSlug={portalSlug}
        token={token}
        canWithdraw={WITHDRAWABLE_STAGES.has(stage)}
      />
    </div>
  )
}
