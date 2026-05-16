import { AuthPageFrame } from "#components/auth/auth-page-frame"
import { Button } from "#components/ui/button"
import { Link } from "#i18n/navigation"

/**
 * Invalid segment under auth flows (`/sign-in/…`, `/sign-up/…`, etc.) — keeps
 * {@link AuthPageFrame} so the gradient + brand framing matches real auth pages.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 */
export default function AuthGroupNotFound() {
  return (
    <AuthPageFrame>
      <div className="flex flex-col gap-6 text-center">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">404</p>
          <h1 className="text-lg font-medium text-foreground">
            Page not found
          </h1>
          <p className="text-sm text-muted-foreground">
            This URL is not part of sign-in, sign-up, or password recovery.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/sign-in" prefetch={false}>
              Back to sign in
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/" prefetch={false}>
              Go home
            </Link>
          </Button>
        </div>
      </div>
    </AuthPageFrame>
  )
}
