"use client"

import type { ComponentProps } from "react"
import { useFormStatus } from "react-dom"

import { Button } from "#components2/ui/button"

type HrmImportFormSubmitButtonProps = {
  label: string
  variant?: ComponentProps<typeof Button>["variant"]
  size?: ComponentProps<typeof Button>["size"]
}

export function HrmImportFormSubmitButton({
  label,
  variant = "default",
  size = "sm",
}: HrmImportFormSubmitButtonProps) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} size={size} variant={variant}>
      {label}
    </Button>
  )
}
