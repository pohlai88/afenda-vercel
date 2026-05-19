import { IamProfileContextBand } from "./iam-profile-context-band"

export function IamProfileOverviewNowBand({
  label,
  lines,
}: {
  label: string
  lines: readonly string[]
}) {
  return (
    <IamProfileContextBand label={label}>
      <div className="space-y-2 text-sm leading-6 text-foreground">
        {lines.map((line, index) => (
          <p key={`now-${index}`}>{line}</p>
        ))}
      </div>
    </IamProfileContextBand>
  )
}

export type IamProfileOverviewRecentItem = {
  id: string
  label: string
  detail: string
}

export function IamProfileOverviewRecentBand({
  label,
  items,
  emptyLabel,
}: {
  label: string
  items: readonly IamProfileOverviewRecentItem[]
  emptyLabel: string
}) {
  return (
    <IamProfileContextBand label={label}>
      {items.length > 0 ? (
        <ul className="space-y-3 text-sm">
          {items.map((item) => (
            <li key={item.id} className="space-y-1">
              <p className="font-medium text-foreground">{item.label}</p>
              <p className="text-muted-foreground">{item.detail}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </IamProfileContextBand>
  )
}
