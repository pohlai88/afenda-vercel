import { getFormatter, getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import { getBureauReliabilitySnapshot } from "../data/bureau-reliability.queries.server"

import { BureauReliabilityListSection } from "./bureau-reliability-list-section"

type BureauReliabilityCardProps = {
  organizationId: string
  windowDays?: number
}

export async function BureauReliabilityCard({
  organizationId,
  windowDays,
}: BureauReliabilityCardProps) {
  const [t, format, snapshot] = await Promise.all([
    getTranslations("Dashboard.Hrm.compliance.bureauReliability"),
    getFormatter(),
    getBureauReliabilitySnapshot(
      organizationId,
      windowDays !== undefined ? { windowDays } : {}
    ),
  ])

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>
          {t("description", { windowDays: snapshot.windowDays })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <BureauReliabilityListSection snapshot={snapshot} />
        <p className="text-xs text-muted-foreground">
          {t("footer", {
            windowDays: snapshot.windowDays,
            rowsConsidered: snapshot.rowsConsidered,
            computedAt: format.dateTime(snapshot.computedAt, {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          })}
        </p>
      </CardContent>
    </Card>
  )
}
