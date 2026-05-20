"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"

import {
  describeOrgNotificationBadge,
  type OrgNotificationNotice,
} from "#features/org-notifications/client"

import {
  AppShellNotificationsAdvancedBlock,
  type CreateNoticeFormState,
  type NoticeFilter,
} from "./appshell-notifications-advanced-block.client"
import { AFENDA_ORG_NOTIFICATION_REFRESH_EVENT } from "../appshell-org-notification-delivery.client"

type AppShellNexusUtilityNotificationsProps = {
  canManage: boolean
}

type NotificationsResponse = {
  items: OrgNotificationNotice[]
}

const EMPTY_CREATE_FORM: CreateNoticeFormState = {
  title: "",
  body: "",
  severity: "info",
  expiresAt: "",
  linkedEntityLabel: "",
  linkedPath: "",
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

export function AppShellNexusUtilityNotifications({
  canManage,
}: AppShellNexusUtilityNotificationsProps) {
  const t = useTranslations("Dashboard.shell.utilityBar.notifications")
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [noticeFilter, setNoticeFilter] = useState<NoticeFilter>("all")
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
  const acknowledgedCount = useMemo(
    () => items.filter((item) => item.isAcknowledged).length,
    [items]
  )
  const criticalCount = useMemo(
    () => items.filter((item) => item.severity === "critical").length,
    [items]
  )

  const filteredItems = useMemo(() => {
    switch (noticeFilter) {
      case "unread":
        return items.filter((item) => !item.isRead)
      case "acknowledged":
        return items.filter((item) => item.isAcknowledged)
      case "critical":
        return items.filter((item) => item.severity === "critical")
      default:
        return items
    }
  }, [items, noticeFilter])

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
    const onRefresh = () => {
      void loadNotifications().catch(() => {})
    }
    window.addEventListener(AFENDA_ORG_NOTIFICATION_REFRESH_EVENT, onRefresh)
    return () => {
      window.removeEventListener(
        AFENDA_ORG_NOTIFICATION_REFRESH_EVENT,
        onRefresh
      )
    }
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

  function handleCreateOpenChange(nextOpen: boolean) {
    setCreateOpen(nextOpen)
    if (!nextOpen) {
      setCreateError(null)
      setForm(EMPTY_CREATE_FORM)
    }
  }

  return (
    <AppShellNotificationsAdvancedBlock
      canManage={canManage}
      open={open}
      onOpenChange={setOpen}
      createOpen={createOpen}
      onCreateOpenChange={handleCreateOpenChange}
      loading={loading}
      noticeFilter={noticeFilter}
      onNoticeFilter={setNoticeFilter}
      errorMessage={errorMessage}
      createError={createError}
      items={items}
      filteredItems={filteredItems}
      unreadCount={unreadCount}
      acknowledgedCount={acknowledgedCount}
      criticalCount={criticalCount}
      selectedNoticeId={selectedNoticeId}
      onSelectNoticeId={setSelectedNoticeId}
      selectedNotice={selectedNotice}
      selectedNoticeDisplayBadge={selectedNoticeDisplayBadge}
      busyNoticeId={busyNoticeId}
      form={form}
      onFormUpdate={updateForm}
      submitting={submitting}
      onRead={handleRead}
      onAcknowledge={handleAcknowledge}
      onClose={handleClose}
      onCreateNotice={handleCreateNotice}
    />
  )
}
