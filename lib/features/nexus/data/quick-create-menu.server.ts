import "server-only"

import type { Route } from "next"

import { listEffectiveErpPermissionsForUser } from "#features/erp-rbac/server"
import { buildErpPermissionKey } from "#features/erp-rbac"
import { organizationAppsPath } from "#lib/org-apps-module-paths"
import { ORG_APPS_MODULES } from "#lib/i18n/org-apps-path.shared"

import type {
  QuickCreateMenu,
  QuickCreateMenuEntry,
} from "./quick-create-menu.shared"

export type {
  QuickCreateFormEntry,
  QuickCreateFormKind,
  QuickCreateLinkEntry,
  QuickCreateMenu,
  QuickCreateMenuEntry,
} from "./quick-create-menu.shared"

export async function buildQuickCreateMenu(input: {
  orgSlug: string
  orgId: string
  userId: string
}): Promise<QuickCreateMenu> {
  const permissions = await listEffectiveErpPermissionsForUser({
    organizationId: input.orgId,
    userId: input.userId,
  })

  const permissionSet = new Set(permissions)
  const entries: QuickCreateMenuEntry[] = []

  const canCreateContact = permissionSet.has(
    buildErpPermissionKey({
      module: "contacts",
      object: "record",
      function: "create",
    })
  )

  if (canCreateContact) {
    entries.push({
      kind: "contact",
      id: "contact-create",
      group: "records",
    })
    entries.push({
      kind: "link",
      id: "contacts-module",
      href: organizationAppsPath(input.orgSlug, "contacts") as Route,
      labelKey: "contacts",
      group: "modules",
    })
  }

  entries.push(
    {
      kind: "orbit-signal",
      id: "orbit-signal",
      group: "orbit",
    },
    {
      kind: "orbit-item",
      id: "orbit-item",
      group: "orbit",
    },
    {
      kind: "orbit-session",
      id: "orbit-session",
      group: "orbit",
    },
    {
      kind: "link",
      id: "orbit-module",
      href: organizationAppsPath(input.orgSlug, "orbit") as Route,
      labelKey: "orbit",
      group: "modules",
    }
  )

  for (const appModule of ORG_APPS_MODULES) {
    if (appModule === "contacts" || appModule === "orbit") continue
    entries.push({
      kind: "link",
      id: `module-${appModule}`,
      href: organizationAppsPath(input.orgSlug, appModule) as Route,
      labelKey: appModule,
      group: "modules",
    })
  }

  return { entries, orgSlug: input.orgSlug }
}
