"use client"

import type { Route } from "next"
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useLocale, useTranslations } from "next-intl"

import { useRouter } from "#i18n/navigation"

import type { SafeLinkedAccount } from "#features/iam-profile/client"
import { sendVerificationEmailAction } from "#features/iam-profile/client"
import { authClient } from "#lib/auth-client"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"

export type IamProfileIdentityViewProps = {
  email: string
  name: string
  emailVerified: boolean
  notice?: string
  linkedAccounts: SafeLinkedAccount[]
  enabledProviders: string[]
  hasCredential: boolean
  identityPath: Route
  securityPath: Route
  nexusPath: Route
}

type IamProfileIdentityContextValue = IamProfileIdentityViewProps & {
  locale: ReturnType<typeof ensureAppLocale>
  setName: (value: string) => void
  msg: string | null
  err: string | null
  linkedProviderSet: Set<string>
  saveProfile: () => Promise<void>
  resendVerificationEmail: () => Promise<void>
  linkProvider: (provider: string) => Promise<void>
  unlinkRow: (row: SafeLinkedAccount) => Promise<void>
}

const IamProfileIdentityContext =
  createContext<IamProfileIdentityContextValue | null>(null)

export function useIamProfileIdentity() {
  const ctx = useContext(IamProfileIdentityContext)
  if (!ctx) {
    throw new Error(
      "useIamProfileIdentity must be used within IamProfileIdentityProvider"
    )
  }
  return ctx
}

export function IamProfileIdentityProvider({
  children,
  ...props
}: IamProfileIdentityViewProps & { children: ReactNode }) {
  const locale = ensureAppLocale(useLocale())
  const t = useTranslations("IamProfileSurface.identity.messages")
  const router = useRouter()
  const [name, setName] = useState(props.name)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const linkedProviderSet = useMemo(
    () => new Set(props.linkedAccounts.map((a) => a.providerId)),
    [props.linkedAccounts]
  )

  async function saveProfile() {
    setErr(null)
    setMsg(null)
    const { error } = await authClient.updateUser({
      name: name.trim() || undefined,
    })
    if (error) {
      setErr(error.message ?? t("updateFailed"))
      return
    }
    setMsg(t("profileUpdated"))
    router.refresh()
  }

  async function resendVerificationEmail() {
    setErr(null)
    setMsg(null)
    const result = await sendVerificationEmailAction()
    if (!result.ok) {
      setErr(result.error ?? t("verificationFailed"))
      return
    }
    setMsg(t("verificationSent"))
  }

  async function linkProvider(provider: string) {
    setErr(null)
    setMsg(null)
    const { error } = await authClient.linkSocial({
      provider,
      callbackURL: toLocalePath(locale, props.identityPath as never),
    })
    if (error) {
      setErr(error.message ?? t("linkFailed"))
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
      setErr(error.message ?? t("unlinkFailed"))
      return
    }
    setMsg(t("providerUnlinked"))
    router.refresh()
  }

  const value: IamProfileIdentityContextValue = {
    ...props,
    locale,
    name,
    setName,
    msg,
    err,
    linkedProviderSet,
    saveProfile,
    resendVerificationEmail,
    linkProvider,
    unlinkRow,
  }

  return (
    <IamProfileIdentityContext.Provider value={value}>
      {children}
    </IamProfileIdentityContext.Provider>
  )
}
