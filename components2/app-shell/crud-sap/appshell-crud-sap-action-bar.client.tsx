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

import { isCrudSapVerb, type CrudSapVerb } from "#lib/erp/crud-sap.shared"
import { cn } from "#lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#components2/ui/tooltip"

import {
  CRUD_SAP_ORDER_STORAGE_KEY,
  CRUD_SAP_VERB_IDS,
  type CrudSapVerbId,
} from "./appshell-crud-sap.schema"

const SAP_EDGE_SEP_CLASS = "h-[18px] w-px shrink-0 bg-border/50"

const L2_BTN = cn(
  "flex size-[28px] shrink-0 items-center justify-center rounded-full",
  "bg-transparent ring-1 ring-border/50 transition-colors",
  "text-muted-foreground hover:bg-muted/55 hover:text-foreground active:bg-muted/75",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:outline-none"
)
const ICON_SZ = "size-[15px] shrink-0 [&>svg]:size-full"

function sapVerbButtonSurfaceClass(
  destructive?: boolean,
  ...extra: Array<string | false | null | undefined>
) {
  return cn(
    L2_BTN,
    ...extra,
    destructive &&
      "text-destructive/60 hover:bg-destructive/5 hover:text-destructive"
  )
}

const DEFAULT_SAP_ORDER: readonly CrudSapVerbId[] = [...CRUD_SAP_VERB_IDS]

const SAP_LABELS: Record<CrudSapVerbId, string> = {
  search: "Search",
  audit: "Audit",
  resolve: "Resolve",
  update: "Update",
  create: "Create",
  predict: "Predict",
  deprecate: "Deprecate",
}

function normalizePersistedOrder(raw: unknown): CrudSapVerbId[] | null {
  if (!Array.isArray(raw) || raw.length !== CRUD_SAP_VERB_IDS.length)
    return null
  const seen = new Set<CrudSapVerb>()
  for (const x of raw) {
    if (typeof x !== "string" || !isCrudSapVerb(x)) return null
    if (seen.has(x)) return null
    seen.add(x)
  }
  if (seen.size !== CRUD_SAP_VERB_IDS.length) return null
  return raw as CrudSapVerbId[]
}

function SapIcon({ id }: { id: CrudSapVerbId }) {
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
          className={sapVerbButtonSurfaceClass(destructive)}
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

/** L2 round icon button — same chrome as draggable SAP buttons; for mock table rows in dev preview. */
export function CrudSapIconButton({
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

function DraggableSapVerbItem({
  id,
  index,
  label,
  destructive,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  children,
}: {
  id: CrudSapVerbId
  index: number
  label: string
  destructive?: boolean
  isDragging: boolean
  isDropTarget: boolean
  onDragStart: (id: CrudSapVerbId) => void
  onDragOver: (e: DragEvent, index: number) => void
  onDrop: (e: DragEvent) => void
  onDragEnd: () => void
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "relative flex items-center",
        isDropTarget &&
          "before:absolute before:top-1 before:bottom-1 before:-left-[3px] before:w-0.5 before:rounded-full before:bg-ring"
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            draggable
            aria-label={label}
            aria-grabbed={isDragging}
            className={sapVerbButtonSurfaceClass(
              destructive,
              "select-none",
              "cursor-grab active:cursor-grabbing",
              isDragging && "opacity-30"
            )}
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
    </div>
  )
}

export function CrudSapActionBar() {
  const [order, setOrder] = useState<CrudSapVerbId[]>(() => [
    ...DEFAULT_SAP_ORDER,
  ])
  const [dragId, setDragId] = useState<CrudSapVerbId | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CRUD_SAP_ORDER_STORAGE_KEY)
      if (!raw) return
      let parsedUnknown: unknown
      try {
        parsedUnknown = JSON.parse(raw) as unknown
      } catch {
        return
      }
      const parsed = normalizePersistedOrder(parsedUnknown)
      if (parsed) {
        startTransition(() => {
          setOrder(parsed)
        })
      }
    } catch {
      // Ignore corrupt storage.
    }
  }, [])

  function persist(next: CrudSapVerbId[]) {
    try {
      localStorage.setItem(CRUD_SAP_ORDER_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Ignore quota / private mode.
    }
  }

  function handleDragStart(verbId: CrudSapVerbId) {
    setDragId(verbId)
    setOverIndex(null)
  }

  function handleDragOver(e: DragEvent, index: number) {
    e.preventDefault()
    if (dragId === null) return
    e.dataTransfer.dropEffect = "move"
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
    <div
      role="toolbar"
      aria-label="CRUD-SAP actions"
      className="flex items-center gap-1"
    >
      <div aria-hidden className={SAP_EDGE_SEP_CLASS} />
      <div className="flex items-center gap-1.5">
        {order.map((id, index) => (
          <DraggableSapVerbItem
            key={id}
            id={id}
            index={index}
            label={SAP_LABELS[id]}
            destructive={id === "deprecate"}
            isDragging={dragId === id}
            isDropTarget={overIndex === index && dragId !== id}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          >
            <SapIcon id={id} />
          </DraggableSapVerbItem>
        ))}
      </div>
      <div aria-hidden className={SAP_EDGE_SEP_CLASS} />
    </div>
  )
}
