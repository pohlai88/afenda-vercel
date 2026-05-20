import { getTranslations } from "next-intl/server"

import { organizationHrmPath } from "../../../constants"
import { Link } from "#i18n/navigation"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

type SftAttendanceShiftLinkProps = {
  orgSlug: string
}

export async function SftAttendanceShiftLink({
  orgSlug,
}: SftAttendanceShiftLinkProps) {
  const t = await getTranslations("Dashboard.Hrm.shiftScheduling")
  const href = organizationHrmPath(orgSlug, "shift-scheduling")

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("attendanceLinkTitle")}</CardTitle>
        <CardDescription>{t("attendanceLinkDescription")}</CardDescription>
      </CardHeader>
      <p className="px-6 pb-4 text-sm">
        <Link
          href={href}
          className="font-medium text-primary underline-offset-4 hover:underline"
          prefetch={false}
        >
          {t("attendanceLinkLabel")}
        </Link>
      </p>
    </Card>
  )
}
