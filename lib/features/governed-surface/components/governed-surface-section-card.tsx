import type { ReactNode } from "react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { cn } from "#lib/utils"

import type { EmptyState } from "../schemas/list-surface.schema"
import { GovernedEmpty } from "./governed-empty"

/** Section body contract — one Card shell, one state path (ADR-0026 Pattern C recipe). */
export type GovernedSurfaceSectionCardBody =
  | { state: "forbidden"; model: EmptyState }
  | { state: "invalid"; model: EmptyState }
  | { state: "empty"; children: ReactNode }
  | { state: "ready"; children: ReactNode }

export type GovernedSurfaceSectionCardProps = {
  title: string
  description?: string
  body: GovernedSurfaceSectionCardBody
  headerAction?: ReactNode
  className?: string
  contentClassName?: string
}

export function GovernedSurfaceSectionCard({
  title,
  description,
  body,
  headerAction,
  className,
  contentClassName,
}: GovernedSurfaceSectionCardProps) {
  return (
    <Card
      size="sm"
      className={cn("mt-6 border-solid border-border", className)}
    >
      <CardHeader>
        <CardTitle className="text-base font-semibold tracking-tight">
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {headerAction ? <CardAction>{headerAction}</CardAction> : null}
      </CardHeader>
      <CardContent className={contentClassName}>
        {body.state === "forbidden" || body.state === "invalid" ? (
          <GovernedEmpty model={body.model} />
        ) : (
          body.children
        )}
      </CardContent>
    </Card>
  )
}
