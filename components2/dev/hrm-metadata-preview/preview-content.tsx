import type { ReactNode } from "react"

import { GovernedComponentRenderer } from "#components2/metadata"
import { cn } from "#lib/utils"

import {
  HRM_PREVIEW_CANDIDATE_APPLICATION_STATUS_STATS,
  HRM_PREVIEW_CANDIDATE_CAREERS_LIST,
  HRM_PREVIEW_CANDIDATE_ROLE_DETAIL_STATS,
  HRM_PREVIEW_EMPLOYEE_PAYSLIP_LINES_LIST,
  HRM_PREVIEW_EMPLOYEE_PAYSLIP_SUMMARY_STATS,
  HRM_PREVIEW_EMPLOYEE_PAYSLIPS_LIST,
  HRM_PREVIEW_RECRUITMENT_APPLICATIONS_LIST,
  HRM_PREVIEW_RECRUITMENT_PIPELINE_STATS,
  HRM_PREVIEW_RECRUITMENT_REQUISITIONS_LIST,
} from "../fixtures/hrm-metadata-preview.fixture"
import {
  HRM_METADATA_PREVIEW_PORTAL_SLUG,
  METADATA_RENDERER_GALLERY_HREF,
  SHELL_PREVIEW_HREF,
} from "../fixtures/preview-href.shared"

function PreviewSection({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-24 flex flex-col gap-4"
    >
      <div className="space-y-1">
        <h2
          id={`${id}-heading`}
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          {title}
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function RendererBlock({
  label,
  componentType,
  configuration,
  className,
}: {
  label: string
  componentType: "governed:stat-card" | "governed:list-surface"
  configuration: Record<string, unknown>
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="text-xs font-medium text-muted-foreground">
        <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{label}</code>
      </p>
      <GovernedComponentRenderer
        component={{
          type: componentType,
          serverType: componentType,
          configuration,
        }}
      />
    </div>
  )
}

export function HrmMetadataPreviewContent() {
  return (
    <div className="flex flex-col gap-10">
      <PreviewSection
        id="workbench-recruitment"
        title="Workbench — Recruitment ATS"
        description="Internal recruiter surface: pipeline KPIs plus requisitions and applications tables. Production wiring lives in recruitment-applicant-tracking/ with surface builders feeding GovernedComponentRenderer."
      >
        <RendererBlock
          label="governed:stat-card · pipeline"
          componentType="governed:stat-card"
          configuration={HRM_PREVIEW_RECRUITMENT_PIPELINE_STATS}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <RendererBlock
            label="governed:list-surface · requisitions"
            componentType="governed:list-surface"
            configuration={HRM_PREVIEW_RECRUITMENT_REQUISITIONS_LIST}
          />
          <RendererBlock
            label="governed:list-surface · applications"
            componentType="governed:list-surface"
            configuration={HRM_PREVIEW_RECRUITMENT_APPLICATIONS_LIST}
          />
        </div>
      </PreviewSection>

      <PreviewSection
        id="candidate-careers"
        title="Candidate portal — Careers (anonymous)"
        description={`Public listing at /p/{portalSlug}/candidate/careers. Fixture links use portal slug "${HRM_METADATA_PREVIEW_PORTAL_SLUG}" for shape only — routes 404 until a candidate portal exists in your branch.`}
      >
        <RendererBlock
          label="governed:list-surface · careers"
          componentType="governed:list-surface"
          configuration={HRM_PREVIEW_CANDIDATE_CAREERS_LIST}
        />
      </PreviewSection>

      <PreviewSection
        id="candidate-role-detail"
        title="Candidate portal — Role detail"
        description="Pre-apply detail page: stat tiles for department/headcount and required skills, then a primary Apply CTA (hand-built Button in production; multi-step form renderer is a future governed type)."
      >
        <RendererBlock
          label="governed:stat-card · role detail"
          componentType="governed:stat-card"
          configuration={HRM_PREVIEW_CANDIDATE_ROLE_DETAIL_STATS}
        />
      </PreviewSection>

      <PreviewSection
        id="candidate-status"
        title="Candidate portal — Application status (magic link)"
        description="Post-submit status at /p/{portalSlug}/candidate/applications/[token]. Withdraw uses a client form with useActionState; only the status tile is metadata-driven today."
      >
        <RendererBlock
          label="governed:stat-card · application status"
          componentType="governed:stat-card"
          configuration={HRM_PREVIEW_CANDIDATE_APPLICATION_STATUS_STATS}
        />
      </PreviewSection>

      <PreviewSection
        id="employee-payslips"
        title="Employee portal — Payslips"
        description="Payslip list and detail surfaces for the employee self-service portal. The list uses governed:list-surface; the detail uses governed:stat-card for the summary KPIs and governed:list-surface for the line items — matching the layout of EmployeePortalPayslipsPage and EmployeePortalPayslipDetailPage."
      >
        <RendererBlock
          label="governed:list-surface · payslip list"
          componentType="governed:list-surface"
          configuration={HRM_PREVIEW_EMPLOYEE_PAYSLIPS_LIST}
        />
        <div className="mt-2 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <RendererBlock
            label="governed:list-surface · payslip detail — pay lines"
            componentType="governed:list-surface"
            configuration={HRM_PREVIEW_EMPLOYEE_PAYSLIP_LINES_LIST}
          />
          <RendererBlock
            label="governed:stat-card · payslip detail — summary KPIs"
            componentType="governed:stat-card"
            configuration={HRM_PREVIEW_EMPLOYEE_PAYSLIP_SUMMARY_STATS}
          />
        </div>
      </PreviewSection>

      <section
        aria-label="Metadata preview notes"
        className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3.5 text-xs text-muted-foreground"
      >
        <p className="font-medium text-foreground">How to read this page</p>
        <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
          <li>
            Every block above is rendered only through{" "}
            <code>GovernedComponentRenderer</code> — no bespoke table markup.
          </li>
          <li>
            Fixtures mirror{" "}
            <code>recruitment-surface-builders.server.ts</code> and{" "}
            <code>candidate-portal-surface-builders.server.ts</code> output shapes.
          </li>
          <li>
            Future types (<code>governed:kanban-board</code>,{" "}
            <code>governed:multi-step-form</code>,{" "}
            <code>governed:approval-timeline</code>) register in{" "}
            <code>AFENDA_GOVERNED_COMPONENT_REGISTRY</code> before appearing here.
          </li>
          <li>
            Compare chrome with{" "}
            <a href={SHELL_PREVIEW_HREF} className="text-primary underline">
              Shell preview
            </a>{" "}
            — same AppShell contract, different scenario group.
          </li>
          <li>
            All eight shipped renderers with width scenarios:{" "}
            <a
              href={METADATA_RENDERER_GALLERY_HREF}
              className="text-primary underline"
            >
              Metadata renderer gallery
            </a>
            .
          </li>
        </ul>
      </section>
    </div>
  )
}
