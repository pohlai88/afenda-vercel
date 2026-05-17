import { getTranslations } from "next-intl/server"

import { Button } from "#components2/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Label } from "#components2/ui/label"

import { updateKnowledgeOrgSettingsFormAction } from "../actions/update-org-settings"
import { getKnowledgeOrgSetting } from "../data/settings.queries.server"

function CheckboxField({
  id,
  name,
  defaultChecked,
  label,
}: {
  id: string
  name: string
  defaultChecked: boolean
  label: string
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <input type="hidden" name={name} value="0" />
      <input
        id={id}
        name={name}
        type="checkbox"
        value="1"
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border"
      />
      {label}
    </label>
  )
}

export async function KnowledgeOrgSettingsPanel({
  organizationId,
}: {
  organizationId: string
}) {
  const t = await getTranslations("OrgAdmin.knowledge")
  const setting = await getKnowledgeOrgSetting(organizationId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settingsTitle")}</CardTitle>
        <CardDescription>{t("settingsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          action={updateKnowledgeOrgSettingsFormAction}
          className="space-y-3"
        >
          <div className="space-y-2">
            <Label>{t("settingsTogglesLabel")}</Label>
            <CheckboxField
              id="knowledge-hybrid-enabled"
              name="retrievalHybridEnabled"
              defaultChecked={setting?.retrievalHybridEnabled ?? false}
              label={t("settingsHybrid")}
            />
            <CheckboxField
              id="knowledge-rerank-enabled"
              name="retrievalRerankEnabled"
              defaultChecked={setting?.retrievalRerankEnabled ?? false}
              label={t("settingsRerank")}
            />
            <CheckboxField
              id="knowledge-enforce-zdr"
              name="enforceZdr"
              defaultChecked={setting?.enforceZdr ?? false}
              label={t("settingsZdr")}
            />
          </div>
          <Button type="submit" variant="outline">
            {t("settingsSubmit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
