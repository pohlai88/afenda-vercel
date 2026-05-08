/**
 * Props typed for client `error.tsx` / `global-error.tsx` **signatures**.
 *
 * Next.js also injects `unstable_retry` / `reset` at runtime; those keys are omitted from
 * {@link NextAppErrorPageProps} so the Next.js TypeScript plugin (serializable props,
 * TS 71007) accepts `"use client"` entry files. Read them via
 * {@link resolveErrorBoundaryRetryCallbacks}.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export type NextAppErrorPageProps = {
  error: Error & { digest?: string }
}

/** Full framework injection shape at runtime (internal). */
type NextAppErrorFrameworkProps = NextAppErrorPageProps & {
  unstable_retry?: () => void
  reset?: () => void
}

/** Maps Next-injected callbacks to `*Action` names safe for client component props. */
export function resolveErrorBoundaryRetryCallbacks(
  props: NextAppErrorPageProps,
): { retryAction?: () => void; resetAction?: () => void } {
  const framework = props as NextAppErrorFrameworkProps
  return {
    retryAction: framework.unstable_retry,
    resetAction: framework.reset,
  }
}
