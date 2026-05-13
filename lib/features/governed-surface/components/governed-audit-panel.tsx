import type { AuditPanelModel } from "../schemas/audit-panel.schema"

export type GovernedAuditPanelProps = {
  model: AuditPanelModel
}

/**
 * Read-only audit/evidence table — label resolution stays in the owning module.
 */
export function GovernedAuditPanel({ model }: GovernedAuditPanelProps) {
  if (model.rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        {model.headerDescription ?? "No audit rows."}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold tracking-tight">
          {model.headerTitle}
        </h3>
        {model.headerDescription ? (
          <p className="text-sm text-muted-foreground">{model.headerDescription}</p>
        ) : null}
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Action</th>
              <th className="px-3 py-2 font-medium">Actor</th>
              <th className="px-3 py-2 font-medium">Resource</th>
              <th className="px-3 py-2 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {model.rows.map((row) => (
              <tr key={row.id}>
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground font-mono text-xs">
                  {row.occurredAt}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{row.action}</td>
                <td className="max-w-[180px] truncate px-3 py-2">{row.actorLabel}</td>
                <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground">
                  {row.resourceLabel ?? "—"}
                </td>
                <td className="max-w-[320px] truncate px-3 py-2 text-muted-foreground">
                  {row.narrative ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
