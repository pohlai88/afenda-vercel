"use client"

import { useLocale } from "next-intl"
import { useState } from "react"

import { Link, useRouter } from "#i18n/navigation"

import type { SafeLinkedAccount } from "#lib/auth/accounts.types.shared"
import { authClient } from "#lib/auth-client"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"

function providerLabel(providerId: string) {
  if (providerId === "credential") return "Email & password"
  return providerId
}

export function AccountIdentityClient(props: {
  email: string
  name: string
  emailVerified: boolean
  notice?: string
  linkedAccounts: SafeLinkedAccount[]
  enabledProviders: string[]
  hasCredential: boolean
}) {
  const locale = ensureAppLocale(useLocale())
  const router = useRouter()
  const [name, setName] = useState(props.name)
  const [newEmail, setNewEmail] = useState("")
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const linkedProviderSet = new Set(
    props.linkedAccounts.map((a) => a.providerId)
  )

  async function saveProfile() {
    setErr(null)
    setMsg(null)
    const { error } = await authClient.updateUser({
      name: name.trim() || undefined,
    })
    if (error) {
      setErr(error.message ?? "Could not update profile")
      return
    }
    setMsg("Profile updated.")
    router.refresh()
  }

  async function requestEmailChange() {
    setErr(null)
    setMsg(null)
    const trimmed = newEmail.trim()
    if (!trimmed) {
      setErr("Enter a new email address.")
      return
    }
    const { error } = await authClient.changeEmail({
      newEmail: trimmed,
      callbackURL: toLocalePath(locale, "/account/identity"),
    })
    if (error) {
      setErr(error.message ?? "Could not start email change")
      return
    }
    setMsg("Check your current email to approve the change.")
    setNewEmail("")
  }

  async function linkProvider(provider: string) {
    setErr(null)
    setMsg(null)
    const { error } = await authClient.linkSocial({
      provider,
      callbackURL: toLocalePath(locale, "/account/identity"),
    })
    if (error) {
      setErr(error.message ?? "Could not link provider")
    }
  }

  async function unlinkRow(row: SafeLinkedAccount) {
    if (row.isCredentialAccount) return
    setErr(null)
    setMsg(null)
    const { error } = await authClient.unlinkAccount({
      providerId: row.providerId,
      accountId: row.id,
    })
    if (error) {
      setErr(error.message ?? "Could not unlink")
      return
    }
    setMsg("Provider unlinked.")
    router.refresh()
  }

  return (
    <div className="divide-y divide-border/45">
      {props.notice === "verify-email" && !props.emailVerified ? (
        <div
          className="mx-surface-lg mt-surface-lg rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm md:mx-surface-xl"
          role="status"
        >
          Verify your email to open Security settings. Check your inbox for the
          verification link, or sign in again to trigger a new message if your
          project sends one on sign-in.
        </div>
      ) : null}

      <section
        id="profile"
        className="scroll-mt-24 px-surface-lg py-surface-lg md:px-surface-xl"
      >
        <div className="max-w-3xl space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">Profile</h2>
            <p className="text-sm text-muted-foreground">
              Canonical display identity for your operator account.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="id-name">Display name</Label>
            <Input
              id="id-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
            <Button type="button" onClick={() => void saveProfile()}>
              Save name
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Email: {props.email}
            {props.emailVerified ? (
              <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                Verified
              </span>
            ) : (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                Unverified
              </span>
            )}
          </p>
        </div>
      </section>

      <section
        id="change-email"
        className="scroll-mt-24 px-surface-lg py-surface-lg md:px-surface-xl"
      >
        <div className="max-w-3xl space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              Change email
            </h2>
            <p className="text-sm text-muted-foreground">
              We will email your current address to approve a change, then
              verify the new address.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="id-new-email">New email</Label>
            <Input
              id="id-new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              autoComplete="email"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => void requestEmailChange()}
            >
              Request change
            </Button>
          </div>
        </div>
      </section>

      <section
        id="linked-accounts"
        className="scroll-mt-24 px-surface-lg py-surface-lg md:px-surface-xl"
      >
        <div className="max-w-3xl space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              Linked accounts
            </h2>
            <p className="text-sm text-muted-foreground">
              External sign-in methods currently trusted for this operator.
            </p>
          </div>
          <ul className="space-y-2">
            {props.linkedAccounts.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-background/55 p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{providerLabel(a.providerId)}</p>
                  <p className="text-xs text-muted-foreground">
                    Linked {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>
                {!a.isCredentialAccount ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void unlinkRow(a)}
                  >
                    Unlink
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          {props.enabledProviders.filter((p) => !linkedProviderSet.has(p))
            .length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {props.enabledProviders
                .filter((p) => !linkedProviderSet.has(p))
                .map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void linkProvider(p)}
                  >
                    Link {providerLabel(p)}
                  </Button>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              All configured social providers are linked, or none are enabled in
              this environment.
            </p>
          )}
          {!props.hasCredential ? (
            <p className="text-xs text-muted-foreground">
              No password on file — you can use “Forgot password” from sign-in
              to add a credential after verifying email ownership.
            </p>
          ) : null}
        </div>
      </section>

      {(err || msg) && (
        <section className="px-surface-lg py-surface-lg md:px-surface-xl">
          <div className="max-w-3xl space-y-2">
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
            <p className="text-sm text-muted-foreground">
              <Link href="/account/security" className="underline">
                Security settings
              </Link>
              {" · "}
              <Link href="/o" className="underline">
                Dashboard
              </Link>
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
