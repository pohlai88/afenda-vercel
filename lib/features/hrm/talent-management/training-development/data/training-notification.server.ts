import "server-only"

import { and, eq } from "drizzle-orm"

import { sendAuthEmail } from "#lib/auth/auth-mail.server"
import { db } from "#lib/db"
import {
  hrmEmployee,
  hrmTrainingCourse,
  hrmTrainingSession,
  organizationPortal,
} from "#lib/db/schema"
import { DEFAULT_APP_LOCALE } from "#lib/i18n/locales.shared"
import { getSiteUrl } from "#lib/site"

export async function resolveEmployeePortalNotificationContext(
  organizationId: string
): Promise<{ locale: string; portalSlug: string } | null> {
  const [portal] = await db
    .select({ slug: organizationPortal.slug })
    .from(organizationPortal)
    .where(
      and(
        eq(organizationPortal.organizationId, organizationId),
        eq(organizationPortal.audience, "employee"),
        eq(organizationPortal.status, "active")
      )
    )
    .limit(1)

  if (!portal?.slug) return null
  return { locale: DEFAULT_APP_LOCALE, portalSlug: portal.slug }
}

async function getEmployeeEmail(
  organizationId: string,
  employeeId: string
): Promise<string | null> {
  const [row] = await db
    .select({ email: hrmEmployee.email })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.id, employeeId)
      )
    )
    .limit(1)
  const email = row?.email?.trim()
  return email && email.includes("@") ? email : null
}

function trainingPortalPath(locale: string, portalSlug: string): string {
  return `${getSiteUrl()}/${locale}/p/${portalSlug}/employee/training`
}

export function notifyTrainingAssigned(input: {
  readonly locale: string
  readonly portalSlug: string
  readonly organizationId: string
  readonly employeeId: string
  readonly courseName: string
  readonly dueAt: Date | null
}): void {
  void (async () => {
    const to = await getEmployeeEmail(input.organizationId, input.employeeId)
    if (!to) return

    const dueLine = input.dueAt
      ? `Due: ${input.dueAt.toISOString().slice(0, 10)}`
      : "No due date set."

    sendAuthEmail({
      to,
      subject: `Training assigned: ${input.courseName}`,
      text: [
        `You have been assigned training: ${input.courseName}.`,
        dueLine,
        `View assignments: ${trainingPortalPath(input.locale, input.portalSlug)}`,
      ].join("\n"),
    })
  })()
}

export function notifyTrainingSessionScheduled(input: {
  readonly locale: string
  readonly portalSlug: string
  readonly organizationId: string
  readonly employeeId: string
  readonly sessionTitle: string
  readonly scheduledStartAt: Date
  readonly location: string
}): void {
  void (async () => {
    const to = await getEmployeeEmail(input.organizationId, input.employeeId)
    if (!to) return

    sendAuthEmail({
      to,
      subject: `Training session scheduled: ${input.sessionTitle}`,
      text: [
        `Session: ${input.sessionTitle}`,
        `When: ${input.scheduledStartAt.toISOString()}`,
        `Where: ${input.location}`,
        `Details: ${trainingPortalPath(input.locale, input.portalSlug)}`,
      ].join("\n"),
    })
  })()
}

export function notifyTrainingRecordVerified(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly courseName: string
}): void {
  void (async () => {
    const to = await getEmployeeEmail(input.organizationId, input.employeeId)
    if (!to) return

    sendAuthEmail({
      to,
      subject: `Training verified: ${input.courseName}`,
      text: `Your completion record for "${input.courseName}" has been verified by HR.`,
    })
  })()
}

export function notifyTrainingCertificationExpiring(input: {
  readonly locale: string
  readonly portalSlug: string
  readonly organizationId: string
  readonly employeeId: string
  readonly courseName: string
  readonly expiresAt: Date
}): void {
  void (async () => {
    const to = await getEmployeeEmail(input.organizationId, input.employeeId)
    if (!to) return

    sendAuthEmail({
      to,
      subject: `Certification expiring: ${input.courseName}`,
      text: [
        `Your certification for "${input.courseName}" expires on ${input.expiresAt.toISOString().slice(0, 10)}.`,
        `Recertification may already be assigned in your portal.`,
        trainingPortalPath(input.locale, input.portalSlug),
      ].join("\n"),
    })
  })()
}

export async function loadTrainingCourseName(
  organizationId: string,
  courseId: string
): Promise<string> {
  const [row] = await db
    .select({ name: hrmTrainingCourse.name })
    .from(hrmTrainingCourse)
    .where(
      and(
        eq(hrmTrainingCourse.organizationId, organizationId),
        eq(hrmTrainingCourse.id, courseId)
      )
    )
    .limit(1)
  return row?.name ?? "Training course"
}

export async function loadTrainingSessionSummary(
  organizationId: string,
  sessionId: string
): Promise<{
  title: string
  scheduledStartAt: Date
  location: string
} | null> {
  const [row] = await db
    .select({
      title: hrmTrainingSession.title,
      scheduledStartAt: hrmTrainingSession.scheduledStartAt,
      location: hrmTrainingSession.location,
    })
    .from(hrmTrainingSession)
    .where(
      and(
        eq(hrmTrainingSession.organizationId, organizationId),
        eq(hrmTrainingSession.id, sessionId)
      )
    )
    .limit(1)
  return row ?? null
}
