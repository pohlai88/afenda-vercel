"use client"

import { useState, type FormEvent } from "react"
import { MessageSquare, Send } from "lucide-react"

import { cn } from "#lib/utils"

import { Button } from "../../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu"
import { Textarea } from "../../ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip"
import {
  APP_SHELL_UTILITY_L2_MENU_TRIGGER_OPEN_STATE_CLASS,
  APP_SHELL_UTILITY_RAIL_MENU_SURFACE_CLASS,
} from "./appshell-utility-bar-dropdown-chrome.shared"
import { APP_SHELL_UTILITY_L2_ICON_CLASS } from "./appshell-utility-bar.client"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FeedbackType = "bug" | "idea" | "question"

const FEEDBACK_TYPES: { id: FeedbackType; label: string }[] = [
  { id: "bug", label: "Bug" },
  { id: "idea", label: "Idea" },
  { id: "question", label: "Question" },
]

type FormState = "idle" | "submitting" | "success"

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/** Right-rail feedback panel — DropdownMenu anchored to the trigger. */
export function UtilityBarFeedbackPanel() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>("idea")
  const [message, setMessage] = useState("")
  const [formState, setFormState] = useState<FormState>("idle")

  function handleOpenChange(next: boolean) {
    setOpen(next)
    // Reset form when the panel closes so it's fresh on next open
    if (!next) {
      setMessage("")
      setType("idea")
      setFormState("idle")
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setFormState("submitting")
    // TODO: replace with a Server Action (submitFeedbackAction) — issue TBD
    await new Promise((resolve) => setTimeout(resolve, 400))
    setFormState("success")
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Send feedback"
              className={cn(
                APP_SHELL_UTILITY_L2_ICON_CLASS,
                APP_SHELL_UTILITY_L2_MENU_TRIGGER_OPEN_STATE_CLASS
              )}
            >
              <span
                aria-hidden
                className="size-[15px] shrink-0 [&>svg]:size-full"
              >
                <MessageSquare strokeWidth={2} />
              </span>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" sideOffset={8}>
          Send feedback
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        // Prevent Radix from closing on interaction inside the content area
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // Allow closing on outside click but not on interaction within
          const target = e.target as Element
          if (target?.closest("[data-radix-dropdown-menu-content]")) {
            e.preventDefault()
          }
        }}
        className={cn("w-80 p-0", APP_SHELL_UTILITY_RAIL_MENU_SURFACE_CLASS)}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-border/50 px-4 py-3">
          <p className="text-xs font-semibold tracking-tight text-card-foreground">
            Send feedback
          </p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Share a bug, idea, or question with the product team.
          </p>
        </div>

        {/* Body */}
        {formState === "success" ? (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
              <Send className="size-4 text-primary" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-foreground">
              Thanks for your feedback
            </p>
            <p className="text-[11px] text-muted-foreground">
              We read every submission and use it to improve the product.
            </p>
            <button
              type="button"
              onClick={() => {
                setMessage("")
                setType("idea")
                setFormState("idle")
              }}
              className="mt-1 text-[11px] text-primary underline-offset-2 hover:underline"
            >
              Send another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4">
            {/* Type selector */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                Type
              </p>
              <div className="flex gap-1.5">
                {FEEDBACK_TYPES.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setType(id)}
                    className={cn(
                      "rounded-md px-3 py-1 text-[11px] font-medium ring-1 transition-colors",
                      type === id
                        ? "bg-primary text-primary-foreground ring-primary"
                        : "bg-transparent text-muted-foreground ring-border/50 hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                Message
              </p>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  type === "bug"
                    ? "Describe what happened and how to reproduce it…"
                    : type === "idea"
                      ? "Describe your idea and the problem it solves…"
                      : "What would you like to know?"
                }
                rows={4}
                className="resize-none text-[11px]"
                required
              />
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={!message.trim() || formState === "submitting"}
              className="w-full gap-1.5"
            >
              <Send className="size-3.5" strokeWidth={2} />
              {formState === "submitting" ? "Sending…" : "Send feedback"}
            </Button>
          </form>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
