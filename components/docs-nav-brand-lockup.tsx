import Image from "next/image"

import {
  BRAND_COMBINED_LOCKUP_DARK_PNG,
  BRAND_COMBINED_LOCKUP_PNG,
  SITE_NAME,
} from "#lib/site"

/**
 * Fumadocs Notebook top nav title: icon + wordmark, theme-aware.
 * Same treatment as the inline lockup used on the public docs surface.
 */
export function DocsNavBrandLockup() {
  return (
    <span className="inline-flex items-center">
      <Image
        src={BRAND_COMBINED_LOCKUP_PNG}
        alt={SITE_NAME}
        width={1800}
        height={488}
        className="h-[66px] w-auto object-contain dark:hidden"
        priority
      />
      <Image
        src={BRAND_COMBINED_LOCKUP_DARK_PNG}
        alt={SITE_NAME}
        width={1800}
        height={488}
        className="hidden h-[66px] w-auto object-contain dark:inline"
        priority
      />
    </span>
  )
}
