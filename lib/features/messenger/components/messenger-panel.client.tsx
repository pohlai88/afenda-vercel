"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Ably from "ably"
import { MessageCircle, Plus, Send } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "#components2/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#components2/ui/dialog"
import { Input } from "#components2/ui/input"
import { ScrollArea } from "#components2/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "#components2/ui/sheet"
import { Spinner } from "#components2/ui/spinner"
import { Textarea } from "#components2/ui/textarea"
import { cn } from "#lib/utils"
import { uiRadius, uiSurfaceElevation, uiTracking } from "#lib/design-system"

import {
  createMessengerGroupRoomAction,
  listMessengerMessagesAction,
  listMessengerRoomsAction,
  markMessengerRoomReadAction,
  sendMessengerMessageAction,
} from "../actions/messenger.actions"

import type {
  MessengerCreateRoomResult,
  MessengerListMessagesResult,
  MessengerListRoomsResult,
  MessengerMarkReadResult,
  MessengerMessageSummary,
  MessengerRoomSummary,
  MessengerSendMessageResult,
} from "../types"

import { messengerOrgPrivateChannelName } from "../constants"

// ---------------------------------------------------------------------------
// Transport — default uses Server Actions; shell preview may inject mocks.
// ---------------------------------------------------------------------------

export type MessengerPanelTransport = {
  listRooms: () => Promise<MessengerListRoomsResult>
  listMessages: (input: {
    roomId: string
  }) => Promise<MessengerListMessagesResult>
  sendMessage: (input: unknown) => Promise<MessengerSendMessageResult>
  createGroupRoom: (input: unknown) => Promise<MessengerCreateRoomResult>
  markRead: (input: unknown) => Promise<MessengerMarkReadResult>
}

const defaultTransport: MessengerPanelTransport = {
  listRooms: listMessengerRoomsAction,
  listMessages: listMessengerMessagesAction,
  sendMessage: sendMessengerMessageAction,
  createGroupRoom: createMessengerGroupRoomAction,
  markRead: markMessengerRoomReadAction,
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type MessengerPanelProps = {
  organizationId: string | null
  transport?: MessengerPanelTransport
  /** Dev preview: show banner when realtime is stubbed. */
  previewStub?: boolean
  /**
   * Controlled sheet (e.g. App Shell right rail supplies the trigger).
   * When set with {@link onOpenChange}, the built-in trigger is omitted unless
   * {@link hideTrigger} is false.
   */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Omit the default MessageCircle trigger (parent renders the rail control). */
  hideTrigger?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MessengerPanel({
  organizationId,
  transport = defaultTransport,
  previewStub = false,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false,
}: MessengerPanelProps) {
  const t = useTranslations("Dashboard.shell.utilityBar.messenger")
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled =
    typeof controlledOpen === "boolean" &&
    typeof controlledOnOpenChange === "function"
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? controlledOnOpenChange : setInternalOpen
  const [createOpen, setCreateOpen] = useState(false)
  const [rooms, setRooms] = useState<MessengerRoomSummary[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessengerMessageSummary[]>([])
  const [composer, setComposer] = useState("")
  const [newRoomName, setNewRoomName] = useState("")
  const [memberIdsRaw, setMemberIdsRaw] = useState("")
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ablyRef = useRef<Ably.Realtime | null>(null)
  const selectedRoomIdRef = useRef<string | null>(null)

  const useRealtime = Boolean(organizationId) && !previewStub

  const loadRooms = useCallback(async () => {
    if (!organizationId) return
    setLoadingRooms(true)
    setError(null)
    try {
      const res = await transport.listRooms()
      if (!res.ok) {
        setError(res.error)
        return
      }
      setRooms(res.rooms)
      setSelectedRoomId((cur) => {
        if (cur && res.rooms.some((r) => r.id === cur)) return cur
        return res.rooms[0]?.id ?? null
      })
    } finally {
      setLoadingRooms(false)
    }
  }, [organizationId, transport])

  const loadMessages = useCallback(
    async (roomId: string) => {
      setLoadingMessages(true)
      setError(null)
      try {
        const res = await transport.listMessages({ roomId })
        if (!res.ok) {
          setError(res.error)
          return
        }
        setMessages(res.messages)
        await transport.markRead({ roomId })
      } finally {
        setLoadingMessages(false)
      }
    },
    [transport]
  )

  const loadRoomsRef = useRef(loadRooms)
  const loadMessagesRef = useRef(loadMessages)

  useEffect(() => {
    selectedRoomIdRef.current = selectedRoomId
  }, [selectedRoomId])

  useEffect(() => {
    loadRoomsRef.current = loadRooms
    loadMessagesRef.current = loadMessages
  }, [loadRooms, loadMessages])

  /* eslint-disable react-hooks/set-state-in-effect -- server-backed lists refresh when sheet opens */
  useEffect(() => {
    if (!open || !organizationId) return
    void loadRooms()
  }, [open, organizationId, loadRooms])

  useEffect(() => {
    if (!open || !selectedRoomId) {
      setMessages([])
      return
    }
    void loadMessages(selectedRoomId)
  }, [open, selectedRoomId, loadMessages])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!open || !useRealtime || !organizationId) return

    const rt = new Ably.Realtime({
      authCallback: (_tokenParams, callback) => {
        void fetch(
          new URL("/api/erp/messenger/auth", window.location.origin).toString(),
          {
            method: "POST",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({}),
          }
        )
          .then(async (r) => {
            if (!r.ok) throw new Error("auth failed")
            return (await r.json()) as Ably.TokenRequest | Ably.TokenDetails
          })
          .then((data) => {
            callback(null, data)
          })
          .catch((err: unknown) => {
            const message =
              err instanceof Error ? err.message : "Ably auth failed"
            callback(message, null)
          })
      },
    })

    const channel = rt.channels.get(
      messengerOrgPrivateChannelName(organizationId)
    )
    channel.subscribe("messenger", (message) => {
      const data = message.data as { kind?: string; roomId?: string }
      void loadRoomsRef.current()
      if (data?.kind === "message.created" && data.roomId) {
        if (data.roomId === selectedRoomIdRef.current) {
          void loadMessagesRef.current(data.roomId)
        }
      }
    })

    ablyRef.current = rt
    return () => {
      channel.unsubscribe()
      rt.close()
      ablyRef.current = null
    }
  }, [open, useRealtime, organizationId])

  async function handleSend() {
    if (!selectedRoomId || !composer.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await transport.sendMessage({
        roomId: selectedRoomId,
        body: composer,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setComposer("")
      setMessages((prev) => [...prev, res.message])
      await loadRooms()
    } finally {
      setSending(false)
    }
  }

  async function handleCreateRoom() {
    const ids = memberIdsRaw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (!newRoomName.trim() || ids.length === 0) {
      setError(t("errors.createNeedsMembers"))
      return
    }
    setCreating(true)
    setError(null)
    try {
      const res = await transport.createGroupRoom({
        name: newRoomName.trim(),
        memberUserIds: ids,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setCreateOpen(false)
      setNewRoomName("")
      setMemberIdsRaw("")
      await loadRooms()
      setSelectedRoomId(res.roomId)
    } finally {
      setCreating(false)
    }
  }

  const disabled = !organizationId

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        {!hideTrigger ? (
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label={t("trigger")}
              disabled={disabled}
              className={cn(
                "flex size-[28px] shrink-0 items-center justify-center rounded-full",
                "bg-transparent text-muted-foreground ring-1 ring-border/50 transition-colors",
                "hover:bg-muted/55 hover:text-foreground active:bg-muted/75",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:outline-none",
                "data-[state=open]:bg-muted/55 data-[state=open]:text-foreground",
                disabled && "pointer-events-none opacity-40"
              )}
            >
              <span
                aria-hidden
                className="size-[15px] shrink-0 [&>svg]:size-full"
              >
                <MessageCircle strokeWidth={2} />
              </span>
            </button>
          </SheetTrigger>
        ) : null}

        <SheetContent
          side="right"
          className={cn(
            "flex w-full max-w-none flex-col border-l border-border/60 bg-background/96 p-0",
            "supports-[backdrop-filter]:bg-background/72 sm:max-w-3xl"
          )}
        >
          <SheetHeader className="border-b border-border/50 px-4 py-4 text-left sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle>{t("title")}</SheetTitle>
                <SheetDescription>{t("description")}</SheetDescription>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setCreateOpen(true)}
                disabled={disabled}
              >
                <Plus className="size-4" aria-hidden />
                {t("newRoom")}
              </Button>
            </div>
            {previewStub ? (
              <p
                className={cn(
                  "mt-2 text-[11px] text-muted-foreground",
                  uiTracking.control
                )}
              >
                {t("previewStub")}
              </p>
            ) : null}
          </SheetHeader>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 md:grid-cols-[14rem_1fr]">
            <aside className="border-b border-border/50 md:border-r md:border-b-0">
              <div className="border-b border-border/50 px-3 py-2">
                <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                  {t("roomsTitle")}
                </p>
              </div>
              <ScrollArea className="h-[40vh] md:h-[min(70vh,32rem)]">
                <div className="flex flex-col gap-1 p-2">
                  {loadingRooms ? (
                    <div className="flex justify-center py-6">
                      <Spinner className="text-muted-foreground" />
                    </div>
                  ) : rooms.length === 0 ? (
                    <p className="px-2 py-4 text-xs text-muted-foreground">
                      {t("emptyRooms")}
                    </p>
                  ) : (
                    rooms.map((room) => {
                      const active = room.id === selectedRoomId
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => setSelectedRoomId(room.id)}
                          className={cn(
                            "rounded-xl border px-2.5 py-2 text-left text-xs transition-colors",
                            active
                              ? "border-border/70 bg-muted/50 text-foreground"
                              : "border-border/40 bg-card text-card-foreground hover:bg-muted/40"
                          )}
                        >
                          <p className="truncate font-medium">
                            {room.name ?? t("unnamedRoom")}
                          </p>
                          {room.lastMessagePreview ? (
                            <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
                              {room.lastMessagePreview}
                            </p>
                          ) : null}
                        </button>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </aside>

            <section className="flex min-h-0 flex-col">
              {!selectedRoomId ? (
                <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
                  {t("selectRoom")}
                </div>
              ) : (
                <>
                  <ScrollArea className="min-h-0 flex-1 border-b border-border/50">
                    <div className="flex flex-col gap-2 px-4 py-3">
                      {loadingMessages ? (
                        <Spinner className="text-muted-foreground" />
                      ) : messages.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {t("emptyMessages")}
                        </p>
                      ) : (
                        messages.map((m) => (
                          <div
                            key={m.id}
                            className="max-w-[95%] rounded-2xl border border-border/50 bg-muted/30 px-3 py-2 text-xs"
                          >
                            <p className="leading-relaxed whitespace-pre-wrap">
                              {m.body}
                            </p>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {new Date(m.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  <div className="shrink-0 border-t border-border/50 p-3">
                    <div className="flex flex-col gap-2">
                      <Textarea
                        value={composer}
                        onChange={(e) => setComposer(e.target.value)}
                        rows={3}
                        placeholder={t("composerPlaceholder")}
                        className="resize-none text-xs"
                      />
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          disabled={sending || !composer.trim()}
                          onClick={() => void handleSend()}
                        >
                          {sending ? (
                            <Spinner className="size-4" />
                          ) : (
                            <>
                              <Send className="size-3.5" aria-hidden />
                              {t("send")}
                            </>
                          )}
                        </Button>
                      </div>
                      {error ? (
                        <p className="text-xs text-destructive" role="alert">
                          {error}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          className={cn(uiRadius.dialog, uiSurfaceElevation.raised)}
        >
          <DialogHeader>
            <DialogTitle>{t("newRoomTitle")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="space-y-1">
              <label
                className="text-xs font-medium"
                htmlFor="messenger-room-name"
              >
                {t("roomNameLabel")}
              </label>
              <Input
                id="messenger-room-name"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder={t("roomNamePlaceholder")}
              />
            </div>
            <div className="space-y-1">
              <label
                className="text-xs font-medium"
                htmlFor="messenger-member-ids"
              >
                {t("memberIdsLabel")}
              </label>
              <Textarea
                id="messenger-member-ids"
                value={memberIdsRaw}
                onChange={(e) => setMemberIdsRaw(e.target.value)}
                rows={3}
                placeholder={t("memberIdsPlaceholder")}
                className="resize-none text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              disabled={creating || !newRoomName.trim()}
              onClick={() => void handleCreateRoom()}
            >
              {creating ? <Spinner className="size-4" /> : t("createRoom")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
