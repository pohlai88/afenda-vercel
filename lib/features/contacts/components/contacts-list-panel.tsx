"use client"

import * as React from "react"
import { ChevronRight } from "lucide-react"

import { useInspector } from "#components/dashboard/inspector-context"
import { Avatar, AvatarFallback } from "#components/ui/avatar"
import { Badge } from "#components/ui/badge"
import { Checkbox } from "#components/ui/checkbox"
import { cn } from "#lib/utils"

import type { ContactRow } from "../types"
import { getContactAvatarColor, getContactInitials } from "../constants"
import { AddContactDialog } from "./add-contact-dialog"
import { ContactsBulkActions } from "./contacts-bulk-actions"
import { ContactDetailPanel } from "./contact-detail-panel"
import { ContactsEmptyState } from "./contacts-empty-state"
import { ContactsFiltersToolbar } from "./contacts-filters-toolbar"
import { ContactsStatCards } from "./contacts-stat-cards"

type ContactsListPanelProps = {
  rows: ContactRow[]
}

export function ContactsListPanel({ rows }: ContactsListPanelProps) {
  const [query, setQuery] = React.useState("")
  const [mode, setMode] = React.useState<"all" | "withEmail">("all")
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const selectedIdSet = React.useMemo(() => new Set(selectedIds), [selectedIds])
  const { openInspector, closeInspector } = useInspector()

  const handleRowClick = React.useCallback(
    (contact: ContactRow) => {
      if (activeId === contact.id) {
        setActiveId(null)
        closeInspector()
      } else {
        setActiveId(contact.id)
        openInspector(<ContactDetailPanel contact={contact} />)
      }
    },
    [activeId, openInspector, closeInspector]
  )

  const filtered = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return rows.filter((row) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        row.name.toLowerCase().includes(normalizedQuery) ||
        row.email?.toLowerCase().includes(normalizedQuery)
      const matchesMode = mode === "all" || Boolean(row.email)
      return matchesQuery && matchesMode
    })
  }, [mode, query, rows])

  const withEmailCount = React.useMemo(
    () => rows.filter((row) => Boolean(row.email)).length,
    [rows]
  )

  const clearSelection = React.useCallback(() => setSelectedIds([]), [])
  const toggleSelection = React.useCallback(
    (contactId: string, checked: boolean) => {
      setSelectedIds((previous) => {
        const next = new Set(previous)
        if (checked) {
          next.add(contactId)
        } else {
          next.delete(contactId)
        }
        return [...next]
      })
    },
    []
  )

  return (
    <div className="flex flex-col gap-4">
      <ContactsStatCards
        totalContacts={rows.length}
        withEmailCount={withEmailCount}
      />
      <ContactsFiltersToolbar
        query={query}
        onQueryChange={setQuery}
        mode={mode}
        onModeChange={setMode}
      />
      <ContactsBulkActions
        selectedCount={selectedIds.length}
        onClearSelection={clearSelection}
      />
      {filtered.length === 0 ? (
        <ContactsEmptyState
          action={
            rows.length === 0 ? (
              // No contacts at all — open the dialog so the user can add one.
              <AddContactDialog />
            ) : (
              // Contacts exist but none match the current filter — offer to clear it.
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-sm text-primary underline-offset-3 hover:underline"
              >
                Clear filter
              </button>
            )
          }
        />
      ) : (
        // divide-y replaces the index-conditional border-t on each row
        <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border bg-card ring-1 ring-border/60">
          {filtered.map((contact) => {
            const isActive = activeId === contact.id
            const isSelected = selectedIdSet.has(contact.id)
            const initials = getContactInitials(contact.name)
            const avatarColor = getContactAvatarColor(contact.name)
            const addedDate = contact.createdAt.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })

            return (
              <li
                key={contact.id}
                className={cn(
                  "group/row flex items-center gap-3 px-4 py-3 transition-colors",
                  isActive ? "bg-accent/50" : "hover:bg-muted/40"
                )}
              >
                {/* Checkbox — always visible for keyboard accessibility */}
                <Checkbox
                  className="shrink-0"
                  checked={isSelected}
                  onCheckedChange={(checked) =>
                    toggleSelection(contact.id, checked === true)
                  }
                  aria-label={`Select ${contact.name}`}
                />

                {/* Avatar — initials with deterministic semantic color */}
                <Avatar className="shrink-0">
                  <AvatarFallback
                    className={cn("text-xs font-semibold", avatarColor)}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>

                {/* Name + email — full-width interactive button */}
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => handleRowClick(contact)}
                >
                  <p className="truncate leading-tight font-medium">
                    {contact.name}
                  </p>
                  {contact.email ? (
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {contact.email}
                    </p>
                  ) : null}
                </button>

                {/* Trailing metadata — "no email" badge or date, then chevron */}
                <div className="ml-auto flex shrink-0 items-center gap-2.5">
                  {!contact.email ? (
                    <Badge
                      variant="outline"
                      className="hidden text-xs sm:inline-flex"
                    >
                      No email
                    </Badge>
                  ) : (
                    <time
                      dateTime={contact.createdAt.toISOString()}
                      className="hidden text-xs text-muted-foreground/70 sm:block"
                    >
                      {addedDate}
                    </time>
                  )}
                  <ChevronRight
                    className={cn(
                      "size-4 text-muted-foreground/40 transition-all",
                      "group-hover/row:translate-x-1 group-hover/row:text-muted-foreground/70",
                      isActive && "text-primary"
                    )}
                    aria-hidden
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
