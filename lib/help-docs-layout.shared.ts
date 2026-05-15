import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"

import { SITE_NAME } from "#lib/site"

export function helpDocsBaseLayoutOptions(): BaseLayoutProps {
  return {
    nav: {
      title: SITE_NAME,
    },
  }
}
