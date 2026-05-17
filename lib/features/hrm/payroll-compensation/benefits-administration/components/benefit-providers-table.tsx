import { getTranslations } from "next-intl/server"

import { Badge } from "#components2/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components2/ui/table"

import type { BenefitProviderRow } from "../data/benefit-provider.queries.server"

import { BenefitProviderCreateDialog } from "./benefit-provider-create-dialog"
import {
  BenefitProviderEditDialog,
} from "./benefit-provider-edit-dialog"
import type { BenefitProviderFormRow } from "./benefit-provider-form"

type BenefitProvidersTableProps = {
  isAdmin: boolean
  providers: readonly BenefitProviderRow[]
}

function toFormRow(provider: BenefitProviderRow): BenefitProviderFormRow {
  return {
    id: provider.id,
    code: provider.code,
    name: provider.name,
    countryCodes: provider.countryCodes,
    externalReference: provider.externalReference,
    isActive: provider.isActive,
  }
}

export async function BenefitProvidersTable({
  isAdmin,
  providers,
}: BenefitProvidersTableProps) {
  const t = await getTranslations("Dashboard.Hrm.benefits.providersTable")

  if (providers.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {isAdmin ? (
          <div className="flex justify-end">
            <BenefitProviderCreateDialog />
          </div>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {isAdmin ? t("emptyAdmin") : t("emptyMember")}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {isAdmin ? (
        <div className="flex justify-end">
          <BenefitProviderCreateDialog />
        </div>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("colCode")}</TableHead>
            <TableHead>{t("colName")}</TableHead>
            <TableHead>{t("colCountries")}</TableHead>
            <TableHead>{t("colExternalRef")}</TableHead>
            <TableHead>{t("colStatus")}</TableHead>
            {isAdmin ? (
              <TableHead className="text-end">{t("colActions")}</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {providers.map((provider) => (
            <TableRow key={provider.id}>
              <TableCell className="font-mono text-sm">{provider.code}</TableCell>
              <TableCell>{provider.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {provider.countryCodes.length > 0
                  ? provider.countryCodes.join(", ")
                  : "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {provider.externalReference ?? "—"}
              </TableCell>
              <TableCell>
                <Badge variant={provider.isActive ? "success" : "secondary"}>
                  {provider.isActive ? t("statusActive") : t("statusInactive")}
                </Badge>
              </TableCell>
              {isAdmin ? (
                <TableCell className="text-end">
                  <BenefitProviderEditDialog provider={toFormRow(provider)} />
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
