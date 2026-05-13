import { getTranslations } from "next-intl/server"

import { Badge } from "#components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table"

import type { BenefitPlanRow } from "../data/benefit-model.shared"

import { BenefitArchivePlanForm } from "./benefit-archive-plan-form"
import { BenefitPlanCreateDialog } from "./benefit-plan-create-dialog"
import { BenefitPlanEditDialog } from "./benefit-plan-edit-dialog"

type BenefitPlansTableProps = {
  isAdmin: boolean
  plans: readonly BenefitPlanRow[]
}

function formatDate(value: Date | null): string {
  if (!value) return "—"
  return value.toISOString().slice(0, 10)
}

export async function BenefitPlansTable({ isAdmin, plans }: BenefitPlansTableProps) {
  const t = await getTranslations("Dashboard.Hrm.benefits.plansTable")

  if (plans.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {isAdmin ? (
          <div className="flex justify-end">
            <BenefitPlanCreateDialog />
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
          <BenefitPlanCreateDialog />
        </div>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("colCode")}</TableHead>
            <TableHead>{t("colName")}</TableHead>
            <TableHead>{t("colKind")}</TableHead>
            <TableHead>{t("colEffective")}</TableHead>
            <TableHead>{t("colStatus")}</TableHead>
            {isAdmin ? <TableHead className="text-end">{t("colActions")}</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan) => (
            <TableRow key={plan.id}>
              <TableCell className="font-mono text-sm">{plan.code}</TableCell>
              <TableCell>{plan.name}</TableCell>
              <TableCell>
                <span className="text-sm capitalize">{plan.benefitKind.replaceAll("_", " ")}</span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(plan.effectiveFrom)}
              </TableCell>
              <TableCell>
                <Badge variant={plan.isActive ? "success" : "secondary"}>
                  {plan.isActive ? t("statusActive") : t("statusInactive")}
                </Badge>
              </TableCell>
              {isAdmin ? (
                <TableCell className="text-end">
                  <div className="flex flex-wrap justify-end gap-2">
                    <BenefitPlanEditDialog plan={plan} />
                    {plan.isActive ? (
                      <BenefitArchivePlanForm planId={plan.id} planLabel={plan.name} />
                    ) : null}
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
