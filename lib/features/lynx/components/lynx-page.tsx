import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#components/module-page-header"
import { requireOrgSession } from "#lib/tenant"

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
  const [t, ts, org] = await Promise.all([
    getTranslations("Dashboard.Lynx"),
    getTranslations("Dashboard.Lynx.substrate"),
    requireOrgSession(),
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

      <OperatorAssistClient />

      <NlSqlDemoClient />

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
