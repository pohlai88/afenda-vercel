"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Link } from "#i18n/navigation"

import { authClient } from "#lib/auth-client"
import { Button } from "#components/ui/button"

type ListedUser = {
  id: string
  email: string
  name: string
  role?: string | null
}

export default function AdminUsersPage() {
  const t = useTranslations("Admin")
  const tCommon = useTranslations("Common")
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const [users, setUsers] = useState<ListedUser[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!session) return
    const ac = new AbortController()
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error: err } = await authClient.admin.listUsers({
          query: { limit: 100, offset: 0 },
          fetchOptions: { signal: ac.signal },
        })
        if (err) {
          throw new Error(err.message ?? "Failed to load users")
        }
        setUsers(data?.users ?? [])
      } catch (e: unknown) {
        if ((e as Error).name === "AbortError") return
        setError(e instanceof Error ? e.message : "Failed to load users")
      } finally {
        setLoading(false)
      }
    })()
    return () => ac.abort()
  }, [session])

  if (sessionPending) {
    return (
      <div className="mx-auto w-full max-w-3xl py-10">
        <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto w-full max-w-3xl py-10">
        <p className="text-sm text-muted-foreground">
          <Link href="/sign-in" className="underline">
            {t("signInLink")}
          </Link>{" "}
          {t("signInSuffix")}
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("usersTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("usersSubtitle")}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard">{t("linkDashboard")}</Link>
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="text-sm text-muted-foreground">
          {tCommon("loadingUsers")}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border">
          {users.length === 0 ? (
            <li className="px-4 py-6 text-sm text-muted-foreground">
              {t("emptyUsers")}
            </li>
          ) : (
            users.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm"
              >
                <span className="font-medium">{u.email}</span>
                <span className="text-muted-foreground">
                  {u.name}
                  {u.role ? ` · ${u.role}` : ""}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
