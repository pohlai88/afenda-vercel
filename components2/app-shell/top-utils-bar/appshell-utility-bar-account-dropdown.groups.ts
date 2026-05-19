import type { Route } from "next"
import {
  CircleHelp,
  FileText,
  History,
  House,
  Lock,
  LogOut,
  Shield,
  UserRound,
} from "lucide-react"

import type { UtilityDropdownGroup } from "./appshell-utility-bar-dropdown.client"

/**
 * Locale-prefixed routes for the personal IAM menu items.
 *
 * Each href is optional — surfaces without a bound `orgSlug` (platform admin,
 * post-login console) omit the org-scoped Profile / Account / Security rows
 * rather than emitting placeholder paths. Org composers pass all three.
 */
export type AppShellAccountDropdownHrefs = {
  account?: Route
  identity?: Route
  security?: Route
  help?: Route
}

export type AppShellAccountDropdownLabels = {
  profile: string
  profileDescription: string
  accountSettings: string
  accountSettingsDescription: string
  backToWorkspace: string
  backToWorkspaceDescription: string
  recentActivity: string
  recentActivityDescription: string
  securityLabel: string
  securityDescription: string
  helpCenter: string
  helpCenterDescription: string
  privacy: string
  privacyDescription: string
  signOut: string
  signOutDescription: string
}

/**
 * Pure builder for account utility menu groups — keeps the client component thin and
 * makes the catalog easy to snapshot in tests later if needed.
 */
export function buildAppShellAccountDropdownGroups({
  hrefs,
  workspaceHomeHref,
  signOutPending,
  runSignOut,
  labels,
}: {
  hrefs: AppShellAccountDropdownHrefs
  workspaceHomeHref: Route | undefined
  signOutPending: boolean
  runSignOut: () => void
  labels: AppShellAccountDropdownLabels
}): UtilityDropdownGroup[] {
  return [
    {
      items: [
        ...(hrefs.identity
          ? [
              {
                id: "profile",
                label: labels.profile,
                description: labels.profileDescription,
                icon: UserRound,
                href: hrefs.identity,
              },
            ]
          : []),
        ...(hrefs.account
          ? [
              {
                id: "account-settings",
                label: labels.accountSettings,
                description: labels.accountSettingsDescription,
                icon: FileText,
                href: hrefs.account,
              },
            ]
          : []),
      ],
    },
    {
      items: [
        ...(workspaceHomeHref
          ? [
              {
                id: "workspace-home",
                label: labels.backToWorkspace,
                description: labels.backToWorkspaceDescription,
                icon: House,
                href: workspaceHomeHref,
              },
            ]
          : []),
        ...(hrefs.security
          ? [
              {
                id: "recent-activity",
                label: labels.recentActivity,
                description: labels.recentActivityDescription,
                icon: History,
                href: `${hrefs.security}#recent-activity` as Route,
              },
            ]
          : []),
      ],
    },
    {
      items: [
        ...(hrefs.security
          ? [
              {
                id: "security",
                label: labels.securityLabel,
                description: labels.securityDescription,
                icon: Shield,
                href: hrefs.security,
              },
            ]
          : []),
        {
          id: "privacy",
          label: labels.privacy,
          description: labels.privacyDescription,
          icon: Lock,
          disabled: true,
        },
      ],
    },
    {
      items: [
        ...(hrefs.help
          ? [
              {
                id: "help",
                label: labels.helpCenter,
                description: labels.helpCenterDescription,
                icon: CircleHelp,
                href: hrefs.help,
              },
            ]
          : []),
      ],
    },
    {
      items: [
        {
          id: "sign-out",
          label: labels.signOut,
          description: labels.signOutDescription,
          icon: LogOut,
          disabled: signOutPending,
          onSelect: runSignOut,
        },
      ],
    },
  ]
}
