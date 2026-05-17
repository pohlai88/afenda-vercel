import "server-only"

import * as Sentry from "@sentry/nextjs"

import { runWithNodeOtelSpan } from "#lib/observability/otel-span.server"
import { rootLogger } from "#lib/logger.server"

export type PortalMutationTraceContext = {
  readonly spanName: string
  readonly section: string
  readonly organizationId: string
  readonly employeeId: string
  readonly orgSlug?: string
}

export type EmployeePortalMutationHost = {
  readonly portal: { readonly organizationId: string }
  readonly employee: { readonly id: string }
}

/** Span wrapper for durable mutations initiated from `employee-portal-*.actions.ts`. */
export async function withEmployeePortalActionSpan<T>(
  host: EmployeePortalMutationHost,
  section: string,
  verb: string,
  fn: () => Promise<T>
): Promise<T> {
  return withPortalMutationSpan(
    {
      spanName: `hrm.portal.${section}.${verb}`,
      section,
      organizationId: host.portal.organizationId,
      employeeId: host.employee.id,
    },
    fn
  )
}

/**
 * OTel span + Sentry breadcrumb + structured latency log for employee portal
 * durable mutations. Metadata only — no PII in tags or log fields.
 */
export async function withPortalMutationSpan<T>(
  ctx: PortalMutationTraceContext,
  fn: () => Promise<T>
): Promise<T> {
  const startedAt = Date.now()

  return runWithNodeOtelSpan(
    ctx.spanName,
    {
      "portal.audience": "employee",
      "portal.section": ctx.section,
      "org.id": ctx.organizationId,
      "hrm.employee_id": ctx.employeeId,
      ...(ctx.orgSlug ? { "org.slug": ctx.orgSlug } : {}),
    },
    async () => {
      Sentry.addBreadcrumb({
        category: "hrm.portal",
        message: ctx.spanName,
        level: "info",
        data: {
          section: ctx.section,
          organizationId: ctx.organizationId,
          employeeId: ctx.employeeId,
        },
      })

      try {
        return await fn()
      } finally {
        rootLogger.info(
          {
            organizationId: ctx.organizationId,
            employeeId: ctx.employeeId,
            action: ctx.spanName,
            latencyMs: Date.now() - startedAt,
            portalSection: ctx.section,
          },
          "hrm_portal_mutation"
        )
      }
    }
  )
}
