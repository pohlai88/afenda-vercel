"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Bell, CheckCheck, Plus, X } from "lucide-react"
import { useTranslations } from "next-intl"

import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#components/ui/empty"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "#components/ui/field"
import { Input } from "#components/ui/input"
import { NativeSelect, NativeSelectOption } from "#components/ui/native-select"
import { ScrollArea } from "#components/ui/scroll-area"
import { Separator } from "#components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "#components/ui/sheet"
import { Spinner } from "#components/ui/spinner"
import { Textarea } from "#components/ui/textarea"
import { Link } from "#i18n/navigation"
import type {
  OrgNotificationNotice,
  OrgNotificationSeverity,
} from "#features/org-notifications"
import { describeOrgNotificationBadge } from "#features/org-notifications"
import { cn } from "#lib/utils"

import { WORKBENCH_UTILITY_ROUND_CONTROL_CLASS } from "./workbench-utility-round-control-class"
import { WorkbenchUtilityTriggerTooltip } from "./workbench-utility-trigger-tooltip"

type NexusUtilityNotificationsProps = {
  canManage: boolean
}

type NotificationsResponse = {
  items: OrgNotificationNotice[]
}

type CreateNoticeFormState = {
  title: string
  body: string
  severity: OrgNotificationSeverity
  expiresAt: string
  linkedEntityLabel: string
  linkedPath: string
}

const EMPTY_CREATE_FORM: CreateNoticeFormState = {
  title: "",
  body: "",
  severity: "info",
  expiresAt: "",
  linkedEntityLabel: "",
  linkedPath: "",
}

function formatDateTime(value: string | null): string {
  if (!value) return "—"
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
  } catch {
    return value
  }
}

function severityBadgeVariant(
  severity: OrgNotificationSeverity
): "info" | "warning" | "critical" {
  switch (severity) {
    case "critical":
      return "critical"
    case "warning":
      return "warning"
    default:
      return "info"
  }
}

function noticeListTone(input: { active: boolean; unread: boolean }): string {
  if (input.active) {
    return "border-border/70 bg-background text-foreground"
  }
  if (input.unread) {
    return "border-info/40 bg-info/5 text-foreground"
  }
  return "border-border/50 bg-card text-card-foreground"
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

export function WorkbenchUtilityNotifications({
  canManage,
}: NexusUtilityNotificationsProps) {
  const t = useTranslations("Dashboard.shell.utilityBar.notifications")
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [items, setItems] = useState<OrgNotificationNotice[]>([])
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null)
  const [busyNoticeId, setBusyNoticeId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateNoticeFormState>(EMPTY_CREATE_FORM)

  const unreadCount = useMemo(
    () => items.filter((item) => !item.isRead).length,
    [items]
  )

  const selectedNotice = useMemo(
    () => items.find((item) => item.id === selectedNoticeId) ?? null,
    [items, selectedNoticeId]
  )
  const selectedNoticeDisplayBadge = useMemo(
    () =>
      selectedNotice ? describeOrgNotificationBadge(selectedNotice) : null,
    [selectedNotice]
  )

  const loadNotifications = useCallback(async () => {
    const data = await readJson<NotificationsResponse>("/api/erp/notifications")
    setItems(data.items)
    setSelectedNoticeId((current) => {
      if (current && data.items.some((item) => item.id === current)) {
        return current
      }
      return data.items[0]?.id ?? null
    })
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadNotifications().catch(() => {})
    }, 0)
    return () => window.clearTimeout(handle)
  }, [loadNotifications])

  useEffect(() => {
    if (!open) return
    const handle = window.setTimeout(() => {
      setLoading(true)
      setErrorMessage(null)
      void loadNotifications()
        .catch((error) => {
          setErrorMessage(
            error instanceof Error ? error.message : t("errors.generic")
          )
        })
        .finally(() => setLoading(false))
    }, 0)
    return () => window.clearTimeout(handle)
  }, [loadNotifications, open, t])

  useEffect(() => {
    if (!open) return
    const handle = window.setInterval(() => {
      void loadNotifications().catch(() => {})
    }, 60_000)
    return () => window.clearInterval(handle)
  }, [loadNotifications, open])

  function updateForm<K extends keyof CreateNoticeFormState>(
    key: K,
    value: CreateNoticeFormState[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function runNoticeMutation(path: string) {
    await readJson<{ ok: true }>(path, { method: "POST" })
    await loadNotifications()
  }

  async function handleRead(noticeId: string) {
    setBusyNoticeId(noticeId)
    setErrorMessage(null)
    try {
      await runNoticeMutation(`/api/erp/notifications/${noticeId}/read`)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("errors.generic")
      )
    } finally {
      setBusyNoticeId(null)
    }
  }

  async function handleAcknowledge(noticeId: string) {
    setBusyNoticeId(noticeId)
    setErrorMessage(null)
    try {
      await runNoticeMutation(`/api/erp/notifications/${noticeId}/acknowledge`)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("errors.generic")
      )
    } finally {
      setBusyNoticeId(null)
    }
  }

  async function handleClose(noticeId: string) {
    setBusyNoticeId(noticeId)
    setErrorMessage(null)
    try {
      await runNoticeMutation(`/api/erp/notifications/${noticeId}/close`)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("errors.generic")
      )
    } finally {
      setBusyNoticeId(null)
    }
  }

  async function handleCreateNotice() {
    setSubmitting(true)
    setCreateError(null)
    try {
      await readJson<{ noticeId: string }>("/api/erp/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          body: form.body,
          severity: form.severity,
          expiresAt: form.expiresAt || null,
          linkedEntityLabel: form.linkedEntityLabel || null,
          linkedPath: form.linkedPath || null,
        }),
      })
      await loadNotifications()
      setCreateOpen(false)
      setForm(EMPTY_CREATE_FORM)
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : t("errors.createFailed")
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <WorkbenchUtilityTriggerTooltip tooltip={t("tooltip")} align="end">
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label={
                unreadCount > 0
                  ? t("triggerUnread", { count: unreadCount })
                  : t("trigger")
              }
              className={cn(WORKBENCH_UTILITY_ROUND_CONTROL_CLASS, "relative")}
            >
              <Bell
                className="size-[15px] shrink-0"
                aria-hidden
                strokeWidth={2}
              />
              {unreadCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-info px-1 text-[10px] leading-4 font-semibold text-info-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </button>
          </SheetTrigger>
        </WorkbenchUtilityTriggerTooltip>

        <SheetContent
          side="right"
          className="af-nexus-popover-panel flex w-full flex-col border-l border-border/60 bg-background/96 p-0 supports-[backdrop-filter]:bg-background/80 sm:max-w-5xl"
        >
          <SheetHeader className="border-b border-border/50 px-5 py-4 text-left">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-1">
                <SheetTitle>{t("title")}</SheetTitle>
                <SheetDescription>{t("description")}</SheetDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {t("unreadCount", { count: unreadCount })}
                </Badge>
                {canManage ? (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus data-icon="inline-start" aria-hidden />
                    {t("newNotice")}
                  </Button>
                ) : null}
              </div>
            </div>
          </SheetHeader>

          {errorMessage ? (
            <div className="border-b border-border/50 px-5 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[20rem_minmax(0,1fr)]">
            <div className="min-h-0 border-b border-border/50 lg:border-r lg:border-b-0">
              <div className="flex h-full min-h-0 flex-col">
                <div className="border-b border-border/40 px-4 py-3 text-xs font-medium text-muted-foreground">
                  {t("activeNotices")}
                </div>
                {loading && items.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center px-4 py-10 text-sm text-muted-foreground">
                    <Spinner className="mr-2" aria-hidden />
                    {t("loading")}
                  </div>
                ) : items.length === 0 ? (
                  <div className="p-4">
                    <Empty className="border border-dashed border-border/60 bg-muted/20 px-6 py-10">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Bell aria-hidden strokeWidth={1.5} />
                        </EmptyMedia>
                        <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
                        <EmptyDescription>
                          {t("emptyDescription")}
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </div>
                ) : (
                  <ScrollArea className="min-h-0 flex-1">
                    <ul className="flex min-h-full flex-col gap-2 p-3">
                      {items.map((item) => {
                        const displayBadge = describeOrgNotificationBadge(item)

                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedNoticeId(item.id)}
                              className={cn(
                                "w-full rounded-2xl border p-3 text-left transition-colors",
                                noticeListTone({
                                  active: item.id === selectedNoticeId,
                                  unread: !item.isRead,
                                })
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 flex-col gap-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge
                                      variant={severityBadgeVariant(
                                        item.severity
                                      )}
                                    >
                                      {t(`severity.${item.severity}`)}
                                    </Badge>
                                    {displayBadge ? (
                                      <Badge
                                        variant={severityBadgeVariant(
                                          displayBadge.tone
                                        )}
                                      >
                                        {displayBadge.label}
                                      </Badge>
                                    ) : null}
                                    {!item.isAcknowledged ? (
                                      <Badge variant="outline">
                                        {item.isRead
                                          ? t("state.read")
                                          : t("state.unread")}
                                      </Badge>
                                    ) : (
                                      <Badge variant="success">
                                        {t("state.acknowledged")}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="truncate text-sm font-medium text-foreground">
                                    {item.title}
                                  </p>
                                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                    {item.body}
                                  </p>
                                  {item.linkedEntityLabel ? (
                                    <p className="truncate text-[11px] text-muted-foreground">
                                      {item.linkedEntityLabel}
                                    </p>
                                  ) : null}
                                </div>
                                {!item.isRead ? (
                                  <span className="mt-1 size-2.5 shrink-0 rounded-full bg-info" />
                                ) : null}
                              </div>
                              <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                                <span>{t(`source.${item.source}`)}</span>
                                <span>{formatDateTime(item.publishedAt)}</span>
                              </div>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </ScrollArea>
                )}
              </div>
            </div>

            <ScrollArea className="min-h-0">
              <div className="flex min-h-full flex-col p-4 lg:p-5">
                {selectedNotice ? (
                  <div className="flex min-h-full flex-col gap-5">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={severityBadgeVariant(
                            selectedNotice.severity
                          )}
                        >
                          {t(`severity.${selectedNotice.severity}`)}
                        </Badge>
                        {selectedNoticeDisplayBadge ? (
                          <Badge
                            variant={severityBadgeVariant(
                              selectedNoticeDisplayBadge.tone
                            )}
                          >
                            {selectedNoticeDisplayBadge.label}
                          </Badge>
                        ) : null}
                        <Badge variant="secondary">
                          {t(`source.${selectedNotice.source}`)}
                        </Badge>
                        {selectedNotice.isAcknowledged ? (
                          <Badge variant="success">
                            {t("state.acknowledged")}
                          </Badge>
                        ) : selectedNotice.isRead ? (
                          <Badge variant="outline">{t("state.read")}</Badge>
                        ) : (
                          <Badge variant="info">{t("state.unread")}</Badge>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {selectedNotice.title}
                        </h3>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                          {selectedNotice.body}
                        </p>
                      </div>

                      <dl className="grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            {t("publishedAt")}
                          </dt>
                          <dd className="mt-1 text-foreground">
                            {formatDateTime(selectedNotice.publishedAt)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            {t("expiresAt")}
                          </dt>
                          <dd className="mt-1 text-foreground">
                            {formatDateTime(selectedNotice.expiresAt)}
                          </dd>
                        </div>
                        {selectedNotice.linkedEntityLabel ? (
                          <div className="sm:col-span-2">
                            <dt className="text-xs text-muted-foreground">
                              {t("linkedRecord")}
                            </dt>
                            <dd className="mt-1 text-foreground">
                              {selectedNotice.linkedEntityLabel}
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>

                    <Separator />

                    <div className="mt-auto flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={
                          selectedNotice.isRead ||
                          busyNoticeId === selectedNotice.id
                        }
                        onClick={() => void handleRead(selectedNotice.id)}
                      >
                        {busyNoticeId === selectedNotice.id ? (
                          <Spinner aria-hidden />
                        ) : null}
                        {t("markRead")}
                      </Button>
                      <Button
                        type="button"
                        disabled={
                          selectedNotice.isAcknowledged ||
                          busyNoticeId === selectedNotice.id
                        }
                        onClick={() =>
                          void handleAcknowledge(selectedNotice.id)
                        }
                      >
                        {busyNoticeId === selectedNotice.id ? (
                          <Spinner aria-hidden />
                        ) : (
                          <CheckCheck data-icon="inline-start" aria-hidden />
                        )}
                        {t("acknowledge")}
                      </Button>
                      {selectedNotice.linkedPath &&
                      selectedNotice.linkedEntityLabel ? (
                        <Button asChild variant="secondary">
                          <Link href={selectedNotice.linkedPath}>
                            {`${t("openLinkedRecord")} · ${selectedNotice.linkedEntityLabel}`}
                          </Link>
                        </Button>
                      ) : null}
                      {canManage ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busyNoticeId === selectedNotice.id}
                          onClick={() => void handleClose(selectedNotice.id)}
                        >
                          {busyNoticeId === selectedNotice.id ? (
                            <Spinner aria-hidden />
                          ) : (
                            <X data-icon="inline-start" aria-hidden />
                          )}
                          {t("closeNotice")}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <Empty className="h-full border border-dashed border-border/60 bg-muted/20 px-6 py-10">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Bell aria-hidden strokeWidth={1.5} />
                      </EmptyMedia>
                      <EmptyTitle>{t("detailEmptyTitle")}</EmptyTitle>
                      <EmptyDescription>
                        {t("detailEmptyDescription")}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={createOpen}
        onOpenChange={(nextOpen) => {
          setCreateOpen(nextOpen)
          if (!nextOpen) {
            setCreateError(null)
            setForm(EMPTY_CREATE_FORM)
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("createTitle")}</DialogTitle>
            <DialogDescription>{t("createDescription")}</DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-2">
            <Field>
              <FieldLabel htmlFor="notification-title">
                {t("fields.title")}
              </FieldLabel>
              <FieldContent>
                <Input
                  id="notification-title"
                  value={form.title}
                  onChange={(event) => updateForm("title", event.target.value)}
                  maxLength={160}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="notification-body">
                {t("fields.body")}
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id="notification-body"
                  value={form.body}
                  onChange={(event) => updateForm("body", event.target.value)}
                  rows={5}
                  maxLength={4000}
                />
              </FieldContent>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="notification-severity">
                  {t("fields.severity")}
                </FieldLabel>
                <FieldContent>
                  <NativeSelect
                    id="notification-severity"
                    value={form.severity}
                    onChange={(event) =>
                      updateForm(
                        "severity",
                        event.target.value as OrgNotificationSeverity
                      )
                    }
                    className="w-full"
                  >
                    <NativeSelectOption value="info">
                      {t("severity.info")}
                    </NativeSelectOption>
                    <NativeSelectOption value="warning">
                      {t("severity.warning")}
                    </NativeSelectOption>
                    <NativeSelectOption value="critical">
                      {t("severity.critical")}
                    </NativeSelectOption>
                  </NativeSelect>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="notification-expiry">
                  {t("fields.expiresAt")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="notification-expiry"
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={(event) =>
                      updateForm("expiresAt", event.target.value)
                    }
                  />
                </FieldContent>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="notification-linked-label">
                  {t("fields.linkedLabel")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="notification-linked-label"
                    value={form.linkedEntityLabel}
                    onChange={(event) =>
                      updateForm("linkedEntityLabel", event.target.value)
                    }
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="notification-linked-path">
                  {t("fields.linkedPath")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="notification-linked-path"
                    value={form.linkedPath}
                    onChange={(event) =>
                      updateForm("linkedPath", event.target.value)
                    }
                  />
                </FieldContent>
              </Field>
            </div>

            <FieldError role="alert">{createError}</FieldError>
          </FieldGroup>

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
              disabled={submitting}
              onClick={() => void handleCreateNotice()}
            >
              {submitting ? <Spinner aria-hidden /> : null}
              {t("publish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
