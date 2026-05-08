import "server-only"

import { headers } from "next/headers"

import { auth } from "#lib/auth/neon.server"

import {
  PLATFORM_ADMIN_USERS_MAX_PAGE_SIZE,
  PLATFORM_ADMIN_USERS_PAGE_SIZE,
  PLATFORM_ADMIN_USERS_SEARCH_MAX_LENGTH,
} from "../constants"
import type { PlatformAdminUserPage, PlatformAdminUserSummary } from "../types"

/** Sanitized inputs used to drive Neon Auth `admin.listUsers`. */
export type PlatformAdminUserListInput = {
  readonly searchValue?: string
  readonly limit?: number
  readonly offset?: number
}

/**
 * Server-side wrapper around Neon Auth's admin `listUsers` endpoint. Handles
 * search/pagination clamping, projects rows into {@link PlatformAdminUserSummary},
 * and forwards request headers so Better Auth can authorize the caller.
 *
 * Caller is responsible for `requireGlobalAdminSession()` before invoking this.
 */
export async function listUsersForPlatformAdmin(
  input: PlatformAdminUserListInput = {}
): Promise<PlatformAdminUserPage> {
  const limit = clampLimit(input.limit ?? PLATFORM_ADMIN_USERS_PAGE_SIZE)
  const offset = clampOffset(input.offset ?? 0)
  const trimmedSearch = (input.searchValue ?? "").trim()
  const searchValue =
    trimmedSearch.length > 0
      ? trimmedSearch.slice(0, PLATFORM_ADMIN_USERS_SEARCH_MAX_LENGTH)
      : undefined

  const { data: result, error } = await auth.admin.listUsers({
    query: {
      limit,
      offset,
      sortBy: "createdAt",
      sortDirection: "desc",
      ...(searchValue
        ? {
            searchValue,
            searchField: "email",
            searchOperator: "contains",
          }
        : {}),
    },
    fetchOptions: { headers: await headers() },
  })

  if (error || !result) {
    return { users: [], total: 0, limit, offset }
  }

  const users = (result.users ?? []).map(toUserSummary)
  const total = typeof result.total === "number" ? result.total : users.length

  return { users, total, limit, offset }
}

function clampLimit(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return PLATFORM_ADMIN_USERS_PAGE_SIZE
  }
  return Math.min(Math.floor(value), PLATFORM_ADMIN_USERS_MAX_PAGE_SIZE)
}

function clampOffset(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  return Math.floor(value)
}

type RawUser = {
  id?: unknown
  email?: unknown
  name?: unknown
  emailVerified?: unknown
  role?: unknown
  banned?: unknown
  banReason?: unknown
  banExpires?: unknown
  createdAt?: unknown
}

function toUserSummary(raw: RawUser): PlatformAdminUserSummary {
  return {
    id: typeof raw.id === "string" ? raw.id : "",
    email: typeof raw.email === "string" ? raw.email : "",
    name: typeof raw.name === "string" ? raw.name : "",
    emailVerified: raw.emailVerified === true,
    role: typeof raw.role === "string" && raw.role.length > 0 ? raw.role : null,
    banned: raw.banned === true,
    banReason:
      typeof raw.banReason === "string" && raw.banReason.length > 0
        ? raw.banReason
        : null,
    banExpires: toDateOrNull(raw.banExpires),
    createdAt: toDateOrNull(raw.createdAt) ?? new Date(0),
  }
}

function toDateOrNull(value: unknown): Date | null {
  if (value instanceof Date) return value
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date
  }
  return null
}
