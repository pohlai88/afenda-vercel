import { Button } from "#components/ui/button"
import { Empty, EmptyDescription, EmptyTitle } from "#components/ui/empty"

type ContactsEmptyStateProps = {
  onCreateClick: () => void
}

export function ContactsEmptyState({ onCreateClick }: ContactsEmptyStateProps) {
  return (
    <Empty>
      <EmptyTitle>No contacts yet</EmptyTitle>
      <EmptyDescription>
        Add your first contact to start building your organization directory.
      </EmptyDescription>
      <Button onClick={onCreateClick}>Add first contact</Button>
    </Empty>
  )
}
