"use client"

import { useState, type ReactNode } from "react"

import { Info } from "lucide-react"

import { Badge } from "#components2/ui/badge"
import { Button } from "#components2/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#components2/ui/dialog"

export type CapabilityDetailDialogCopy = {
  triggerLabel: string
  closeLabel: string
  metaTitle: string
  metaSourceLabel: string
  metaStateLabel: string
  metaCustomizableLabel: string
  metaCustomizableYes: string
  metaCustomizableNo: string
}

export type CapabilityDetailDialogProps = {
  triggerVariant?: "ghost" | "outline"
  capabilityId: string
  title: string
  description: string
  effectiveLabel: string
  sourceLabel: string
  customizable: boolean
  copy: CapabilityDetailDialogCopy
  /** Optional config subdialog content (forms, role pickers, etc.). */
  children?: ReactNode
}

/**
 * Detail dialog — opened from card / table rows when an operator
 * wants the full read-out for one capability (resolution source,
 * config subdialog).
 *
 * Stays a minimal client island: the detail body is plain text +
 * meta fields. Configurable surfaces (e.g. role-policy pickers) pass
 * their own content through `children`.
 */
export function CapabilityDetailDialog({
  triggerVariant = "ghost",
  title,
  description,
  effectiveLabel,
  sourceLabel,
  customizable,
  copy,
  children,
}: CapabilityDetailDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        size="sm"
        variant={triggerVariant}
        onClick={() => setOpen(true)}
      >
        <Info className="size-3.5" aria-hidden />
        <span>{copy.triggerLabel}</span>
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <section
          aria-label={copy.metaTitle}
          className="grid grid-cols-3 gap-2 rounded-2xl border border-border/60 bg-muted/35 p-3 text-xs"
        >
          <div className="col-span-1">
            <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
              {copy.metaStateLabel}
            </p>
            <p className="mt-1">
              <Badge variant="outline">{effectiveLabel}</Badge>
            </p>
          </div>
          <div className="col-span-1">
            <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
              {copy.metaSourceLabel}
            </p>
            <p className="mt-1">
              <Badge variant="secondary">{sourceLabel}</Badge>
            </p>
          </div>
          <div className="col-span-1">
            <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
              {copy.metaCustomizableLabel}
            </p>
            <p className="mt-1 text-foreground">
              {customizable
                ? copy.metaCustomizableYes
                : copy.metaCustomizableNo}
            </p>
          </div>
        </section>

        {children}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            {copy.closeLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
