import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "#lib/utils"
import { uiRadius, uiTracking } from "#lib/design-system"

const buttonVariants = cva(
  cn(
    "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    uiRadius.control,
    uiTracking.control
  ),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-transparent dark:hover:bg-muted dark:aria-expanded:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-hover aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 active:bg-destructive/25 dark:bg-destructive/20 dark:hover:bg-destructive/35 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "min-h-[var(--af-control-height-md)] gap-[var(--af-control-gap-md)] px-[var(--af-control-px-md)] py-[var(--af-control-py-md)] has-data-[icon=inline-end]:pr-[calc(var(--af-control-px-md)-0.25rem)] has-data-[icon=inline-start]:pl-[calc(var(--af-control-px-md)-0.25rem)]",
        xs: "h-[var(--af-control-height-xs)] gap-[var(--af-control-gap-sm)] px-[var(--af-control-px-xs)] text-xs has-data-[icon=inline-end]:pr-[calc(var(--af-control-px-xs)-0.125rem)] has-data-[icon=inline-start]:pl-[calc(var(--af-control-px-xs)-0.125rem)] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-[var(--af-control-height-sm)] gap-[var(--af-control-gap-sm)] px-[var(--af-control-px-sm)] has-data-[icon=inline-end]:pr-[calc(var(--af-control-px-sm)-0.125rem)] has-data-[icon=inline-start]:pl-[calc(var(--af-control-px-sm)-0.125rem)]",
        lg: "min-h-[var(--af-control-height-lg)] gap-[var(--af-control-gap-lg)] px-[var(--af-control-px-lg)] py-[var(--af-control-py-lg)] has-data-[icon=inline-end]:pr-[calc(var(--af-control-px-lg)-0.25rem)] has-data-[icon=inline-start]:pl-[calc(var(--af-control-px-lg)-0.25rem)]",
        icon: "size-[var(--af-control-icon-md)]",
        "icon-xs":
          "size-[var(--af-control-icon-xs)] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-[var(--af-control-icon-sm)]",
        "icon-lg": "size-[var(--af-control-icon-lg)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
