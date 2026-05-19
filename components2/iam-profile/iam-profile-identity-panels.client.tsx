"use client"

import { Link } from "#i18n/navigation"
import { useTranslations } from "next-intl"

import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"
import { Label } from "#components2/ui/label"

import { useIamProfileIdentity } from "./iam-profile-identity-context.client"

function providerLabel(providerId: string) {
  if (providerId === "credential") return "Email & password"
  return providerId
}

export function IamProfileIdentityPanels() {
  return (
    <div>
      <IamProfileIdentityPanels.VerifyEmailNotice />
      <IamProfileIdentityPanels.Profile />
      <IamProfileIdentityPanels.LinkedAccounts />
      <IamProfileIdentityPanels.StatusFooter />
    </div>
  )
}

function VerifyEmailNotice() {
  const t = useTranslations("IamProfileSurface.identity")
  const { notice, emailVerified, resendVerificationEmail } =
    useIamProfileIdentity()
  if (notice !== "verify-email" || emailVerified) return null
  return (
    <div
      className="mx-surface-lg mt-surface-lg rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm md:mx-surface-xl"
      role="status"
    >
      <p>{t("verifyEmailBanner")}</p>
      <Button
        type="button"
        variant="link"
        className="h-auto px-0 text-amber-800 dark:text-amber-200"
        onClick={() => void resendVerificationEmail()}
      >
        {t("verifyEmailAction")}
      </Button>
    </div>
  )
}

function ProfilePanel() {
  const t = useTranslations("IamProfileSurface.identity")
  const { email, emailVerified, name, setName, saveProfile } =
    useIamProfileIdentity()
  return (
    <section
      id="profile"
      className="scroll-mt-24 px-surface-lg py-surface-lg md:px-surface-xl"
    >
      <div className="max-w-3xl space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            {t("profileTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("profileDescription")}
          </p>
        </div>
        <ProfileFieldsForm
          name={name}
          onNameChange={setName}
          onSave={() => void saveProfile()}
          labels={{
            displayName: t("fields.displayName"),
            save: t("fields.saveName"),
          }}
        />
        <p className="text-xs text-muted-foreground">
          {t("fields.email")}: {email}
          {emailVerified ? (
            <span className="ml-2 text-emerald-600 dark:text-emerald-400">
              {t("fields.emailVerifiedBadge")}
            </span>
          ) : (
            <span className="ml-2 text-amber-600 dark:text-amber-400">
              {t("fields.emailUnverifiedBadge")}
            </span>
          )}
        </p>
      </div>
    </section>
  )
}

function ProfileFieldsForm({
  name,
  onNameChange,
  onSave,
  labels,
}: {
  name: string
  onNameChange: (value: string) => void
  onSave: () => void
  labels: { displayName: string; save: string }
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="id-name">{labels.displayName}</Label>
      <Input
        id="id-name"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        autoComplete="name"
      />
      <Button type="button" onClick={onSave}>
        {labels.save}
      </Button>
    </div>
  )
}

function LinkedAccountsPanel() {
  const t = useTranslations("IamProfileSurface.identity.linked")
  const {
    linkedAccounts,
    enabledProviders,
    linkedProviderSet,
    hasCredential,
    linkProvider,
    unlinkRow,
  } = useIamProfileIdentity()

  return (
    <section
      id="linked-accounts"
      className="scroll-mt-24 px-surface-lg py-surface-lg md:px-surface-xl"
    >
      <div className="max-w-3xl space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <ul className="space-y-2">
          {linkedAccounts.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-background/55 p-3 text-sm"
            >
              <div>
                <p className="font-medium">{providerLabel(a.providerId)}</p>
                <p className="text-xs text-muted-foreground">
                  {t("linkedAt", {
                    date: new Date(a.createdAt).toLocaleString(),
                  })}
                </p>
              </div>
              {!a.isCredentialAccount ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void unlinkRow(a)}
                >
                  {t("disconnectAction")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        {enabledProviders.filter((p) => !linkedProviderSet.has(p)).length >
        0 ? (
          <div className="flex flex-wrap gap-2">
            {enabledProviders
              .filter((p) => !linkedProviderSet.has(p))
              .map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void linkProvider(p)}
                >
                  {t("connectAction", { provider: providerLabel(p) })}
                </Button>
              ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("allLinked")}</p>
        )}
        {!hasCredential ? (
          <p className="text-xs text-muted-foreground">{t("noCredentialHint")}</p>
        ) : null}
      </div>
    </section>
  )
}

function StatusFooter() {
  const t = useTranslations("IamProfileSurface.identity")
  const { err, msg, securityPath, nexusPath } = useIamProfileIdentity()
  if (!err && !msg) return null
  return (
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
          <Link href={securityPath} className="underline">
            {t("footerSecurity")}
          </Link>
          {" · "}
          <Link href={nexusPath} className="underline">
            {t("footerWorkspace")}
          </Link>
        </p>
      </div>
    </section>
  )
}

IamProfileIdentityPanels.VerifyEmailNotice = VerifyEmailNotice
IamProfileIdentityPanels.Profile = ProfilePanel
IamProfileIdentityPanels.LinkedAccounts = LinkedAccountsPanel
IamProfileIdentityPanels.StatusFooter = StatusFooter
