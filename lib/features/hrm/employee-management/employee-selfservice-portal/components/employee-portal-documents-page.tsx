import { getTranslations } from "next-intl/server"

import { Badge } from "#components2/ui/badge"
import { Button } from "#components2/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import { listEmployeeVisibleDocuments } from "../../documents-management/data/hrm-document.queries.server"
import { downloadPortalEmployeeDocumentAction } from "../actions/employee-portal-document.actions"
import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { buildEmployeePortalDocumentsListSurfaceConfiguration } from "../data/employee-portal-list-surface.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"

import { EmployeePortalDocumentRequestForm } from "./employee-portal-document-request-form.client"
import { GovernedPatternCListSection } from "#features/governed-surface"
import { EmployeePortalSectionNav } from "./employee-portal-section-nav"

type EmployeePortalDocumentsPageProps = {
  portalSlug: string
}

export async function EmployeePortalDocumentsPage({
  portalSlug,
}: EmployeePortalDocumentsPageProps) {
  const context = await requireEmployeePortalContext(portalSlug)
  const [tLeave, t, navLabels, documents] = await Promise.all([
    getTranslations("Dashboard.Hrm.leave"),
    getTranslations("Dashboard.Hrm.portalDocuments"),
    getEmployeePortalSectionNavLabels(),
    listEmployeeVisibleDocuments({
      organizationId: context.portal.organizationId,
      employeeId: context.employee.id,
    }),
  ])

  const listConfiguration = buildEmployeePortalDocumentsListSurfaceConfiguration(
    documents,
    {
      empty: t("listEmpty"),
      colTitle: "Title",
      colType: "Type",
    }
  )

  const documentById = new Map(documents.map((doc) => [doc.id, doc]))

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {tLeave("portalEmployee", {
            employeeNumber: context.employee.employeeNumber,
          })}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-normal">
            {t("portalPageTitle")}
          </h1>
          <Badge variant="outline">{context.employee.legalName}</Badge>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t("portalPageDescription")}
        </p>
      </header>

      <EmployeePortalSectionNav
        portalSlug={context.portal.portalSlug}
        current="documents"
        labels={navLabels}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">{t("listTitle")}</CardTitle>
            <CardDescription>{t("portalPageDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <GovernedPatternCListSection
              layout="embedded"
              title=""
              listConfiguration={listConfiguration}
              surfaceKey="hrm:portal:documents"
              resolveConfiguredPermission={false}
              trailingColumn={{
                header: " ",
                render: (surfaceRow) => {
                  const doc = documentById.get(surfaceRow.id)
                  if (!doc) return null
                  return (
                    <form action={downloadPortalEmployeeDocumentAction}>
                      <input
                        type="hidden"
                        name="portalSlug"
                        value={context.portal.portalSlug}
                      />
                      <input type="hidden" name="documentId" value={doc.id} />
                      <Button
                        variant="outline"
                        size="sm"
                        type="submit"
                        disabled={!doc.canDownload}
                      >
                        {t("download")}
                      </Button>
                    </form>
                  )
                },
              }}
            />
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">{t("requestTitle")}</CardTitle>
            <CardDescription>{t("requestDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeePortalDocumentRequestForm
              portalSlug={context.portal.portalSlug}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}