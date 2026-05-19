import { getTranslations } from "next-intl/server"

import { AuthPageFrame } from "#components2/auth/auth-page-frame"
import { Button } from "#components2/ui/button"
import { Link } from "#i18n/navigation"

/**
 * Invalid segment under auth flows (`/sign-in/…`, `/sign-up/…`, etc.) — keeps
 * {@link AuthPageFrame} so the gradient + brand framing matches real auth pages.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 */
export default async function AuthGroupNotFound() {
  const t = await getTranslations("AuthShell")

  return (
    <AuthPageFrame>
      <div className="flex flex-col gap-6 text-center">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t("notFoundCode")}
          </p>
          <h1 className="text-lg font-medium text-foreground">
            {t("notFoundTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("notFoundDescription")}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/sign-in" prefetch={false}>
              {t("backToSignIn")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/" prefetch={false}>
              {t("goHome")}
            </Link>
          </Button>
        </div>
      </div>
    </AuthPageFrame>
  )
}
