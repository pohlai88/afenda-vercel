"use client"

import { useState } from "react"
import { MessageSquare, Send } from "lucide-react"

import { cn } from "#lib/utils"
import { uiRadius, uiSurfaceElevation } from "#lib/design-system"

import { Button } from "../ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet"
import { Textarea } from "../ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { APP_SHELL_UTILITY_L2_ICON_CLASS } from "./utility-bar.client"

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

/** Self-contained Sheet trigger + feedback form. */
export function UtilityBarFeedbackPanel() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>("idea")
  const [message, setMessage] = useState("")
  const [formState, setFormState] = useState<FormState>("idle")

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      // Reset form when panel closes
      setMessage("")
      setType("idea")
      setFormState("idle")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return

    setFormState("submitting")
    // Stub: logs locally. Wire a Server Action here in a follow-up.
    await new Promise((resolve) => setTimeout(resolve, 400))
    console.info("[feedback]", { type, message: message.trim() })
    setFormState("success")
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Send feedback"
            aria-pressed={open}
            onClick={() => setOpen(true)}
            className={cn(
              APP_SHELL_UTILITY_L2_ICON_CLASS,
              open && "bg-muted/55 text-foreground"
            )}
          >
            <span aria-hidden className="size-[15px] shrink-0 [&>svg]:size-full">
              <MessageSquare strokeWidth={2} />
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" sideOffset={8}>
          Send feedback
        </TooltipContent>
      </Tooltip>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className={cn(
            "flex w-[min(22rem,100vw)] flex-col gap-0 p-0",
            uiRadius.sheet,
            uiSurfaceElevation.raised
          )}
        >
          <SheetHeader className="shrink-0 border-b border-border/50 px-5 py-4">
            <SheetTitle className="text-sm font-semibold">
              Send feedback
            </SheetTitle>
            <SheetDescription className="text-[11px] text-muted-foreground">
              Share a bug, idea, or question with the product team.
            </SheetDescription>
          </SheetHeader>

          {formState === "success" ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-10 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <Send className="size-5 text-primary" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-foreground">
                Thanks for your feedback
              </p>
              <p className="text-[11px] text-muted-foreground">
                We read every submission and use it to improve the product.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => handleOpenChange(false)}
              >
                Close
              </Button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-1 flex-col gap-0"
            >
              <div className="flex-1 space-y-4 px-5 py-4">
                {/* Type selector */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
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
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
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
                    rows={5}
                    className="resize-none text-[11px]"
                    required
                  />
                </div>
              </div>

              <SheetFooter className="shrink-0 border-t border-border/50 px-5 py-3">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!message.trim() || formState === "submitting"}
                  className="w-full gap-1.5"
                >
                  <Send className="size-3.5" strokeWidth={2} />
                  {formState === "submitting" ? "Sending…" : "Send feedback"}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
