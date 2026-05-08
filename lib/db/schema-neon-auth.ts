import {
  pgSchema,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core"

export const neonAuth = pgSchema("neon_auth")

export const neonAuthUser = neonAuth.table("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  role: text("role"),
  banned: boolean("banned"),
  banReason: text("banReason"),
  banExpires: timestamp("banExpires", { mode: "date" }),
  twoFactorEnabled: boolean("twoFactorEnabled"),
  username: text("username"),
  displayUsername: text("displayUsername"),
  lastActiveAt: timestamp("lastActiveAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
})

export const neonAuthSession = neonAuth.table("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  token: text("token").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull(),
  activeOrganizationId: text("activeOrganizationId"),
  activeTeamId: text("activeTeamId"),
  impersonatedBy: text("impersonatedBy"),
})

export const neonAuthAccount = neonAuth.table("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { mode: "date" }),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { mode: "date" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
})

export const neonAuthVerification = neonAuth.table("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
})

export const neonAuthOrganization = neonAuth.table("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  logo: text("logo"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull(),
})

export const neonAuthMember = neonAuth.table("member", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  userId: text("userId").notNull(),
  role: text("role").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull(),
})

export const neonAuthInvitation = neonAuth.table("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").notNull(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  inviterId: text("inviterId").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull(),
})

export const neonAuthJwks = neonAuth.table("jwks", {
  id: integer("id").primaryKey(),
  privateKey: text("private_key").notNull(),
  publicKey: text("public_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  enabled: boolean("enabled").notNull(),
})

export const neonAuthProjectConfig = neonAuth.table("project_config", {
  id: text("id"),
  name: text("name").notNull(),
  endpointId: text("endpoint_id").notNull(),
  trustedOrigins: jsonb("trusted_origins").$type<string[]>(),
  socialProviders: jsonb("social_providers").$type<unknown[]>(),
  emailProvider: jsonb("email_provider").$type<Record<
    string,
    unknown
  > | null>(),
  emailAndPassword: jsonb("email_and_password").$type<Record<
    string,
    unknown
  > | null>(),
  allowLocalhost: boolean("allow_localhost"),
  pluginConfigs: jsonb("plugin_configs").$type<Record<
    string,
    unknown
  > | null>(),
  webhookConfig: jsonb("webhook_config").$type<Record<
    string,
    unknown
  > | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
})
