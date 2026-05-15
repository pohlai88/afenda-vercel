import { Tabs, TabsContent, TabsList, TabsTrigger } from "#components/ui/tabs"

import type {
  GovernedDetailTabsInput,
  GovernedDetailSection,
  GovernedDetailTabKind,
  GovernedDetailTabsModel,
  GovernedRevisionEntry,
} from "../schemas/detail-tabs.schema"
import { governedDetailTabsSchema } from "../schemas/detail-tabs.schema"

import { resolveGovernedDetailSectionContent } from "./detail-section-render-registry"
import { GovernedAuditPanel } from "./governed-audit-panel"
import { GovernedEmpty } from "./governed-empty"

export type GovernedDetailTabsProps = {
  model: GovernedDetailTabsInput
}

function sortVisibleSections(
  sections: GovernedDetailSection[] | undefined
): GovernedDetailSection[] {
  if (!sections?.length) return []
  return sections
    .filter((s) => !s.hidden)
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
}

function renderSectionSlot(section: GovernedDetailSection) {
  const resolved = resolveGovernedDetailSectionContent(section)
  if (resolved != null) {
    return resolved
  }
  return (
    <GovernedEmpty
      model={{
        variant: "muted",
        title: "Renderer not registered",
        description: `No renderer is registered for "${section.rendererKey}".`,
      }}
    />
  )
}

function RevisionsTable({ rows }: { rows: GovernedRevisionEntry[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No revision history.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-3 py-2 font-medium">When</th>
            <th className="px-3 py-2 font-medium">Verb</th>
            <th className="px-3 py-2 font-medium">Actor</th>
            <th className="px-3 py-2 font-medium">Narrative</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-3 py-2 font-mono text-xs whitespace-nowrap text-muted-foreground">
                {row.occurredAt}
              </td>
              <td className="px-3 py-2 font-mono text-xs uppercase">
                {row.verb}
              </td>
              <td className="max-w-[180px] truncate px-3 py-2">
                {row.actorLabel}
              </td>
              <td className="max-w-[480px] px-3 py-2 text-muted-foreground">
                {row.narrative}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function visibleTabKinds(
  model: GovernedDetailTabsModel
): GovernedDetailTabKind[] {
  const kinds: GovernedDetailTabKind[] = ["overview"]
  if (sortVisibleSections(model.relations).length > 0) {
    kinds.push("relations")
  }
  if (sortVisibleSections(model.referrers).length > 0) {
    kinds.push("referrers")
  }
  if ((model.revisions?.length ?? 0) > 0) {
    kinds.push("revisions")
  }
  if ((model.audit?.length ?? 0) > 0) {
    kinds.push("audit")
  }
  return kinds
}

function effectiveDefaultTab(
  model: GovernedDetailTabsModel
): GovernedDetailTabKind {
  const kinds = visibleTabKinds(model)
  if (kinds.includes(model.defaultTab)) {
    return model.defaultTab
  }
  return "overview"
}

export function GovernedDetailTabs({ model }: GovernedDetailTabsProps) {
  const parsedModel = governedDetailTabsSchema.safeParse(model)
  if (!parsedModel.success) {
    return (
      <GovernedEmpty
        model={{
          variant: "muted",
          title: "Detail tabs unavailable",
          description: "The detail tab model could not be parsed.",
        }}
      />
    )
  }
  const normalizedModel = parsedModel.data
  const kinds = visibleTabKinds(normalizedModel)
  const defaultValue = effectiveDefaultTab(normalizedModel)
  const relations = sortVisibleSections(normalizedModel.relations)
  const referrers = sortVisibleSections(normalizedModel.referrers)
  const revisions = normalizedModel.revisions ?? []
  const auditRows = normalizedModel.audit ?? []

  return (
    <div data-test="governed-detail-tabs">
      <Tabs defaultValue={defaultValue} className="gap-4">
        <TabsList
          variant="line"
          className="w-full justify-start overflow-x-auto"
        >
          {kinds.includes("overview") ? (
            <TabsTrigger value="overview" data-test="tab-overview">
              {normalizedModel.overview.label}
            </TabsTrigger>
          ) : null}
          {kinds.includes("relations") ? (
            <TabsTrigger value="relations" data-test="tab-relations">
              Relations
            </TabsTrigger>
          ) : null}
          {kinds.includes("referrers") ? (
            <TabsTrigger value="referrers" data-test="tab-referrers">
              Referrers
            </TabsTrigger>
          ) : null}
          {kinds.includes("revisions") ? (
            <TabsTrigger value="revisions" data-test="tab-revisions">
              Revisions
            </TabsTrigger>
          ) : null}
          {kinds.includes("audit") ? (
            <TabsTrigger value="audit" data-test="tab-audit">
              Audit
            </TabsTrigger>
          ) : null}
        </TabsList>

        {kinds.includes("overview") ? (
          <TabsContent value="overview" data-test="tab-panel-overview">
            {normalizedModel.overview.hidden ? (
              <GovernedEmpty
                model={{
                  variant: "muted",
                  title: "Overview hidden",
                  description: "This overview section is marked hidden.",
                }}
              />
            ) : (
              <div className="flex flex-col gap-4">
                {normalizedModel.overview.description ? (
                  <p className="text-sm text-muted-foreground">
                    {normalizedModel.overview.description}
                  </p>
                ) : null}
                {renderSectionSlot(normalizedModel.overview)}
              </div>
            )}
          </TabsContent>
        ) : null}

        {kinds.includes("relations") ? (
          <TabsContent value="relations" data-test="tab-panel-relations">
            <div className="flex flex-col gap-6">
              {relations.map((section) => (
                <section
                  key={section.id}
                  className="flex flex-col gap-2"
                  aria-labelledby={`governed-detail-relations-${section.id}`}
                >
                  <h3
                    className="text-base font-semibold tracking-tight"
                    id={`governed-detail-relations-${section.id}`}
                  >
                    {section.label}
                  </h3>
                  {section.description ? (
                    <p className="text-sm text-muted-foreground">
                      {section.description}
                    </p>
                  ) : null}
                  {renderSectionSlot(section)}
                </section>
              ))}
            </div>
          </TabsContent>
        ) : null}

        {kinds.includes("referrers") ? (
          <TabsContent value="referrers" data-test="tab-panel-referrers">
            <div className="flex flex-col gap-6">
              {referrers.map((section) => (
                <section
                  key={section.id}
                  className="flex flex-col gap-2"
                  aria-labelledby={`governed-detail-referrers-${section.id}`}
                >
                  <h3
                    className="text-base font-semibold tracking-tight"
                    id={`governed-detail-referrers-${section.id}`}
                  >
                    {section.label}
                  </h3>
                  {section.description ? (
                    <p className="text-sm text-muted-foreground">
                      {section.description}
                    </p>
                  ) : null}
                  {renderSectionSlot(section)}
                </section>
              ))}
            </div>
          </TabsContent>
        ) : null}

        {kinds.includes("revisions") ? (
          <TabsContent value="revisions" data-test="tab-panel-revisions">
            <RevisionsTable rows={revisions} />
          </TabsContent>
        ) : null}

        {kinds.includes("audit") ? (
          <TabsContent value="audit" data-test="tab-panel-audit">
            <GovernedAuditPanel
              model={{
                headerTitle: `${normalizedModel.entityLabel} — audit`,
                headerDescription: `${normalizedModel.entityKind} · ${normalizedModel.entityId}`,
                rows: auditRows,
              }}
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  )
}
