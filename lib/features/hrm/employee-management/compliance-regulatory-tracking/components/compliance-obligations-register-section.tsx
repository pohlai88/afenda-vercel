import { getTranslations } from "next-intl/server"

import { GovernedSection } from "#features/governed-surface"
import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"
import { Label } from "#components2/ui/label"

import { upsertComplianceObligationFormAction } from "../actions/compliance-obligation.actions"
import { HRM_COMPLIANCE_EXCEPTION_AREAS } from "../data/compliance-status.shared"
import { HRM_COMPLIANCE_OBLIGATION_KINDS } from "../data/compliance-obligation.shared"

type ComplianceObligationsRegisterSectionProps = {
  orgSlug: string
  canCreate: boolean
}

export async function ComplianceObligationsRegisterSection({
  orgSlug,
  canCreate,
}: ComplianceObligationsRegisterSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.compliance.obligations")

  if (!canCreate) {
    return (
      <p className="text-sm text-muted-foreground">{t("readOnlyRegister")}</p>
    )
  }

  return (
    <GovernedSection
      title={t("registerTitle")}
      description={t("registerDescription")}
    >
      <form
        action={upsertComplianceObligationFormAction}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        data-testid="hrm-compliance-obligation-register-form"
      >
        <input type="hidden" name="orgSlug" value={orgSlug} />
        <div className="space-y-1">
          <Label htmlFor="obligation-code">{t("fieldCode")}</Label>
          <Input
            id="obligation-code"
            name="code"
            required
            className="text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="obligation-title">{t("fieldTitle")}</Label>
          <Input
            id="obligation-title"
            name="title"
            required
            className="text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="obligation-kind">{t("fieldKind")}</Label>
          <select
            id="obligation-kind"
            name="requirementKind"
            required
            className="h-9 w-full rounded border border-border bg-background px-2 text-sm"
            defaultValue="policy_acknowledgement"
          >
            {HRM_COMPLIANCE_OBLIGATION_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="obligation-area">{t("fieldArea")}</Label>
          <select
            id="obligation-area"
            name="complianceArea"
            required
            className="h-9 w-full rounded border border-border bg-background px-2 text-sm"
            defaultValue="acknowledgement"
          >
            {HRM_COMPLIANCE_EXCEPTION_AREAS.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="obligation-country">{t("fieldCountry")}</Label>
          <Input
            id="obligation-country"
            name="countryCode"
            placeholder="MY"
            maxLength={2}
            className="text-sm uppercase"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="obligation-entity">{t("fieldLegalEntity")}</Label>
          <Input
            id="obligation-entity"
            name="legalEntityCode"
            className="text-sm"
          />
        </div>
        <div className="space-y-1 sm:col-span-2 lg:col-span-3">
          <Button
            type="submit"
            size="sm"
            data-testid="hrm-compliance-obligation-save"
          >
            {t("saveSubmit")}
          </Button>
        </div>
      </form>
    </GovernedSection>
  )
}
