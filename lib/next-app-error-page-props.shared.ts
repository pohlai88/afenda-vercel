/**
 * Props Next.js passes to segment `error.tsx` and root `global-error.tsx` client boundaries.
 *
 * Keep this type in a module without a "use client" directive so TS 71007 (serializable
 * props on client entry files) does not mis-flag `unstable_retry` — it is
 * framework-injected, not a Server Action.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export type NextAppErrorPageProps = {
  error: Error & { digest?: string }
  unstable_retry?: () => void
  reset?: () => void
}
