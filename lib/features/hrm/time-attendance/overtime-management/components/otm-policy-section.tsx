import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import { getOtmPolicyForOrg } from "../data/otm-policy.server"
import { OtmPolicyForm } from "./otm-policy-form.client"

export async function OtmPolicySection({
  organizationId,
  canManage,
}: {
  organizationId: string
  canManage: boolean
}) {
  const t = await getTranslations("Dashboard.Hrm.overtime")
  const policy = await getOtmPolicyForOrg(organizationId)

  if (!canManage) return null

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("policyTitle")}</CardTitle>
        <CardDescription>{t("policyDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <OtmPolicyForm policy={policy} />
      </CardContent>
    </Card>
  )
}
