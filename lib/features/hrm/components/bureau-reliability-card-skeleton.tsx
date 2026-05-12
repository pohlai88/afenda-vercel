import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"

/**
 * Phase 3N — geometry-matched fallback for `BureauReliabilityCard`.
 * Title / description / header strip + 3 row skeletons (one per
 * canonical authority — KWSP, PERKESO, LHDN). No layout shift on first
 * paint per App Router runtime doctrine.
 */
export async function BureauReliabilityCardSkeleton() {
  const t = await getTranslations("Dashboard.Hrm.compliance.bureauReliability")
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>
          <span className="block h-3 w-72 max-w-full rounded bg-muted" />
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-y-1 text-sm">
            <tbody>
              {[0, 1, 2].map((index) => (
                <tr key={index} className="rounded-md bg-card/50">
                  <td className="px-2 py-2">
                    <span className="block h-4 w-20 rounded bg-muted" />
                  </td>
                  <td className="px-2 py-2">
                    <span className="block h-5 w-16 rounded bg-muted" />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <span className="ml-auto block h-4 w-10 rounded bg-muted" />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <span className="ml-auto block h-4 w-12 rounded bg-muted" />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <span className="ml-auto block h-4 w-12 rounded bg-muted" />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <span className="ml-auto block h-4 w-14 rounded bg-muted" />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <span className="ml-auto block h-4 w-12 rounded bg-muted" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <span className="block h-3 w-48 rounded bg-muted" />
      </CardContent>
    </Card>
  )
}
