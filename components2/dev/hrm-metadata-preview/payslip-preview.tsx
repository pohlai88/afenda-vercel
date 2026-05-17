import { GovernedComponentRenderer } from "#components2/metadata"

import {
  DEV_PAYSLIP_LINES_SURFACE,
  DEV_PAYSLIP_LIST_SURFACE,
  DEV_PAYSLIP_SUMMARY_STATS,
} from "./payslip-metadata.shared"

function MetadataBlock({
  label,
  componentType,
  configuration,
}: {
  label: string
  componentType: "governed:stat-card" | "governed:list-surface"
  configuration: Record<string, unknown>
}) {
  return (
    <div className="flex flex-col gap-2">
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

export function HrmPayslipMetadataPreview() {
  return (
    <section
      id="employee-payslips"
      aria-labelledby="employee-payslips-heading"
      className="scroll-mt-24 flex flex-col gap-6"
    >
      <div className="space-y-1">
        <h2
          id="employee-payslips-heading"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          Employee portal — Payslips
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Metadata built from{" "}
          <code>PayrollPayslipSnapshot</code> — no auth, no database. Open{" "}
          <code>/en/dev/hrm-metadata-preview</code> with <code>pnpm dev</code>.
        </p>
      </div>

      <MetadataBlock
        label="governed:list-surface · payslip list"
        componentType="governed:list-surface"
        configuration={{ ...DEV_PAYSLIP_LIST_SURFACE }}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <MetadataBlock
          label="governed:list-surface · pay lines"
          componentType="governed:list-surface"
          configuration={{ ...DEV_PAYSLIP_LINES_SURFACE }}
        />
        <MetadataBlock
          label="governed:stat-card · summary"
          componentType="governed:stat-card"
          configuration={{ ...DEV_PAYSLIP_SUMMARY_STATS }}
        />
      </div>
    </section>
  )
}
