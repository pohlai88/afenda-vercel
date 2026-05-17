import type { Route } from "next"
import { redirect } from "next/navigation"

import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { AppShell, AppShellSurface, AppSubLayout } from "#app-shell"
import type { AppShellRailConfig } from "#app-shell"
import {
  AppShellBrandDisc,
  AppShellAppsDisc,
  AppShellRailFooter,
} from "#components2/app-shell/client"

import {
  HRM_METADATA_PREVIEW_HREF,
  SHELL_PREVIEW_HREF,
} from "../fixtures/preview-href.shared"
import { AppShellPreviewCommandPalette } from "../app-shell-preview/command-search.client"
import { AppShellPreviewOperationalScope } from "../app-shell-preview/operational-scope.client"
import { AppShellPreviewPolicyDisc } from "../app-shell-preview/policy-disc.client"
import { AppShellPreviewUtilityBarRight } from "../app-shell-preview/utility-bar-right.client"
import { HrmMetadataPreviewContent } from "./preview-content"

const METADATA_SUB_RAIL: AppShellRailConfig = {
  storageKey: "dev-hrm-metadata-preview-sub-rail",
  labels: {
    ariaLabel: "HRM metadata scenarios",
    collapseLabel: "Collapse",
    expandLabel: "Expand",
  },
  slots: {
    nav: [
      {
        id: "metadata-workbench",
        label: "Workbench",
        items: [
          {
            id: "scenario-recruitment",
            label: "Recruitment ATS",
            icon: "users",
            href: `${HRM_METADATA_PREVIEW_HREF}#workbench-recruitment` as Route,
            active: true,
          },
        ],
      },
      {
        id: "metadata-candidate",
        label: "Candidate portal",
        items: [
          {
            id: "scenario-careers",
            label: "Careers listing",
            icon: "briefcase",
            href: `${HRM_METADATA_PREVIEW_HREF}#candidate-careers` as Route,
          },
          {
            id: "scenario-role-detail",
            label: "Role detail",
            icon: "file-text",
            href: `${HRM_METADATA_PREVIEW_HREF}#candidate-role-detail` as Route,
          },
          {
            id: "scenario-application-status",
            label: "Application status",
            icon: "clock",
            href: `${HRM_METADATA_PREVIEW_HREF}#candidate-status` as Route,
          },
        ],
      },
      {
        id: "metadata-employee",
        label: "Employee portal",
        items: [
          {
            id: "scenario-payslips",
            label: "Payslips",
            icon: "file-text",
            href: `${HRM_METADATA_PREVIEW_HREF}#employee-payslips` as Route,
          },
        ],
      },
      {
        id: "metadata-related",
        label: "Related",
        items: [
          {
            id: "scenario-shell",
            label: "Shell preview",
            icon: "layout-dashboard",
            href: SHELL_PREVIEW_HREF,
          },
        ],
      },
    ],
  },
}

export default async function HrmMetadataPreviewPage({
  params,
}: PageProps<"/[locale]/dev/hrm-metadata-preview">) {
  if (process.env.NODE_ENV !== "development") {
    redirect("/")
  }

  const { locale: localeRaw } = await params
  const locale = ensureAppLocale(localeRaw)

  const rail: AppShellRailConfig = {
    storageKey: "dev-hrm-metadata-preview-rail",
    labels: {
      ariaLabel: "Main navigation",
      collapseLabel: "Collapse sidebar",
      expandLabel: "Expand sidebar",
    },
    slots: {
      nav: [
        {
          id: "dev",
          label: "Dev",
          items: [
            {
              id: "shell-preview",
              label: "Shell preview",
              icon: "layout-dashboard",
              href: SHELL_PREVIEW_HREF,
            },
            {
              id: "hrm-metadata",
              label: "HRM metadata UI",
              icon: "list",
              href: HRM_METADATA_PREVIEW_HREF,
              active: true,
            },
          ],
        },
      ],
      footer: (
        <AppShellRailFooter
          labels={{
            sidebarControl: "Sidebar",
            expanded: "Expanded mode",
            expandedHelp: "Always show the full navigation rail.",
            hover: "Expand on hover",
            hoverHelp: "Show only icons; expands while hovering.",
            collapsed: "Collapsed",
            collapsedHelp: "Show only icons in the navigation rail.",
          }}
        />
      ),
    },
  }

  return (
    <AppShell
      envelope={{ surface: "dashboard", locale }}
      rail={rail}
      utilityBar={{
        left: <UtilityBarLeft />,
        right: <AppShellPreviewUtilityBarRight />,
      }}
    >
      <AppSubLayout
        rail={METADATA_SUB_RAIL}
        command={<AppShellPreviewCommandPalette />}
      >
        <AppShellSurface
          title="HRM metadata preview"
          subtitle="Governed renderer shapes — recruitment workbench, candidate portal, and employee payslips. No auth, no database."
          breadcrumbs={[
            { label: "Dev" },
            { label: "HRM metadata" },
          ]}
        >
          <HrmMetadataPreviewContent />
        </AppShellSurface>
      </AppSubLayout>
    </AppShell>
  )
}

function UtilityBarLeft() {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-start gap-1.5">
      <AppShellBrandDisc
        href={HRM_METADATA_PREVIEW_HREF}
        ariaLabel="Afenda home (metadata preview)"
        tooltip="Reload this metadata preview"
      />
      <AppShellAppsDisc
        ariaLabel="Apps (preview)"
        tooltip="App launcher — dev preview only"
      />
      <AppShellPreviewPolicyDisc />
      <div aria-hidden className="h-4 w-px shrink-0 bg-border/40" />
      <AppShellPreviewOperationalScope />
    </div>
  )
}
