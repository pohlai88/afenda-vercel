"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { authClient } from "#lib/auth-client"
import { Button } from "#components/ui/button"

type ListedUser = {
  id: string
  email: string
  name: string
  role?: string | null
}

export default function AdminUsersPage() {
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
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-muted-foreground text-sm">
          <Link href="/sign-in" className="underline">
            Sign in
          </Link>{" "}
          to access admin tools.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Admin plugin — requires permission to list users.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading users…</p>
      ) : (
        <ul className="divide-border divide-y rounded-md border">
          {users.length === 0 ? (
            <li className="text-muted-foreground px-4 py-6 text-sm">
              No users returned (empty project or insufficient admin access).
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
