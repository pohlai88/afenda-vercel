import Image from "next/image"
import { getTranslations } from "next-intl/server"

import { Button } from "#components/ui/button"
import { Link } from "#i18n/navigation"
import { APP_ICON_512_PNG } from "#lib/site"
import { cn } from "#lib/utils"

import { ConsoleControlMenu } from "./console-control-menu"

const CHROME_RING_BASE =
  "shrink-0 rounded-full! border border-border/60 bg-card/72 p-0! shadow-elevation-1 backdrop-blur-md transition-colors hover:bg-card/92 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
const BRAND_RING_CLASS = cn(CHROME_RING_BASE, "size-[33px]! min-h-0!")

/**
 * L1 bar for the Console loading bay — mirrors {@link NexusUtilityBar} rhythm
 * (brand · surface label · account) without org switcher or command palette.
 */
export async function ConsoleTopNavBar({ userEmail }: { userEmail: string }) {
  const t = await getTranslations("Console.topNav")

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/72 supports-backdrop-filter:backdrop-blur-xl">
      <div className="flex h-12 items-center gap-2 px-3 sm:px-4">
        <div className="shrink-0">
          <Button
            type="button"
            variant="ghost"
            asChild
            className={cn(BRAND_RING_CLASS, "relative block overflow-hidden")}
          >
            <Link href="/" aria-label={t("brandHome")} prefetch={false}>
              <Image
                src={APP_ICON_512_PNG}
                alt=""
                width={33}
                height={33}
                className="size-[33px] object-contain"
                aria-hidden
              />
            </Link>
          </Button>
        </div>

        <div className="mx-auto flex min-w-0 flex-1 justify-center">
          <span className="truncate text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {t("surfaceLabel")}
          </span>
        </div>

        <div className="shrink-0">
          <ConsoleControlMenu userEmail={userEmail} />
        </div>
      </div>
    </header>
  )
}
