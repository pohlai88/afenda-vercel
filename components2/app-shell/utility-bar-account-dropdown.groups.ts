import type { Route } from "next"
import {
  CircleHelp,
  FileText,
  Folder,
  History,
  House,
  LifeBuoy,
  Lock,
  LogOut,
  MessageSquare,
  Palette,
  Shield,
  UserRound,
  Users,
} from "lucide-react"

import type { UtilityDropdownGroup } from "./utility-dropdown.client"

export type AppShellAccountDropdownHrefs = {
  account: Route
  identity: Route
  security: Route
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
  securityLabel,
  securityDescription,
}: {
  hrefs: AppShellAccountDropdownHrefs
  workspaceHomeHref: Route | undefined
  signOutPending: boolean
  runSignOut: () => void
  securityLabel: string
  securityDescription: string
}): UtilityDropdownGroup[] {
  return [
    {
      items: [
        {
          id: "profile",
          label: "Profile",
          description: "Edit name, email visibility, and profile fields.",
          icon: UserRound,
          href: hrefs.identity,
        },
        {
          id: "account-settings",
          label: "Account & settings",
          description: "Account overview, next steps, and workspace context.",
          icon: FileText,
          href: hrefs.account,
        },
        {
          id: "appearance",
          label: "Appearance (theme)",
          description:
            "Coming soon — light, dark, and system appearance in account.",
          icon: Palette,
          disabled: true,
        },
      ],
    },
    {
      items: [
        ...(workspaceHomeHref
          ? [
              {
                id: "workspace-home",
                label: "Back to workspace",
                description: "Return to your main workspace surface.",
                icon: House,
                href: workspaceHomeHref,
              },
            ]
          : []),
        {
          id: "my-files",
          label: "My files",
          description: "Coming soon — personal uploads and saved documents.",
          icon: Folder,
          disabled: true,
        },
        {
          id: "recent-activity",
          label: "Recent activity",
          description: "Coming soon — cross-surface activity history.",
          icon: History,
          disabled: true,
        },
      ],
    },
    {
      items: [
        {
          id: "security",
          label: securityLabel,
          description: securityDescription,
          icon: Shield,
          href: hrefs.security,
        },
        {
          id: "privacy",
          label: "Privacy & data",
          description:
            "Coming soon — visibility, exports, and retention controls.",
          icon: Lock,
          disabled: true,
        },
      ],
    },
    {
      items: [
        {
          id: "help",
          label: "Help center",
          description: "Coming soon — guides and FAQs in the product.",
          icon: CircleHelp,
          disabled: true,
        },
        {
          id: "contact",
          label: "Contact support",
          description: "Coming soon — reach the Afenda team from the shell.",
          icon: LifeBuoy,
          disabled: true,
        },
        {
          id: "feedback",
          label: "Send feedback",
          description: "Coming soon — structured product feedback from here.",
          icon: MessageSquare,
          disabled: true,
        },
      ],
    },
    {
      items: [
        {
          id: "switch-account",
          label: "Switch account",
          description:
            "Coming soon — fast user switching for multiple profiles.",
          icon: Users,
          disabled: true,
        },
        {
          id: "sign-out",
          label: "Sign out",
          description: "End this browser session for the current profile.",
          icon: LogOut,
          disabled: signOutPending,
          onSelect: runSignOut,
        },
      ],
    },
  ]
}
