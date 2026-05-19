export type IamProfileSecuritySessionRow = {
  id: string
  token: string
  createdAt: string
  expiresAt: string
  ipAddress: string | null
  userAgent: string | null
}

export type IamProfileSecurityActivityRow = {
  id: string
  label: string
  createdAt: string
  path: string | null
}
