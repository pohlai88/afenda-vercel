"use client"

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type FormEvent,
  type ReactNode,
} from "react"
import {
  ChevronDownIcon,
  ClockIcon,
  PinIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { Link, usePathname } from "#i18n/navigation"
import { cn } from "#lib/utils"
import { Button } from "../../ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "../../ui/context-menu"
import { Empty, EmptyHeader, EmptyTitle } from "../../ui/empty"
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover"
import { Separator } from "../../ui/separator"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../../ui/sidebar"
import { ToggleGroup, ToggleGroupItem } from "../../ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip"
import {
  useLaneMemoryStore,
  LANE_MEMORY_MAX,
  LANE_MEMORY_LANES,
  LANE_MEMORY_LABELS,
} from "../../stores/lane-memory.store"
import type {
  LaneMemoryItem,
  LaneMemoryLane,
} from "../../stores/lane-memory.store"
import { filterAppShellPrimaryLeftRailNavSections } from "./appshell-primary-left-rail.shared"
import { AppShellPrimaryLeftRailRaw } from "./appshell-primary-left-rail-raw.client"
import type {
  AppShellPrimaryLeftRailConfig,
  AppShellPrimaryLeftRailNavSection,
  AppShellPrimaryLeftRailView,
  AppShellPrimaryLeftRailRecent,
} from "./appshell-primary-left-rail.schema"

// ---------------------------------------------------------------------------
// Active row — when several slots share the same `href` as pathname, only the
// first wins (dev preview + duplicate targets). Avoids stacked `aria-current`.
// ---------------------------------------------------------------------------

function firstMatchingRowId<T extends { id: string; href: string }>(
  pathname: string,
  rows: ReadonlyArray<T>
): string | null {
  const hit = rows.find((r) => pathname === r.href)
  return hit?.id ?? null
}

// ---------------------------------------------------------------------------
// Section headings — ERP-style module bands (dense, high legibility)
// ---------------------------------------------------------------------------

const RAIL_SECTION_HEADING_CLASS =
  "flex h-5 shrink-0 items-center rounded-md px-2.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-sidebar-foreground/55"

// ---------------------------------------------------------------------------
// Collapsible section header — icon + label + chevron + optional action
// ---------------------------------------------------------------------------

function CollapsibleSectionHeader({
  icon: Icon,
  label,
  open,
  onToggle,
  action,
}: {
  icon: ElementType
  label: string
  open: boolean
  onToggle: () => void
  action?: ReactNode
}) {
  return (
    <div className="flex h-5 items-center px-2.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex flex-1 items-center gap-1 rounded text-[10px] leading-none font-semibold tracking-wide text-sidebar-foreground/55 uppercase transition-colors hover:text-sidebar-foreground/75 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Icon className="size-2.5 shrink-0" aria-hidden />
        <span>{label}</span>
        <ChevronDownIcon
          className={cn(
            "ml-0.5 size-2.5 shrink-0 transition-transform duration-150",
            !open && "-rotate-90"
          )}
          aria-hidden
        />
      </button>
      {open && action ? (
        <div className="ml-1 flex items-center">{action}</div>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recent row — compact relative timestamp
// ---------------------------------------------------------------------------

function formatRecentStamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const diffMs = Date.now() - d.getTime()
  const diffM = Math.floor(diffMs / 60_000)
  if (diffM < 1) return "Just now"
  if (diffM < 60) return `${diffM}m`
  const diffH = Math.floor(diffM / 60)
  if (diffH < 24) return `${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD}d`
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

// ---------------------------------------------------------------------------
// Rail search — unified search across nav, memory, and recents
// ---------------------------------------------------------------------------

const LANE_BADGE_CLASS: Record<LaneMemoryLane, string> = {
  pinned: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  urgent: "bg-red-500/10 text-red-600 dark:text-red-400",
  todo: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
}

type SearchNavResult = {
  id: string
  label: string
  href: string
  sectionLabel?: string
}

function SearchResultsList({
  navResults,
  memoryResults,
  recentResults,
  onSelect,
}: {
  navResults: SearchNavResult[]
  memoryResults: LaneMemoryItem[]
  recentResults: AppShellPrimaryLeftRailRecent[]
  onSelect: () => void
}) {
  const hasAny =
    navResults.length > 0 ||
    memoryResults.length > 0 ||
    recentResults.length > 0

  if (!hasAny) {
    return (
      <div className="py-6 text-center text-[11px] text-sidebar-foreground/45">
        No results found
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {navResults.length > 0 && (
        <div>
          <div className={RAIL_SECTION_HEADING_CLASS}>
            Nav
            <span className="ml-1.5 opacity-60">{navResults.length}</span>
          </div>
          <div className="mt-0.5 flex flex-col gap-0.5">
            {navResults.map((item) => (
              <Link
                key={item.id}
                href={item.href as Parameters<typeof Link>[0]["href"]}
                prefetch={false}
                onClick={onSelect}
                className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent/25 hover:text-sidebar-accent-foreground"
              >
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full bg-sidebar-foreground/35"
                />
                <span className="flex-1 truncate">{item.label}</span>
                {item.sectionLabel ? (
                  <span className="shrink-0 text-[10px] tracking-wide text-sidebar-foreground/35 uppercase">
                    {item.sectionLabel}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      )}

      {memoryResults.length > 0 && (
        <div>
          <div className={RAIL_SECTION_HEADING_CLASS}>
            Memory
            <span className="ml-1.5 opacity-60">{memoryResults.length}</span>
          </div>
          <div className="mt-0.5 flex flex-col gap-0.5">
            {memoryResults.map((item) =>
              item.href ? (
                <Link
                  key={item.id}
                  href={item.href as Parameters<typeof Link>[0]["href"]}
                  prefetch={false}
                  onClick={onSelect}
                  className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent/25 hover:text-sidebar-accent-foreground"
                >
                  <PinIcon
                    className="size-2.5 shrink-0 opacity-40"
                    aria-hidden
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded px-1 py-0.5 text-[10px] font-medium",
                      LANE_BADGE_CLASS[item.lane]
                    )}
                  >
                    {LANE_MEMORY_LABELS[item.lane]}
                  </span>
                </Link>
              ) : (
                <div
                  key={item.id}
                  className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] text-sidebar-foreground/65"
                >
                  <PinIcon
                    className="size-2.5 shrink-0 opacity-40"
                    aria-hidden
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded px-1 py-0.5 text-[10px] font-medium",
                      LANE_BADGE_CLASS[item.lane]
                    )}
                  >
                    {LANE_MEMORY_LABELS[item.lane]}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {recentResults.length > 0 && (
        <div>
          <div className={RAIL_SECTION_HEADING_CLASS}>
            Recent
            <span className="ml-1.5 opacity-60">{recentResults.length}</span>
          </div>
          <div className="mt-0.5 flex flex-col gap-0.5">
            {recentResults.map((r) => {
              const stamp = formatRecentStamp(r.occurredAt)
              return (
                <Link
                  key={r.id}
                  href={r.href as Parameters<typeof Link>[0]["href"]}
                  prefetch={false}
                  onClick={onSelect}
                  className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent/25 hover:text-sidebar-accent-foreground"
                >
                  <ClockIcon
                    className="size-2.5 shrink-0 opacity-40"
                    aria-hidden
                  />
                  <span className="flex-1 truncate">{r.label}</span>
                  {stamp ? (
                    <span className="shrink-0 text-[10px] text-sidebar-foreground/40 tabular-nums">
                      {stamp}
                    </span>
                  ) : null}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

type RailSearchProps = {
  collapsed: boolean
  query: string
  onQueryChange: (v: string) => void
  navSections: AppShellPrimaryLeftRailNavSection[]
  recents?: AppShellPrimaryLeftRailRecent[]
  placeholder: string
  ariaLabel: string
  collapsedAriaLabel: string
}

function RailSearch({
  collapsed,
  query,
  onQueryChange,
  navSections,
  recents,
  placeholder,
  ariaLabel,
  collapsedAriaLabel,
}: RailSearchProps) {
  const inputId = useId()
  const memoryItems = useLaneMemoryStore((s) => s.items)

  const q = query.trim().toLowerCase()
  const isActive = q.length > 0

  const navResults = useMemo<SearchNavResult[]>(() => {
    if (!isActive) return []
    return navSections.flatMap((s) =>
      s.items
        .filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q)
        )
        .map((item) => ({
          id: item.id,
          label: item.label,
          href: item.href,
          sectionLabel: s.label,
        }))
    )
  }, [navSections, q, isActive])

  const memoryResults = useMemo<LaneMemoryItem[]>(() => {
    if (!isActive) return []
    return memoryItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.href?.toLowerCase().includes(q)
    )
  }, [memoryItems, q, isActive])

  const recentResults = useMemo<AppShellPrimaryLeftRailRecent[]>(() => {
    if (!isActive || !recents) return []
    return recents.filter((r) => r.label.toLowerCase().includes(q))
  }, [recents, q, isActive])

  const inputField = (
    <div
      className={cn(
        "group/search relative flex h-7 min-h-0 w-full items-center overflow-hidden rounded-lg",
        "border border-sidebar-border/60 bg-sidebar-accent/25 text-sidebar-foreground shadow-none",
        "transition-[background-color,border-color,box-shadow] duration-150 ease-out",
        "hover:border-sidebar-border hover:bg-sidebar-accent/30",
        "focus-within:border-sidebar-ring/60 focus-within:bg-sidebar-accent/40",
        "focus-within:ring-2 focus-within:ring-sidebar-ring/20"
      )}
    >
      <SearchIcon
        className="pointer-events-none absolute left-2 size-3 text-sidebar-foreground/50 transition-colors group-focus-within/search:text-sidebar-foreground/75"
        aria-hidden
      />
      <input
        id={inputId}
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          "h-full min-h-0 w-full border-0 bg-transparent py-0 pr-7 pl-7 text-xs text-sidebar-foreground shadow-none ring-0 outline-none",
          "placeholder:text-sidebar-foreground/50"
        )}
      />
      {isActive ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute right-1 size-5 text-sidebar-foreground/60 hover:bg-sidebar-accent/25 hover:text-sidebar-foreground"
          aria-label="Clear search"
          onClick={() => onQueryChange("")}
        >
          <XIcon className="size-3.5" aria-hidden />
        </Button>
      ) : null}
    </div>
  )

  // Collapsed rail — icon trigger with popover
  if (collapsed) {
    return (
      <div role="search" className="flex shrink-0 justify-center px-2.5 py-1">
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={cn(
                    "border border-sidebar-border/60 bg-sidebar-accent/25 text-sidebar-foreground",
                    "transition-[background-color,border-color,box-shadow] duration-150 ease-out",
                    "hover:border-sidebar-border hover:bg-sidebar-accent/30",
                    "focus-visible:border-sidebar-ring/60 focus-visible:ring-sidebar-ring/20"
                  )}
                  aria-label={collapsedAriaLabel}
                >
                  <SearchIcon className="size-4" aria-hidden />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" align="center" sideOffset={10}>
              <span className="block font-medium">{collapsedAriaLabel}</span>
            </TooltipContent>
          </Tooltip>
          <PopoverContent
            side="right"
            align="start"
            className="w-72 gap-3 border border-border/60 bg-popover p-3 shadow-lg"
            collisionPadding={12}
          >
            {inputField}
            {isActive ? (
              <div className="mt-2 max-h-72 overflow-y-auto">
                <SearchResultsList
                  navResults={navResults}
                  memoryResults={memoryResults}
                  recentResults={recentResults}
                  onSelect={() => onQueryChange("")}
                />
              </div>
            ) : null}
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  // Expanded rail — inline input + results panel when active
  return (
    <>
      <div role="search" className="shrink-0 px-2.5 py-1">
        {inputField}
      </div>

      {isActive ? (
        <div className="af-appshell-rail-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2.5 py-0.5 [--radius:var(--radius-xl)]">
          <SearchResultsList
            navResults={navResults}
            memoryResults={memoryResults}
            recentResults={recentResults}
            onSelect={() => onQueryChange("")}
          />
        </div>
      ) : null}
    </>
  )
}

// ---------------------------------------------------------------------------
// Nav section
// ---------------------------------------------------------------------------

function NavItemWithLaneMenu({
  item,
  collapsed,
}: {
  item: AppShellPrimaryLeftRailNavSection["items"][number]
  collapsed: boolean
}) {
  const addItem = useLaneMemoryStore((s) => s.addItem)

  if (collapsed) {
    return <AppShellPrimaryLeftRailRaw item={item} />
  }

  const contextMenuContent = (
    <ContextMenuContent className="w-44">
      <ContextMenuLabel>Add to lane</ContextMenuLabel>
      {LANE_MEMORY_LANES.map((lane) => (
        <ContextMenuItem
          key={lane}
          onClick={() => addItem({ label: item.label, href: item.href, lane })}
        >
          <PinIcon className="size-3.5 opacity-60" />
          {LANE_MEMORY_LABELS[lane]}
        </ContextMenuItem>
      ))}
    </ContextMenuContent>
  )

  return (
    <AppShellPrimaryLeftRailRaw
      item={item}
      contextMenuContent={contextMenuContent}
    />
  )
}

function AppShellPrimaryLeftRailNavSectionGroup({
  section,
  collapsed,
}: {
  section: AppShellPrimaryLeftRailNavSection
  collapsed: boolean
}) {
  return (
    <SidebarGroup className="p-0" role="group" aria-label={section.label}>
      {!collapsed && section.label ? (
        <SidebarGroupLabel className={RAIL_SECTION_HEADING_CLASS}>
          {section.label}
        </SidebarGroupLabel>
      ) : null}
      <SidebarGroupContent className="pt-0 pb-0">
        <SidebarMenu className="gap-0">
          {section.items.map((item) => (
            <NavItemWithLaneMenu
              key={item.id}
              item={item}
              collapsed={collapsed}
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

// ---------------------------------------------------------------------------
// Memory lanes widget — localStorage-backed, self-contained
// ---------------------------------------------------------------------------

const LANES_VISIBLE = 3

/** One lane item row — links if href present, plain label otherwise. */
function LocalLaneRow({
  item,
  isActive,
  onRemove,
  onMove,
}: {
  item: LaneMemoryItem
  isActive: boolean
  onRemove: () => void
  onMove: (lane: LaneMemoryLane) => void
}) {
  const active = isActive
  const otherLanes = LANE_MEMORY_LANES.filter((l) => l !== item.lane)

  const rowContent = (
    <span className="group/lane-row flex min-w-0 flex-1 items-center gap-1">
      <span className="min-w-0 flex-1 truncate text-[11px] leading-tight font-medium">
        {item.label}
      </span>
      <button
        type="button"
        aria-label="Remove"
        tabIndex={-1}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onRemove()
        }}
        className="invisible shrink-0 rounded p-px text-sidebar-foreground/40 transition-colors group-hover/lane-row:visible hover:text-destructive focus:visible"
      >
        <XIcon className="size-3" aria-hidden />
      </button>
    </span>
  )

  const buttonBase = "relative h-auto min-h-6 items-center gap-1.5 py-0.5"
  const activeBar = (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-y-0.5 left-0 w-[2px] rounded-r-md bg-primary transition-opacity duration-150 ease-out",
        active ? "opacity-100" : "opacity-0"
      )}
    />
  )

  const menuContent = (
    <ContextMenuContent className="w-44">
      <ContextMenuSub>
        <ContextMenuSubTrigger>Move to…</ContextMenuSubTrigger>
        <ContextMenuSubContent>
          {otherLanes.map((l) => (
            <ContextMenuItem key={l} onClick={() => onMove(l)}>
              {LANE_MEMORY_LABELS[l]}
            </ContextMenuItem>
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuSeparator />
      <ContextMenuItem variant="destructive" onClick={onRemove}>
        Remove
      </ContextMenuItem>
    </ContextMenuContent>
  )

  return (
    <SidebarMenuItem>
      <ContextMenu>
        {item.href ? (
          <>
            <SidebarMenuButton
              asChild
              isActive={active}
              size="sm"
              className={buttonBase}
            >
              <ContextMenuTrigger asChild>
                <Link
                  href={item.href}
                  prefetch={false}
                  aria-current={active ? "page" : undefined}
                >
                  {activeBar}
                  {rowContent}
                </Link>
              </ContextMenuTrigger>
            </SidebarMenuButton>
            {menuContent}
          </>
        ) : (
          <>
            <SidebarMenuButton size="sm" className={buttonBase}>
              <ContextMenuTrigger asChild>
                <span className="flex w-full items-center">{rowContent}</span>
              </ContextMenuTrigger>
            </SidebarMenuButton>
            {menuContent}
          </>
        )}
      </ContextMenu>
    </SidebarMenuItem>
  )
}

/** Inline quick-add form rendered below the lane tab bar. */
function LaneAddForm({
  lane,
  onAdd,
  onClose,
}: {
  lane: LaneMemoryLane
  onAdd: (label: string, href?: string) => void
  onClose: () => void
}) {
  const [label, setLabel] = useState("")
  const [href, setHref] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    onAdd(label.trim(), href.trim() || undefined)
    setLabel("")
    setHref("")
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-0.5 flex flex-col gap-1 rounded-md border border-sidebar-border/50 bg-sidebar-accent/10 p-1"
    >
      <input
        ref={inputRef}
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder={`Add to ${LANE_MEMORY_LABELS[lane]}…`}
        maxLength={160}
        className="h-6 w-full bg-transparent px-1 text-xs text-sidebar-foreground outline-none placeholder:text-sidebar-foreground/40"
      />
      <input
        type="url"
        value={href}
        onChange={(e) => setHref(e.target.value)}
        placeholder="Link (optional)"
        className="h-6 w-full bg-transparent px-1 text-xs text-sidebar-foreground/70 outline-none placeholder:text-sidebar-foreground/35"
      />
      <div className="flex justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="h-5 w-5 text-sidebar-foreground/50 hover:text-sidebar-foreground"
          aria-label="Cancel"
          onClick={onClose}
        >
          <XIcon className="size-3" aria-hidden />
        </Button>
        <Button
          type="submit"
          variant="ghost"
          size="icon-xs"
          disabled={!label.trim()}
          className="h-5 w-5 text-primary disabled:opacity-30"
          aria-label="Add"
        >
          <PlusIcon className="size-3" aria-hidden />
        </Button>
      </div>
    </form>
  )
}

/**
 * Self-contained memory lane widget.
 * Reads from / writes to `useLaneMemoryStore` (localStorage-persisted).
 */
function RailLanesWidget({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname()
  const { items, addItem, removeItem, moveLane } = useLaneMemoryStore()
  const [activeLane, setActiveLane] = useState<LaneMemoryLane>("pinned")
  const [showAdd, setShowAdd] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [open, setOpen] = useState(true)

  const laneItems = items.filter((i) => i.lane === activeLane)
  const activeLaneItemId = useMemo(() => {
    const linked = laneItems.filter(
      (i): i is LaneMemoryItem & { href: string } => Boolean(i.href)
    )
    return firstMatchingRowId(pathname, linked)
  }, [pathname, laneItems])

  if (collapsed) return null
  // All hooks are above this early return — safe to gate rendering here.

  const visible = showAll ? laneItems : laneItems.slice(0, LANES_VISIBLE)
  const overflowCount = laneItems.length - LANES_VISIBLE
  const laneCount = (lane: LaneMemoryLane) =>
    items.filter((i) => i.lane === lane).length

  return (
    <SidebarGroup
      aria-label="Memory"
      data-rail-section="memory-lanes"
      className="p-0"
    >
      <CollapsibleSectionHeader
        icon={PinIcon}
        label="Memory"
        open={open}
        onToggle={() => {
          setOpen((v) => !v)
          if (open) setShowAdd(false)
        }}
        action={
          <button
            type="button"
            title="Add reminder"
            onClick={() => setShowAdd((v) => !v)}
            className="rounded p-0.5 text-sidebar-foreground/40 transition-colors hover:text-sidebar-foreground"
          >
            <PlusIcon className="size-3" aria-hidden />
          </button>
        }
      />

      {open ? (
        <SidebarGroupContent className="pt-0 pb-0">
          {/* Lane tab switcher */}
          <ToggleGroup
            type="single"
            value={activeLane}
            onValueChange={(v) => {
              if (!v) return
              setActiveLane(v as LaneMemoryLane)
              setShowAll(false)
              setShowAdd(false)
            }}
            variant="outline"
            size="sm"
            className="mb-0.5 grid w-full grid-cols-3 gap-0.5 px-0 py-0"
          >
            {LANE_MEMORY_LANES.map((lane) => {
              const count = laneCount(lane)
              return (
                <ToggleGroupItem
                  key={lane}
                  value={lane}
                  aria-label={`${LANE_MEMORY_LABELS[lane]}${count ? ` (${count})` : ""}`}
                  className="gap-0.5 text-[11px] leading-none"
                >
                  {LANE_MEMORY_LABELS[lane]}
                  {count > 0 ? (
                    <span className="tabular-nums opacity-60">{count}</span>
                  ) : null}
                </ToggleGroupItem>
              )
            })}
          </ToggleGroup>

          {/* Quick-add form */}
          {showAdd ? (
            <LaneAddForm
              lane={activeLane}
              onAdd={(label, href) => {
                addItem({ label, href, lane: activeLane })
                setShowAdd(false)
              }}
              onClose={() => setShowAdd(false)}
            />
          ) : null}

          {/* Lane rows or empty state */}
          {laneItems.length === 0 ? (
            !showAdd ? (
              <Empty className="border border-dashed border-sidebar-border/40 bg-sidebar-accent/5 py-2">
                <EmptyHeader>
                  <EmptyTitle className="text-xs">
                    Nothing in {LANE_MEMORY_LABELS[activeLane].toLowerCase()}{" "}
                    yet
                  </EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : null
          ) : (
            <>
              <SidebarMenu className="gap-0">
                {visible.map((item) => (
                  <LocalLaneRow
                    key={item.id}
                    item={item}
                    isActive={Boolean(
                      item.href && item.id === activeLaneItemId
                    )}
                    onRemove={() => removeItem(item.id)}
                    onMove={(lane) => moveLane(item.id, lane)}
                  />
                ))}
              </SidebarMenu>

              {/* Show more / less toggle */}
              {laneItems.length > LANES_VISIBLE ? (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="mt-0.5 w-full rounded px-2 py-1 text-left text-xs text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/25 hover:text-sidebar-foreground/80"
                >
                  {showAll
                    ? "Show less"
                    : `+${overflowCount} more in ${LANE_MEMORY_LABELS[activeLane].toLowerCase()}`}
                </button>
              ) : null}

              {/* At-cap warning */}
              {laneItems.length >= LANE_MEMORY_MAX ? (
                <p className="mt-0.5 px-2 text-xs text-muted-foreground/60">
                  Lane full ({LANE_MEMORY_MAX} max)
                </p>
              ) : null}
            </>
          )}
        </SidebarGroupContent>
      ) : null}
    </SidebarGroup>
  )
}

function RailViewsSection({
  views,
  heading,
}: {
  views: ReadonlyArray<AppShellPrimaryLeftRailView>
  heading?: string
}) {
  const pathname = usePathname()
  const activeViewId = useMemo(
    () => firstMatchingRowId(pathname, views),
    [pathname, views]
  )
  const label = heading ?? "Views"

  return (
    <SidebarGroup aria-label={label} data-rail-section="views" className="p-0">
      <SidebarGroupLabel className={RAIL_SECTION_HEADING_CLASS}>
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent className="pt-0 pb-0">
        <SidebarMenu className="gap-0">
          {views.map((view) => {
            const active = view.id === activeViewId
            return (
              <SidebarMenuItem key={view.id}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  size="sm"
                  className="relative h-auto min-h-6 gap-1.5 py-0.5"
                >
                  <Link
                    href={view.href}
                    prefetch={false}
                    aria-current={active ? "page" : undefined}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "pointer-events-none absolute inset-y-0.5 left-0 w-[2px] rounded-r-md bg-primary transition-opacity duration-150 ease-out",
                        active ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate text-[11px] leading-tight font-medium">
                      {view.label}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function RailRecentsSection({
  recents,
  heading,
}: {
  recents: ReadonlyArray<AppShellPrimaryLeftRailRecent>
  heading?: string
}) {
  const label = heading ?? "Recent"
  const [open, setOpen] = useState(true)

  return (
    <SidebarGroup
      aria-label={label}
      data-rail-section="recents"
      className="p-0"
    >
      <CollapsibleSectionHeader
        icon={ClockIcon}
        label={label}
        open={open}
        onToggle={() => setOpen((v) => !v)}
      />
      {open ? (
        <SidebarGroupContent className="pt-0 pb-0">
          <SidebarMenu className="gap-0">
            {recents.map((recent) => {
              const stamp = formatRecentStamp(recent.occurredAt)
              return (
                <SidebarMenuItem key={recent.id}>
                  <SidebarMenuButton
                    asChild
                    size="sm"
                    className="relative h-auto min-h-6 items-center gap-1.5 py-0.5"
                  >
                    <Link href={recent.href} prefetch={false}>
                      <span
                        className={cn(
                          "grid min-w-0 flex-1 items-baseline gap-x-1.5 gap-y-0",
                          stamp
                            ? "grid-cols-[minmax(0,1fr)_auto]"
                            : "grid-cols-1"
                        )}
                      >
                        <span className="truncate text-[11px] leading-tight font-medium text-sidebar-foreground">
                          {recent.label}
                        </span>
                        {stamp ? (
                          <time
                            className="shrink-0 text-[10px] font-medium text-sidebar-foreground/50 tabular-nums"
                            dateTime={recent.occurredAt}
                          >
                            {stamp}
                          </time>
                        ) : null}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      ) : null}
    </SidebarGroup>
  )
}

// ---------------------------------------------------------------------------
// AppShellPrimaryLeftRail (public export)
// ---------------------------------------------------------------------------

type AppShellPrimaryLeftRailProps = {
  config: AppShellPrimaryLeftRailConfig
  collapsed: boolean
}

export function AppShellPrimaryLeftRail({
  config,
  collapsed,
}: AppShellPrimaryLeftRailProps) {
  const { slots, labels } = config
  const { nav, footer: _footer, views, recents } = slots

  const [navQuery, setNavQuery] = useState("")
  const isSearchActive = navQuery.trim().length > 0

  const displayNav = useMemo(
    () => filterAppShellPrimaryLeftRailNavSections(nav, navQuery),
    [nav, navQuery]
  )

  const originalCount = useMemo(
    () => nav.reduce((sum, s) => sum + s.items.length, 0),
    [nav]
  )
  const filteredCount = useMemo(
    () => displayNav.reduce((sum, s) => sum + s.items.length, 0),
    [displayNav]
  )

  const isNavEmpty = originalCount === 0
  const filterExcludesAll =
    navQuery.trim().length > 0 && originalCount > 0 && filteredCount === 0

  const emptyLabel = labels.emptyState ?? "No surfaces available."
  const noMatchesLabel =
    labels.navSearchNoMatches ?? "No links match your filter."

  const hasViews = !collapsed && views !== undefined && views.length > 0
  const dockedRecents =
    !collapsed && recents !== undefined && recents.length > 0
      ? recents.slice(0, 5)
      : null

  return (
    // Wrapper owns the flex-col geometry so search stays pinned at top,
    // the nav fills the middle, and the footer stays docked at bottom —
    // same pattern as the primary left rail <aside>. overflow-hidden is required
    // so the inner flex-1 children can constrain themselves.
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Search — always at top; renders results panel inline when active */}
      <RailSearch
        collapsed={collapsed}
        query={navQuery}
        onQueryChange={setNavQuery}
        navSections={nav}
        recents={recents}
        placeholder={labels.navSearchPlaceholder ?? "Search…"}
        ariaLabel={
          labels.navSearchAriaLabel ?? "Search navigation, memory, and recents"
        }
        collapsedAriaLabel={
          labels.navSearchCollapsedTriggerAriaLabel ?? "Open search"
        }
      />

      {/* Scrollable nav — hidden while search results are showing */}
      {!isSearchActive ? (
        <nav
          className="af-appshell-rail-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2.5 py-0.5 [--radius:var(--radius-xl)]"
          aria-label={labels.ariaLabel}
        >
          {isNavEmpty ? (
            collapsed ? (
              <span
                aria-hidden
                data-rail-empty="true"
                className="mx-auto my-3 block h-1 w-6 rounded-full bg-muted-foreground/25"
                title={emptyLabel}
              />
            ) : (
              <Empty
                data-rail-empty="true"
                className="min-h-0 flex-none border border-dashed border-sidebar-border/50 bg-sidebar-accent/5 p-4 py-6"
              >
                <EmptyHeader className="max-w-none">
                  <EmptyTitle className="text-xs leading-snug font-medium text-sidebar-foreground">
                    {emptyLabel}
                  </EmptyTitle>
                </EmptyHeader>
              </Empty>
            )
          ) : filterExcludesAll ? (
            collapsed ? (
              <span
                aria-hidden
                data-rail-filter-empty="true"
                className="mx-auto my-3 block h-1 w-6 rounded-full bg-muted-foreground/25"
                title={noMatchesLabel}
              />
            ) : (
              <Empty
                data-rail-filter-empty="true"
                className="min-h-0 flex-none border border-dashed border-sidebar-border/50 bg-sidebar-accent/5 p-4 py-6"
              >
                <EmptyHeader className="max-w-none">
                  <EmptyTitle className="text-xs leading-snug font-medium text-sidebar-foreground">
                    {noMatchesLabel}
                  </EmptyTitle>
                </EmptyHeader>
              </Empty>
            )
          ) : (
            <div className="flex flex-col gap-0">
              {displayNav.map((section) => (
                <AppShellPrimaryLeftRailNavSectionGroup
                  key={section.id}
                  section={section}
                  collapsed={collapsed}
                />
              ))}

              {hasViews ? (
                <>
                  <Separator
                    decorative
                    className="my-0.5 h-px shrink-0 bg-transparent"
                  />
                  <RailViewsSection
                    views={views!}
                    heading={labels.viewsHeading}
                  />
                </>
              ) : null}
            </div>
          )}
        </nav>
      ) : null}

      {/* Docked footer — Memory widget + Recents, always visible */}
      <div className="shrink-0 group-data-[collapsible=icon]:hidden">
        <div className="px-2.5 pt-0 pb-0">
          <RailLanesWidget collapsed={collapsed} />
          {dockedRecents ? (
            <RailRecentsSection
              recents={dockedRecents}
              heading={labels.recentsHeading}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
