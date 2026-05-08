"use client"

import type { ComponentProps } from "react"

import { Button } from "#components/ui/button"

type Props = {
  retryAction?: () => void
  resetAction?: () => void
} & Omit<ComponentProps<typeof Button>, "onClick" | "type">

/**
 * Next.js passes `unstable_retry` / `reset` into segment `error.tsx`; callers should alias
 * those to `retryAction` / `resetAction` so client entry files satisfy TS 71007 (props must
 * use `action` or an `*Action` name at the client boundary).
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export function RouteErrorRetryButton({
  retryAction,
  resetAction,
  ...buttonProps
}: Props) {
  const retry = retryAction ?? resetAction
  return <Button type="button" {...buttonProps} onClick={() => retry?.()} />
}
