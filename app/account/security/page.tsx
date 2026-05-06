"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { authClient } from "#lib/auth-client"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"

export default function AccountSecurityPage() {
  const { data: session, isPending } = authClient.useSession()
  const [passkeyMsg, setPasskeyMsg] = useState<string | null>(null)
  const [passkeyErr, setPasskeyErr] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [totpUri, setTotpUri] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [twoFactorErr, setTwoFactorErr] = useState<string | null>(null)
  const [twoFactorMsg, setTwoFactorMsg] = useState<string | null>(null)

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
      void authClient.signIn.passkey({ autoFill: true })
    }
    void run()
  }, [])

  async function addPasskey() {
    setPasskeyErr(null)
    setPasskeyMsg(null)
    const { error } = await authClient.passkey.addPasskey({
      name: "This device",
    })
    if (error) {
      setPasskeyErr(error.message ?? "Could not register passkey")
      return
    }
    setPasskeyMsg("Passkey registered.")
  }

  async function startTwoFactorSetup() {
    setTwoFactorErr(null)
    setTwoFactorMsg(null)
    const { data, error } = await authClient.twoFactor.enable({
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
    const { error } = await authClient.twoFactor.verifyTotp({
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
    const { error } = await authClient.twoFactor.disable({
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
    const { data, error } = await authClient.twoFactor.generateBackupCodes({})
    if (error) {
      setTwoFactorErr(error.message ?? "Could not generate backup codes")
      return
    }
    setBackupCodes(data?.backupCodes ?? [])
    setTwoFactorMsg("New backup codes generated.")
  }

  if (isPending) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-muted-foreground text-sm">
          <Link href="/sign-in" className="underline">
            Sign in
          </Link>{" "}
          to manage security settings.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Passkeys and two-factor endpoints are provided by Better Auth.
        </p>
      </div>
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Passkeys</h2>
        <p className="text-muted-foreground text-sm">
          Register a passkey for passwordless sign-in on this device.
        </p>
        <Button type="button" variant="secondary" onClick={() => void addPasskey()}>
          Register passkey
        </Button>
        {passkeyErr ? (
          <p className="text-destructive text-sm" role="alert">
            {passkeyErr}
          </p>
        ) : null}
        {passkeyMsg ? (
          <p className="text-muted-foreground text-sm" role="status">
            {passkeyMsg}
          </p>
        ) : null}
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Two-factor authentication</h2>
        <p className="text-muted-foreground text-sm">
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
          <Button type="button" variant="secondary" onClick={() => void startTwoFactorSetup()}>
            Start 2FA setup
          </Button>
          <Button type="button" variant="outline" onClick={() => void disableTwoFactor()}>
            Disable 2FA
          </Button>
          <Button type="button" variant="outline" onClick={() => void regenerateBackupCodes()}>
            Regenerate backup codes
          </Button>
        </div>
        {totpUri ? (
          <div className="rounded-md border p-3">
            <p className="mb-2 text-xs font-medium">TOTP URI</p>
            <p className="text-muted-foreground break-all text-xs">{totpUri}</p>
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
            <ul className="text-muted-foreground grid gap-1 text-xs">
              {backupCodes.map((code) => (
                <li key={code} className="font-mono">
                  {code}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {twoFactorErr ? (
          <p className="text-destructive text-sm" role="alert">
            {twoFactorErr}
          </p>
        ) : null}
        {twoFactorMsg ? (
          <p className="text-muted-foreground text-sm" role="status">
            {twoFactorMsg}
          </p>
        ) : null}
      </section>
      <p className="text-muted-foreground text-sm">
        <Link href="/dashboard" className="underline">
          Back to dashboard
        </Link>
      </p>
    </div>
  )
}
