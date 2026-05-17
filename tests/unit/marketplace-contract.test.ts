import { describe, expect, it } from "vitest"

import enMessages from "../../messages/en.json"

import {
  CAPABILITY_CATEGORIES,
  isCapabilityCategory,
  MARKETPLACE_AUDIT_ACTIONS,
  MARKETPLACE_RESOURCE_TYPES,
  marketplaceAuditPrefixIsRegistered,
  organizationMarketplacePath,
  isMarketplaceRoute,
} from "#features/marketplace"
import {
  ORG_ADMIN_EVENT_NAMESPACES,
  isAllowedAuditAction,
} from "#features/org-admin"

const MARKETPLACE_MESSAGES = (enMessages as Record<string, unknown>)
  .Marketplace as {
  shell: { breadcrumbs: Record<string, string> }
  categories: Record<string, string>
  categoryDescriptions: Record<string, string>
  items: Record<string, { title: string; description: string }>
}

describe("CAPABILITY_CATEGORIES registry", () => {
  it("registers exactly the seven canonical categories in canonical order", () => {
    expect(CAPABILITY_CATEGORIES).toEqual([
      "utilities",
      "plugins",
      "mcp",
      "integrations",
      "automations",
      "operators",
      "surfaces",
    ])
  })

  it("has unique category ids", () => {
    expect(new Set(CAPABILITY_CATEGORIES).size).toBe(
      CAPABILITY_CATEGORIES.length
    )
  })

  it("isCapabilityCategory accepts every registered id and rejects others", () => {
    for (const category of CAPABILITY_CATEGORIES) {
      expect(isCapabilityCategory(category)).toBe(true)
    }
    for (const bad of ["", "Utilities", "admin", "evil", "../utilities"]) {
      expect(isCapabilityCategory(bad)).toBe(false)
    }
  })

  it("every registered category has localized name + description + breadcrumb", () => {
    for (const category of CAPABILITY_CATEGORIES) {
      expect(MARKETPLACE_MESSAGES.categories[category]).toBeTypeOf("string")
      expect(MARKETPLACE_MESSAGES.categoryDescriptions[category]).toBeTypeOf(
        "string"
      )
      expect(MARKETPLACE_MESSAGES.shell.breadcrumbs[category]).toBeTypeOf(
        "string"
      )
    }
  })
})

describe("organizationMarketplacePath / isMarketplaceRoute", () => {
  const slug = "demo-org"

  it("organizationMarketplacePath() returns /o/{slug}/marketplace", () => {
    expect(organizationMarketplacePath(slug)).toBe("/o/demo-org/marketplace")
  })

  it("organizationMarketplacePath(category) returns /o/{slug}/marketplace/<category> for every registered category", () => {
    for (const category of CAPABILITY_CATEGORIES) {
      expect(organizationMarketplacePath(slug, category)).toBe(
        `/o/demo-org/marketplace/${category}`
      )
    }
  })

  it("organizationMarketplacePath('admin') returns /o/{slug}/marketplace/admin", () => {
    expect(organizationMarketplacePath(slug, "admin")).toBe(
      "/o/demo-org/marketplace/admin"
    )
  })

  it("isMarketplaceRoute accepts admin + every registered category and rejects others", () => {
    expect(isMarketplaceRoute("admin")).toBe(true)
    for (const category of CAPABILITY_CATEGORIES) {
      expect(isMarketplaceRoute(category)).toBe(true)
    }
    for (const bad of ["", "Admin", "../admin", "utilities/extra", "evil"]) {
      expect(isMarketplaceRoute(bad)).toBe(false)
    }
  })
})

describe("MARKETPLACE_AUDIT_ACTIONS / MARKETPLACE_RESOURCE_TYPES contract", () => {
  it("registers exactly the three canonical audit verbs", () => {
    expect(MARKETPLACE_AUDIT_ACTIONS).toEqual({
      USER_PREFERENCE_SET: "iam.workbench.capability.preference.set",
      ORG_POLICY_SET: "org.capability.policy.set",
      ORG_POLICY_DELETE: "org.capability.policy.delete",
    })
  })

  it("every audit action prefix is in ORG_ADMIN_EVENT_NAMESPACES", () => {
    for (const action of Object.values(MARKETPLACE_AUDIT_ACTIONS)) {
      expect(marketplaceAuditPrefixIsRegistered(action)).toBe(true)
      expect(isAllowedAuditAction(action)).toBe(true)
    }
  })

  it("marketplaceAuditPrefixIsRegistered rejects unknown namespaces and malformed strings", () => {
    expect(marketplaceAuditPrefixIsRegistered("evil.do")).toBe(false)
    expect(marketplaceAuditPrefixIsRegistered("noseparator")).toBe(false)
    expect(marketplaceAuditPrefixIsRegistered("")).toBe(false)
    expect(marketplaceAuditPrefixIsRegistered(".starts.with.dot")).toBe(false)
  })

  it("uses the iam.* namespace for personal preference and org.* for governance", () => {
    expect(
      MARKETPLACE_AUDIT_ACTIONS.USER_PREFERENCE_SET.startsWith("iam.")
    ).toBe(true)
    expect(MARKETPLACE_AUDIT_ACTIONS.ORG_POLICY_SET.startsWith("org.")).toBe(
      true
    )
    expect(MARKETPLACE_AUDIT_ACTIONS.ORG_POLICY_DELETE.startsWith("org.")).toBe(
      true
    )

    // ORG_ADMIN_EVENT_NAMESPACES must include both for the contract to hold.
    expect(ORG_ADMIN_EVENT_NAMESPACES).toContain("iam")
    expect(ORG_ADMIN_EVENT_NAMESPACES).toContain("org")
  })

  it("resource types match the Drizzle table names", () => {
    expect(MARKETPLACE_RESOURCE_TYPES).toEqual({
      USER_PREFERENCE: "user_capability_preference",
      ORG_POLICY: "org_capability_policy",
    })
  })
})
