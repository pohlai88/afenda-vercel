import * as React from "react"

import { Empty, EmptyDescription, EmptyTitle } from "#components/ui/empty"

type ContactsEmptyStateProps = {
  /**
   * CTA rendered below the description. Pass `<AddContactDialog />` for the
   * zero-contacts case, or a "Clear filter" button for the filtered-empty case.
   * No CTA is rendered when omitted.
   */
  action?: React.ReactNode
}

export function ContactsEmptyState({ action }: ContactsEmptyStateProps) {
  return (
    <Empty>
      <EmptyTitle>No contacts yet</EmptyTitle>
      <EmptyDescription>
        Add your first contact to start building your organization directory.
      </EmptyDescription>
      {action}
    </Empty>
  )
}
