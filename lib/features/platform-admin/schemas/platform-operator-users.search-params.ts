import {
  createLoader,
  createSerializer,
  parseAsInteger,
  parseAsString,
} from "nuqs/server"

import { PLATFORM_ADMIN_USERS_SEARCH_MAX_LENGTH } from "../constants"

export const platformOperatorUsersSearchParams = {
  q: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
}

export const loadPlatformOperatorUsersSearchParams = createLoader(
  platformOperatorUsersSearchParams
)

export const serializePlatformOperatorUsersSearchParams = createSerializer(
  platformOperatorUsersSearchParams
)

export type PlatformOperatorUsersSearchParamsLoaded = Awaited<
  ReturnType<typeof loadPlatformOperatorUsersSearchParams>
>

export function sanitizePlatformOperatorUsersSearchParams(
  loaded: PlatformOperatorUsersSearchParamsLoaded
) {
  const q = loaded.q.trim().slice(0, PLATFORM_ADMIN_USERS_SEARCH_MAX_LENGTH)
  const page = Number.isFinite(loaded.page) && loaded.page >= 1 ? loaded.page : 1
  return { q, page }
}
