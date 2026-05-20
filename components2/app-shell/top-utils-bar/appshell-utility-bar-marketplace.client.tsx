"use client"

import {
  useCallback,
  useMemo,
  useState,
  type DragEvent,
  type ElementType,
} from "react"
import type { Route } from "next"
import { useTranslations } from "next-intl"
import {
  Activity,
  Bell,
  Camera,
  CircleHelp,
  Database,
  FileUp,
  GripVertical,
  Keyboard,
  Languages,
  LayoutGrid,
  MessageCircle,
  MessageSquare,
  Moon,
  PenLine,
  Plug2,
  RotateCcw,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Sun,
  Wifi,
} from "lucide-react"

import { cn } from "#lib/utils"
import { OrgFeedbackComposeForm } from "#features/org-feedback/client"
import type { UtilityBarCapabilityRow } from "#features/nexus/client"
import { CapabilityToggleButton } from "#features/marketplace/client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog"
import { Input } from "../../ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../ui/sheet"
import { Switch } from "../../ui/switch"
import {
  UTILITY_BAR_CATALOG,
  UTILITY_BAR_MAX_VISIBLE,
  type UtilityBarItemDef,
  type UtilityBarItemId,
} from "./appshell-utility-bar-items"
import { AppShellUtilityBarIconDropdown } from "./appshell-utility-bar-icon-dropdown.client"
import type { UtilityDropdownGroup } from "./appshell-utility-bar-dropdown.client"
import {
  selectAllItemsOrdered,
  useUtilityBarStore,
  type UtilityBarItemState,
} from "../../stores/utility-bar.store"

// ---------------------------------------------------------------------------
// Icon map — catalog icon names → Lucide components for the list UI
// ---------------------------------------------------------------------------

const CATALOG_ICON: Record<string, ElementType> = {
  Search,
  PenLine,
  Bell,
  Sparkles,
  Sun,
  Moon,
  LayoutGrid,
  Languages,
  Keyboard,
  MessageSquare,
  CircleHelp,
  ShieldCheck,
  Wifi,
  Database,
  Camera,
  FileUp,
  Activity,
  MessageCircle,
  ScanSearch,
  Store,
}

/** Match marketplace filter against catalog label, description, id, `searchAliases`, and optional i18n haystack. */
function catalogRowMatchesFilter(
  item: UtilityBarItemState,
  query: string,
  resolveExtraHaystack: (def: UtilityBarItemDef) => string
): boolean {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return true
  const def = UTILITY_BAR_CATALOG.find((d) => d.id === item.id)
  if (!def) return false
  const extra = resolveExtraHaystack(def)
  const haystack = [
    def.label,
    def.description,
    def.id.replace(/-/g, " "),
    ...(def.searchAliases ?? []),
    extra,
  ]
    .join(" ")
    .toLowerCase()
  const tokens = trimmed.split(/\s+/).filter(Boolean)
  return tokens.every((tok) => haystack.includes(tok))
}

// ---------------------------------------------------------------------------
// Drag-and-drop row
// ---------------------------------------------------------------------------

type DragState = {
  dragId: UtilityBarItemId | null
  overIndex: number | null
}

type ItemRowProps = {
  item: UtilityBarItemState
  index: number
  visibleCount: number
  isDragging: boolean
  isOver: boolean
  allowReorder: boolean
  capabilityRow?: UtilityBarCapabilityRow
  onToggle: (id: UtilityBarItemId) => void
  onDragStart: (id: UtilityBarItemId) => void
  onDragOver: (e: DragEvent, index: number) => void
  onDrop: (e: DragEvent) => void
  onDragEnd: () => void
}

function CatalogItemRow({
  item,
  index,
  visibleCount,
  isDragging,
  isOver,
  allowReorder,
  capabilityRow,
  onToggle,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: ItemRowProps) {
  const tCatalog = useTranslations("Dashboard.shell.utilityBar.catalog")
  const tToggle = useTranslations("Marketplace")
  const def = UTILITY_BAR_CATALOG.find((d) => d.id === item.id)
  if (!def) return null

  const label = def.id === "settings" ? tCatalog("settings.label") : def.label
  const description =
    def.id === "settings" ? tCatalog("settings.description") : def.description

  const IconEl = CATALOG_ICON[def.iconName] ?? Store
  const atCap = !item.visible && visibleCount >= UTILITY_BAR_MAX_VISIBLE - 1

  return (
    <div
      draggable={allowReorder}
      onDragStart={(e) => {
        if (!allowReorder) return
        onDragStart(item.id)
        try {
          e.dataTransfer.effectAllowed = "move"
          e.dataTransfer.setData("text/plain", item.id)
        } catch {
          // Optional drag metadata — ignore in constrained environments.
        }
      }}
      onDragOver={(e) => {
        if (!allowReorder) return
        onDragOver(e, index)
      }}
      onDrop={(e) => {
        if (!allowReorder) return
        onDrop(e)
      }}
      onDragEnd={() => {
        if (!allowReorder) return
        onDragEnd()
      }}
      className={cn(
        "group/row flex items-center gap-2.5 px-4 py-2.5 transition-colors select-none",
        allowReorder && "cursor-grab active:cursor-grabbing",
        !allowReorder && "cursor-default",
        isDragging && allowReorder && "opacity-40",
        isOver && allowReorder && "bg-muted/60",
        !(isOver && allowReorder) && "hover:bg-muted/30"
      )}
    >
      <GripVertical
        className="size-3.5 shrink-0 text-muted-foreground/40 group-hover/row:text-muted-foreground"
        aria-hidden
      />

      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/50">
        <IconEl className="size-3.5 text-muted-foreground" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground">{label}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {description}
        </p>
      </div>

      {capabilityRow ? (
        <CapabilityToggleButton
          capabilityId={capabilityRow.capabilityId}
          effective={capabilityRow.effective}
          customizable={capabilityRow.customizable}
          labels={{
            enable: tToggle("toggle.enable"),
            disable: tToggle("toggle.disable"),
            pending: tToggle("toggle.pending"),
            mandatory: tToggle("toggle.mandatory"),
            blocked: tToggle("toggle.blocked"),
            unavailable: tToggle("toggle.unavailable"),
            notCustomizable: tToggle("toggle.notCustomizable"),
            error: tToggle("toggle.error"),
          }}
        />
      ) : (
        <Switch
          checked={item.visible}
          onCheckedChange={() => onToggle(item.id)}
          disabled={atCap}
          aria-label={`${item.visible ? "Hide" : "Show"} ${label}`}
          className="shrink-0 scale-90"
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Utilities configuration body (sheet)
// ---------------------------------------------------------------------------

function UtilitiesTab({
  capabilityRows,
}: {
  capabilityRows: readonly UtilityBarCapabilityRow[]
}) {
  const { items, toggleItem, reorderFullCatalog, reset } = useUtilityBarStore()
  const capabilityByItemId = useMemo(
    () => new Map(capabilityRows.map((row) => [row.utilityBarItemId, row])),
    [capabilityRows]
  )
  const orderedItems = selectAllItemsOrdered(items)
  const visibleCount = items.filter((i) => i.visible).length
  const tCatalog = useTranslations("Dashboard.shell.utilityBar.catalog")

  const resolveExtraHaystack = useCallback(
    (def: UtilityBarItemDef) =>
      def.id === "settings"
        ? `${tCatalog("settings.label")} ${tCatalog("settings.description")}`
        : "",
    [tCatalog]
  )

  const [filterQuery, setFilterQuery] = useState("")
  const filteredItems = useMemo(
    () =>
      orderedItems.filter((row) =>
        catalogRowMatchesFilter(row, filterQuery, resolveExtraHaystack)
      ),
    [orderedItems, filterQuery, resolveExtraHaystack]
  )
  const allowReorder = filterQuery.trim() === ""

  const [drag, setDrag] = useState<DragState>({
    dragId: null,
    overIndex: null,
  })

  function handleDragStart(id: UtilityBarItemId) {
    setDrag({ dragId: id, overIndex: null })
  }

  function handleDragOver(e: DragEvent, index: number) {
    e.preventDefault()
    setDrag((d) => ({ ...d, overIndex: index }))
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    const { dragId, overIndex } = drag
    if (dragId === null || overIndex === null) {
      setDrag({ dragId: null, overIndex: null })
      return
    }
    const ids = selectAllItemsOrdered(useUtilityBarStore.getState().items).map(
      (i) => i.id
    )
    const from = ids.indexOf(dragId)
    if (from === -1) {
      setDrag({ dragId: null, overIndex: null })
      return
    }
    ids.splice(from, 1)
    ids.splice(overIndex, 0, dragId)
    reorderFullCatalog(ids)
    setDrag({ dragId: null, overIndex: null })
  }

  function handleDragEnd() {
    setDrag({ dragId: null, overIndex: null })
  }

  const maxVisible = UTILITY_BAR_MAX_VISIBLE - 1

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border/30 px-4 py-2">
        <span className="text-[10px] text-muted-foreground">
          {visibleCount} / {maxVisible} shown
        </span>
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="size-3" aria-hidden />
          Reset
        </button>
      </div>

      <div className="border-b border-border/30 px-4 py-2">
        <Input
          aria-label="Filter utilities"
          placeholder="Search name, alias…"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="h-8 text-xs"
        />
        {!allowReorder ? (
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Clear search to drag-and-drop reorder.
          </p>
        ) : null}
      </div>

      {filteredItems.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-muted-foreground">
          No utilities match &quot;{filterQuery.trim()}&quot;.
        </p>
      ) : (
        filteredItems.map((item, index) => (
          <CatalogItemRow
            key={item.id}
            item={item}
            index={index}
            visibleCount={visibleCount}
            isDragging={drag.dragId === item.id}
            isOver={
              Boolean(allowReorder) &&
              drag.overIndex === index &&
              drag.dragId !== item.id
            }
            allowReorder={allowReorder}
            capabilityRow={capabilityByItemId.get(item.id)}
            onToggle={toggleItem}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          />
        ))
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sheet — full utility bar customisation
// ---------------------------------------------------------------------------

function UtilityBarConfigSheet({
  open,
  onOpenChange,
  capabilityRows,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  capabilityRows: readonly UtilityBarCapabilityRow[]
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton
        className="flex w-[22rem] max-w-[min(100vw-1rem,22rem)] flex-col gap-0 p-0 sm:max-w-[22rem]"
      >
        <SheetHeader className="shrink-0 border-b border-border/40 px-4 py-4 text-left">
          <SheetTitle>Customise utility bar</SheetTitle>
          <SheetDescription>
            Visibility syncs to your account; order stays on this device.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <UtilitiesTab capabilityRows={capabilityRows} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Dialog — request utility (stub)
// ---------------------------------------------------------------------------

function RequestUtilityDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("Dashboard.shell.utilityBar.marketplace")
  const [formKey, setFormKey] = useState(0)

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
    if (!next) setFormKey((k) => k + 1)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-4 sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{t("requestTitle")}</DialogTitle>
          <DialogDescription>{t("requestDescription")}</DialogDescription>
        </DialogHeader>
        <OrgFeedbackComposeForm
          key={formKey}
          metadata={{
            source: "utility-marketplace",
            requestKind: "rail-icon",
            utilityId: "marketplace.customIcon",
          }}
          onReset={() => setFormKey((k) => k + 1)}
        />
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Marketplace — dropdown hub + sheet/dialog flows
// ---------------------------------------------------------------------------

/**
 * AppShellMarketplacePanel
 *
 * Marketplace entry on the utility bar: opens a standard utility dropdown,
 * then branches to a sheet (icon bar customisation) or dialog (request utility).
 */
export function AppShellMarketplacePanel({
  triggerAriaLabel = "Open marketplace",
  triggerTooltip = "Marketplace",
  capabilityRows = [],
  integrationsHref,
}: {
  triggerAriaLabel?: string
  triggerTooltip?: string
  capabilityRows?: readonly UtilityBarCapabilityRow[]
  integrationsHref?: Route
}) {
  const [configOpen, setConfigOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const t = useTranslations("Dashboard.shell.utilityBar.marketplace")

  const groups: UtilityDropdownGroup[] = useMemo(
    () => [
      {
        items: [
          {
            id: "customise",
            label: "Customise icon bar",
            description: "Choose visible utilities and drag to reorder",
            icon: LayoutGrid,
            onSelect: () => setConfigOpen(true),
          },
          {
            id: "request",
            label: "Request utility",
            description: "Suggest a new control for the utility bar",
            icon: PenLine,
            onSelect: () => setRequestOpen(true),
          },
        ],
      },
      ...(integrationsHref
        ? [
            {
              items: [
                {
                  id: "integrations",
                  label: t("integrationsLabel"),
                  description: t("integrationsDescription"),
                  icon: Plug2,
                  href: integrationsHref,
                },
              ],
            },
          ]
        : []),
    ],
    [integrationsHref, t]
  )

  return (
    <AppShellUtilityBarIconDropdown
      ariaLabel={triggerAriaLabel}
      tooltip={triggerTooltip}
      title="Marketplace"
      subtitle="Configure the utility bar, request controls, and preview upcoming extensions."
      footer={
        <p>
          Sheets and dialogs open from actions above. Integrations, plugins, and
          in-shell release notes are planned for a later release.
        </p>
      }
      groups={groups}
      triggerIcon={
        <span aria-hidden className="size-[15px] shrink-0 [&>svg]:size-full">
          <Store strokeWidth={2} />
        </span>
      }
    >
      <UtilityBarConfigSheet
        open={configOpen}
        onOpenChange={setConfigOpen}
        capabilityRows={capabilityRows}
      />
      <RequestUtilityDialog open={requestOpen} onOpenChange={setRequestOpen} />
    </AppShellUtilityBarIconDropdown>
  )
}
