import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table"

import { listSkillMatrixForOrg } from "../data/skill.queries.server"

type SkillMatrixPanelProps = {
  readonly organizationId: string
}

export async function SkillMatrixPanel({
  organizationId,
}: SkillMatrixPanelProps) {
  const [t, matrix] = await Promise.all([
    getTranslations("Dashboard.Hrm.skills"),
    listSkillMatrixForOrg(organizationId),
  ])

  if (matrix.skills.length === 0) {
    return null
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("matrixTitle")}</CardTitle>
        <CardDescription>{t("matrixDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("matrixEmployee")}</TableHead>
              {matrix.skills.map((skill) => (
                <TableHead key={skill.id} className="text-center text-xs">
                  {skill.code}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrix.rows.map((row) => (
              <TableRow key={row.employeeId}>
                <TableCell className="whitespace-nowrap">
                  {row.employeeLabel}
                </TableCell>
                {matrix.skills.map((skill) => (
                  <TableCell key={skill.id} className="text-center text-xs">
                    {row.proficiencyBySkillId[skill.id] ?? "—"}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
