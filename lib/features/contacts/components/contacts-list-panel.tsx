"use client"

import * as React from "react"

import { Checkbox } from "#components/ui/checkbox"

import type { ContactRow } from "../types"
import { ContactsBulkActions } from "./contacts-bulk-actions"
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
  const selectedIdSet = React.useMemo(() => new Set(selectedIds), [selectedIds])

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
    <div className="space-y-4">
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
        <ContactsEmptyState onCreateClick={() => setQuery("")} />
      ) : (
        <ul className="divide-y rounded-2xl border bg-card">
          {filtered.map((contact) => (
            <li key={contact.id} className="flex items-start gap-3 px-4 py-3">
              <Checkbox
                className="mt-1"
                checked={selectedIdSet.has(contact.id)}
                onCheckedChange={(checked) =>
                  toggleSelection(contact.id, checked === true)
                }
                aria-label={`Select ${contact.name}`}
              />
              <div className="flex-1 space-y-0.5">
                <p className="font-medium">{contact.name}</p>
                {contact.email ? (
                  <p className="text-sm text-muted-foreground">
                    {contact.email}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No email added
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
