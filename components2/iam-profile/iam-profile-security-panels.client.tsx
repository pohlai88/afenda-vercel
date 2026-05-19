"use client"

import type { ReactNode } from "react"
import { useRouter } from "#i18n/navigation"
import { useMemo, useState, useTransition } from "react"
import { useTranslations } from "next-intl"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#components2/ui/alert-dialog"
import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"
import { Label } from "#components2/ui/label"
import { Spinner } from "#components2/ui/spinner"
import { parseUserAgentLabel } from "#lib/auth/user-agent-parse.shared"
import {
  changePasswordAction,
  revokeOtherSessionsAction,
  revokeSessionAction,
} from "#features/iam-profile/client"

import type {
  IamProfileSecurityActivityRow,
  IamProfileSecuritySessionRow,
} from "./iam-profile.types.shared"

function maskToken(token: string) {
  if (token.length <= 8) return "••••"
  return `${token.slice(0, 4)}…${token.slice(-4)}`
}

function SectionShell({ id, children }: { id: string; children: ReactNode }) {
  return (
    <section
      id={id}
      className="scroll-mt-24 px-surface-lg py-surface-lg md:px-surface-xl"
    >
      <div className="max-w-4xl space-y-4">{children}</div>
    </section>
  )
}

function SectionHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function IamProfileSecurityPanelsPassword({
  hasCredential,
}: {
  hasCredential: boolean
}) {
  const t = useTranslations("IamProfileSurface.security.password")
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <SectionShell id="password">
      <SectionHeader
        title={t("title")}
        description={
          hasCredential ? t("description") : t("noCredentialDescription")
        }
      />
      {hasCredential ? (
        <>
          <PasswordFieldsForm
            currentPassword={currentPassword}
            newPassword={newPassword}
            pending={pending}
            onCurrentChange={setCurrentPassword}
            onNewChange={setNewPassword}
            onSubmit={() => {
              setErr(null)
              setMsg(null)
              startTransition(() => {
                void changePasswordAction({
                  currentPassword,
                  newPassword,
                }).then((result) => {
                  if (!result.ok) {
                    setErr(result.error)
                    return
                  }
                  setMsg(t("success"))
                  setCurrentPassword("")
                  setNewPassword("")
                  router.refresh()
                })
              })
            }}
            labels={{
              current: t("currentPasswordLabel"),
              next: t("newPasswordLabel"),
              submit: t("submit"),
              submitting: t("submitting"),
            }}
          />
          {err ? (
            <p className="text-sm text-destructive" role="alert">
              {err}
            </p>
          ) : null}
          {msg ? (
            <p className="text-sm text-muted-foreground" role="status">
              {msg}
            </p>
          ) : null}
        </>
      ) : null}
    </SectionShell>
  )
}

function PasswordFieldsForm({
  currentPassword,
  newPassword,
  pending,
  onCurrentChange,
  onNewChange,
  onSubmit,
  labels,
}: {
  currentPassword: string
  newPassword: string
  pending: boolean
  onCurrentChange: (value: string) => void
  onNewChange: (value: string) => void
  onSubmit: () => void
  labels: {
    current: string
    next: string
    submit: string
    submitting: string
  }
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="security-current-password">{labels.current}</Label>
          <Input
            id="security-current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => onCurrentChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="security-new-password">{labels.next}</Label>
          <Input
            id="security-new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => onNewChange(e.target.value)}
          />
        </div>
      </div>
      <Button type="button" disabled={pending} onClick={onSubmit}>
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <Spinner className="size-4" />
            {labels.submitting}
          </span>
        ) : (
          labels.submit
        )}
      </Button>
    </>
  )
}

function IamProfileSecurityPanelsSessions({
  currentSessionId,
  currentSessionToken,
  sessions,
}: {
  currentSessionId: string
  currentSessionToken: string
  sessions: IamProfileSecuritySessionRow[]
}) {
  const t = useTranslations("IamProfileSurface.security.sessions")
  const router = useRouter()
  const [actionErr, setActionErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [revokeSessionToken, setRevokeSessionToken] = useState<string | null>(
    null
  )
  const [revokeAllOpen, setRevokeAllOpen] = useState(false)

  const sessionPendingRevoke = useMemo(
    () => sessions.find((s) => s.token === revokeSessionToken),
    [sessions, revokeSessionToken]
  )

  function runAction(fn: () => Promise<void>, onSuccess?: () => void) {
    setActionErr(null)
    startTransition(() => {
      void fn()
        .then(() => {
          onSuccess?.()
          router.refresh()
        })
        .catch((e: unknown) => {
          setActionErr(e instanceof Error ? e.message : "Something went wrong.")
        })
    })
  }

  return (
    <SectionShell id="sessions">
      <SectionHeader title={t("title")} description={t("subtitle")} />
      <ul className="space-y-2">
        {sessions.map((s) => {
          const isCurrent =
            s.id === currentSessionId || s.token === currentSessionToken
          const ua = parseUserAgentLabel(s.userAgent)
          return (
            <li
              key={s.id}
              className="flex flex-col gap-2 rounded-md border border-border/60 bg-background/55 p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {maskToken(s.token)}
                  {isCurrent ? (
                    <span className="ml-2 text-foreground">
                      {t("currentDeviceBadge")}
                    </span>
                  ) : null}
                </span>
                {!isCurrent ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => setRevokeSessionToken(s.token)}
                  >
                    {t("revoke")}
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {ua.browser} · {ua.device}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("signedInAt")} {new Date(s.createdAt).toLocaleString()}
                {s.ipAddress ? ` · ${s.ipAddress}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("expiresAt")} {new Date(s.expiresAt).toLocaleString()}
              </p>
            </li>
          )
        })}
      </ul>
      {sessions.length > 1 ? (
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => setRevokeAllOpen(true)}
        >
          {t("revokeOtherSessions")}
        </Button>
      ) : null}

      <AlertDialog
        open={revokeSessionToken !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setRevokeSessionToken(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("revokeDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left text-muted-foreground">
                <p>{t("revokeDialogDescription")}</p>
                {sessionPendingRevoke ? (
                  <ul className="list-inside list-disc space-y-1 text-xs">
                    <li>
                      {
                        parseUserAgentLabel(sessionPendingRevoke.userAgent)
                          .browser
                      }
                    </li>
                    <li>
                      {t("signedInAt")}{" "}
                      {new Date(
                        sessionPendingRevoke.createdAt
                      ).toLocaleString()}
                    </li>
                  </ul>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {t("revokeDialogCancel")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pending || !revokeSessionToken}
              onClick={() => {
                const token = revokeSessionToken
                if (!token) return
                runAction(
                  () => revokeSessionAction(token, sessionPendingRevoke?.id),
                  () => setRevokeSessionToken(null)
                )
              }}
            >
              {pending ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  {t("revoking")}
                </span>
              ) : (
                t("revokeConfirm")
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={revokeAllOpen} onOpenChange={setRevokeAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("revokeAllDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              {t("revokeAllDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {t("revokeDialogCancel")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                runAction(
                  () => revokeOtherSessionsAction(),
                  () => setRevokeAllOpen(false)
                )
              }
            >
              {pending ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  {t("revokingAll")}
                </span>
              ) : (
                t("revokeAllConfirm")
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {actionErr ? (
        <p className="text-sm text-destructive" role="alert">
          {actionErr}
        </p>
      ) : null}
    </SectionShell>
  )
}

function IamProfileSecurityPanelsActivity({
  activity,
}: {
  activity: IamProfileSecurityActivityRow[]
}) {
  const t = useTranslations("IamProfileSurface.security.activity")

  return (
    <SectionShell id="recent-activity">
      <SectionHeader title={t("title")} description={t("subtitle")} />
      {activity.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {activity.map((a) => (
            <li
              key={a.id}
              className="flex flex-col gap-0.5 border-b border-border/60 py-2 last:border-0"
            >
              <span className="font-medium">{a.label}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(a.createdAt).toLocaleString()}
                {a.path ? ` · ${a.path}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      )}
    </SectionShell>
  )
}

export function IamProfileSecurityPanels(props: {
  currentSessionId: string
  currentSessionToken: string
  sessions: IamProfileSecuritySessionRow[]
  activity: IamProfileSecurityActivityRow[]
  hasCredential: boolean
}) {
  return (
    <div className="divide-y divide-border/45">
      <IamProfileSecurityPanelsPassword hasCredential={props.hasCredential} />
      <IamProfileSecurityPanelsSessions
        currentSessionId={props.currentSessionId}
        currentSessionToken={props.currentSessionToken}
        sessions={props.sessions}
      />
      <IamProfileSecurityPanelsActivity activity={props.activity} />
    </div>
  )
}

IamProfileSecurityPanels.Password = IamProfileSecurityPanelsPassword
IamProfileSecurityPanels.Sessions = IamProfileSecurityPanelsSessions
IamProfileSecurityPanels.Activity = IamProfileSecurityPanelsActivity
