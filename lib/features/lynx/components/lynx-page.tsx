import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#features/governed-surface"
import { isLynxOperatorEnabled, isLynxStructuredQueryDemoEnabled } from "#flags"
import { requireOrgSession } from "#lib/auth"

import {
  AddKnowledgeChunkForm,
  listRecentKnowledgeChunks,
  SearchKnowledgeChunksForm,
} from "#features/knowledge"

import { NlSqlDemoClient } from "./nl-sql-demo-client"
import { OperatorAssistClient } from "./operator-assist-client"
import { TruthSearchClient } from "./truth-search-client"

export async function LynxPage() {
  // Start all independent fetches in parallel — translations and session auth
  // are fully independent; the chunk list is the only one that needs org.organizationId.
  const [t, ts, org, operatorEnabled, structuredQueryDemoEnabled] =
    await Promise.all([
      getTranslations("Dashboard.Lynx"),
      getTranslations("Dashboard.Lynx.substrate"),
      requireOrgSession(),
      isLynxOperatorEnabled(),
      isLynxStructuredQueryDemoEnabled(),
    ])
  const recent = await listRecentKnowledgeChunks(org.organizationId, 12)

  return (
    <div className="space-y-8">
      <ModulePageHeader
        title={t("title")}
        eyebrow={t("eyebrow")}
        description={t("description")}
      />

      <TruthSearchClient />

      {operatorEnabled ? (
        <OperatorAssistClient />
      ) : (
        <FeaturePolicyNotice
          title={t("operator.sectionTitle")}
          description={t("operator.disabledDescription")}
        />
      )}

      {structuredQueryDemoEnabled ? (
        <NlSqlDemoClient />
      ) : (
        <FeaturePolicyNotice
          title={t("nlDemo.sectionTitle")}
          description={t("nlDemo.disabledDescription")}
        />
      )}

      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
        <h2 className="font-medium">{ts("addTitle")}</h2>
        <p className="text-sm text-muted-foreground">{ts("addDescription")}</p>
        <AddKnowledgeChunkForm />
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
        <h2 className="font-medium">{ts("searchTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {ts("searchDescription")}
        </p>
        <SearchKnowledgeChunksForm />
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">{ts("recentTitle")}</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">{ts("recentEmpty")}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {recent.map((row) => (
              <li key={row.id} className="rounded-lg border bg-card px-3 py-2">
                <span className="font-medium">{row.title}</span>
                <p className="line-clamp-2 text-muted-foreground">{row.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function FeaturePolicyNotice({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-dashed bg-muted/20 p-4">
      <h2 className="font-medium">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </section>
  )
}
