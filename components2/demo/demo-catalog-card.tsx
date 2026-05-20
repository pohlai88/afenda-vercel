import { Link } from "#i18n/navigation"
import { Badge } from "#components2/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { demoPath, type DemoRouteManifestEntry } from "#features/demo/client"

export type DemoCatalogCardProps = {
  entry: DemoRouteManifestEntry
  statusLabelAvailable: string
  statusLabelPlanned: string
  ctaOpen: string
  ctaPlanned: string
  mirrorsLabel: string
}

export function DemoCatalogCard({
  entry,
  statusLabelAvailable,
  statusLabelPlanned,
  ctaOpen,
  ctaPlanned,
  mirrorsLabel,
}: DemoCatalogCardProps) {
  const isAvailable = entry.status === "available"

  return (
    <Card size="sm" className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{entry.title}</CardTitle>
          <Badge variant={isAvailable ? "default" : "secondary"}>
            {isAvailable ? statusLabelAvailable : statusLabelPlanned}
          </Badge>
        </div>
        <CardDescription>{entry.teaches}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 text-xs text-muted-foreground">
        <p>
          {mirrorsLabel}:{" "}
          <code className="rounded bg-muted px-1 py-px font-mono">
            {entry.mirrors}
          </code>
        </p>
        <p className="mt-2 capitalize">{entry.category}</p>
      </CardContent>
      <CardFooter>
        {isAvailable ? (
          <Link
            href={demoPath(entry.slug)}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            prefetch={false}
          >
            {ctaOpen}
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">{ctaPlanned}</span>
        )}
      </CardFooter>
    </Card>
  )
}
