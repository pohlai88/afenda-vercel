import { getTranslations } from "next-intl/server"

import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"

import {
  createKnowledgeCredentialFormAction,
  deleteKnowledgeCredentialFormAction,
  rotateKnowledgeCredentialFormAction,
  toggleKnowledgeCredentialFormAction,
} from "../actions/credentials"
import { listOrgProviderCredentials } from "../data/credential.queries.server"

export async function KnowledgeByokAdminPanel({
  organizationId,
}: {
  organizationId: string
}) {
  const t = await getTranslations("OrgAdmin.knowledge")
  const credentials = await listOrgProviderCredentials(organizationId)

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div>
        <h4 className="text-base font-semibold">{t("byokTitle")}</h4>
        <p className="text-sm text-muted-foreground">{t("byokDescription")}</p>
      </div>

      <form
        action={createKnowledgeCredentialFormAction}
        className="grid gap-2 md:grid-cols-3"
      >
        <div className="grid gap-1">
          <Label htmlFor="byok-provider">{t("byokProviderLabel")}</Label>
          <Input
            id="byok-provider"
            name="provider"
            placeholder="openai"
            required
          />
        </div>
        <div className="grid gap-1 md:col-span-2">
          <Label htmlFor="byok-secret">{t("byokSecretLabel")}</Label>
          <Input id="byok-secret" name="secret" type="password" required />
        </div>
        <div className="md:col-span-3">
          <Button type="submit" size="sm">
            {t("byokCreateSubmit")}
          </Button>
        </div>
      </form>

      {credentials.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("byokEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {credentials.map((credential) => (
            <li
              key={credential.provider}
              className="rounded border p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{credential.provider}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("byokStateLabel", {
                      state: credential.state,
                      enabled: credential.enabled ? "true" : "false",
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={toggleKnowledgeCredentialFormAction}>
                    <input
                      type="hidden"
                      name="provider"
                      value={credential.provider}
                    />
                    <input
                      type="hidden"
                      name="enabled"
                      value={credential.enabled ? "0" : "1"}
                    />
                    <Button type="submit" size="sm" variant="secondary">
                      {credential.enabled
                        ? t("byokDisableSubmit")
                        : t("byokEnableSubmit")}
                    </Button>
                  </form>
                  <form action={deleteKnowledgeCredentialFormAction}>
                    <input
                      type="hidden"
                      name="provider"
                      value={credential.provider}
                    />
                    <Button type="submit" size="sm" variant="destructive">
                      {t("byokDeleteSubmit")}
                    </Button>
                  </form>
                </div>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  {t("byokRotateSummary")}
                </summary>
                <form
                  action={rotateKnowledgeCredentialFormAction}
                  className="mt-2 flex gap-2"
                >
                  <input
                    type="hidden"
                    name="provider"
                    value={credential.provider}
                  />
                  <Input
                    name="secret"
                    type="password"
                    placeholder={t("byokRotatePlaceholder")}
                    required
                  />
                  <Button type="submit" size="sm" variant="outline">
                    {t("byokRotateSubmit")}
                  </Button>
                </form>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
