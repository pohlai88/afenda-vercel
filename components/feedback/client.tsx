"use client"
import {
  type HTMLAttributes,
  type ReactNode,
  type SyntheticEvent,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react"
import { CornerDownRightIcon, ThumbsDown, ThumbsUp } from "lucide-react"
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react-dom"
import { cva } from "class-variance-authority"
import { usePathname } from "fumadocs-core/framework"
import { z } from "zod/mini"

import { Button } from "#components2/ui/button"
import { Collapsible, CollapsibleContent } from "#components2/ui/collapsible"
import { Textarea } from "#components2/ui/textarea"
import { cn } from "#lib/utils"
import {
  actionResponse,
  blockFeedback,
  pageFeedback,
  type ActionResponse,
  type BlockFeedback,
  type PageFeedback,
} from "./schema"

const rateButtonVariants = cva(
  "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed [&_svg]:size-4",
  {
    variants: {
      active: {
        true: "bg-accent text-accent-foreground [&_svg]:fill-current",
        false: "text-muted-foreground",
      },
    },
  }
)

const pageFeedbackResult = z.extend(pageFeedback, {
  response: actionResponse,
})

const blockFeedbackResult = z.extend(blockFeedback, {
  response: actionResponse,
})

/**
 * A feedback component to be attached at the end of page
 */
export function Feedback({
  onSendAction,
}: {
  onSendAction: (feedback: PageFeedback) => Promise<ActionResponse>
}) {
  const pathname = usePathname()
  const { previous, setPrevious } = useSubmissionStorage(pathname, (v) => {
    const result = pageFeedbackResult.safeParse(v)
    return result.success ? result.data : null
  })
  const [opinion, setOpinion] = useState<"good" | "bad" | null>(null)
  const [message, setMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  function submit(e?: SyntheticEvent) {
    if (opinion == null) return

    startTransition(async () => {
      const feedback: PageFeedback = {
        url: location.href,
        opinion,
        message,
      }

      const response = await onSendAction(feedback)
      setPrevious({
        response,
        ...feedback,
      })
      setMessage("")
      setOpinion(null)
    })

    e?.preventDefault()
  }

  const activeOpinion = previous?.opinion ?? opinion

  return (
    <Collapsible
      open={opinion !== null || previous !== null}
      onOpenChange={(v) => {
        if (!v) setOpinion(null)
      }}
      className="border-y py-3"
    >
      <div className="flex flex-row items-center gap-2">
        <p className="pe-2 text-sm font-medium">How is this guide?</p>
        <button
          disabled={previous !== null}
          className={cn(
            rateButtonVariants({ active: activeOpinion === "good" })
          )}
          onClick={() => setOpinion("good")}
        >
          <ThumbsUp />
          Good
        </button>
        <button
          disabled={previous !== null}
          className={cn(
            rateButtonVariants({ active: activeOpinion === "bad" })
          )}
          onClick={() => setOpinion("bad")}
        >
          <ThumbsDown />
          Bad
        </button>
      </div>
      <CollapsibleContent className="mt-3">
        {previous ? (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-card px-3 py-6 text-center text-sm text-muted-foreground">
            <p>Thank you for your feedback!</p>
            <div className="flex flex-row items-center gap-2">
              <Button asChild variant="default" size="sm">
                <a
                  href={previous.response?.githubUrl}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  View on GitHub
                </a>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setOpinion(previous.opinion)
                  setPrevious(null)
                }}
              >
                Submit Again
              </Button>
            </div>
          </div>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <Textarea
              autoFocus
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Leave your feedback..."
              onKeyDown={(e) => {
                if (!e.shiftKey && e.key === "Enter") {
                  submit(e)
                }
              }}
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={isPending}
              className="w-fit"
            >
              Submit
            </Button>
          </form>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

export interface FeedbackTextProps {
  onSendAction: (feedback: BlockFeedback) => Promise<ActionResponse>
  children?: ReactNode
}

/**
 * A feedback component for each content block in page, should be used with `remark-feedback-block`.
 *
 * See https://fumadocs.dev/docs/integrations/feedback.
 */
export function FeedbackText({ onSendAction, children }: FeedbackTextProps) {
  const [popup, _setPopup] = useState<{
    mode: "tooltip" | "expanded"
    blockId: string
    selection: string
    range: Range
  } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const { refs, floatingStyles } = useFloating({
    open: popup !== null,
    placement: "bottom",
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })

  function expandPopup() {
    if (popup?.mode !== "tooltip") return

    const highlight = new Highlight(popup.range)
    CSS.highlights.set("fd-feedback-text", highlight)

    _setPopup({ ...popup, mode: "expanded" })
  }

  function closePopup() {
    if (popup?.mode === "expanded") {
      CSS.highlights.delete("fd-feedback-text")
    }

    _setPopup(null)
  }

  const updateSelectionPopover = useEffectEvent(() => {
    if (popup && popup.mode === "expanded") return

    const container = containerRef.current
    const selection = window.getSelection()

    if (
      !container ||
      !selection ||
      selection.isCollapsed ||
      selection.rangeCount === 0
    ) {
      closePopup()
      return
    }

    const range = selection.getRangeAt(0).cloneRange()
    if (!container.contains(range.commonAncestorContainer)) {
      closePopup()
      return
    }

    const selectionText = selection.toString().trim()
    if (selectionText.length === 0 || selectionText.includes("\n")) {
      closePopup()
      return
    }

    const element =
      range.startContainer instanceof Element
        ? range.startContainer
        : range.startContainer.parentElement
    const blockId = element?.closest('[data-block="feedback"]')?.id
    if (!blockId) {
      closePopup()
      return
    }

    refs.setReference({
      getBoundingClientRect() {
        return range.getBoundingClientRect()
      },
      contextElement: container,
    })

    _setPopup({ mode: "tooltip", range, selection: selectionText, blockId })
  })

  const closeOnEscape = useEffectEvent((event: KeyboardEvent) => {
    if (popup === null) return
    if (event.key === "Escape") closePopup()
  })

  const closeOnPointerDown = useEffectEvent((event: PointerEvent) => {
    const target = event.target
    if (popup === null || !(target instanceof Node)) return

    if (
      refs.floating.current?.contains(target) ||
      (popup.mode === "tooltip" && containerRef.current?.contains(target))
    ) {
      return
    }

    closePopup()
  })

  useEffect(() => {
    let frame: number | null = null

    function scheduleSelectionPopover() {
      if (frame !== null) window.cancelAnimationFrame(frame)

      frame = window.requestAnimationFrame(() => {
        frame = null
        updateSelectionPopover()
      })
    }

    document.addEventListener("selectionchange", scheduleSelectionPopover)
    document.addEventListener("keydown", closeOnEscape)
    document.addEventListener("pointerdown", closeOnPointerDown)

    return () => {
      document.removeEventListener("keydown", closeOnEscape)
      document.removeEventListener("pointerdown", closeOnPointerDown)
      document.removeEventListener("selectionchange", scheduleSelectionPopover)
      if (frame !== null) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <>
      <div
        ref={containerRef}
        className="prose-no-margin [&_::highlight(fd-feedback-text)]:bg-primary [&_::highlight(fd-feedback-text)]:text-primary-foreground"
      >
        {children}
      </div>

      {popup && (
        <div
          // eslint-disable-next-line react-hooks/refs
          ref={refs.setFloating}
          className={cn(
            "not-prose z-40 box-content h-9.5 w-30 overflow-hidden rounded-xl border bg-popover text-sm text-popover-foreground shadow-lg transition-[width,height]",
            popup.mode === "expanded"
              ? "h-32 w-[300px] max-w-[98vw]"
              : "select-none"
          )}
          style={floatingStyles}
        >
          {popup.mode === "tooltip" ? (
            <div className="h-9.5 w-30 p-1">
              <Button
                variant="ghost"
                size="sm"
                className="size-full gap-1.5"
                onClick={expandPopup}
              >
                <CornerDownRightIcon data-icon="inline-start" />
                Feedback
              </Button>
            </div>
          ) : (
            <FeedbackTextForm
              blockId={popup.blockId}
              selection={popup.selection}
              onSendAction={onSendAction}
              onClose={closePopup}
              container={{
                className: "animate-fd-fade-in h-32 w-[300px] max-w-[98vw] p-2",
              }}
            />
          )}
        </div>
      )}
    </>
  )
}

function FeedbackTextForm({
  blockId,
  selection,
  onSendAction,
  onClose,
  container,
}: {
  container: HTMLAttributes<HTMLElement>
  blockId: string
  selection: string
  onSendAction: (feedback: BlockFeedback) => Promise<ActionResponse>
  onClose: () => void
}) {
  const pathname = usePathname()
  const { previous, setPrevious } = useSubmissionStorage(
    `${pathname}-${blockId}`,
    (v) => {
      const result = blockFeedbackResult.safeParse(v)
      if (result.success) return result.data
      return null
    }
  )
  const [message, setMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  function submit(e?: SyntheticEvent) {
    startTransition(async () => {
      const feedback: BlockFeedback = {
        blockId,
        blockBody: selection,
        url: location.href,
        message,
      }

      const response = await onSendAction(feedback)
      setPrevious({
        response,
        ...feedback,
      })
      setMessage("")
    })

    e?.preventDefault()
  }

  if (previous)
    return (
      <div
        {...container}
        className={cn(
          "flex flex-col items-center justify-center gap-2 text-center text-muted-foreground",
          container.className
        )}
      >
        <p>Thank you for your feedback!</p>
        <div className="flex flex-row items-center gap-2">
          <Button asChild variant="default" size="xs">
            <a
              href={previous.response?.githubUrl}
              rel="noreferrer noopener"
              target="_blank"
            >
              View on GitHub
            </a>
          </Button>
          <Button
            variant="secondary"
            size="xs"
            onClick={() => setPrevious(null)}
          >
            Submit Again
          </Button>
        </div>
      </div>
    )

  return (
    <form
      {...container}
      className={cn("flex flex-col gap-2", container.className)}
      onSubmit={submit}
    >
      <Textarea
        autoFocus
        required
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Leave your feedback..."
        className="resize-none"
        onKeyDown={(e) => {
          if (!e.shiftKey && e.key === "Enter") {
            submit(e)
          }
        }}
      />
      <div className="mt-auto grid grid-cols-2 gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={isPending}
          className="gap-1.5"
        >
          <CornerDownRightIcon data-icon="inline-start" />
          Submit
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </form>
  )
}

function useSubmissionStorage<Result>(
  key: string,
  validate: (v: unknown) => Result | null
) {
  const storageKey = `docs-feedback-${key}`
  const [value, setValue] = useState<Result | null>(null)
  const validateCallback = useEffectEvent(validate)

  useEffect(() => {
    const item = localStorage.getItem(storageKey)
    if (item === null) return
    const validated = validateCallback(JSON.parse(item))

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (validated !== null) setValue(validated)
  }, [storageKey])

  return {
    previous: value,
    setPrevious(result: Result | null) {
      if (result) localStorage.setItem(storageKey, JSON.stringify(result))
      else localStorage.removeItem(storageKey)

      setValue(result)
    },
  }
}
