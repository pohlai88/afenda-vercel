"use client"

import type { ComponentProps } from "react"

import { useDocsPage } from "fumadocs-ui/layouts/notebook/page"

import { cn } from "#lib/utils"

/**
 * Article slot — mirrors fumadocs-ui default notebook page container (no inner
 * ScrollArea). Scrolling is owned by the notebook layout / document, not #nd-page.
 */
export function AskDocsPageScrollContainer({
  children,
  className,
  ...props
}: ComponentProps<"article">) {
  const {
    props: { full },
  } = useDocsPage()

  return (
    <article
      id="nd-page"
      data-full={full}
      {...props}
      className={cn(
        "flex flex-col gap-4 px-4 py-6 [grid-area:main] *:max-w-[900px] md:px-6 md:pt-8 xl:px-8 xl:pt-14",
        full && "*:max-w-[1285px]",
        className
      )}
    >
      {children}
    </article>
  )
}
