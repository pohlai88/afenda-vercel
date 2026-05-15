"use client"

import {
  startTransition,
  useEffect,
  useState,
  type DragEvent,
  type ReactNode,
} from "react"
import {
  Archive,
  BugPlay,
  FilePlus,
  GitPullRequestCreateArrow,
  HatGlasses,
  PencilLine,
  Search,
} from "lucide-react"

import { cn } from "#lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#components2/ui/tooltip"

// ---------------------------------------------------------------------------
// CRUD-SAP action bar — 7 canonical verbs (dev preview only)
// Past: search · audit   |   Now: resolve · update   |   Next: create · predict   |   Meta: deprecate
// @internal — raw verb labels must not appear in production UI
// ---------------------------------------------------------------------------

const SAP_EDGE_SEP_CLASS = "h-[18px] w-px shrink-0 bg-border/50"

const L2_BTN = cn(
  "flex size-[28px] shrink-0 items-center justify-center rounded-full",
  "bg-transparent ring-1 ring-border/50 transition-colors",
  "text-muted-foreground hover:bg-muted/55 hover:text-foreground active:bg-muted/75",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:outline-none"
)
const ICON_SZ = "size-[15px] shrink-0 [&>svg]:size-full"

const SAP_VERB_IDS = [
  "search",
  "audit",
  "resolve",
  "update",
  "create",
  "predict",
  "deprecate",
] as const

export type SapVerbId = (typeof SAP_VERB_IDS)[number]

const DEFAULT_SAP_ORDER: readonly SapVerbId[] = [...SAP_VERB_IDS]

const STORAGE_KEY = "afenda-dev-shell-preview-crud-sap-order-v1"

const SAP_LABELS: Record<SapVerbId, string> = {
  search: "Search",
  audit: "Audit",
  resolve: "Resolve",
  update: "Update",
  create: "Create",
  predict: "Predict",
  deprecate: "Deprecate",
}

function isSapVerbId(value: unknown): value is SapVerbId {
  return (
    typeof value === "string" &&
    (SAP_VERB_IDS as readonly string[]).includes(value)
  )
}

function normalizePersistedOrder(raw: unknown): SapVerbId[] | null {
  if (!Array.isArray(raw) || raw.length !== SAP_VERB_IDS.length) return null
  const seen = new Set<SapVerbId>()
  for (const x of raw) {
    if (!isSapVerbId(x)) return null
    if (seen.has(x)) return null
    seen.add(x)
  }
  if (seen.size !== SAP_VERB_IDS.length) return null
  return raw as SapVerbId[]
}

function SapIcon({ id }: { id: SapVerbId }) {
  switch (id) {
    case "search":
      return <Search strokeWidth={2} />
    case "audit":
      return <HatGlasses strokeWidth={2} />
    case "resolve":
      return <BugPlay strokeWidth={2} />
    case "update":
      return <PencilLine strokeWidth={2} />
    case "create":
      return <FilePlus strokeWidth={2} />
    case "predict":
      return <GitPullRequestCreateArrow strokeWidth={2} />
    case "deprecate":
      return <Archive strokeWidth={2} />
  }
}

function SapBtn({
  label,
  children,
  destructive,
}: {
  label: string
  children: ReactNode
  destructive?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            L2_BTN,
            destructive &&
              "text-destructive/60 hover:bg-destructive/5 hover:text-destructive"
          )}
        >
          <span aria-hidden className={ICON_SZ}>
            {children}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

/** L2 round icon button — same chrome as {@link SapBtn}; exported for mock table rows in shell-preview. */
export function ShellPreviewSapBtn({
  label,
  children,
  destructive,
}: {
  label: string
  children: ReactNode
  destructive?: boolean
}) {
  return (
    <SapBtn label={label} destructive={destructive}>
      {children}
    </SapBtn>
  )
}

// ---------------------------------------------------------------------------
// Drag-and-drop — mirrors {@link AppShellUtilityBarRight} rail pattern
// ---------------------------------------------------------------------------

function DraggableSapVerbItem({
  id,
  index,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  children,
}: {
  id: SapVerbId
  index: number
  isDragging: boolean
  isDropTarget: boolean
  onDragStart: (id: SapVerbId) => void
  onDragOver: (e: DragEvent, index: number) => void
  onDrop: (e: DragEvent) => void
  onDragEnd: () => void
  children: ReactNode
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        onDragStart(id)
        try {
          e.dataTransfer.effectAllowed = "move"
          e.dataTransfer.setData("text/plain", id)
        } catch {
          // Optional drag metadata — ignore in constrained environments.
        }
      }}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        "relative flex items-center select-none",
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-30",
        isDropTarget &&
          "before:absolute before:top-1 before:bottom-1 before:-left-[3px] before:w-0.5 before:rounded-full before:bg-ring"
      )}
    >
      {children}
    </div>
  )
}

export function ShellPreviewCrudSapActionBar() {
  const [order, setOrder] = useState<SapVerbId[]>(() => [...DEFAULT_SAP_ORDER])
  const [dragId, setDragId] = useState<SapVerbId | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = normalizePersistedOrder(JSON.parse(raw) as unknown)
      if (parsed) {
        startTransition(() => {
          setOrder(parsed)
        })
      }
    } catch {
      // Ignore corrupt storage.
    }
  }, [])

  function persist(next: SapVerbId[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Ignore quota / private mode.
    }
  }

  function handleDragStart(id: SapVerbId) {
    setDragId(id)
    setOverIndex(null)
  }

  function handleDragOver(e: DragEvent, index: number) {
    e.preventDefault()
    setOverIndex(index)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    if (dragId === null || overIndex === null) {
      setDragId(null)
      setOverIndex(null)
      return
    }
    const ids = [...order]
    const from = ids.indexOf(dragId)
    if (from !== -1) {
      ids.splice(from, 1)
      ids.splice(overIndex, 0, dragId)
      setOrder(ids)
      persist(ids)
    }
    setDragId(null)
    setOverIndex(null)
  }

  function handleDragEnd() {
    setDragId(null)
    setOverIndex(null)
  }

  return (
    <div className="flex items-center gap-1">
      <div aria-hidden className={SAP_EDGE_SEP_CLASS} />
      <div className="flex items-center gap-1.5">
        {order.map((id, index) => (
          <DraggableSapVerbItem
            key={id}
            id={id}
            index={index}
            isDragging={dragId === id}
            isDropTarget={overIndex === index && dragId !== id}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          >
            <SapBtn label={SAP_LABELS[id]} destructive={id === "deprecate"}>
              <SapIcon id={id} />
            </SapBtn>
          </DraggableSapVerbItem>
        ))}
      </div>
      <div aria-hidden className={SAP_EDGE_SEP_CLASS} />
    </div>
  )
}
