"use client"

import { Bell, CheckCheck, Plus, X } from "lucide-react"
import { useTranslations } from "next-intl"

import { Alert, AlertDescription } from "#components/ui/alert"
import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
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
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemTitle,
} from "#components/ui/item"
import { ScrollArea } from "#components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "#components/ui/sheet"
import { Separator } from "#components/ui/separator"
import { Spinner } from "#components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "#components/ui/tabs"
import { Textarea } from "#components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "#components/ui/toggle-group"
import { Link } from "#i18n/navigation"
import type {
  OrgNotificationNotice,
  OrgNotificationSeverity,
} from "#features/org-notifications"
import { describeOrgNotificationBadge } from "#features/org-notifications"
import { cn } from "#lib/utils"

import { WORKBENCH_UTILITY_ROUND_CONTROL_CLASS } from "../workbench-utility-round-control-class"
import { WorkbenchUtilityTriggerTooltip } from "./workbench-utility-trigger-tooltip"

export type NoticeFilter = "all" | "unread" | "acknowledged" | "critical"

export type CreateNoticeFormState = {
  title: string
  body: string
  severity: OrgNotificationSeverity
  expiresAt: string
  linkedEntityLabel: string
  linkedPath: string
}

export type WorkbenchNotificationsAdvancedBlockProps = {
  canManage: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  createOpen: boolean
  onCreateOpenChange: (open: boolean) => void
  loading: boolean
  noticeFilter: NoticeFilter
  onNoticeFilter: (filter: NoticeFilter) => void
  errorMessage: string | null
  createError: string | null
  items: OrgNotificationNotice[]
  filteredItems: OrgNotificationNotice[]
  unreadCount: number
  acknowledgedCount: number
  criticalCount: number
  selectedNoticeId: string | null
  onSelectNoticeId: (id: string) => void
  selectedNotice: OrgNotificationNotice | null
  selectedNoticeDisplayBadge: ReturnType<
    typeof describeOrgNotificationBadge
  > | null
  busyNoticeId: string | null
  form: CreateNoticeFormState
  onFormUpdate: <K extends keyof CreateNoticeFormState>(
    key: K,
    value: CreateNoticeFormState[K]
  ) => void
  submitting: boolean
  onRead: (noticeId: string) => void | Promise<void>
  onAcknowledge: (noticeId: string) => void | Promise<void>
  onClose: (noticeId: string) => void | Promise<void>
  onCreateNotice: () => void | Promise<void>
}

const NOTICE_SEVERITIES = ["info", "warning", "critical"] as const

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
    return "border-border bg-background text-foreground shadow-xs"
  }
  if (input.unread) {
    return "border-info/40 bg-info/5 text-foreground"
  }
  return "border-border/60 bg-card text-card-foreground"
}

export function WorkbenchNotificationsAdvancedBlock({
  canManage,
  open,
  onOpenChange,
  createOpen,
  onCreateOpenChange,
  loading,
  noticeFilter,
  onNoticeFilter,
  errorMessage,
  createError,
  items,
  filteredItems,
  unreadCount,
  acknowledgedCount,
  criticalCount,
  selectedNoticeId,
  onSelectNoticeId,
  selectedNotice,
  selectedNoticeDisplayBadge,
  busyNoticeId,
  form,
  onFormUpdate,
  submitting,
  onRead,
  onAcknowledge,
  onClose,
  onCreateNotice,
}: WorkbenchNotificationsAdvancedBlockProps) {
  const t = useTranslations("Dashboard.shell.utilityBar.notifications")

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
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
          className="flex h-dvh w-full max-w-full flex-col overflow-hidden border-l bg-background p-0 sm:max-w-5xl"
        >
          <SheetHeader className="px-5 py-4 text-left">
            <div className="flex min-w-0 flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <SheetTitle>{t("title")}</SheetTitle>
                  <SheetDescription>{t("description")}</SheetDescription>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">
                    {t("unreadCount", { count: unreadCount })}
                  </Badge>
                  {canManage ? (
                    <Button size="sm" onClick={() => onCreateOpenChange(true)}>
                      <Plus data-icon="inline-start" aria-hidden />
                      {t("newNotice")}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card size="sm" className="shadow-none">
                  <CardHeader>
                    <CardDescription>{t("activeNotices")}</CardDescription>
                    <CardTitle>{items.length}</CardTitle>
                  </CardHeader>
                </Card>
                <Card size="sm" className="shadow-none">
                  <CardHeader>
                    <CardDescription>{t("state.unread")}</CardDescription>
                    <CardTitle>{unreadCount}</CardTitle>
                  </CardHeader>
                </Card>
                <Card size="sm" className="shadow-none">
                  <CardHeader>
                    <CardDescription>{t("state.acknowledged")}</CardDescription>
                    <CardTitle>{acknowledgedCount}</CardTitle>
                  </CardHeader>
                </Card>
                <Card size="sm" className="shadow-none">
                  <CardHeader>
                    <CardDescription>{t("severity.critical")}</CardDescription>
                    <CardTitle>{criticalCount}</CardTitle>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </SheetHeader>

          <Separator className="shrink-0" />

          {errorMessage ? (
            <Alert variant="destructive" className="rounded-none border-x-0">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid min-h-0 min-w-0 flex-1 overflow-hidden lg:grid-cols-[21rem_minmax(0,1fr)]">
            <div className="min-h-0 min-w-0 overflow-hidden border-b border-border/50 lg:border-r lg:border-b-0">
              <div className="flex h-full min-h-0 flex-col">
                <Tabs
                  value={noticeFilter}
                  onValueChange={(value) =>
                    onNoticeFilter(value as NoticeFilter)
                  }
                  className="border-b border-border/40 px-3 py-3"
                >
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="all">{t("activeNotices")}</TabsTrigger>
                    <TabsTrigger value="unread">
                      {t("state.unread")}
                    </TabsTrigger>
                    <TabsTrigger value="acknowledged">
                      {t("state.acknowledged")}
                    </TabsTrigger>
                    <TabsTrigger value="critical">
                      {t("severity.critical")}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                {loading && items.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground">
                    <Spinner aria-hidden />
                    {t("loading")}
                  </div>
                ) : filteredItems.length === 0 ? (
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
                  <ScrollArea className="h-full min-h-0 flex-1 overflow-hidden">
                    <ul className="flex min-h-full flex-col gap-2 p-3">
                      {filteredItems.map((item) => {
                        const displayBadge = describeOrgNotificationBadge(item)

                        return (
                          <li key={item.id}>
                            <Item
                              asChild
                              variant="outline"
                              size="sm"
                              className={cn(
                                "items-start",
                                noticeListTone({
                                  active: item.id === selectedNoticeId,
                                  unread: !item.isRead,
                                })
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => onSelectNoticeId(item.id)}
                              >
                                <ItemContent className="min-w-0">
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
                                  <ItemTitle className="w-full truncate text-foreground">
                                    {item.title}
                                  </ItemTitle>
                                  <ItemDescription className="text-xs leading-relaxed">
                                    {item.body}
                                  </ItemDescription>
                                  {item.linkedEntityLabel ? (
                                    <p className="truncate text-[11px] text-muted-foreground">
                                      {item.linkedEntityLabel}
                                    </p>
                                  ) : null}
                                </ItemContent>
                                {!item.isRead ? (
                                  <span className="mt-1 size-2.5 shrink-0 rounded-full bg-info" />
                                ) : null}
                                <ItemFooter className="text-[11px] text-muted-foreground">
                                  <span>{t(`source.${item.source}`)}</span>
                                  <span>
                                    {formatDateTime(item.publishedAt)}
                                  </span>
                                </ItemFooter>
                              </button>
                            </Item>
                          </li>
                        )
                      })}
                    </ul>
                  </ScrollArea>
                )}
              </div>
            </div>

            <ScrollArea className="h-full min-h-0 min-w-0 overflow-hidden">
              <div className="flex min-h-full flex-col p-4 lg:p-5">
                {selectedNotice ? (
                  <Card className="min-h-full shadow-none">
                    <CardHeader className="border-b border-border/50">
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

                      <CardTitle className="text-lg">
                        {selectedNotice.title}
                      </CardTitle>
                      <CardDescription className="leading-relaxed whitespace-pre-wrap">
                        {selectedNotice.body}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-1 flex-col gap-5 pt-5">
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
                    </CardContent>

                    <CardFooter className="mt-auto flex-wrap gap-2 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={
                          selectedNotice.isRead ||
                          busyNoticeId === selectedNotice.id
                        }
                        onClick={() => void onRead(selectedNotice.id)}
                      >
                        {busyNoticeId === selectedNotice.id ? (
                          <Spinner data-icon="inline-start" aria-hidden />
                        ) : null}
                        {t("markRead")}
                      </Button>
                      <Button
                        type="button"
                        disabled={
                          selectedNotice.isAcknowledged ||
                          busyNoticeId === selectedNotice.id
                        }
                        onClick={() => void onAcknowledge(selectedNotice.id)}
                      >
                        {busyNoticeId === selectedNotice.id ? (
                          <Spinner data-icon="inline-start" aria-hidden />
                        ) : (
                          <CheckCheck data-icon="inline-start" aria-hidden />
                        )}
                        {t("acknowledge")}
                      </Button>
                      {selectedNotice.linkedPath &&
                      selectedNotice.linkedEntityLabel ? (
                        <Button
                          asChild
                          variant="secondary"
                          className="max-w-full"
                        >
                          <Link
                            href={selectedNotice.linkedPath}
                            aria-label={t("openLinkedRecord")}
                            className="min-w-0 truncate"
                          >
                            {`${t("openLinkedRecord")} · ${selectedNotice.linkedEntityLabel}`}
                          </Link>
                        </Button>
                      ) : null}
                      {canManage ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busyNoticeId === selectedNotice.id}
                          onClick={() => void onClose(selectedNotice.id)}
                        >
                          {busyNoticeId === selectedNotice.id ? (
                            <Spinner data-icon="inline-start" aria-hidden />
                          ) : (
                            <X data-icon="inline-start" aria-hidden />
                          )}
                          {t("closeNotice")}
                        </Button>
                      ) : null}
                    </CardFooter>
                  </Card>
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
          onCreateOpenChange(nextOpen)
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("createTitle")}</DialogTitle>
            <DialogDescription>{t("createDescription")}</DialogDescription>
          </DialogHeader>

          <FieldGroup className="grid gap-4 py-2 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="notification-title">
                {t("fields.title")}
              </FieldLabel>
              <FieldContent>
                <Input
                  id="notification-title"
                  value={form.title}
                  onChange={(event) =>
                    onFormUpdate("title", event.target.value)
                  }
                  maxLength={160}
                />
              </FieldContent>
            </Field>

            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="notification-body">
                {t("fields.body")}
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id="notification-body"
                  value={form.body}
                  onChange={(event) => onFormUpdate("body", event.target.value)}
                  rows={5}
                  maxLength={4000}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>{t("fields.severity")}</FieldLabel>
              <FieldContent>
                <ToggleGroup
                  type="single"
                  value={form.severity}
                  onValueChange={(value) => {
                    if (value) {
                      onFormUpdate("severity", value as OrgNotificationSeverity)
                    }
                  }}
                  variant="outline"
                  size="sm"
                  spacing={1}
                  className="flex-wrap justify-start"
                  aria-label={t("fields.severity")}
                >
                  {NOTICE_SEVERITIES.map((severity) => (
                    <ToggleGroupItem
                      key={severity}
                      value={severity}
                      className="h-8 rounded-full px-3 text-xs"
                    >
                      {t(`severity.${severity}`)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
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
                    onFormUpdate("expiresAt", event.target.value)
                  }
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="notification-linked-label">
                {t("fields.linkedLabel")}
              </FieldLabel>
              <FieldContent>
                <Input
                  id="notification-linked-label"
                  value={form.linkedEntityLabel}
                  onChange={(event) =>
                    onFormUpdate("linkedEntityLabel", event.target.value)
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
                    onFormUpdate("linkedPath", event.target.value)
                  }
                />
              </FieldContent>
            </Field>

            <FieldError className="sm:col-span-2" role="alert">
              {createError}
            </FieldError>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onCreateOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={() => void onCreateNotice()}
            >
              {submitting ? (
                <Spinner data-icon="inline-start" aria-hidden />
              ) : null}
              {t("publish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
