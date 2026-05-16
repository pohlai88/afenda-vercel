import { getTranslations } from "next-intl/server"

import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
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

import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"
import { listHrmDocumentsForEmployee } from "../data/hrm-document.queries.server"

import { EmployeePortalDocumentRequestForm } from "./employee-portal-document-request-form.client"
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
    listHrmDocumentsForEmployee(
      context.portal.organizationId,
      context.employee.id
    ),
  ])

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
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("listEmpty")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right"> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>{doc.title}</TableCell>
                      <TableCell>{doc.documentType}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={doc.blobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {t("download")}
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
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
