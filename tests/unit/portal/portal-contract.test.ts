import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  PORTAL_AUDIENCES,
  employeePortalPath,
  normalizePortalSlugParam,
  portalPath,
  toLocalePortalRevalidatePattern,
} from "#lib/portal"
import { resolvePortalContextFromRows } from "#lib/portal/context.shared"
import type {
  PortalResolverAccessRow,
  PortalResolverPortalRow,
} from "#lib/portal"
import type { RouteEnvelope } from "#lib/route-envelope.shared"
import type { SignedInSession } from "#lib/tenant"

const session: SignedInSession = {
  userId: "user_01",
  sessionId: "session_01",
  user: {
    email: "ada@example.com",
    name: "Ada Lovelace",
    role: null,
  },
}

const portal: PortalResolverPortalRow = {
  id: "portal_01",
  slug: "employee-main",
  audience: "employee",
  status: "active",
  displayName: "Employee Portal",
  organizationId: "org_01",
  organizationName: "Afenda",
}

const access: PortalResolverAccessRow = {
  id: "access_01",
  audience: "employee",
  status: "active",
  organizationId: "org_01",
  subjectId: "employee_01",
}

function listFiles(root: string): string[] {
  if (!existsSync(root)) return []

  return readdirSync(root).flatMap((entry) => {
    const absolute = join(root, entry)
    if (statSync(absolute).isDirectory()) {
      return listFiles(absolute)
    }
    return [absolute]
  })
}

describe("portal foundation contract", () => {
  it("defines the supported audience registry", () => {
    expect(PORTAL_AUDIENCES).toEqual([
      "employee",
      "supplier",
      "customer",
      "investor",
    ])
  })

  it("keeps the route envelope audience sourced from the portal registry", () => {
    const envelopes = PORTAL_AUDIENCES.map((portalAudience) => {
      const envelope = {
        surface: "portal",
        locale: "en",
        orgId: "org_01",
        portalSlug: "employee-main",
        portalAudience,
      } satisfies RouteEnvelope

      return envelope.portalAudience
    })

    expect(envelopes).toEqual(PORTAL_AUDIENCES)
  })

  it("normalizes only safe portal slugs", () => {
    expect(normalizePortalSlugParam("Employee_Main")).toBe("employee_main")
    expect(normalizePortalSlugParam(" supplier-portal ")).toBe(
      "supplier-portal"
    )
    expect(normalizePortalSlugParam("../admin")).toBeNull()
    expect(normalizePortalSlugParam("bad/slug")).toBeNull()
    expect(normalizePortalSlugParam("-bad")).toBeNull()
  })

  it("builds org-owned portal paths", () => {
    expect(portalPath("Employee_Main")).toBe("/p/employee_main")
    expect(portalPath("supplier-main", "supplier")).toBe(
      "/p/supplier-main/supplier"
    )
    expect(employeePortalPath("acme-employee")).toBe(
      "/p/acme-employee/employee"
    )
    expect(employeePortalPath("acme-employee", "leave")).toBe(
      "/p/acme-employee/employee/leave"
    )
    expect(employeePortalPath("acme-employee", "payslips")).toBe(
      "/p/acme-employee/employee/payslips"
    )
    expect(toLocalePortalRevalidatePattern("/employee/leave")).toBe(
      "/[locale]/p/[portalSlug]/employee/leave"
    )
    expect(() => portalPath("../admin")).toThrow(
      "portalPath: invalid portal slug"
    )
  })

  it("resolves an active signed-in portal context", () => {
    const resolution = resolvePortalContextFromRows({
      session,
      portal,
      access,
    })

    expect(resolution).toEqual({
      ok: true,
      context: {
        portalId: "portal_01",
        portalSlug: "employee-main",
        portalAudience: "employee",
        portalDisplayName: "Employee Portal",
        organizationId: "org_01",
        organizationName: "Afenda",
        userId: "user_01",
        sessionId: "session_01",
        user: session.user,
        subjectId: "employee_01",
      },
    })
  })

  it("does not resolve missing, inactive, or mismatched portal access", () => {
    expect(
      resolvePortalContextFromRows({ session, portal: null, access }).ok
    ).toBe(false)
    expect(
      resolvePortalContextFromRows({
        session,
        portal: { ...portal, status: "inactive" },
        access,
      }).ok
    ).toBe(false)
    expect(
      resolvePortalContextFromRows({
        session,
        portal,
        access: { ...access, status: "revoked" },
      }).ok
    ).toBe(false)
    expect(
      resolvePortalContextFromRows({
        session,
        portal,
        access: { ...access, audience: "supplier" },
      }).ok
    ).toBe(false)
    expect(
      resolvePortalContextFromRows({
        session,
        portal,
        access: { ...access, organizationId: "org_02" },
      }).ok
    ).toBe(false)
  })

  it("rejects unsupported portal and access registry values", () => {
    expect(
      resolvePortalContextFromRows({
        session,
        portal: { ...portal, audience: "partner" },
        access,
      })
    ).toEqual({ ok: false, reason: "portal_audience_invalid" })

    expect(
      resolvePortalContextFromRows({
        session,
        portal,
        access: { ...access, audience: "partner" },
      })
    ).toEqual({ ok: false, reason: "access_audience_invalid" })

    expect(
      resolvePortalContextFromRows({
        session,
        portal,
        access: { ...access, status: "pending" },
      })
    ).toEqual({ ok: false, reason: "access_inactive" })
  })

  it("keeps /p free of route handlers and Workbench shell imports", () => {
    const routeRoot = join(process.cwd(), "app", "[locale]", "p")
    const shellRoot = join(process.cwd(), "components2", "portal-shell")
    const controlRoot = join(process.cwd(), "lib", "portal")
    const files = [
      ...listFiles(routeRoot),
      ...listFiles(shellRoot),
      ...listFiles(controlRoot),
    ]

    expect(files.some((file) => file.endsWith("route.ts"))).toBe(false)

    const source = files
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n")

    expect(source).not.toContain("WorkbenchShell")
    expect(source).not.toContain("WorkbenchSubLayout")
    expect(source).not.toContain("#components/workbench")
    expect(source).not.toContain("#app-shell")
    expect(source).not.toContain("requireOrgSession")
  })

  it("enforces active-only portal ownership and employee subject access uniqueness", () => {
    const schemaSource = readFileSync(
      join(process.cwd(), "lib", "db", "schema.ts"),
      "utf8"
    )
    const migrationSource = readFileSync(
      join(process.cwd(), "drizzle", "0040_portal_foundation.sql"),
      "utf8"
    )

    expect(schemaSource).toContain(
      "organization_portal_org_audience_active_uidx"
    )
    expect(schemaSource).toContain(
      "organization_portal_access_employee_subject_active_uidx"
    )
    expect(schemaSource).toContain("sql`${t.status} = 'active'`")
    expect(schemaSource).toContain(
      "sql`${t.status} = 'active' AND ${t.audience} = 'employee' AND ${t.subjectId} IS NOT NULL`"
    )
    expect(schemaSource).not.toContain(
      "organization_portal_access_portal_audience_subject_active_uidx"
    )

    expect(migrationSource).toContain(
      '"organization_portal_org_audience_active_uidx"'
    )
    expect(migrationSource).toContain(
      '"organization_portal_access_portal_audience_subject_active_uidx"'
    )
    expect(migrationSource).toContain("WHERE \"status\" = 'active'")
    expect(migrationSource).toContain('"subjectId" IS NOT NULL')

    const hardeningMigrationSource = readFileSync(
      join(
        process.cwd(),
        "drizzle",
        "0048_portal_employee_access_uniqueness.sql"
      ),
      "utf8"
    )
    expect(hardeningMigrationSource).toContain(
      'DROP INDEX IF EXISTS "organization_portal_access_portal_audience_subject_active_uidx"'
    )
    expect(hardeningMigrationSource).toContain(
      '"organization_portal_access_employee_subject_active_uidx"'
    )
    expect(hardeningMigrationSource).toContain("\"audience\" = 'employee'")
  })

  it("dispatches employee portal roots to leave self-service", () => {
    const source = readFileSync(
      join(process.cwd(), "app", "[locale]", "p", "[portalSlug]", "page.tsx"),
      "utf8"
    )
    const normalizedSource = source.replace(/\s+/g, " ")

    expect(normalizedSource).toContain(
      "params: Promise<{ locale: string; portalSlug: string }>"
    )
    expect(source).toContain(
      'context.portalAudience === "employee" && context.subjectId'
    )
    expect(source).toMatch(
      /redirect\(\s*toLocalePath\(\s*locale,\s*employeePortalPath\(context\.portalSlug, "leave"\)\s*\)\s*\)/
    )
  })

  it("uses the Next.js async params contract for portal route files", () => {
    const routeRoot = join(
      process.cwd(),
      "app",
      "[locale]",
      "p",
      "[portalSlug]"
    )
    const routeSource = [
      "layout.tsx",
      "page.tsx",
      join("employee", "page.tsx"),
      join("employee", "leave", "page.tsx"),
      join("employee", "payslips", "page.tsx"),
      join("employee", "payslips", "[documentId]", "page.tsx"),
    ]
      .map((file) => readFileSync(join(routeRoot, file), "utf8"))
      .join("\n")

    expect(routeSource).toContain("params: Promise<")
    expect(routeSource).toContain("await params")
  })
})
