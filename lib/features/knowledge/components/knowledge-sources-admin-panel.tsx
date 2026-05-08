import { getTranslations } from "next-intl/server"

import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"
import { Textarea } from "#components/ui/textarea"

import { KNOWLEDGE_SOURCE_KINDS } from "#features/knowledge/constants"

import { createKnowledgeSourceFormAction } from "../actions/create-source"
import { deleteKnowledgeSourceFormAction } from "../actions/delete-source"
import { runKnowledgeEvalSetFormAction } from "../actions/run-eval-set"
import { runKnowledgeSourceSyncFormAction } from "../actions/run-source-sync"
import { cancelKnowledgeSourceSyncFormAction } from "../actions/cancel-source-sync"
import { toggleKnowledgeSourceEnabledFormAction } from "../actions/toggle-source-enabled"
import { updateKnowledgeSourceFormAction } from "../actions/update-source"
import { listEvalSetsForOrganization } from "../data/eval.queries.server"
import { listKnowledgeSourcesForOrganization } from "../data/source.queries.server"
import { listSourceSyncRunsForOrganization } from "../data/sync-run.queries.server"
import { BotLinksAdminPanel } from "./bot-links-admin-panel"
import { KnowledgeEvalHistoryTile } from "./knowledge-eval-history-tile"
import { KnowledgeByokAdminPanel } from "./knowledge-byok-admin-panel"
import { KnowledgeOrgSettingsPanel } from "./knowledge-org-settings-panel"

export async function KnowledgeSourcesAdminPanel({
  organizationId,
  orgSlug,
}: {
  organizationId: string
  orgSlug: string
}) {
  const t = await getTranslations("OrgAdmin.knowledge")
  const sources = await listKnowledgeSourcesForOrganization(organizationId)
  const evalSets = await listEvalSetsForOrganization(organizationId)
  const syncRuns = await listSourceSyncRunsForOrganization(organizationId)
  const latestSyncBySource = new Map<string, (typeof syncRuns)[number]>()
  for (const run of syncRuns) {
    if (!latestSyncBySource.has(run.sourceId)) {
      latestSyncBySource.set(run.sourceId, run)
    }
  }

  return (
    <div className="space-y-4">
      <KnowledgeOrgSettingsPanel organizationId={organizationId} />

      <Card>
        <CardHeader>
          <CardTitle>{t("createTitle")}</CardTitle>
          <CardDescription>{t("createDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createKnowledgeSourceFormAction} className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="knowledge-source-kind">{t("kindLabel")}</Label>
              <select
                id="knowledge-source-kind"
                name="kind"
                className="h-9 rounded-md border bg-transparent px-3 text-sm"
                defaultValue="github_repo"
              >
                {KNOWLEDGE_SOURCE_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="knowledge-source-name">{t("nameLabel")}</Label>
              <Input
                id="knowledge-source-name"
                name="name"
                placeholder={t("namePlaceholder")}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="knowledge-source-config">
                {t("configLabel")}
              </Label>
              <Textarea
                id="knowledge-source-config"
                name="configJson"
                rows={6}
                defaultValue={JSON.stringify(
                  { owner: "vercel", repo: "next.js" },
                  null,
                  2
                )}
              />
            </div>
            <Button type="submit">{t("createSubmit")}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("listTitle")}</CardTitle>
          <CardDescription>{t("listDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("listEmpty")}</p>
          ) : (
            <ul className="space-y-3">
              {sources.map((source) => (
                <li key={source.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{source.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {source.kind} ·{" "}
                        {source.enabled ? t("enabled") : t("disabled")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("lastSyncedAt", {
                          value: source.lastSyncedAt
                            ? source.lastSyncedAt.toISOString()
                            : t("neverSynced"),
                        })}
                      </p>
                      {latestSyncBySource.get(source.id) ? (
                        <p className="text-xs text-muted-foreground">
                          {t("syncState")}:{" "}
                          {latestSyncBySource.get(source.id)?.state}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <form action={toggleKnowledgeSourceEnabledFormAction}>
                        <input
                          type="hidden"
                          name="sourceId"
                          value={source.id}
                        />
                        <input
                          type="hidden"
                          name="enabled"
                          value={source.enabled ? "0" : "1"}
                        />
                        <Button type="submit" size="sm" variant="secondary">
                          {source.enabled
                            ? t("disableSubmit")
                            : t("enableSubmit")}
                        </Button>
                      </form>
                      <form action={runKnowledgeSourceSyncFormAction}>
                        <input
                          type="hidden"
                          name="sourceId"
                          value={source.id}
                        />
                        <Button type="submit" size="sm" variant="outline">
                          {t("syncSubmit")}
                        </Button>
                      </form>
                      {latestSyncBySource.get(source.id)?.state ===
                      "running" ? (
                        <form action={cancelKnowledgeSourceSyncFormAction}>
                          <input
                            type="hidden"
                            name="sourceId"
                            value={source.id}
                          />
                          <input
                            type="hidden"
                            name="runId"
                            value={
                              latestSyncBySource.get(source.id)?.runId ?? ""
                            }
                          />
                          <Button type="submit" size="sm" variant="outline">
                            {t("cancelSyncSubmit")}
                          </Button>
                        </form>
                      ) : null}
                      <form action={deleteKnowledgeSourceFormAction}>
                        <input
                          type="hidden"
                          name="sourceId"
                          value={source.id}
                        />
                        <Button type="submit" size="sm" variant="destructive">
                          {t("deleteSubmit")}
                        </Button>
                      </form>
                    </div>
                  </div>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                      {t("editSource")}
                    </summary>
                    <form
                      action={updateKnowledgeSourceFormAction}
                      className="mt-2 grid gap-2"
                    >
                      <input type="hidden" name="sourceId" value={source.id} />
                      <Input name="name" defaultValue={source.name} />
                      <Textarea
                        name="configJson"
                        rows={5}
                        defaultValue={JSON.stringify(source.config, null, 2)}
                      />
                      <input
                        type="hidden"
                        name="enabled"
                        value={source.enabled ? "true" : "false"}
                      />
                      <Button type="submit" size="sm" variant="outline">
                        {t("saveSource")}
                      </Button>
                    </form>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("evalTitle")}</CardTitle>
          <CardDescription>{t("evalDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {evalSets.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("evalEmpty")}</p>
          ) : (
            <form
              action={runKnowledgeEvalSetFormAction}
              className="flex flex-wrap gap-2"
            >
              <select
                name="evalSetId"
                className="h-9 min-w-[14rem] rounded-md border bg-transparent px-3 text-sm"
                defaultValue={evalSets[0]?.id}
              >
                {evalSets.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.name}
                  </option>
                ))}
              </select>
              <Input
                name="topK"
                type="number"
                min={1}
                max={30}
                defaultValue={8}
                className="w-24"
              />
              <Button type="submit" variant="outline">
                {t("evalSubmit")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <KnowledgeEvalHistoryTile
        organizationId={organizationId}
        orgSlug={orgSlug}
      />

      <BotLinksAdminPanel organizationId={organizationId} />

      <KnowledgeByokAdminPanel organizationId={organizationId} />
    </div>
  )
}
