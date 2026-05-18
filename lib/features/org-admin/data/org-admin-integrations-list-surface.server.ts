import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import type {
  OrgEventDeliverySummary,
  OrgEventEndpointSummary,
  OrgImportJobFailureSummary,
  OrgImportJobSummary,
} from "../types"

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

function summarizeRecentDeliveries(
  deliveries: readonly OrgEventDeliverySummary[],
  emptyLabel: string
): string {
  if (deliveries.length === 0) return emptyLabel
  const latest = deliveries[0]
  return `${deliveries.length} recent · ${latest.eventType} · ${latest.state}`
}

function summarizeRecentFailures(
  failures: readonly OrgImportJobFailureSummary[],
  emptyLabel: string
): string {
  if (failures.length === 0) return emptyLabel
  const latest = failures[0]
  return `${failures.length} recent · ${latest.code}`
}

type OrgIntegrationsEndpointsListCopy = {
  empty: string
  colName: string
  colUrl: string
  colStatus: string
  colRecent: string
  noRecent: string
  enabledLabel: (enabled: boolean) => string
  eventsLabel: (count: number) => string
}

export function buildOrgIntegrationsEndpointsListSurfaceConfiguration(
  endpoints: readonly OrgEventEndpointSummary[],
  recentByEndpointId: ReadonlyMap<string, readonly OrgEventDeliverySummary[]>,
  copy: OrgIntegrationsEndpointsListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: { title: "org-admin-integrations-endpoints" },
      columnsId: "org-admin-integrations-endpoints",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "name", header: copy.colName },
      { id: "url", header: copy.colUrl },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "default" },
      },
      { id: "recent", header: copy.colRecent },
    ],
    rows: endpoints.map((endpoint) => ({
      id: endpoint.id,
      cells: {
        name: endpoint.name,
        url: endpoint.url,
        status: `${copy.enabledLabel(endpoint.enabled)} · ${copy.eventsLabel(endpoint.events.length)}`,
        recent: summarizeRecentDeliveries(
          recentByEndpointId.get(endpoint.id) ?? [],
          copy.noRecent
        ),
      },
      trailingAction: { state: "ready" as const },
    })),
  }
}

type OrgIntegrationsImportsListCopy = {
  empty: string
  colAdapter: string
  colSummary: string
  colFile: string
  colRecent: string
  noRecent: string
  noFile: string
  adapterLabel: (adapter: OrgImportJobSummary["adapter"]) => string
  rowSummary: (job: OrgImportJobSummary) => string
}

export function buildOrgIntegrationsImportsListSurfaceConfiguration(
  jobs: readonly OrgImportJobSummary[],
  failuresByJobId: ReadonlyMap<string, readonly OrgImportJobFailureSummary[]>,
  copy: OrgIntegrationsImportsListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    presentation: PRESENTATION,
    surface: {
      header: { title: "org-admin-integrations-imports" },
      columnsId: "org-admin-integrations-imports",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "adapter", header: copy.colAdapter },
      { id: "summary", header: copy.colSummary },
      { id: "file", header: copy.colFile },
      { id: "recent", header: copy.colRecent },
    ],
    rows: jobs.map((job) => ({
      id: job.id,
      cells: {
        adapter: copy.adapterLabel(job.adapter),
        summary: copy.rowSummary(job),
        file:
          job.metadata && typeof job.metadata.filename === "string"
            ? job.metadata.filename
            : copy.noFile,
        recent: summarizeRecentFailures(
          failuresByJobId.get(job.id) ?? [],
          copy.noRecent
        ),
      },
      trailingAction: { state: "ready" as const },
    })),
  }
}
