"use client"

import type { ComponentProps } from "react"

import { Button } from "#components/ui/button"

type Props = {
  unstable_retry?: () => void
  reset?: () => void
} & Omit<ComponentProps<typeof Button>, "onClick" | "type">

/**
 * Next.js 16+ segment `error.tsx` receives `unstable_retry`; older setups may pass `reset`.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export function RouteErrorRetryButton({
  unstable_retry,
  reset,
  ...buttonProps
}: Props) {
  const retry = unstable_retry ?? reset
  return <Button type="button" {...buttonProps} onClick={() => retry?.()} />
}
