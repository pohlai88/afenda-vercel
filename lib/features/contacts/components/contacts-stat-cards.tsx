import { Card, CardContent, CardHeader, CardTitle } from "#components/ui/card"

type ContactsStatCardsProps = {
  totalContacts: number
  withEmailCount: number
}

export function ContactsStatCards({
  totalContacts,
  withEmailCount,
}: ContactsStatCardsProps) {
  const coverage = totalContacts === 0 ? 0 : Math.round((withEmailCount / totalContacts) * 100)

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Total contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tracking-tight">{totalContacts}</p>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>With email</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tracking-tight">{withEmailCount}</p>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Email coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tracking-tight">{coverage}%</p>
        </CardContent>
      </Card>
    </div>
  )
}
