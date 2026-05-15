"use client"

import type { ReactNode } from "react"
import Image from "next/image"
import type { Route } from "next"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { useTheme } from "next-themes"
import { useLocale, useTranslations } from "next-intl"
import {
  Activity,
  Bell,
  Camera,
  CheckCircle2,
  CircleHelp,
  Database,
  FileUp,
  Grip,
  Keyboard,
  Languages,
  MessageCircle,
  MessageSquare,
  Moon,
  PenLine,
  Rows3,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Wifi,
} from "lucide-react"

import { Link, usePathname, useRouter } from "#i18n/navigation"
import { APP_LOCALES } from "#lib/i18n/locales.shared"
import { APP_ICON_512_PNG, ERP_UTILITY_AVATAR_PNG } from "#lib/site"
import { uiRadius, uiSurfaceElevation, uiTracking } from "#lib/design-system"
import { cn } from "#lib/utils"

import { Button } from "../ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"

// ---------------------------------------------------------------------------
// Disc geometry + chrome (single class for all utility-bar discs)
// ---------------------------------------------------------------------------

const DISC_PX = 33

/** Disc shell for avatar / brand-style utility triggers (33px). */
export const APP_SHELL_UTILITY_DISC_CLASS = cn(
  // border-0 removes the Button base `border border-transparent` — that 1px border
  // pushes fill-image inset from the padding edge, leaving a visible gap ring.
  "relative size-[33px] shrink-0 overflow-hidden rounded-full border-0 p-0",
  "text-sidebar-foreground shadow-none",
  "transition-colors hover:bg-sidebar-accent/45 hover:text-sidebar-accent-foreground",
  "focus-visible:ring-2 focus-visible:ring-sidebar-ring/25 focus-visible:ring-offset-0"
)

// ---------------------------------------------------------------------------
// Internal primitive — Tooltip + Button + Image (link or button)
// ---------------------------------------------------------------------------

type AppShellDiscProps = {
  src: string
  ariaLabel: string
  tooltip: string
  href?: Route
  /** Client handler — `*Action` suffix satisfies TS 71007 on `"use client"` entry files. */
  onClickAction?: () => void
  /** Merged onto the disc trigger (Button or Link-as-child). */
  className?: string
}

function AppShellDisc({
  src,
  ariaLabel,
  tooltip,
  href,
  onClickAction,
  className,
}: AppShellDiscProps) {
  const image = (
    <Image
      src={src}
      alt=""
      fill
      sizes={`${DISC_PX}px`}
      draggable={false}
      className="pointer-events-none object-cover select-none"
      aria-hidden
    />
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {href ? (
          <Button
            variant="ghost"
            size="icon-lg"
            asChild
            className={cn(APP_SHELL_UTILITY_DISC_CLASS, className)}
          >
            <Link
              href={href}
              prefetch={false}
              aria-label={ariaLabel}
              className="relative flex items-center justify-center"
            >
              {image}
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label={ariaLabel}
            onClick={onClickAction}
            className={cn(APP_SHELL_UTILITY_DISC_CLASS, className)}
          >
            {image}
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom" align="center" sideOffset={8}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

// ---------------------------------------------------------------------------
// Presets — `AppShellDisc` (PNG): brand + avatar only.
// ---------------------------------------------------------------------------

export type AppShellBrandDiscProps = {
  href: Route
  ariaLabel: string
  tooltip: string
  className?: string
}

export function AppShellBrandDisc({
  href,
  ariaLabel,
  tooltip,
  className,
}: AppShellBrandDiscProps) {
  return (
    <AppShellDisc
      src={APP_ICON_512_PNG}
      href={href}
      ariaLabel={ariaLabel}
      tooltip={tooltip}
      className={className}
    />
  )
}

export type AppShellAvatarDiscProps = {
  ariaLabel: string
  tooltip: string
  onClickAction?: () => void
  className?: string
}

export function AppShellAvatarDisc({
  ariaLabel,
  tooltip,
  onClickAction,
  className,
}: AppShellAvatarDiscProps) {
  return (
    <AppShellDisc
      src={ERP_UTILITY_AVATAR_PNG}
      ariaLabel={ariaLabel}
      tooltip={tooltip}
      onClickAction={onClickAction}
      className={className}
    />
  )
}

// ---------------------------------------------------------------------------
// L2 icon-only round control (28px, ring border)
// Matches the legacy WORKBENCH_UTILITY_ROUND_CONTROL_CLASS shape.
// ---------------------------------------------------------------------------

/** L2 round utility control — shared by icon buttons/links and dropdown triggers. */
export const APP_SHELL_UTILITY_L2_ICON_CLASS = cn(
  "flex size-[28px] shrink-0 items-center justify-center rounded-full",
  "bg-transparent text-muted-foreground ring-1 ring-border/50 transition-colors",
  "hover:bg-muted/55 hover:text-foreground active:bg-muted/75",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:outline-none"
)

const ICON_CLASS = APP_SHELL_UTILITY_L2_ICON_CLASS

/** Internal: icon inside the button — 15px, no pointer events */
function BarIcon({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn("size-[15px] shrink-0 [&>svg]:size-full", className)}
    >
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// AppShellIconButton — round tooltip button (L2 utility controls)
// ---------------------------------------------------------------------------

export type AppShellIconButtonProps = {
  ariaLabel: string
  tooltip: string
  onClickAction?: () => void
  className?: string
  children: ReactNode
}

export function AppShellIconButton({
  ariaLabel,
  tooltip,
  onClickAction,
  className,
  children,
}: AppShellIconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          onClick={onClickAction}
          className={cn(ICON_CLASS, className)}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="center" sideOffset={8}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

// ---------------------------------------------------------------------------
// AppShellIconLink — round tooltip link (L2 utility controls)
// ---------------------------------------------------------------------------

export type AppShellIconLinkProps = {
  href: Route
  ariaLabel: string
  tooltip: string
  className?: string
  children: ReactNode
}

export function AppShellIconLink({
  href,
  ariaLabel,
  tooltip,
  className,
  children,
}: AppShellIconLinkProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          prefetch={false}
          aria-label={ariaLabel}
          className={cn(ICON_CLASS, className)}
        >
          {children}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="center" sideOffset={8}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

// ---------------------------------------------------------------------------
// L1 left-rail — apps + policy (Lucide, same 28px ring chrome as right rail)
// ---------------------------------------------------------------------------

export type AppShellAppsDiscProps = {
  ariaLabel: string
  tooltip: string
  className?: string
}

export function AppShellAppsDisc({
  ariaLabel,
  tooltip,
  className,
}: AppShellAppsDiscProps) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={ariaLabel}
              className={cn(
                APP_SHELL_UTILITY_L2_ICON_CLASS,
                "data-[state=open]:bg-muted/55 data-[state=open]:text-foreground",
                className
              )}
            >
              <BarIcon>
                <Grip strokeWidth={2} />
              </BarIcon>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" sideOffset={8}>
          {tooltip}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className={cn(
          "flex max-h-[min(92vh,40rem)] w-[min(20rem,calc(100vw-2rem))] min-w-0 flex-col gap-0 overflow-hidden p-0",
          "border border-border bg-card/95 text-card-foreground backdrop-blur-sm",
          uiRadius.popover,
          uiSurfaceElevation.raised,
          "ring-0 ring-offset-0"
        )}
      >
        <div className="shrink-0 border-b border-border/50 px-4 py-3">
          <p className="text-xs font-semibold tracking-tight text-card-foreground">
            App launcher
          </p>
          <p
            className={cn(
              "mt-1 text-[11px] leading-snug text-muted-foreground",
              uiTracking.control
            )}
          >
            No apps configured yet.
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export type AppShellPolicyDiscProps = {
  ariaLabel: string
  tooltip: string
  /** When provided, renders a standard dropdown panel anchored to the trigger. */
  dropdownContent?: ReactNode
  className?: string
}

export function AppShellPolicyDisc({
  ariaLabel,
  tooltip,
  dropdownContent,
  className,
}: AppShellPolicyDiscProps) {
  if (!dropdownContent) {
    return (
      <AppShellIconButton
        ariaLabel={ariaLabel}
        tooltip={tooltip}
        className={className}
      >
        <BarIcon>
          <Scale strokeWidth={2} />
        </BarIcon>
      </AppShellIconButton>
    )
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={ariaLabel}
              className={cn(
                APP_SHELL_UTILITY_L2_ICON_CLASS,
                "data-[state=open]:bg-muted/55 data-[state=open]:text-foreground",
                className
              )}
            >
              <BarIcon>
                <Scale strokeWidth={2} />
              </BarIcon>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" sideOffset={8}>
          {tooltip}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className={cn(
          "flex max-h-[min(92vh,40rem)] w-[min(28rem,calc(100vw-2rem))] min-w-0 flex-col gap-0 overflow-hidden p-0",
          "border border-border bg-card/95 text-card-foreground backdrop-blur-sm",
          uiRadius.popover,
          uiSurfaceElevation.raised,
          "ring-0 ring-offset-0"
        )}
      >
        {dropdownContent}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---------------------------------------------------------------------------
// Named right-rail icon presets — icon shape only, no business logic inside
// ---------------------------------------------------------------------------

/** Help / docs link */
export function AppShellHelpIcon(
  props: Omit<AppShellIconLinkProps, "children">
) {
  return (
    <AppShellIconLink {...props}>
      <BarIcon>
        <CircleHelp strokeWidth={2} />
      </BarIcon>
    </AppShellIconLink>
  )
}

/** Lynx · machine insight link */
export function AppShellInsightIcon(
  props: Omit<AppShellIconLinkProps, "children">
) {
  return (
    <AppShellIconLink {...props}>
      <BarIcon>
        <Sparkles strokeWidth={2} />
      </BarIcon>
    </AppShellIconLink>
  )
}

/** Org admin settings link */
export function AppShellSettingsIcon(
  props: Omit<AppShellIconLinkProps, "children">
) {
  return (
    <AppShellIconLink {...props}>
      <BarIcon>
        <ShieldCheck strokeWidth={2} />
      </BarIcon>
    </AppShellIconLink>
  )
}

/** Quick-create button */
export function AppShellQuickCreateIcon(
  props: Omit<AppShellIconButtonProps, "children">
) {
  return (
    <AppShellIconButton {...props}>
      <BarIcon>
        <PenLine strokeWidth={2} />
      </BarIcon>
    </AppShellIconButton>
  )
}

/** Search button (mobile only — hidden at sm+) */
export function AppShellSearchMobileIcon(
  props: Omit<AppShellIconButtonProps, "children">
) {
  return (
    <AppShellIconButton {...props} className={cn("sm:hidden", props.className)}>
      <BarIcon>
        <Search strokeWidth={2} />
      </BarIcon>
    </AppShellIconButton>
  )
}

/** Notifications bell button */
export function AppShellNotificationsIcon(
  props: Omit<AppShellIconButtonProps, "children">
) {
  return (
    <AppShellIconButton {...props}>
      <BarIcon>
        <Bell strokeWidth={2} />
      </BarIcon>
    </AppShellIconButton>
  )
}

/** Keyboard shortcuts button */
export function AppShellShortcutsIcon(
  props: Omit<AppShellIconButtonProps, "children">
) {
  return (
    <AppShellIconButton {...props}>
      <BarIcon>
        <Keyboard strokeWidth={2} />
      </BarIcon>
    </AppShellIconButton>
  )
}

/** Theme (sun / moon) toggle — flips light/dark via `next-themes`. */
export function AppShellThemeIcon(
  props: Omit<AppShellIconButtonProps, "children">
) {
  const { resolvedTheme, setTheme } = useTheme()
  const t = useTranslations("Dashboard.shell.utilityBar.theme")

  const toggleHint =
    resolvedTheme === "dark" ? t("toggleToLight") : t("toggleToDark")

  function handleClick() {
    props.onClickAction?.()
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  return (
    <AppShellIconButton
      {...props}
      ariaLabel={`${props.ariaLabel} — ${toggleHint}`}
      onClickAction={handleClick}
      className={cn("relative", props.className)}
    >
      <BarIcon className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90">
        <Sun strokeWidth={2} />
      </BarIcon>
      <BarIcon className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0">
        <Moon strokeWidth={2} />
      </BarIcon>
    </AppShellIconButton>
  )
}

/** Layout density button */
export function AppShellDensityIcon(
  props: Omit<AppShellIconButtonProps, "children">
) {
  return (
    <AppShellIconButton {...props}>
      <BarIcon>
        <Rows3 strokeWidth={2} />
      </BarIcon>
    </AppShellIconButton>
  )
}

/** Locale / language dropdown — lists available locales, switches via router. */
export function AppShellLocaleDropdown({
  ariaLabel = "Language",
  tooltip = "Language",
  className,
}: {
  ariaLabel?: string
  tooltip?: string
  className?: string
}) {
  const currentLocale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const LOCALE_LABELS: Record<string, string> = { en: "English" }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={ariaLabel}
              className={cn(
                APP_SHELL_UTILITY_L2_ICON_CLASS,
                "data-[state=open]:bg-muted/55 data-[state=open]:text-foreground",
                className
              )}
            >
              <BarIcon>
                <Languages strokeWidth={2} />
              </BarIcon>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" sideOffset={8}>
          {tooltip}
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={cn(
          "w-48 p-1",
          "border border-border bg-card/95 text-card-foreground backdrop-blur-sm",
          uiRadius.popover,
          uiSurfaceElevation.raised,
          "ring-0 ring-offset-0"
        )}
      >
        <DropdownMenuLabel className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Language
        </DropdownMenuLabel>
        {APP_LOCALES.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onSelect={() => {
              if (locale !== currentLocale) {
                router.replace(pathname, { locale })
              }
            }}
            className="flex cursor-pointer items-center gap-2 text-[11px]"
          >
            <span className="size-3.5 shrink-0">
              {locale === currentLocale ? (
                <CheckCircle2 className="size-full" strokeWidth={2} />
              ) : null}
            </span>
            {LOCALE_LABELS[locale] ?? locale}
            {locale === currentLocale && (
              <span className="ml-auto text-[10px] text-muted-foreground">
                Current
              </span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-[10px] leading-snug text-muted-foreground">
          More languages coming soon.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** @deprecated Use AppShellLocaleDropdown. Kept for backward compatibility. */
export const AppShellLocaleIcon = AppShellLocaleDropdown

/** Feedback button */
export function AppShellFeedbackIcon(
  props: Omit<AppShellIconButtonProps, "children">
) {
  return (
    <AppShellIconButton {...props}>
      <BarIcon>
        <MessageSquare strokeWidth={2} />
      </BarIcon>
    </AppShellIconButton>
  )
}

/** Messenger / async messaging button */
export function AppShellMessengerIcon(
  props: Omit<AppShellIconButtonProps, "children">
) {
  return (
    <AppShellIconButton {...props}>
      <BarIcon>
        <MessageCircle strokeWidth={2} />
      </BarIcon>
    </AppShellIconButton>
  )
}

/** Connectivity / network status button */
export function AppShellConnectivityIcon(
  props: Omit<AppShellIconButtonProps, "children">
) {
  return (
    <AppShellIconButton {...props}>
      <BarIcon>
        <Wifi strokeWidth={2} />
      </BarIcon>
    </AppShellIconButton>
  )
}

/** Storage inspector button */
export function AppShellStorageIcon(
  props: Omit<AppShellIconButtonProps, "children">
) {
  return (
    <AppShellIconButton {...props}>
      <BarIcon>
        <Database strokeWidth={2} />
      </BarIcon>
    </AppShellIconButton>
  )
}

/** Screenshot capture button */
export function AppShellScreenshotIcon(
  props: Omit<AppShellIconButtonProps, "children">
) {
  return (
    <AppShellIconButton {...props}>
      <BarIcon>
        <Camera strokeWidth={2} />
      </BarIcon>
    </AppShellIconButton>
  )
}

/** File upload button */
export function AppShellUploadIcon(
  props: Omit<AppShellIconButtonProps, "children">
) {
  return (
    <AppShellIconButton {...props}>
      <BarIcon>
        <FileUp strokeWidth={2} />
      </BarIcon>
    </AppShellIconButton>
  )
}

/** Network diagnosis button */
export function AppShellDiagnosisIcon(
  props: Omit<AppShellIconButtonProps, "children">
) {
  return (
    <AppShellIconButton {...props}>
      <BarIcon>
        <Activity strokeWidth={2} />
      </BarIcon>
    </AppShellIconButton>
  )
}

// ---------------------------------------------------------------------------
// Slot clusters — left wing (brand + apps) and right wing (identity)
// ---------------------------------------------------------------------------

export type AppShellUtilityBarLeftIconsProps = {
  brandHref: Route
  brandAriaLabel: string
  brandTooltip: string
  appsAriaLabel: string
  appsTooltip: string
  policyAriaLabel: string
  policyTooltip: string
  /** Rendered inside the policy dropdown panel. Omit to render a plain icon button. */
  policyDropdownContent?: ReactNode
  /** Optional operational scope rail — RSC parent passes the server-resolved node. */
  scopeRail?: ReactNode
}

export function AppShellUtilityBarLeftIcons({
  brandHref,
  brandAriaLabel,
  brandTooltip,
  appsAriaLabel,
  appsTooltip,
  policyAriaLabel,
  policyTooltip,
  policyDropdownContent,
  scopeRail,
}: AppShellUtilityBarLeftIconsProps) {
  return (
    <div className="flex min-w-0 items-center gap-0.5">
      <AppShellBrandDisc
        href={brandHref}
        ariaLabel={brandAriaLabel}
        tooltip={brandTooltip}
      />
      <div className="flex items-center gap-1.5">
        <AppShellAppsDisc ariaLabel={appsAriaLabel} tooltip={appsTooltip} />
        <AppShellPolicyDisc
          ariaLabel={policyAriaLabel}
          tooltip={policyTooltip}
          dropdownContent={policyDropdownContent}
        />
      </div>
      {scopeRail ? (
        <div className="ml-1 flex min-w-0 items-center">{scopeRail}</div>
      ) : null}
    </div>
  )
}

export type AppShellUtilityBarRightIconsProps = {
  avatarAriaLabel: string
  avatarTooltip: string
  onAvatarClickAction?: () => void
}

export function AppShellUtilityBarRightIcons({
  avatarAriaLabel,
  avatarTooltip,
  onAvatarClickAction,
}: AppShellUtilityBarRightIconsProps) {
  return (
    <div className="flex min-w-0 items-center justify-end gap-1.5">
      <AppShellAvatarDisc
        ariaLabel={avatarAriaLabel}
        tooltip={avatarTooltip}
        onClickAction={onAvatarClickAction}
      />
    </div>
  )
}
