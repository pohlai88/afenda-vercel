"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  Activity,
  Bell,
  Building2,
  Camera,
  CircleHelp,
  Database,
  Keyboard,
  Languages,
  LayoutGrid,
  MessageCircle,
  MessageSquare,
  PenLine,
  Plug,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  Wifi,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import { Label } from "#components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "#components/ui/sheet"
import { Switch } from "#components/ui/switch"
import { ui, uiRadius } from "#lib/design-system"
import { APP_LOCALES } from "#lib/i18n/locales.shared"
import { cn } from "#lib/utils"

import {
  NEXUS_RIGHT_UTILITY_WIDGET_IDS,
  type NexusUtilityRightWidgetId,
  type NexusUtilityWidgetId,
} from "./nexus-utility-widget-ids"
import {
  defaultUtilityWidgetVisibility,
  isUtilityWidgetCustomizable,
} from "./nexus-utility-widget-registry"

const STORAGE_KEY = "afenda.nexusUtilityBar.widgets.v1"

export type UtilityWidgetVisibilityPrefs = Partial<
  Record<NexusUtilityWidgetId, boolean>
>

type NexusUtilityWidgetUiValue = {
  isWidgetVisible: (id: NexusUtilityWidgetId) => boolean
  setWidgetVisible: (id: NexusUtilityWidgetId, visible: boolean) => void
  resetWidgetLayout: () => void
  openUtilityCustomize: () => void
}

const NexusUtilityWidgetUiContext =
  createContext<NexusUtilityWidgetUiValue | null>(null)

function loadPrefsFromStorage(): UtilityWidgetVisibilityPrefs {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as UtilityWidgetVisibilityPrefs
    }
  } catch {
    /* ignore */
  }
  return {}
}

export function NexusUtilityWidgetPreferencesProvider({
  children,
}: {
  children: ReactNode
}) {
  const [prefs, setPrefs] = useState<UtilityWidgetVisibilityPrefs>({})
  const [prefsReady, setPrefsReady] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)

  useEffect(() => {
    const apply = () => {
      setPrefs(loadPrefsFromStorage())
      setPrefsReady(true)
    }
    let idleHandle: number | undefined
    let timeoutHandle: number | undefined
    if (typeof window.requestIdleCallback === "function") {
      idleHandle = window.requestIdleCallback(apply)
    } else {
      timeoutHandle = window.setTimeout(apply, 0)
    }
    return () => {
      if (idleHandle !== undefined) window.cancelIdleCallback(idleHandle)
      if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle)
    }
  }, [])

  useEffect(() => {
    if (!prefsReady) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    } catch {
      /* ignore */
    }
  }, [prefs, prefsReady])

  const isWidgetVisible = useCallback(
    (id: NexusUtilityWidgetId) => {
      const entry = prefs[id]
      if (typeof entry === "boolean") return entry
      return defaultUtilityWidgetVisibility(id)
    },
    [prefs]
  )

  const setWidgetVisible = useCallback(
    (id: NexusUtilityWidgetId, visible: boolean) => {
      setPrefs((prev) => {
        const defaultV = defaultUtilityWidgetVisibility(id)
        if (visible === defaultV) {
          if (!(id in prev)) return prev
          const next = { ...prev }
          delete next[id]
          return next
        }
        return { ...prev, [id]: visible }
      })
    },
    []
  )

  const resetWidgetLayout = useCallback(() => {
    setPrefs({})
  }, [])

  const openUtilityCustomize = useCallback(() => {
    setCustomizeOpen(true)
  }, [])

  const value = useMemo(
    () => ({
      isWidgetVisible,
      setWidgetVisible,
      resetWidgetLayout,
      openUtilityCustomize,
    }),
    [isWidgetVisible, openUtilityCustomize, resetWidgetLayout, setWidgetVisible]
  )

  return (
    <NexusUtilityWidgetUiContext.Provider value={value}>
      {children}
      <NexusUtilityWidgetCustomizeSheet
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        isWidgetVisible={isWidgetVisible}
        setWidgetVisible={setWidgetVisible}
        onReset={resetWidgetLayout}
      />
    </NexusUtilityWidgetUiContext.Provider>
  )
}

export function useNexusUtilityWidgetUi(): NexusUtilityWidgetUiValue {
  const ctx = useContext(NexusUtilityWidgetUiContext)
  if (!ctx) {
    return {
      isWidgetVisible: (id) => defaultUtilityWidgetVisibility(id),
      setWidgetVisible: () => {},
      resetWidgetLayout: () => {},
      openUtilityCustomize: () => {},
    }
  }
  return ctx
}

type CustomizeSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  isWidgetVisible: (id: NexusUtilityWidgetId) => boolean
  setWidgetVisible: (id: NexusUtilityWidgetId, visible: boolean) => void
  onReset: () => void
}

function NexusUtilityWidgetCustomizeSheet({
  open,
  onOpenChange,
  isWidgetVisible,
  setWidgetVisible,
  onReset,
}: CustomizeSheetProps) {
  const t = useTranslations("Dashboard.shell.utilityBar.customize")
  const tWidgetsRight = useTranslations(
    "Dashboard.shell.utilityBar.widgets.right"
  )
  const multiLocale = APP_LOCALES.length > 1

  const rightRows = NEXUS_RIGHT_UTILITY_WIDGET_IDS.filter((id) => {
    if (!isUtilityWidgetCustomizable(id)) return false
    if (id === "right.locale" && !multiLocale) return false
    return true
  })
  const visibleRightCount = rightRows.filter((id) => isWidgetVisible(id)).length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex w-full flex-col border-l border-border/60 bg-background/96 p-0 supports-[backdrop-filter]:bg-background/72 supports-[backdrop-filter]:backdrop-blur-2xl sm:max-w-lg",
          ui.elevation.floating
        )}
      >
        <SheetHeader className="border-b border-border/50 px-surface-lg py-surface-lg text-left sm:px-surface-xl">
          <div
            className={cn(
              "af-material af-material-shell flex flex-col gap-surface-sm p-surface-lg",
              ui.radius.surface
            )}
            data-phase="idle"
          >
            <div className="flex items-start justify-between gap-surface-md">
              <div className="min-w-0 space-y-1">
                <SheetTitle>{t("title")}</SheetTitle>
                <SheetDescription>{t("description")}</SheetDescription>
              </div>
              <div
                className={cn(
                  "shrink-0 rounded-full border border-border/60 bg-background/72 px-surface-sm py-1 text-xs font-medium text-muted-foreground shadow-elevation-1",
                  uiRadius.chip
                )}
                aria-label={`${visibleRightCount}/${rightRows.length}`}
              >
                {visibleRightCount}/{rightRows.length}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-surface-lg py-surface-lg sm:px-surface-xl">
          <section
            className={cn(
              "af-material af-material-opaque flex flex-col gap-surface-md p-surface-md",
              ui.radius.surface
            )}
          >
            <div className="flex items-center justify-between gap-surface-sm border-b border-border/50 pb-surface-sm">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {t("sectionRight")}
              </p>
              <div
                className={cn(
                  "rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground",
                  uiRadius.chip
                )}
              >
                {rightRows.length}
              </div>
            </div>
            <div className="flex flex-col gap-surface-sm">
              {rightRows.map((id) => (
                <WidgetToggleRow
                  key={id}
                  id={id}
                  icon={WIDGET_ICONS[id]}
                  label={tWidgetsRight(rightWidgetLabelKey(id))}
                  checked={isWidgetVisible(id)}
                  onCheckedChange={(v) => setWidgetVisible(id, v)}
                />
              ))}
            </div>
          </section>
        </div>

        <div className="mt-auto border-t border-border/50 px-surface-lg py-surface-md sm:px-surface-xl">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={onReset}
          >
            {t("reset")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

const WIDGET_ICONS: Record<NexusUtilityRightWidgetId, LucideIcon> = {
  "right.console": Building2,
  "right.quickCreate": PenLine,
  "right.notifications": Bell,
  "right.connectivity": Wifi,
  "right.diagnosis": Activity,
  "right.searchMobile": Search,
  "right.shortcuts": Keyboard,
  "right.help": CircleHelp,
  "right.theme": Sun,
  "right.density": LayoutGrid,
  "right.locale": Languages,
  "right.messenger": MessageCircle,
  "right.feedback": MessageSquare,
  "right.screenshot": Camera,
  "right.upload": Upload,
  "right.storage": Database,
  "right.insight": Sparkles,
  "right.integrations": Plug,
  "right.settings": ShieldCheck,
}

function rightWidgetLabelKey(
  id: NexusUtilityRightWidgetId
):
  | "console"
  | "quickCreate"
  | "notifications"
  | "connectivity"
  | "diagnosis"
  | "searchMobile"
  | "shortcuts"
  | "help"
  | "theme"
  | "density"
  | "locale"
  | "messenger"
  | "feedback"
  | "screenshot"
  | "upload"
  | "storage"
  | "insight"
  | "integrations"
  | "settings" {
  switch (id) {
    case "right.console":
      return "console"
    case "right.quickCreate":
      return "quickCreate"
    case "right.notifications":
      return "notifications"
    case "right.connectivity":
      return "connectivity"
    case "right.diagnosis":
      return "diagnosis"
    case "right.searchMobile":
      return "searchMobile"
    case "right.shortcuts":
      return "shortcuts"
    case "right.help":
      return "help"
    case "right.theme":
      return "theme"
    case "right.density":
      return "density"
    case "right.locale":
      return "locale"
    case "right.messenger":
      return "messenger"
    case "right.feedback":
      return "feedback"
    case "right.screenshot":
      return "screenshot"
    case "right.upload":
      return "upload"
    case "right.storage":
      return "storage"
    case "right.insight":
      return "insight"
    case "right.integrations":
      return "integrations"
    case "right.settings":
      return "settings"
  }
}

function WidgetToggleRow({
  id,
  icon: Icon,
  label,
  checked,
  onCheckedChange,
}: {
  id: NexusUtilityWidgetId
  icon: LucideIcon
  label: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  const switchId = `utility-widget-${id.replace(/\./g, "-")}`
  return (
    <div
      data-active={checked}
      className={cn(
        "group flex items-center justify-between gap-surface-sm border border-border/50 bg-card px-surface-sm py-surface-sm text-card-foreground shadow-elevation-1 transition-colors hover:bg-muted/35 data-[active=true]:border-border/70 data-[active=true]:bg-background/90 data-[active=true]:shadow-elevation-2",
        ui.radius.section
      )}
    >
      <Label
        htmlFor={switchId}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-surface-sm text-sm font-normal"
      >
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center border border-border/50 bg-background/78 shadow-elevation-1 transition-colors group-data-[active=true]:bg-card",
            ui.radius.control
          )}
        >
          <Icon
            className="size-4 text-muted-foreground"
            aria-hidden
            strokeWidth={2}
          />
        </span>
        <span className="truncate">{label}</span>
      </Label>
      <Switch
        id={switchId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        size="sm"
      />
    </div>
  )
}
