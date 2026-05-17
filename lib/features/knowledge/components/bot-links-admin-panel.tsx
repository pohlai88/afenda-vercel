import { getTranslations } from "next-intl/server"

import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"
import { Label } from "#components2/ui/label"

import {
  createOrgBotLinkFormAction,
  deleteOrgBotLinkFormAction,
  testOrgBotLinkFormAction,
  toggleOrgBotLinkEnabledFormAction,
  updateOrgBotLinkFormAction,
} from "../actions/bot-links"
import { listOrgBotLinks } from "../data/bot-link.mutations.server"

export async function BotLinksAdminPanel({
  organizationId,
}: {
  organizationId: string
}) {
  const t = await getTranslations("OrgAdmin.integrations.botLinks")
  const links = await listOrgBotLinks(organizationId)

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div>
        <h4 className="text-base font-semibold">{t("title")}</h4>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <form
        action={createOrgBotLinkFormAction}
        className="grid gap-2 md:grid-cols-2"
      >
        <div className="grid gap-1">
          <Label htmlFor="bot-platform">{t("platformLabel")}</Label>
          <select
            id="bot-platform"
            name="platform"
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            defaultValue="github"
          >
            <option value="github">GitHub</option>
            <option value="discord">Discord</option>
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="bot-repository">{t("repositoryLabel")}</Label>
          <Input id="bot-repository" name="externalRepository" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="bot-install">{t("installationLabel")}</Label>
          <Input id="bot-install" name="externalInstallationId" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="bot-workspace">{t("workspaceLabel")}</Label>
          <Input id="bot-workspace" name="externalWorkspaceId" />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" size="sm">
            {t("createSubmit")}
          </Button>
        </div>
      </form>

      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.id} className="rounded border p-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span>
                  {link.platform} ·{" "}
                  {link.displayName ??
                    link.externalRepository ??
                    link.externalWorkspaceId ??
                    "—"}
                </span>
                <div className="flex flex-wrap gap-2">
                  <form action={toggleOrgBotLinkEnabledFormAction}>
                    <input type="hidden" name="id" value={link.id} />
                    <input
                      type="hidden"
                      name="enabled"
                      value={link.enabled ? "0" : "1"}
                    />
                    <Button type="submit" size="sm" variant="secondary">
                      {link.enabled ? t("disableSubmit") : t("enableSubmit")}
                    </Button>
                  </form>
                  <form action={testOrgBotLinkFormAction}>
                    <input type="hidden" name="id" value={link.id} />
                    <Button type="submit" size="sm" variant="outline">
                      {t("testSubmit")}
                    </Button>
                  </form>
                  <form action={deleteOrgBotLinkFormAction}>
                    <input type="hidden" name="id" value={link.id} />
                    <Button type="submit" size="sm" variant="destructive">
                      {t("deleteSubmit")}
                    </Button>
                  </form>
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("statusLabel", {
                  enabled: link.enabled ? "true" : "false",
                  state: link.lastTestStatus ?? "none",
                })}
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  {t("editSubmit")}
                </summary>
                <form
                  action={updateOrgBotLinkFormAction}
                  className="mt-2 grid gap-2 md:grid-cols-2"
                >
                  <input type="hidden" name="id" value={link.id} />
                  <Input
                    name="displayName"
                    defaultValue={link.displayName ?? ""}
                    placeholder={t("displayNameLabel")}
                  />
                  <Input
                    name="externalRepository"
                    defaultValue={link.externalRepository ?? ""}
                    placeholder={t("repositoryLabel")}
                  />
                  <Input
                    name="externalInstallationId"
                    defaultValue={link.externalInstallationId ?? ""}
                    placeholder={t("installationLabel")}
                  />
                  <Input
                    name="externalWorkspaceId"
                    defaultValue={link.externalWorkspaceId ?? ""}
                    placeholder={t("workspaceLabel")}
                  />
                  <div className="md:col-span-2">
                    <Button type="submit" size="sm" variant="outline">
                      {t("saveSubmit")}
                    </Button>
                  </div>
                </form>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
