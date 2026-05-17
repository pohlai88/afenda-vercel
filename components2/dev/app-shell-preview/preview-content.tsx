import type { Route } from "next"
import Link from "next/link"

import { GovernedComponentRenderer } from "#components2/metadata"

import { METADATA_RENDERER_GALLERY_HREF } from "../fixtures/preview-href.shared"
import { SHELL_PREVIEW_LIST_SURFACE } from "../fixtures/list-surface.fixture"
import { SHELL_PREVIEW_STAT_CARDS } from "../fixtures/stat-cards.fixture"

export function AppShellPreviewContent() {
  return (
    <div className="flex flex-col gap-6">
      <GovernedComponentRenderer
        component={{
          type: "governed:stat-card",
          serverType: "governed:stat-card",
          configuration: SHELL_PREVIEW_STAT_CARDS,
        }}
      />

      <GovernedComponentRenderer
        component={{
          type: "governed:list-surface",
          serverType: "governed:list-surface",
          configuration: SHELL_PREVIEW_LIST_SURFACE,
        }}
      />

      <p className="text-sm text-muted-foreground">
        Full renderer catalog:{" "}
        <Link
          href={METADATA_RENDERER_GALLERY_HREF as Route}
          prefetch={false}
          className="text-primary hover:underline"
        >
          Metadata renderer gallery
        </Link>
      </p>

      <section
        aria-label="Dev notes"
        className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3.5 text-xs text-muted-foreground"
      >
        <p className="font-medium text-foreground">Dev preview notes</p>
        <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
          <li>
            <strong className="text-foreground">Primary rail</strong> —{" "}
            <code>AppShell</code> with <code>mode=&quot;primary&quot;</code>:{" "}
            <code>PrimaryNavItem</code> / <code>SidebarMenuButton</code> —
            collapse and tooltips via <code>SidebarProvider</code>. Persist key:{" "}
            <code>dev-shell-preview-rail</code>.
          </li>
          <li>
            <strong className="text-foreground">Secondary rail</strong> —{" "}
            <code>AppSubLayout</code> with{" "}
            <code>rail=&#123;SUB_RAIL&#125;</code>: floating HRM text nav when
            the primary sidebar is icon-only (
            <code>useSidebar().open === false</code>). Hover the content pane to
            reveal it.{" "}
            <code>
              command=&#123;&lt;AppShellPreviewCommandPalette /&gt;&#125;
            </code>{" "}
            mounts the cmdk dialog with the same store as the center search
            trigger.
          </li>
          <li>
            Mock nav, badges, and recents are cosmetic; rail and preview{" "}
            <code>href</code>s point back to this page. The utility-bar{" "}
            <strong>Help</strong> icon uses a locale-internal{" "}
            <code>/ask-docs</code> path (same contract as <code>Link</code> from{" "}
            <code>#i18n/navigation</code>) so it opens the real public docs
            surface.
          </li>
          <li>
            <strong className="text-foreground">
              Utility bar — tenant vs scope
            </strong>{" "}
            — The <strong>building + name</strong> chip is the active{" "}
            <em>organization</em> (workspace tenant), same role as{" "}
            <code>WorkbenchOrgCompanySwitch</code> on real ERP routes. The{" "}
            <strong>operational scope</strong> rail (project, team, …) is{" "}
            <em>inside</em> that tenant — ADR-0019 does not model organization
            as a scope dimension, so it will not appear as a fifth row in{" "}
            <strong>Configure</strong>.
          </li>
          <li>
            <strong className="text-foreground">
              Utility bar — operational scope
            </strong>{" "}
            — <code>OperationalScopeRail</code> (mock context via{" "}
            <code>AppShellPreviewOperationalScope</code>): project + team pills,{" "}
            <strong>Add scope</strong> ghost, and org-admin{" "}
            <strong>Configure</strong> sheet. Server Actions are not connected
            to a real org session in this preview.
          </li>
          <li>
            <strong className="text-foreground">
              Utility bar — right rail
            </strong>{" "}
            — <code>AppShellUtilityBarRight</code> renders items from the
            persisted Zustand store (<code>useUtilityBarStore</code>). Icons are
            drag-to-reorder; order and visibility are saved to{" "}
            <code>localStorage</code>. The <strong>Marketplace</strong> Store
            icon opens <code>AppShellUtilityDropdown</code> with a titled
            header, dev-style row hovers, grouped actions, and a footnote
            footer. <strong>Customise icon bar</strong> opens a right{" "}
            <code>Sheet</code> with the drag/toggle list;{" "}
            <strong>Request utility</strong> opens a stub <code>Dialog</code>.
            The avatar opens <code>AppShellAccountDropdown</code> (personal IAM
            links + coming-soon placeholders + preview sign-out no-op).
          </li>
          <li>
            <strong className="text-foreground">
              Surface chrome — CRUD-SAP mock
            </strong>{" "}
            — <code>CrudSapActionBar</code>: edge-only separators, HTML5
            drag-and-drop reorder (same affordance as the right rail), persisted
            under <code>afenda-dev-shell-preview-crud-sap-order-v1</code>.
          </li>
          <li>
            <strong className="text-foreground">Governed surfaces</strong> —{" "}
            <code>GovernedComponentRenderer</code> drives{" "}
            <code>governed:stat-card</code> and{" "}
            <code>governed:list-surface</code> through the metadata kernel.
          </li>
        </ul>
      </section>
    </div>
  )
}
