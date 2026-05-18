"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import {
  hrmApplication,
  hrmCandidate,
  hrmJobRequisition,
  hrmRecruitmentEvent,
} from "#lib/db/schema"
import {
  candidatePortalApplicationPath,
  toLocalePortalRevalidatePattern,
} from "#lib/portal"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"

import { HRM_CSSP_AUDIT } from "../cssp.contract"
import { requireCandidatePublicPortalGate } from "../data/candidate-portal-mutation-gate.server"
import { requireCandidatePortalSessionGate } from "../data/candidate-portal-mutation-gate.server"
import {
  candidateStructuredProfileSchema,
  submitPublicApplicationFormSchema,
} from "../schemas/candidate-portal-profile.schema"

const MAGIC_LINK_TTL_MS = 1000 * 60 * 60 * 24 * 14

export type CandidatePortalFormState =
  | { ok: true; token?: string }
  | { ok: false; formError: string }

function parseSkillsInput(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return [
    ...new Set(
      raw
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ]
}

export async function submitPublicApplicationAction(
  _prev: CandidatePortalFormState | undefined,
  formData: FormData
): Promise<CandidatePortalFormState> {
  const parsed = submitPublicApplicationFormSchema.safeParse({
    portalSlug: formData.get("portalSlug"),
    requisitionId: formData.get("requisitionId"),
    legalName: formData.get("legalName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    source: formData.get("source"),
    skills: formData.get("skills"),
    consented: formData.get("consented"),
  })

  if (!parsed.success) {
    return { ok: false, formError: "Invalid application details." }
  }

  if (parsed.data.consented !== "on") {
    return { ok: false, formError: "You must accept the terms to apply." }
  }

  const gate = await requireCandidatePublicPortalGate(parsed.data.portalSlug)
  if (!gate.ok) {
    return { ok: false, formError: gate.formError }
  }

  const { portal } = gate

  const [requisition] = await db
    .select({ id: hrmJobRequisition.id, status: hrmJobRequisition.status })
    .from(hrmJobRequisition)
    .where(
      and(
        eq(hrmJobRequisition.id, parsed.data.requisitionId),
        eq(hrmJobRequisition.organizationId, portal.organizationId)
      )
    )
    .limit(1)

  if (!requisition || requisition.status !== "open") {
    return { ok: false, formError: "This role is not accepting applications." }
  }

  const structuredProfile = candidateStructuredProfileSchema.parse({
    legalName: parsed.data.legalName,
    email: parsed.data.email || undefined,
    phone: parsed.data.phone || undefined,
    skills: parseSkillsInput(parsed.data.skills),
    education: [],
    workHistory: [],
    certifications: [],
  })

  const candidateId = crypto.randomUUID()
  const applicationId = crypto.randomUUID()
  const token = applicationId
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS)
  const now = new Date()

  try {
    await db.transaction(async (tx) => {
      await tx.insert(hrmCandidate).values({
        id: candidateId,
        organizationId: portal.organizationId,
        legalName: structuredProfile.legalName,
        email: structuredProfile.email ?? null,
        phone: structuredProfile.phone ?? null,
        source: parsed.data.source?.trim() || "careers_portal",
      })

      await tx.insert(hrmApplication).values({
        id: applicationId,
        organizationId: portal.organizationId,
        candidateId,
        requisitionId: parsed.data.requisitionId,
        stage: "applied",
        audit7w1h: {
          candidatePortalTokenExpiresAt: expiresAt.toISOString(),
          consentedTermsAt: now.toISOString(),
          structuredProfile,
          selfDeclaredSkills: structuredProfile.skills,
        },
      })
      await tx.insert(hrmRecruitmentEvent).values({
        id: crypto.randomUUID(),
        organizationId: portal.organizationId,
        subjectKind: "application",
        subjectId: applicationId,
        eventType: "application.submitted_from_portal",
        actorUserId: null,
        toState: "applied",
        metadata: {
          candidateId,
          requisitionId: parsed.data.requisitionId,
          source: parsed.data.source?.trim() || "careers_portal",
        },
      })
    })
  } catch {
    return {
      ok: false,
      formError: "Could not submit your application. Please try again.",
    }
  }

  await writeIamAuditEventFromNextHeaders({
    action: HRM_CSSP_AUDIT.application.submit,
    organizationId: portal.organizationId,
    resourceType: "hrm_application",
    resourceId: applicationId,
    metadata: {
      requisitionId: parsed.data.requisitionId,
      candidateId,
    },
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_CSSP_AUDIT.candidate.magicLinkIssued,
    organizationId: portal.organizationId,
    resourceType: "hrm_candidate",
    resourceId: candidateId,
    metadata: { applicationId },
  })

  revalidatePath(toLocalePortalRevalidatePattern(`/candidate/careers`), "page")

  const locale = await getRequestAppLocale()
  redirect(
    toLocalePath(
      locale,
      candidatePortalApplicationPath(parsed.data.portalSlug, token)
    )
  )
}

export async function withdrawApplicationFromPortalAction(
  _prev: CandidatePortalFormState | undefined,
  formData: FormData
): Promise<CandidatePortalFormState> {
  const portalSlug = formData.get("portalSlug")
  const token = formData.get("token")
  if (typeof portalSlug !== "string" || typeof token !== "string") {
    return { ok: false, formError: "Invalid request." }
  }

  const gate = await requireCandidatePortalSessionGate({ portalSlug, token })
  if (!gate.ok) {
    return { ok: false, formError: gate.formError }
  }

  const { context } = gate

  await db
    .update(hrmApplication)
    .set({ stage: "withdrawn", updatedAt: new Date() })
    .where(
      and(
        eq(hrmApplication.id, context.applicationId),
        eq(hrmApplication.organizationId, context.portal.organizationId)
      )
    )

  await db.insert(hrmRecruitmentEvent).values({
    id: crypto.randomUUID(),
    organizationId: context.portal.organizationId,
    subjectKind: "application",
    subjectId: context.applicationId,
    eventType: "application.withdrawn_from_portal",
    actorUserId: null,
    toState: "withdrawn",
    metadata: { candidateId: context.candidate.id },
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_CSSP_AUDIT.application.withdraw,
    organizationId: context.portal.organizationId,
    resourceType: "hrm_application",
    resourceId: context.applicationId,
    metadata: { candidateId: context.candidate.id },
  })

  revalidatePath(
    toLocalePortalRevalidatePattern(`/candidate/applications/${token.trim()}`),
    "page"
  )

  return { ok: true }
}
