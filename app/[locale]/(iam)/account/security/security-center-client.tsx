"use client"

import { useRouter } from "#i18n/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"
import { Link } from "#i18n/navigation"

import { neonAuthClient } from "#lib/auth-client-neon-compat"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#components/ui/alert-dialog"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"
import { Spinner } from "#components/ui/spinner"

import {
  deletePasskeyAction,
  revokeOtherSessionsAction,
  revokeSessionAction,
} from "./security-actions"

export type SecuritySessionRow = {
  id: string
  token: string
  createdAt: string
  expiresAt: string
  ipAddress: string | null
  userAgent: string | null
}

export type SecurityPasskeyRow = {
  id: string
  name: string | null
  createdAt: string | null
}

export type SecurityActivityRow = {
  id: string
  label: string
  createdAt: string
  path: string | null
}

function maskToken(token: string) {
  if (token.length <= 8) return "••••"
  return `${token.slice(0, 4)}…${token.slice(-4)}`
}

function summarizeUserAgent(ua: string | null) {
  if (!ua?.trim()) return "Unknown browser or device"
  const t = ua.trim()
  return t.length > 120 ? `${t.slice(0, 120)}…` : t
}

export function AccountSecurityCenterClient(props: {
  currentSessionId: string
  currentSessionToken: string
  sessions: SecuritySessionRow[]
  passkeys: SecurityPasskeyRow[]
  activity: SecurityActivityRow[]
}) {
  const router = useRouter()
  const [passkeyMsg, setPasskeyMsg] = useState<string | null>(null)
  const [passkeyErr, setPasskeyErr] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [totpUri, setTotpUri] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [twoFactorErr, setTwoFactorErr] = useState<string | null>(null)
  const [twoFactorMsg, setTwoFactorMsg] = useState<string | null>(null)
  const [actionErr, setActionErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [revokeSessionToken, setRevokeSessionToken] = useState<string | null>(
    null
  )
  const [revokeAllOpen, setRevokeAllOpen] = useState(false)

  const sessionPendingRevoke = useMemo(
    () => props.sessions.find((s) => s.token === revokeSessionToken),
    [props.sessions, revokeSessionToken]
  )

  useEffect(() => {
    const run = async () => {
      if (
        typeof window === "undefined" ||
        !PublicKeyCredential?.isConditionalMediationAvailable
      ) {
        return
      }
      if (!(await PublicKeyCredential.isConditionalMediationAvailable())) {
        return
      }
      void neonAuthClient.signIn.passkey?.({ autoFill: true })
    }
    void run()
  }, [])

  async function addPasskey() {
    setPasskeyErr(null)
    setPasskeyMsg(null)
    const add = neonAuthClient.passkey?.addPasskey
    if (!add) {
      setPasskeyErr("Passkeys are not enabled for this deployment.")
      return
    }
    const { error } = await add({
      name: "This device",
    })
    if (error) {
      setPasskeyErr(error.message ?? "Could not register passkey")
      return
    }
    setPasskeyMsg("Passkey registered.")
    router.refresh()
  }

  async function startTwoFactorSetup() {
    setTwoFactorErr(null)
    setTwoFactorMsg(null)
    const tf = neonAuthClient.twoFactor?.enable
    if (!tf) {
      setTwoFactorErr(
        "Two-factor authentication is not enabled for this deployment."
      )
      return
    }
    const { data, error } = await tf({
      password: password || undefined,
      issuer: "Afenda",
    })
    if (error) {
      setTwoFactorErr(error.message ?? "Could not start 2FA setup")
      return
    }
    setTotpUri(data?.totpURI ?? null)
    setBackupCodes(data?.backupCodes ?? [])
    setTwoFactorMsg("Scan the TOTP URI in your authenticator app, then verify.")
  }

  async function verifyTwoFactor() {
    setTwoFactorErr(null)
    setTwoFactorMsg(null)
    const verify = neonAuthClient.twoFactor?.verifyTotp
    if (!verify) {
      setTwoFactorErr(
        "Two-factor authentication is not enabled for this deployment."
      )
      return
    }
    const { error } = await verify({
      code: totpCode.trim(),
    })
    if (error) {
      setTwoFactorErr(error.message ?? "Invalid TOTP code")
      return
    }
    setTwoFactorMsg("Two-factor authentication is enabled.")
    setTotpCode("")
  }

  async function disableTwoFactor() {
    setTwoFactorErr(null)
    setTwoFactorMsg(null)
    const disable = neonAuthClient.twoFactor?.disable
    if (!disable) {
      setTwoFactorErr(
        "Two-factor authentication is not enabled for this deployment."
      )
      return
    }
    const { error } = await disable({
      password: password || undefined,
    })
    if (error) {
      setTwoFactorErr(error.message ?? "Could not disable 2FA")
      return
    }
    setTwoFactorMsg("Two-factor authentication disabled.")
    setTotpUri(null)
    setBackupCodes([])
    setTotpCode("")
  }

  async function regenerateBackupCodes() {
    setTwoFactorErr(null)
    const gen = neonAuthClient.twoFactor?.generateBackupCodes
    if (!gen) {
      setTwoFactorErr(
        "Two-factor authentication is not enabled for this deployment."
      )
      return
    }
    const { data, error } = await gen({})
    if (error) {
      setTwoFactorErr(error.message ?? "Could not generate backup codes")
      return
    }
    setBackupCodes(data?.backupCodes ?? [])
    setTwoFactorMsg("New backup codes generated.")
  }

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
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sessions, passkeys, and two-factor authentication.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Active sessions</h2>
        <p className="text-sm text-muted-foreground">
          Sign out other devices or end a single session. Your current session
          is highlighted.
        </p>
        <ul className="space-y-2">
          {props.sessions.map((s) => {
            const isCurrent =
              s.id === props.currentSessionId ||
              s.token === props.currentSessionToken
            return (
              <li
                key={s.id}
                className="flex flex-col gap-2 rounded-md border p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {maskToken(s.token)}
                    {isCurrent ? (
                      <span className="ml-2 text-foreground">
                        (this device)
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
                      Revoke
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(s.createdAt).toLocaleString()}
                  {s.ipAddress ? ` · ${s.ipAddress}` : ""}
                </p>
                {s.userAgent ? (
                  <p className="text-xs text-muted-foreground">
                    {summarizeUserAgent(s.userAgent)}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
        {props.sessions.length > 1 ? (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => setRevokeAllOpen(true)}
          >
            Sign out all other sessions
          </Button>
        ) : null}
      </section>

      <AlertDialog
        open={revokeSessionToken !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setRevokeSessionToken(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this session?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left text-muted-foreground">
                <p>
                  That device will be signed out. Unsaved work there may be
                  lost.
                </p>
                {sessionPendingRevoke ? (
                  <ul className="list-inside list-disc space-y-1 text-xs">
                    <li>
                      {summarizeUserAgent(sessionPendingRevoke.userAgent)}
                    </li>
                    <li>
                      Started{" "}
                      {new Date(
                        sessionPendingRevoke.createdAt
                      ).toLocaleString()}
                    </li>
                    {sessionPendingRevoke.ipAddress ? (
                      <li>IP {sessionPendingRevoke.ipAddress}</li>
                    ) : null}
                  </ul>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
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
                  Revoking…
                </span>
              ) : (
                "Revoke session"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={revokeAllOpen} onOpenChange={setRevokeAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out all other sessions?</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              This will end every session except the one on this device. Other
              browsers and devices will need to sign in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
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
                  Signing out…
                </span>
              ) : (
                "Sign out everywhere else"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Passkeys</h2>
        {props.passkeys.length > 0 ? (
          <ul className="space-y-2">
            {props.passkeys.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{p.name ?? "Passkey"}</p>
                  {p.createdAt ? (
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(p.createdAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => runAction(() => deletePasskeyAction(p.id))}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No passkeys yet.</p>
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={() => void addPasskey()}
        >
          Register passkey
        </Button>
        {passkeyErr ? (
          <p className="text-sm text-destructive" role="alert">
            {passkeyErr}
          </p>
        ) : null}
        {passkeyMsg ? (
          <p className="text-sm text-muted-foreground" role="status">
            {passkeyMsg}
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Recent security activity</h2>
        {props.activity.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {props.activity.map((a) => (
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
          <p className="text-sm text-muted-foreground">
            No recent sign-in events recorded yet.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Two-factor authentication</h2>
        <p className="text-sm text-muted-foreground">
          Configure TOTP-based 2FA and manage backup codes.
        </p>
        <div className="space-y-2">
          <Label htmlFor="security-password">Current password</Label>
          <Input
            id="security-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Required for credential accounts"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => void startTwoFactorSetup()}
          >
            Start 2FA setup
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void disableTwoFactor()}
          >
            Disable 2FA
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void regenerateBackupCodes()}
          >
            Regenerate backup codes
          </Button>
        </div>
        {totpUri ? (
          <div className="rounded-md border p-3">
            <p className="mb-2 text-xs font-medium">TOTP URI</p>
            <p className="text-xs break-all text-muted-foreground">{totpUri}</p>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="totp-code">Authenticator code</Label>
          <Input
            id="totp-code"
            inputMode="numeric"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            placeholder="6-digit code"
          />
          <Button type="button" onClick={() => void verifyTwoFactor()}>
            Verify code
          </Button>
        </div>
        {backupCodes.length > 0 ? (
          <div className="rounded-md border p-3">
            <p className="mb-2 text-xs font-medium">Backup codes</p>
            <ul className="grid gap-1 text-xs text-muted-foreground">
              {backupCodes.map((code) => (
                <li key={code} className="font-mono">
                  {code}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {twoFactorErr ? (
          <p className="text-sm text-destructive" role="alert">
            {twoFactorErr}
          </p>
        ) : null}
        {twoFactorMsg ? (
          <p className="text-sm text-muted-foreground" role="status">
            {twoFactorMsg}
          </p>
        ) : null}
      </section>

      {actionErr ? (
        <p className="text-sm text-destructive" role="alert">
          {actionErr}
        </p>
      ) : null}

      <p className="text-sm text-muted-foreground">
        <Link href="/account" className="underline">
          Back to account
        </Link>
      </p>
    </div>
  )
}
