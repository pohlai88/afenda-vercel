"use client"

import Image from "next/image"
import {
  type ComponentProps,
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  type SyntheticEvent,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  ArrowDown,
  Copy,
  Loader2,
  RotateCcw,
  SearchIcon,
  Send,
  Trash2,
  PanelRightClose,
} from "lucide-react"
import { useChat, type UseChatHelpers } from "@ai-sdk/react"
import { useTranslations } from "next-intl"
import { DefaultChatTransport, type Tool, type UIToolInvocation } from "ai"
import { buttonVariants } from "#components2/ui/fumadocs-button"
import { Presence } from "#components2/ui/presence"

import { Markdown } from "#components2/markdown"
import { buildPublicLynxUserMessage } from "#lib/ask-docs/public-lynx-client-context.shared"
import { resolvePublicLynxChatErrorKey } from "#lib/ask-docs/public-lynx-error.shared"
import {
  extractPublicLynxMessageText,
  extractPublicLynxSearchToolCalls,
} from "#lib/ask-docs/public-lynx-message-parts.shared"
import {
  publicLynxSearchHits,
  publicLynxSearchResultCount,
} from "#lib/ask-docs/public-lynx-search.shared"
import { buildPublicLynxConversationTranscript } from "#lib/ask-docs/public-lynx-transcript.shared"
import {
  LYNX_ICON_DARK,
  LYNX_ICON_LIGHT_ACTIVE,
  LYNX_ICON_LIGHT_REST,
  LYNX_ICON_PIXEL_SIZE,
  LYNX_TRIGGER_SIZE_CLASS,
} from "#lib/ask-docs/lynx-brand.shared"
import {
  type ChatUIMessage,
  formatPublicLynxModelLabel,
  isPublicLynxChatLoading,
  PUBLIC_LYNX_CHAT_API_PATH,
  PUBLIC_LYNX_MAX_USER_INPUT_CHARS,
  normalizePublicLynxChatMessages,
  resolvePublicLynxDisplayModelId,
} from "#lib/ask-docs/public-lynx.shared"
import { cn } from "#lib/utils"

import { AskLynxTooltip } from "./ask-lynx-tooltip"
import { usePublicLynxFabDrag } from "./public-lynx-fab-drag"

const ASK_LYNX_INPUT_ID = "nd-ai-input"
const ASK_LYNX_PANEL_ID = "ask-lynx-panel"
const ASK_LYNX_TITLE_ID = "ask-lynx-title"
const CHAR_COUNTER_THRESHOLD = Math.floor(
  PUBLIC_LYNX_MAX_USER_INPUT_CHARS * 0.8
)
const COPY_STATUS_RESET_MS = 2_000

const LYNX_SUGGESTED_PROMPT_KEYS = [
  "prompts.whatIsAfenda",
  "prompts.signInFirstTime",
  "prompts.docsStructure",
] as const

const PUBLIC_LYNX_DISPLAY_MODEL_LABEL = formatPublicLynxModelLabel(
  resolvePublicLynxDisplayModelId()
)

const Context = createContext<{
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
  chat: UseChatHelpers<ChatUIMessage>
} | null>(null)

function LynxAvatarCircle({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full ring-1 ring-fd-border",
        className
      )}
    >
      <Image
        src={LYNX_ICON_LIGHT_REST}
        alt=""
        width={LYNX_ICON_PIXEL_SIZE}
        height={LYNX_ICON_PIXEL_SIZE}
        className="size-full object-cover dark:hidden"
      />
      <Image
        src={LYNX_ICON_DARK}
        alt=""
        width={LYNX_ICON_PIXEL_SIZE}
        height={LYNX_ICON_PIXEL_SIZE}
        className="hidden size-full object-cover dark:block"
      />
    </span>
  )
}

function LynxBrandMark({
  className,
  imageSizes = "56px",
}: {
  className?: string
  imageSizes?: string
}) {
  return (
    <span
      className={cn(
        "relative block size-full overflow-hidden rounded-full",
        className
      )}
    >
      <Image
        src={LYNX_ICON_LIGHT_REST}
        alt=""
        fill
        priority
        draggable={false}
        sizes={imageSizes}
        className={cn(
          "pointer-events-none object-cover dark:hidden",
          "transition-opacity duration-200",
          "group-hover:opacity-0 group-data-[state=open]:opacity-0"
        )}
      />
      <Image
        src={LYNX_ICON_LIGHT_ACTIVE}
        alt=""
        fill
        priority
        draggable={false}
        sizes={imageSizes}
        className={cn(
          "pointer-events-none object-cover opacity-0 dark:hidden",
          "transition-opacity duration-200",
          "group-hover:opacity-100 group-data-[state=open]:opacity-100"
        )}
      />
      <Image
        src={LYNX_ICON_DARK}
        alt=""
        fill
        priority
        draggable={false}
        sizes={imageSizes}
        className="pointer-events-none hidden object-cover dark:block"
      />
    </span>
  )
}

function PanelHeaderIconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <AskLynxTooltip label={label} disabled={disabled}>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        className={cn(
          buttonVariants({
            size: "icon-sm",
            color: "ghost",
            className: "shrink-0 rounded-full text-fd-muted-foreground",
          })
        )}
        onClick={onClick}
      >
        {children}
      </button>
    </AskLynxTooltip>
  )
}

export function AISearchPanelHeader({
  className,
  ...props
}: ComponentProps<"div">) {
  const t = useTranslations("AskLynx")
  const { setOpen } = useAISearchContext()
  const { messages, status, setMessages, regenerate } = useChatContext()
  const visibleMessages = messages.filter(
    (msg: ChatUIMessage) => msg.role !== "system"
  )
  const hasMessages = visibleMessages.length > 0
  const isLoading = isPublicLynxChatLoading(status)
  const showRetry =
    hasMessages && !isLoading && visibleMessages.at(-1)?.role === "assistant"
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle"
  )
  const copyStatusResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleCopyStatusReset = useCallback(() => {
    if (copyStatusResetRef.current) {
      clearTimeout(copyStatusResetRef.current)
    }
    copyStatusResetRef.current = setTimeout(() => {
      copyStatusResetRef.current = null
      setCopyStatus("idle")
    }, COPY_STATUS_RESET_MS)
  }, [])

  useEffect(() => {
    return () => {
      if (copyStatusResetRef.current) {
        clearTimeout(copyStatusResetRef.current)
      }
    }
  }, [])

  const onCopyConversation = useCallback(async () => {
    const transcript = buildPublicLynxConversationTranscript(visibleMessages)
    if (!transcript) return
    try {
      await navigator.clipboard.writeText(transcript)
      setCopyStatus("copied")
      scheduleCopyStatusReset()
    } catch {
      setCopyStatus("failed")
      scheduleCopyStatusReset()
    }
  }, [visibleMessages, scheduleCopyStatusReset])

  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex items-center gap-2.5 border-b border-fd-border bg-fd-card px-3 py-2",
        className
      )}
      {...props}
    >
      <LynxAvatarCircle className="size-7" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id={ASK_LYNX_TITLE_ID}
            className="text-[13px] font-semibold text-fd-foreground"
          >
            {t("title")}
          </h2>
          <span className="rounded-md bg-fd-muted px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-fd-muted-foreground uppercase">
            {t("beta")}
          </span>
        </div>
        <p className="text-[11px] text-fd-muted-foreground">
          {PUBLIC_LYNX_DISPLAY_MODEL_LABEL}
        </p>
        <p className="sr-only" aria-live="polite">
          {copyStatus === "copied"
            ? t("copyStatusCopied")
            : copyStatus === "failed"
              ? t("copyStatusFailed")
              : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {showRetry ? (
          <PanelHeaderIconButton
            label={t("retryLastResponse")}
            onClick={() => regenerate()}
          >
            <RotateCcw className="size-4" />
          </PanelHeaderIconButton>
        ) : null}
        <PanelHeaderIconButton
          label={t("copyConversation")}
          disabled={!hasMessages}
          onClick={() => {
            void onCopyConversation()
          }}
        >
          <Copy className="size-4" />
        </PanelHeaderIconButton>
        <PanelHeaderIconButton
          label={t("newChat")}
          disabled={!hasMessages}
          onClick={() => setMessages([])}
        >
          <Trash2 className="size-4" />
        </PanelHeaderIconButton>
        <PanelHeaderIconButton
          label={t("collapsePanel")}
          onClick={() => setOpen(false)}
        >
          <PanelRightClose className="size-4" />
        </PanelHeaderIconButton>
      </div>
    </div>
  )
}

export function AISearchInput(props: ComponentProps<"form">) {
  const t = useTranslations("AskLynx")
  const { status, sendMessage, stop } = useChatContext()
  const [input, setInput] = useState("")
  const isLoading = isPublicLynxChatLoading(status)
  const showCharCounter = input.length > CHAR_COUNTER_THRESHOLD
  const stopButtonRef = useRef<HTMLButtonElement>(null)

  const onStart = (e?: SyntheticEvent) => {
    e?.preventDefault()
    const message = input.trim()
    if (
      message.length === 0 ||
      message.length > PUBLIC_LYNX_MAX_USER_INPUT_CHARS
    ) {
      return
    }

    void sendMessage(buildPublicLynxUserMessage(message))
    setInput("")
  }

  useEffect(() => {
    if (isLoading) stopButtonRef.current?.focus()
  }, [isLoading])

  return (
    <form
      {...props}
      className={cn("flex flex-col", props.className)}
      onSubmit={onStart}
    >
      <div className="flex items-start gap-1 pe-2 pt-1">
        <ComposerTextarea
          value={input}
          placeholder={
            isLoading ? t("inputPlaceholderLoading") : t("inputPlaceholder")
          }
          maxLength={PUBLIC_LYNX_MAX_USER_INPUT_CHARS}
          autoFocus
          className="min-h-10 p-3"
          disabled={isLoading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(event) => {
            if (!event.shiftKey && event.key === "Enter") {
              onStart(event)
            }
          }}
        />
        {isLoading ? (
          <button
            ref={stopButtonRef}
            type="button"
            aria-label={t("stopResponse")}
            className={cn(
              buttonVariants({
                color: "secondary",
                className: "mt-2 shrink-0 gap-2 rounded-full",
              })
            )}
            onClick={stop}
          >
            <Loader2 className="size-4 animate-spin text-fd-muted-foreground" />
            <span className="sr-only sm:not-sr-only sm:inline">
              {t("stop")}
            </span>
          </button>
        ) : (
          <button
            type="submit"
            aria-label={t("sendMessage")}
            className={cn(
              buttonVariants({
                color: "primary",
                className: "mt-2 shrink-0 rounded-full",
              })
            )}
            disabled={
              input.trim().length === 0 ||
              input.trim().length > PUBLIC_LYNX_MAX_USER_INPUT_CHARS
            }
          >
            <Send className="size-4" />
          </button>
        )}
      </div>
      {showCharCounter ? (
        <p className="px-3 pb-1 text-end text-[10px] text-fd-muted-foreground tabular-nums">
          {input.length}/{PUBLIC_LYNX_MAX_USER_INPUT_CHARS}
        </p>
      ) : null}
      <p className="border-t border-fd-border px-3 py-2 text-[10px] leading-snug text-fd-muted-foreground">
        {t("disclaimer")}
      </p>
    </form>
  )
}

function ComposerTextarea(props: ComponentProps<"textarea">) {
  return (
    <textarea
      id={ASK_LYNX_INPUT_ID}
      {...props}
      className={cn(
        "min-w-0 flex-1 resize-none bg-transparent placeholder:text-fd-muted-foreground focus-visible:outline-none",
        props.className
      )}
    />
  )
}

function MessageList({
  messageCount,
  onScrollContainer,
  children,
  className,
  ...props
}: Omit<ComponentProps<"div">, "onScroll"> & {
  messageCount: number
  onScrollContainer?: (el: HTMLDivElement | null) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      containerRef.current = el
      onScrollContainer?.(el)
    },
    [onScrollContainer]
  )

  const scrollToBottom = useEffectEvent(() => {
    const container = containerRef.current
    if (!container) return

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "instant",
    })
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    scrollToBottom()
    const observer = new ResizeObserver(scrollToBottom)
    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messageCount])

  return (
    <div
      ref={setRef}
      className={cn(
        "relative fd-scroll-container min-h-0 min-w-0 flex-1 overflow-y-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function ScrollToBottomButton({
  visible,
  onClick,
}: {
  visible: boolean
  onClick: () => void
}) {
  const t = useTranslations("AskLynx")
  if (!visible) return null

  return (
    <button
      type="button"
      aria-label={t("scrollToLatest")}
      className={cn(
        buttonVariants({
          color: "secondary",
          size: "sm",
          className:
            "absolute right-3 bottom-3 z-10 gap-1 rounded-full shadow-md",
        })
      )}
      onClick={onClick}
    >
      <ArrowDown className="size-3.5" />
      <span className="text-xs">{t("latest")}</span>
    </button>
  )
}

function SearchToolCard({ call }: { call: UIToolInvocation<Tool> }) {
  const t = useTranslations("AskLynx")
  const count = publicLynxSearchResultCount(call.output)
  const hits = publicLynxSearchHits(call.output)
  const isError =
    call.state === "output-error" || call.state === "output-denied"

  return (
    <details className="mt-2 rounded-lg border border-fd-border bg-fd-muted/40 text-xs">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-2 marker:content-none [&::-webkit-details-marker]:hidden">
        <SearchIcon className="size-3.5 shrink-0 text-fd-muted-foreground" />
        {isError ? (
          <span className="text-fd-error">
            {call.errorText ?? t("searchFailed")}
          </span>
        ) : (
          <span className="text-fd-muted-foreground">
            {!call.output ? t("searching") : t("searchResults", { count })}
          </span>
        )}
      </summary>
      {!isError && hits.length > 0 ? (
        <ul className="space-y-1 border-t border-fd-border px-2.5 py-2">
          {hits.map((hit, index) => (
            <li
              key={`${call.toolCallId ?? "search"}-${hit.url ?? hit.title ?? index}`}
            >
              {hit.url ? (
                <a
                  href={hit.url}
                  className="text-fd-primary underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {hit.title ?? hit.url}
                </a>
              ) : (
                <span>{hit.title ?? t("untitled")}</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </details>
  )
}

function AssistantTypingIndicator() {
  const t = useTranslations("AskLynx")
  return (
    <div
      className="flex gap-2"
      aria-live="polite"
      aria-label={t("respondingAria")}
    >
      <LynxAvatarCircle className="mt-0.5 size-7" />
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-fd-secondary px-3 py-2.5">
        <Loader2
          className="size-3.5 animate-spin text-fd-muted-foreground"
          aria-hidden
        />
        <span className="text-xs text-fd-muted-foreground">
          {t("thinking")}
        </span>
      </div>
    </div>
  )
}

function Message({
  message,
  isStreaming = false,
  className,
  onClick,
  ...rest
}: { message: ChatUIMessage; isStreaming?: boolean } & ComponentProps<"div">) {
  const markdown = extractPublicLynxMessageText(message.parts)
  const searchCalls = extractPublicLynxSearchToolCalls(message.parts)

  const isUser = message.role === "user"
  const isAssistant = message.role === "assistant"

  const stopBubblePropagation = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
    onClick?.(event)
  }

  if (isUser) {
    return (
      <div
        className={cn("flex justify-end", className)}
        onClick={stopBubblePropagation}
        {...rest}
      >
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-fd-primary px-3 py-2 text-sm text-fd-primary-foreground">
          {markdown}
        </div>
      </div>
    )
  }

  if (!isAssistant) return null

  if (isStreaming && !markdown && searchCalls.length === 0) {
    return <AssistantTypingIndicator />
  }

  if (!markdown && searchCalls.length === 0) {
    return null
  }

  return (
    <div
      className={cn("flex gap-2", className)}
      onClick={stopBubblePropagation}
      {...rest}
    >
      <LynxAvatarCircle className="mt-0.5 size-7" />
      <div className="min-w-0 flex-1">
        {markdown ? (
          <div className="prose-sm dark:prose-invert prose max-w-none rounded-2xl rounded-tl-sm bg-fd-secondary px-3 py-2 text-fd-secondary-foreground">
            <Markdown text={markdown} />
          </div>
        ) : null}
        {searchCalls.map((call) => (
          <SearchToolCard key={call.toolCallId} call={call} />
        ))}
      </div>
    </div>
  )
}

function PublicLynxErrorCard({
  error,
  onRetry,
}: {
  error: Error
  onRetry: () => void
}) {
  const t = useTranslations("AskLynx")
  return (
    <div
      role="alert"
      className="rounded-lg border border-fd-border bg-fd-secondary p-2 text-fd-secondary-foreground"
    >
      <p className="mb-1 text-xs text-fd-muted-foreground">{t("errorTitle")}</p>
      <p className="text-sm">{t(resolvePublicLynxChatErrorKey(error))}</p>
      <button
        type="button"
        className={cn(
          buttonVariants({
            color: "secondary",
            size: "sm",
            className: "mt-2",
          })
        )}
        onClick={onRetry}
      >
        {t("retry")}
      </button>
    </div>
  )
}

function SuggestedPrompts() {
  const t = useTranslations("AskLynx")
  const { sendMessage, status } = useChatContext()
  const isLoading = isPublicLynxChatLoading(status)

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6 text-center">
      <span className="relative block size-12 overflow-hidden rounded-full">
        <LynxBrandMark imageSizes="48px" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-fd-foreground">
          {t("greeting")}
        </p>
        <p className="text-xs text-fd-muted-foreground">
          {t("greetingDescription")}
        </p>
      </div>
      <div className="grid w-full max-w-sm grid-cols-1 gap-2 sm:grid-cols-2">
        {LYNX_SUGGESTED_PROMPT_KEYS.map((promptKey) => {
          const promptText = t(promptKey)
          return (
            <button
              key={promptKey}
              type="button"
              disabled={isLoading}
              className={cn(
                buttonVariants({
                  color: "secondary",
                  className:
                    "h-auto min-h-9 rounded-xl border border-fd-border px-3 py-2 text-start text-xs leading-snug whitespace-normal",
                })
              )}
              onClick={() => {
                void sendMessage(buildPublicLynxUserMessage(promptText))
              }}
            >
              {promptText}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function AISearch({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: PUBLIC_LYNX_CHAT_API_PATH,
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: {
            ...(body ?? {}),
            messages: normalizePublicLynxChatMessages(
              messages as ChatUIMessage[]
            ),
          },
        }),
      }),
    []
  )
  const chat = useChat<ChatUIMessage>({
    id: "ask-lynx",
    transport,
  })
  const { status: chatStatus, stop: stopChat } = chat

  const stopStreamingWhenClosed = useEffectEvent(() => {
    if (isPublicLynxChatLoading(chatStatus)) {
      stopChat()
    }
  })

  useEffect(() => {
    if (!open) stopStreamingWhenClosed()
  }, [open])

  return (
    <Context.Provider
      value={useMemo(() => ({ chat, open, setOpen }), [chat, open])}
    >
      {children}
    </Context.Provider>
  )
}

function AISearchFloatTrigger({
  className,
  children,
  ...props
}: Omit<ComponentProps<"button">, "type">) {
  const t = useTranslations("AskLynx")
  const { open, setOpen } = useAISearchContext()
  const toggleOpen = useCallback(
    () => setOpen((prev: boolean) => !prev),
    [setOpen]
  )
  const {
    fabPosition,
    isDraggingFab,
    fabPointerDown,
    consumeClickSuppression,
  } = usePublicLynxFabDrag()

  return (
    <button
      type="button"
      data-state={open ? "open" : "closed"}
      aria-label={t("floatTriggerAria")}
      aria-expanded={open}
      aria-controls={ASK_LYNX_PANEL_ID}
      style={{
        right: fabPosition.right,
        bottom: fabPosition.bottom,
      }}
      onPointerDown={fabPointerDown}
      onClick={(e) => {
        if (consumeClickSuppression()) {
          e.preventDefault()
          return
        }
        toggleOpen()
      }}
      onDragStart={(e) => {
        e.preventDefault()
      }}
      className={cn(
        "group fixed z-20 touch-none overflow-hidden rounded-full shadow-lg ring-1 ring-fd-border select-none",
        LYNX_TRIGGER_SIZE_CLASS,
        isDraggingFab
          ? "cursor-grabbing motion-safe:transition-none motion-reduce:transition-none"
          : "cursor-grab motion-safe:transition-[translate,opacity] motion-safe:hover:scale-105 motion-reduce:transition-none",
        open && "pointer-events-none translate-y-10 opacity-0",
        className
      )}
      {...props}
    >
      {children ?? <LynxBrandMark />}
    </button>
  )
}

export function AISearchTrigger({
  position = "default",
  className,
  children,
  ...props
}: ComponentProps<"button"> & { position?: "default" | "float" }) {
  const t = useTranslations("AskLynx")
  const { open, setOpen } = useAISearchContext()

  if (position === "float") {
    return (
      <AISearchFloatTrigger className={className} {...props}>
        {children}
      </AISearchFloatTrigger>
    )
  }

  return (
    <button
      type="button"
      data-state={open ? "open" : "closed"}
      aria-label={t("defaultTriggerAria")}
      aria-expanded={open}
      aria-controls={ASK_LYNX_PANEL_ID}
      className={cn(
        "group relative shrink-0 overflow-hidden rounded-full ring-1 ring-fd-border",
        LYNX_TRIGGER_SIZE_CLASS,
        className
      )}
      onClick={() => setOpen((prev: boolean) => !prev)}
      {...props}
    >
      {children ?? <LynxBrandMark />}
    </button>
  )
}

export function AISearchPanel() {
  const { open, setOpen } = useAISearchContext()
  const t = useTranslations("AskLynx")
  useHotKey()

  return (
    <>
      <style>
        {`
        @keyframes ask-ai-open {
          from { translate: 100% 0; }
          to { translate: 0 0; }
        }
        @keyframes ask-ai-close {
          from { width: var(--ai-chat-width); }
          to { width: 0px; }
        }`}
      </style>
      <Presence present={open}>
        <div
          className={cn(
            "fixed inset-0 z-30 bg-fd-overlay backdrop-blur-xs lg:hidden",
            open ? "animate-fd-fade-in" : "animate-fd-fade-out"
          )}
          onClick={() => setOpen(false)}
        />
      </Presence>
      <Presence present={open}>
        <div
          id={ASK_LYNX_PANEL_ID}
          role="region"
          aria-label={t("title")}
          aria-labelledby={ASK_LYNX_TITLE_ID}
          className={cn(
            "z-30 overflow-hidden bg-fd-card text-fd-card-foreground [--ai-chat-width:380px] 2xl:[--ai-chat-width:380px]",
            "max-lg:fixed max-lg:inset-x-2 max-lg:inset-y-4 max-lg:rounded-2xl max-lg:border max-lg:shadow-xl",
            "lg:max-2xl:fixed lg:max-2xl:top-16 lg:max-2xl:right-3 lg:max-2xl:bottom-3 lg:max-2xl:w-[380px] lg:max-2xl:rounded-2xl lg:max-2xl:border lg:max-2xl:shadow-xl",
            "2xl:sticky 2xl:top-0 2xl:ms-auto 2xl:h-dvh 2xl:border-s",
            "2xl:in-[#nd-docs-layout]:[grid-area:toc]",
            "2xl:in-[#nd-notebook-layout]:col-start-5 2xl:in-[#nd-notebook-layout]:row-span-full",
            open
              ? "animate-fd-dialog-in 2xl:animate-[ask-ai-open_200ms]"
              : "animate-fd-dialog-out 2xl:animate-[ask-ai-close_200ms]"
          )}
        >
          <div className="flex size-full flex-col p-2 2xl:w-(--ai-chat-width) 2xl:p-3">
            <AISearchPanelHeader />
            <AISearchPanelList className="min-h-0 flex-1" />
            <div className="mt-2 rounded-xl border border-fd-border bg-fd-secondary text-fd-secondary-foreground shadow-sm has-focus-visible:shadow-md">
              <AISearchInput />
            </div>
          </div>
        </div>
      </Presence>
    </>
  )
}

export function AISearchPanelList({
  className,
  style,
  ...props
}: ComponentProps<"div">) {
  const chat = useChatContext()
  const messages = chat.messages.filter(
    (msg: ChatUIMessage) => msg.role !== "system"
  )
  const isLoading = isPublicLynxChatLoading(chat.status)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const bottomSentinelRef = useRef<HTMLDivElement>(null)
  const [showScrollAnchor, setShowScrollAnchor] = useState(false)

  useEffect(() => {
    const root = scrollContainerRef.current
    const sentinel = bottomSentinelRef.current
    if (!root || !sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowScrollAnchor(!entry?.isIntersecting)
      },
      { root, threshold: 0, rootMargin: "80px" }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [messages.length])

  const scrollToBottom = useCallback(() => {
    scrollContainerRef.current?.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [])

  return (
    <MessageList
      messageCount={messages.length}
      onScrollContainer={(el) => {
        scrollContainerRef.current = el
      }}
      className={cn("py-2", className)}
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent, white 1rem, white calc(100% - 1rem), transparent 100%)",
        ...style,
      }}
      {...props}
    >
      {messages.length === 0 ? (
        <SuggestedPrompts />
      ) : (
        <>
          <div className="flex flex-col gap-4 px-3 pb-2">
            {messages.map((item: ChatUIMessage, index: number) => (
              <Message
                key={item.id}
                message={item}
                isStreaming={
                  isLoading &&
                  index === messages.length - 1 &&
                  item.role === "assistant"
                }
              />
            ))}
            {chat.error ? (
              <PublicLynxErrorCard
                error={chat.error}
                onRetry={() => chat.regenerate()}
              />
            ) : null}
            <div
              ref={bottomSentinelRef}
              className="h-px w-full shrink-0"
              aria-hidden
            />
          </div>
          <ScrollToBottomButton
            visible={showScrollAnchor}
            onClick={scrollToBottom}
          />
        </>
      )}
    </MessageList>
  )
}

export function useHotKey() {
  const { open, setOpen } = useAISearchContext()

  const onKeyPress = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      setOpen(false)
      e.preventDefault()
    }
    if (e.key === "/" && (e.metaKey || e.ctrlKey) && !open) {
      setOpen(true)
      e.preventDefault()
      requestAnimationFrame(() => {
        document.getElementById(ASK_LYNX_INPUT_ID)?.focus()
      })
    }
  })

  useEffect(() => {
    window.addEventListener("keydown", onKeyPress)
    return () => window.removeEventListener("keydown", onKeyPress)
  }, [])
}

export function useAISearchContext() {
  const context = useContext(Context)
  if (!context) {
    throw new Error("useAISearchContext must be used within <AISearch>")
  }
  return context
}

function useChatContext() {
  return useAISearchContext().chat
}
