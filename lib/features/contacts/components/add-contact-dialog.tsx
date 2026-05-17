"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"

import { Button } from "#components2/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components2/ui/dialog"

import { AddContactForm } from "./add-contact-form"

/**
 * Dialog-wrapped add contact entry point.
 * Triggered by a button in the Directory card header action slot.
 * Closes automatically on successful save via the form's onSuccess callback.
 */
export function AddContactDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon data-icon="inline-start" aria-hidden />
          Add contact
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add contact</DialogTitle>
          <DialogDescription>
            Create a new customer, supplier, or partner record.
          </DialogDescription>
        </DialogHeader>

        <AddContactForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
