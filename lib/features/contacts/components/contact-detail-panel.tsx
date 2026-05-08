"use client"

import { CalendarDays, Mail, MoreHorizontal, Pencil, Trash2 } from "lucide-react"

import { Avatar, AvatarFallback } from "#components/ui/avatar"
import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
import { Separator } from "#components/ui/separator"
import { cn } from "#lib/utils"

import { getContactAvatarColor, getContactInitials } from "../constants"
import type { ContactRow } from "../types"

type ContactDetailPanelProps = {
  contact: ContactRow
}

export function ContactDetailPanel({ contact }: ContactDetailPanelProps) {
  const initials = getContactInitials(contact.name)
  const avatarColor = getContactAvatarColor(contact.name)

  return (
    <div className="flex flex-col gap-5">
      {/* Identity header */}
      <div className="flex items-center gap-3">
        <Avatar size="lg" className="shrink-0">
          <AvatarFallback className={cn("text-sm font-semibold", avatarColor)}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{contact.name}</p>
        </div>
        {/* Overflow menu stub — wired in a future action pass */}
        <Button variant="ghost" size="icon-sm" aria-label="More actions">
          <MoreHorizontal className="size-4" aria-hidden />
        </Button>
      </div>

      <Separator />

      {/* Structured metadata */}
      <dl className="flex flex-col gap-4 text-sm">
        <div className="flex flex-col gap-1">
          <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <Mail className="size-3" aria-hidden />
            Email
          </dt>
          <dd>
            {contact.email ? (
              <a
                href={`mailto:${contact.email}`}
                className="truncate text-primary underline-offset-3 hover:underline"
              >
                {contact.email}
              </a>
            ) : (
              <Badge variant="outline" className="text-xs">
                No email added
              </Badge>
            )}
          </dd>
        </div>

        <div className="flex flex-col gap-1">
          <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <CalendarDays className="size-3" aria-hidden />
            Added
          </dt>
          <dd className="text-muted-foreground">
            {contact.createdAt.toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </dd>
        </div>
      </dl>

      <Separator />

      {/* Action stubs — stubbed pending a full edit/delete implementation pass */}
      <div className="flex flex-col gap-2">
        <Button variant="outline" size="sm" className="w-full justify-start gap-2" disabled>
          <Pencil className="size-3.5" aria-hidden />
          Edit contact
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-destructive hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
          disabled
        >
          <Trash2 className="size-3.5" aria-hidden />
          Delete contact
        </Button>
      </div>
    </div>
  )
}
