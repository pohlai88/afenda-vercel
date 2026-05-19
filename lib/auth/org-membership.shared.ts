export type IamSessionUserFields = {
  email: string
  name: string | null
  role: string | null
}

export type BetterAuthSessionUserLike = {
  id: string
  email: string
  name?: string | null
  role?: string | null
  emailVerified?: boolean
}

export function mapIamSessionUser(
  user: BetterAuthSessionUserLike
): { userId: string; user: IamSessionUserFields } {
  return {
    userId: user.id,
    user: {
      email: user.email,
      name: user.name ?? null,
      role: user.role ?? null,
    },
  }
}
