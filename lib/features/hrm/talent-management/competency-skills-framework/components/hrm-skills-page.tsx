import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#features/governed-surface"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components2/ui/table"
import { requireOrgSession } from "#lib/auth"

import { listSkillsForOrg } from "../data/skill.queries.server"

import { SkillCreateDialog } from "./skill-create-dialog"
import { SkillEditDialog } from "./skill-edit-dialog"
import { SkillMatrixPanel } from "./skill-matrix-panel"

type HrmSkillsPageProps = {
  readonly orgSlug: string
  readonly canMutate: boolean
}

export async function HrmSkillsPage({
  orgSlug,
  canMutate,
}: HrmSkillsPageProps) {
  const { organizationId } = await requireOrgSession()
  const [skills, t] = await Promise.all([
    listSkillsForOrg(organizationId, { includeArchived: false }),
    getTranslations("Dashboard.Hrm.skills"),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <Card size="sm">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <CardTitle>{t("tableTitle")}</CardTitle>
            <CardDescription>
              {canMutate
                ? t("tableDescriptionAdmin")
                : t("tableDescriptionRead")}
            </CardDescription>
          </div>
          {canMutate ? <SkillCreateDialog orgSlug={orgSlug} /> : null}
        </CardHeader>
        <CardContent>
          {skills.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("headers.code")}</TableHead>
                  <TableHead>{t("headers.label")}</TableHead>
                  <TableHead>{t("headers.category")}</TableHead>
                  {canMutate ? (
                    <TableHead className="text-right">
                      {t("headers.actions")}
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {skills.map((skill) => (
                  <TableRow key={skill.id}>
                    <TableCell className="font-mono text-xs">
                      {skill.code}
                    </TableCell>
                    <TableCell>{skill.label}</TableCell>
                    <TableCell>{skill.categoryLabel ?? "ÔÇö"}</TableCell>
                    {canMutate ? (
                      <TableCell className="text-right">
                        <SkillEditDialog
                          orgSlug={orgSlug}
                          skillId={skill.id}
                          code={skill.code}
                          label={skill.label}
                          description={skill.description}
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SkillMatrixPanel organizationId={organizationId} />
    </div>
  )
}
