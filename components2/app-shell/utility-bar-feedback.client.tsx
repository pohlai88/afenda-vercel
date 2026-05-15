"use client"

import { useState } from "react"
import { Send } from "lucide-react"

import { cn } from "#lib/utils"

import { Button } from "../ui/button"
import { Textarea } from "../ui/textarea"
import { AppShellFeedbackIcon } from "./utility-bar.client"
import { AppShellUtilityPanel } from "./utility-bar-panel.client"

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

/** Right-rail feedback panel — Popover anchored below the trigger. */
export function UtilityBarFeedbackPanel() {
  const [type, setType] = useState<FeedbackType>("idea")
  const [message, setMessage] = useState("")
  const [formState, setFormState] = useState<FormState>("idle")

  function resetForm() {
    setMessage("")
    setType("idea")
    setFormState("idle")
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

  const footer =
    formState !== "success" ? (
      <Button
        type="submit"
        form="utility-feedback-form"
        size="sm"
        disabled={!message.trim() || formState === "submitting"}
        className="w-full gap-1.5"
      >
        <Send className="size-3.5" strokeWidth={2} />
        {formState === "submitting" ? "Sending…" : "Send feedback"}
      </Button>
    ) : undefined

  return (
    <AppShellUtilityPanel
      trigger={
        <AppShellFeedbackIcon
          ariaLabel="Send feedback"
          tooltip="Send feedback"
        />
      }
      title="Send feedback"
      description="Share a bug, idea, or question with the product team."
      footer={footer}
    >
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
            onClick={resetForm}
            className="mt-1 text-[11px] text-primary underline-offset-2 hover:underline"
          >
            Send another
          </button>
        </div>
      ) : (
        <form
          id="utility-feedback-form"
          onSubmit={handleSubmit}
          className="space-y-4 px-4 py-4"
        >
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
              rows={4}
              className="resize-none text-[11px]"
              required
            />
          </div>
        </form>
      )}
    </AppShellUtilityPanel>
  )
}
