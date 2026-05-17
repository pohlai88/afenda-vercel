"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import html2canvas from "html2canvas"
import {
  AlertCircle,
  CheckCircle2,
  MessageCircle,
  Paperclip,
  Plus,
  ScanSearch,
} from "lucide-react"
import { upload as uploadBlob } from "@vercel/blob/client"
import { useTranslations } from "next-intl"

import { Badge } from "#components2/ui/badge"
import { Button } from "#components2/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#components2/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#components2/ui/empty"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#components2/ui/field"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "#components2/ui/tooltip"
import type {
  CoordinationActivityCreateInput,
  CoordinationContextDetail,
  CoordinationContextSummary,
  CoordinationEvidenceItem,
  CoordinationEvidenceKind,
  CoordinationOperatorSummary,
} from "#features/coordination"
import { usePathname } from "#i18n/navigation"
import { cn } from "#lib/utils"

/** Matches {@link APP_SHELL_UTILITY_L2_ICON_CLASS} — duplicated to avoid `lib/features` → `#app-shell` imports. */
const COORDINATION_CONSOLE_TRIGGER_CLASS = cn(
  "flex size-[28px] shrink-0 items-center justify-center rounded-full",
  "bg-transparent text-muted-foreground ring-1 ring-border/50 transition-colors",
  "hover:bg-muted/55 hover:text-foreground active:bg-muted/75",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:outline-none"
)

type BlobUploadResult = Awaited<ReturnType<typeof uploadBlob>>

type PendingEvidenceItem = {
  id: string
  kind: CoordinationEvidenceKind
  file: File | Blob
  fileName: string
  contentType: string | null
  fileSize: number | null
}

type OperationalCoordinationConsoleProps = {
  orgId: string
}

type CoordinationContextsResponse = { items: CoordinationContextSummary[] }
type CoordinationOperatorsResponse = { items: CoordinationOperatorSummary[] }

function sanitizeUploadFilename(name: string): string {
  const trimmed = name.trim()
  const replaced = trimmed.replace(/[^a-zA-Z0-9._-]+/g, "-")
  const collapsed = replaced.replace(/-+/g, "-").replace(/^-|-$/g, "")
  return collapsed.length > 0 ? collapsed : "file"
}

function buildCoordinationUploadPath(input: {
  orgId: string
  contextId: string
  kind: CoordinationEvidenceKind
  fileName: string
}): string {
  const safeName = sanitizeUploadFilename(input.fileName)
  return `orgs/${input.orgId}/nexus-coordination/${input.contextId}/${Date.now()}-${input.kind}-${safeName}`
}

function formatDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
  } catch {
    return value
  }
}

async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(body?.error ?? "Request failed")
  }
  return (await response.json()) as T
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })
}

async function waitForDomQuiet(): Promise<void> {
  await waitForNextPaint()
  await waitForNextPaint()
}

function contextButtonTone(unreadCount: number, active: boolean): string {
  if (active) return "border-border/70 bg-background text-foreground"
  if (unreadCount > 0) return "border-info/40 bg-info/5 text-foreground"
  return "border-border/50 bg-card text-card-foreground"
}

/**
 * Operational coordination console launched from the Workbench right rail.
 * Context-first by design: operational object, operators, activity, evidence.
 */
export function OperationalCoordinationConsole({
  orgId,
}: OperationalCoordinationConsoleProps) {
  const t = useTranslations("Dashboard.shell.utilityBar.coordination")
  const pathname = usePathname()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [contexts, setContexts] = useState<CoordinationContextSummary[]>([])
  const [operators, setOperators] = useState<CoordinationOperatorSummary[]>([])
  const [selectedContextId, setSelectedContextId] = useState<string | null>(
    null
  )
  const [detail, setDetail] = useState<CoordinationContextDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [creating, setCreating] = useState(false)
  const [composerBody, setComposerBody] = useState("")
  const [pendingEvidence, setPendingEvidence] = useState<PendingEvidenceItem[]>(
    []
  )
  const [createSubject, setCreateSubject] = useState("")
  const [createBody, setCreateBody] = useState("")
  const [selectedOperatorIds, setSelectedOperatorIds] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const unreadCount = useMemo(
    () => contexts.reduce((sum, item) => sum + item.unreadCount, 0),
    [contexts]
  )

  const availableOperators = operators

  const loadContexts = useCallback(async () => {
    const data = await readJson<CoordinationContextsResponse>(
      "/api/erp/coordination/contexts"
    )
    setContexts(data.items)
    setSelectedContextId((current) => {
      if (current && data.items.some((item) => item.id === current))
        return current
      return data.items[0]?.id ?? null
    })
  }, [])

  const loadOperators = useCallback(async () => {
    const data = await readJson<CoordinationOperatorsResponse>(
      "/api/erp/coordination/operators"
    )
    setOperators(data.items)
  }, [])

  const loadDetail = useCallback(
    async (contextId: string, markRead = false) => {
      setDetailLoading(true)
      try {
        const data = await readJson<CoordinationContextDetail>(
          `/api/erp/coordination/contexts/${contextId}`
        )
        setDetail(data)
        if (markRead) {
          await fetch(`/api/erp/coordination/contexts/${contextId}/read`, {
            method: "POST",
          })
          await loadContexts()
        }
      } finally {
        setDetailLoading(false)
      }
    },
    [loadContexts]
  )

  const refreshAll = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      await Promise.all([loadContexts(), loadOperators()])
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("errors.generic")
      )
    } finally {
      setLoading(false)
    }
  }, [loadContexts, loadOperators, t])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadContexts().catch(() => {})
    }, 0)
    return () => window.clearTimeout(handle)
  }, [loadContexts])

  useEffect(() => {
    if (!open) return
    const handle = window.setTimeout(() => {
      void refreshAll()
    }, 0)
    return () => window.clearTimeout(handle)
  }, [open, refreshAll])

  useEffect(() => {
    if (!open || !selectedContextId) {
      const handle = window.setTimeout(() => setDetail(null), 0)
      return () => window.clearTimeout(handle)
    }
    const handle = window.setTimeout(() => {
      void loadDetail(selectedContextId, true).catch((error) => {
        setErrorMessage(
          error instanceof Error ? error.message : t("errors.generic")
        )
      })
    }, 0)
    return () => window.clearTimeout(handle)
  }, [loadDetail, open, selectedContextId, t])

  useEffect(() => {
    if (!open) return
    const handle = window.setInterval(() => {
      void loadContexts().catch(() => {})
      if (selectedContextId) {
        void loadDetail(selectedContextId, false).catch(() => {})
      }
    }, 30_000)
    return () => window.clearInterval(handle)
  }, [loadContexts, loadDetail, open, selectedContextId])

  function resetCreateForm() {
    setCreateSubject("")
    setCreateBody("")
    setSelectedOperatorIds([])
  }

  function resetComposer() {
    setComposerBody("")
    setPendingEvidence([])
  }

  function toggleOperator(userId: string) {
    setSelectedOperatorIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    )
  }

  async function handleCreateContext() {
    setCreating(true)
    setErrorMessage(null)
    try {
      const response = await readJson<{ contextId: string }>(
        "/api/erp/coordination/contexts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: createSubject,
            operatorUserIds: selectedOperatorIds,
            body: createBody,
          }),
        }
      )
      await loadContexts()
      setSelectedContextId(response.contextId)
      setCreateOpen(false)
      resetCreateForm()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("errors.generic")
      )
    } finally {
      setCreating(false)
    }
  }

  function addPendingFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const nextItems = Array.from(files).map((file) => ({
      id: `${Date.now()}-${file.name}-${Math.random()}`,
      kind: "file" as const,
      file,
      fileName: file.name,
      contentType: file.type || null,
      fileSize: file.size,
    }))
    setPendingEvidence((current) => [...current, ...nextItems])
  }

  async function handleCaptureScreenshot() {
    setErrorMessage(null)
    try {
      await waitForDomQuiet()
      const target = document.querySelector<HTMLElement>(
        '[data-appshell-capture-root="workspace"]'
      )
      if (!target) throw new Error(t("errors.captureTarget"))
      const canvas = await html2canvas(target, {
        backgroundColor: null,
        logging: false,
        scale: Math.min(window.devicePixelRatio || 1, 2),
        useCORS: true,
        ignoreElements(element) {
          return element.hasAttribute("data-nexus-capture-exclude")
        },
      })
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((value) => {
          if (value) resolve(value)
          else reject(new Error(t("errors.captureFailed")))
        }, "image/png")
      })
      const stamp = Date.now()
      setPendingEvidence((current) => [
        ...current,
        {
          id: `screenshot-${stamp}`,
          kind: "screenshot",
          file: blob,
          fileName: `screenshot-${stamp}.png`,
          contentType: "image/png",
          fileSize: blob.size,
        },
      ])
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("errors.captureFailed")
      )
    }
  }

  function removePendingEvidence(id: string) {
    setPendingEvidence((current) => current.filter((item) => item.id !== id))
  }

  async function uploadEvidence(
    context: CoordinationContextDetail["context"],
    items: PendingEvidenceItem[]
  ): Promise<CoordinationEvidenceItem[]> {
    const uploaded: CoordinationEvidenceItem[] = []
    for (const item of items) {
      const result: BlobUploadResult = await uploadBlob(
        buildCoordinationUploadPath({
          orgId,
          contextId: context.id,
          kind: item.kind,
          fileName: item.fileName,
        }),
        item.file,
        {
          access: "public",
          contentType: item.contentType ?? undefined,
          handleUploadUrl: "/api/upload/blob",
          clientPayload: JSON.stringify({
            source: "nexus-utility-messenger",
            contextId: context.id,
            activityDraftId: `draft-${Date.now()}`,
            evidenceKind: item.kind,
            fileName: item.fileName,
            fileSize: item.fileSize,
            mimeType: item.contentType,
            routePath: pathname,
            linkedEntityType: context.linkedEntityType,
            linkedEntityId: context.linkedEntityId,
          }),
        }
      )

      uploaded.push({
        blobPathname: result.pathname,
        url: result.url,
        downloadUrl: result.downloadUrl ?? null,
        contentType: result.contentType ?? item.contentType,
        fileName: item.fileName,
        fileSize: item.fileSize,
        kind: item.kind,
      })
    }
    return uploaded
  }

  async function submitActivity(payload: CoordinationActivityCreateInput) {
    if (!selectedContextId) return
    await readJson(
      `/api/erp/coordination/contexts/${selectedContextId}/activity`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    )
    await loadContexts()
    await loadDetail(selectedContextId, true)
  }

  async function handleSendUpdate() {
    if (!detail) return
    setSending(true)
    setErrorMessage(null)
    try {
      const evidence =
        pendingEvidence.length > 0
          ? await uploadEvidence(detail.context, pendingEvidence)
          : []
      await submitActivity({
        kind:
          composerBody.trim().length === 0 && evidence.length > 0
            ? "evidence_added"
            : "comment",
        body: composerBody,
        evidence,
      })
      resetComposer()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("errors.sendFailed")
      )
    } finally {
      setSending(false)
    }
  }

  async function handleMarkReviewed() {
    if (!detail) return
    setSending(true)
    setErrorMessage(null)
    try {
      await submitActivity({
        kind: "status_note",
        body: t("reviewedNote"),
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("errors.sendFailed")
      )
    } finally {
      setSending(false)
    }
  }

  const flattenedEvidence = useMemo(
    () => detail?.activities.flatMap((activity) => activity.evidence) ?? [],
    [detail]
  )

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label={t("trigger")}
                className={cn(COORDINATION_CONSOLE_TRIGGER_CLASS, "relative")}
              >
                <MessageCircle
                  className="size-[15px] shrink-0"
                  aria-hidden
                  strokeWidth={2}
                />
                {unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-info px-1 text-[10px] font-semibold text-info-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </button>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end" sideOffset={8}>
            {t("tooltip")}
          </TooltipContent>
        </Tooltip>

        <SheetContent
          side="right"
          className="af-nexus-popover-panel w-full max-w-none border-l border-border/60 bg-background/96 p-0 supports-[backdrop-filter]:bg-background/72 sm:max-w-6xl"
        >
          <SheetHeader className="border-b border-border/50 px-surface-lg py-surface-lg text-left sm:px-surface-xl">
            <div className="flex items-start justify-between gap-surface-md">
              <div className="flex min-w-0 flex-col gap-1">
                <SheetTitle>{t("title")}</SheetTitle>
                <SheetDescription>{t("description")}</SheetDescription>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setCreateOpen(true)}
              >
                <Plus data-icon="inline-start" aria-hidden />
                {t("newContext")}
              </Button>
            </div>
          </SheetHeader>

          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[20rem_minmax(0,1fr)]">
            <aside className="border-b border-border/50 lg:border-r lg:border-b-0">
              <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  {t("contextsTitle")}
                </p>
                {loading ? (
                  <Spinner className="text-muted-foreground" aria-hidden />
                ) : null}
              </div>
              <ScrollArea className="max-h-[32vh] lg:h-full lg:max-h-none">
                <div className="flex flex-col gap-2 p-3">
                  {contexts.length > 0 ? (
                    contexts.map((context) => {
                      const active = context.id === selectedContextId
                      return (
                        <button
                          key={context.id}
                          type="button"
                          onClick={() => setSelectedContextId(context.id)}
                          className={cn(
                            "flex flex-col gap-2 rounded-2xl border px-3 py-3 text-left transition-colors",
                            contextButtonTone(context.unreadCount, active)
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {context.subject}
                              </p>
                              {context.linkedEntityLabel ? (
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {context.linkedEntityLabel}
                                </p>
                              ) : null}
                            </div>
                            {context.unreadCount > 0 ? (
                              <Badge variant="info">
                                {context.unreadCount}
                              </Badge>
                            ) : null}
                          </div>
                          {context.latestActivityBody ? (
                            <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                              {context.latestActivityBody}
                            </p>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">
                              {t("contextNoActivity")}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground">
                            {formatDateTime(context.lastActivityAt)}
                          </p>
                        </button>
                      )
                    })
                  ) : (
                    <Empty className="border border-dashed border-border/60 bg-muted/20 px-4 py-8">
                      <EmptyHeader>
                        <EmptyTitle className="text-sm">
                          {t("emptyContexts")}
                        </EmptyTitle>
                      </EmptyHeader>
                    </Empty>
                  )}
                </div>
              </ScrollArea>
            </aside>

            <section className="flex min-h-0 flex-col">
              {detail ? (
                <>
                  <div className="border-b border-border/50 px-4 py-4 sm:px-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-col gap-2">
                        <h3 className="text-base font-medium text-foreground">
                          {detail.context.subject}
                        </h3>
                        {detail.context.linkedEntityLabel ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">
                              {detail.context.linkedEntityType ??
                                t("linkedRecord")}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {detail.context.linkedEntityLabel}
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {t("unlinkedContext")}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {detail.context.linkedEntityPath ? (
                          <Button asChild variant="outline" size="sm">
                            <a href={detail.context.linkedEntityPath}>
                              {t("openLinkedRecord")}
                            </a>
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {t("attachEvidence")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={sending}
                          onClick={handleMarkReviewed}
                        >
                          {t("markReviewed")}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {detail.operators.map((operator) => (
                        <Badge key={operator.userId} variant="outline">
                          {operator.name ?? operator.email}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_18rem]">
                    <div className="flex min-h-0 flex-col">
                      <div className="border-b border-border/50 px-4 py-3 sm:px-6">
                        <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                          {t("activityTitle")}
                        </p>
                      </div>
                      <ScrollArea className="min-h-0 flex-1">
                        <div className="flex min-h-full flex-col px-4 py-4 sm:px-6">
                          {detailLoading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Spinner aria-hidden />
                              {t("loading")}
                            </div>
                          ) : detail.activities.length > 0 ? (
                            <div className="flex flex-col gap-3">
                              {detail.activities.map((activity) => (
                                <article
                                  key={activity.id}
                                  className="rounded-2xl border border-border/60 bg-background/85 p-3"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-foreground">
                                        {activity.author.name ??
                                          activity.author.email}
                                      </p>
                                      <p className="text-[11px] text-muted-foreground">
                                        {formatDateTime(activity.createdAt)}
                                      </p>
                                    </div>
                                    <Badge variant="secondary">
                                      {t(`activityKinds.${activity.kind}`)}
                                    </Badge>
                                  </div>
                                  {activity.body ? (
                                    <p className="mt-3 text-sm leading-relaxed text-foreground">
                                      {activity.body}
                                    </p>
                                  ) : null}
                                  {activity.evidence.length > 0 ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {activity.evidence.map((item) => (
                                        <Button
                                          key={`${activity.id}-${item.blobPathname}`}
                                          asChild
                                          variant="outline"
                                          size="sm"
                                        >
                                          <a
                                            href={item.downloadUrl ?? item.url}
                                            target="_blank"
                                            rel="noreferrer"
                                          >
                                            {item.fileName}
                                          </a>
                                        </Button>
                                      ))}
                                    </div>
                                  ) : null}
                                </article>
                              ))}
                            </div>
                          ) : (
                            <Empty className="border border-dashed border-border/60 bg-muted/20 px-4 py-8">
                              <EmptyHeader>
                                <EmptyTitle className="text-sm">
                                  {t("emptyActivity")}
                                </EmptyTitle>
                              </EmptyHeader>
                            </Empty>
                          )}
                        </div>
                      </ScrollArea>

                      <div className="border-t border-border/50 px-4 py-4 sm:px-6">
                        <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/85 p-4">
                          <FieldGroup>
                            <Field>
                              <FieldLabel htmlFor="coordination-composer">
                                {t("composerLabel")}
                              </FieldLabel>
                              <FieldContent>
                                <Textarea
                                  id="coordination-composer"
                                  value={composerBody}
                                  onChange={(event) =>
                                    setComposerBody(event.target.value)
                                  }
                                  rows={4}
                                  placeholder={t("composerPlaceholder")}
                                />
                              </FieldContent>
                            </Field>
                          </FieldGroup>

                          {pendingEvidence.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {pendingEvidence.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => removePendingEvidence(item.id)}
                                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-xs text-foreground"
                                >
                                  <Paperclip className="size-3" aria-hidden />
                                  <span>{item.fileName}</span>
                                  <span className="text-muted-foreground">
                                    ×
                                  </span>
                                </button>
                              ))}
                            </div>
                          ) : null}

                          <input
                            ref={fileInputRef}
                            type="file"
                            className="sr-only"
                            multiple
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            onChange={(event) => {
                              addPendingFiles(event.target.files)
                              event.currentTarget.value = ""
                            }}
                          />

                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Paperclip data-icon="inline-start" aria-hidden />
                              {t("attachFile")}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleCaptureScreenshot}
                            >
                              <ScanSearch
                                data-icon="inline-start"
                                aria-hidden
                              />
                              {t("attachScreenshot")}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={
                                sending ||
                                (composerBody.trim().length === 0 &&
                                  pendingEvidence.length === 0)
                              }
                              onClick={handleSendUpdate}
                            >
                              {sending ? (
                                <>
                                  <Spinner aria-hidden />
                                  {t("sending")}
                                </>
                              ) : (
                                t("sendUpdate")
                              )}
                            </Button>
                          </div>

                          {errorMessage ? (
                            <p
                              className="text-xs text-destructive"
                              role="alert"
                            >
                              {errorMessage}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <aside className="border-t border-border/50 xl:border-t-0 xl:border-l">
                      <div className="border-b border-border/50 px-4 py-3">
                        <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                          {t("evidenceTitle")}
                        </p>
                      </div>
                      <ScrollArea className="max-h-[18rem] xl:h-full xl:max-h-none">
                        <div className="flex flex-col gap-2 p-4">
                          {flattenedEvidence.length > 0 ? (
                            flattenedEvidence.map((item) => (
                              <div
                                key={item.blobPathname}
                                className="rounded-2xl border border-border/60 bg-background/85 p-3"
                              >
                                <p className="truncate text-sm font-medium text-foreground">
                                  {item.fileName}
                                </p>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  {t(`evidenceKinds.${item.kind}`)}
                                </p>
                                <div className="mt-3">
                                  <Button asChild variant="outline" size="sm">
                                    <a
                                      href={item.downloadUrl ?? item.url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      {t("openEvidence")}
                                    </a>
                                  </Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <Empty className="border border-dashed border-border/60 bg-muted/20 px-4 py-8">
                              <EmptyHeader>
                                <EmptyTitle className="text-sm">
                                  {t("emptyEvidence")}
                                </EmptyTitle>
                              </EmptyHeader>
                            </Empty>
                          )}
                        </div>
                      </ScrollArea>
                    </aside>
                  </div>
                </>
              ) : (
                <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-10">
                  <Empty className="max-w-md border border-dashed border-border/60 bg-muted/20 p-6">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <AlertCircle aria-hidden />
                      </EmptyMedia>
                      <EmptyDescription>
                        {contexts.length > 0
                          ? t("selectContext")
                          : t("emptyContexts")}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </div>
              )}
            </section>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("newContextTitle")}</DialogTitle>
            <DialogDescription>{t("newContextDescription")}</DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="coordination-subject">
                {t("subjectLabel")}
              </FieldLabel>
              <FieldContent>
                <Input
                  id="coordination-subject"
                  value={createSubject}
                  onChange={(event) => setCreateSubject(event.target.value)}
                  placeholder={t("subjectPlaceholder")}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="coordination-start-note">
                {t("startNoteLabel")}
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id="coordination-start-note"
                  value={createBody}
                  onChange={(event) => setCreateBody(event.target.value)}
                  rows={3}
                  placeholder={t("startNotePlaceholder")}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>{t("operatorsLabel")}</FieldLabel>
              <FieldContent>
                <ScrollArea className="max-h-56 rounded-2xl border border-border/60">
                  <div className="flex flex-col gap-2 p-3">
                    {availableOperators.length > 0 ? (
                      availableOperators.map((operator) => {
                        const selected = selectedOperatorIds.includes(
                          operator.userId
                        )
                        return (
                          <button
                            key={operator.userId}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => toggleOperator(operator.userId)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors",
                              selected
                                ? "border-foreground bg-foreground text-background"
                                : "border-border/60 bg-background text-foreground"
                            )}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {operator.name ?? operator.email}
                              </p>
                              <p className="truncate text-[11px] opacity-80">
                                {operator.email}
                              </p>
                            </div>
                            {selected ? (
                              <CheckCircle2
                                className="size-4 shrink-0"
                                aria-hidden
                              />
                            ) : null}
                          </button>
                        )
                      })
                    ) : (
                      <Empty className="border-0 px-2 py-6">
                        <EmptyHeader>
                          <EmptyDescription>
                            {t("noOperators")}
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    )}
                  </div>
                </ScrollArea>
              </FieldContent>
            </Field>

            <FieldError role="alert">{errorMessage}</FieldError>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateOpen(false)
                resetCreateForm()
              }}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              disabled={creating || selectedOperatorIds.length === 0}
              onClick={handleCreateContext}
            >
              {creating ? (
                <>
                  <Spinner aria-hidden />
                  {t("creating")}
                </>
              ) : (
                t("createContext")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export { buildCoordinationUploadPath }
