"use client"

import { useTransition } from "react"
import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"

import { useRouter } from "#i18n/navigation"

export function PlatformAdminUsersSearch({
  initialValue,
  basePath,
}: {
  initialValue: string
  basePath: string
}) {
  const t = useTranslations("PlatformAdmin.users")
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <form
      role="search"
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        const raw = formData.get("q")
        const value = typeof raw === "string" ? raw.trim() : ""
        const params = new URLSearchParams()
        if (value) params.set("q", value)
        const next =
          params.size > 0 ? `${basePath}?${params.toString()}` : basePath
        startTransition(() => {
          router.replace(next as Parameters<typeof router.replace>[0])
        })
      }}
    >
      <label htmlFor="platform-admin-users-search" className="sr-only">
        {t("searchLabel")}
      </label>
      <input
        id="platform-admin-users-search"
        name="q"
        type="search"
        defaultValue={initialValue}
        placeholder={t("searchPlaceholder")}
        className="h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-2 focus-visible:outline-ring sm:w-64"
      />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? t("searching") : t("search")}
      </Button>
    </form>
  )
}
