"use server"

import { revalidatePath } from "next/cache"

import {
  canActInOrganization,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import {
  createLynxOperatorRuntime,
  resolveLynxTruthStreamProviderOptionsForOrg,
} from "#features/lynx"
import { toLocaleOrgAdminRevalidatePattern } from "#lib/i18n/locales.shared"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/tenant"

import {
  deleteOrgBotLink,
  insertOrgBotLink,
  recordOrgBotLinkTestResult,
  setOrgBotLinkEnabled,
  updateOrgBotLink,
} from "../data/bot-link.mutations.server"

export type BotLinkActionState =
  | undefined
  | { ok: true }
  | { ok: false; error: string }

function revalidateIntegrationsPage() {
  revalidatePath(toLocaleOrgAdminRevalidatePattern("/integrations"), "page")
}

export async function createOrgBotLinkAction(
  _prev: BotLinkActionState,
  formData: FormData
): Promise<BotLinkActionState> {
  const session = await requireOrgSession()
  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) return { ok: false, error: "Admin role required." }

  const platform = formData.get("platform")
  if (platform !== "github" && platform !== "discord") {
    return { ok: false, error: "Platform must be github or discord." }
  }

  await insertOrgBotLink({
    organizationId: session.organizationId,
    platform,
    externalWorkspaceId:
      typeof formData.get("externalWorkspaceId") === "string"
        ? String(formData.get("externalWorkspaceId"))
        : undefined,
    externalRepository:
      typeof formData.get("externalRepository") === "string"
        ? String(formData.get("externalRepository"))
        : undefined,
    externalInstallationId:
      typeof formData.get("externalInstallationId") === "string"
        ? String(formData.get("externalInstallationId"))
        : undefined,
    createdByUserId: session.userId,
  })

  void writeIamAuditEventFromNextHeaders({
    action: "org.integration.endpoint.update",
    organizationId: session.organizationId,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "integration.bot_link",
  })

  revalidateIntegrationsPage()
  return { ok: true }
}

export async function deleteOrgBotLinkAction(
  _prev: BotLinkActionState,
  formData: FormData
): Promise<BotLinkActionState> {
  const session = await requireOrgSession()
  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) return { ok: false, error: "Admin role required." }

  const id = formData.get("id")
  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, error: "Missing bot-link id." }
  }

  const deleted = await deleteOrgBotLink({
    organizationId: session.organizationId,
    id,
  })
  if (!deleted) return { ok: false, error: "Bot link not found." }

  void writeIamAuditEventFromNextHeaders({
    action: "org.integration.endpoint.delete",
    organizationId: session.organizationId,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "integration.bot_link",
    resourceId: id,
  })

  revalidateIntegrationsPage()
  return { ok: true }
}

export async function updateOrgBotLinkAction(
  _prev: BotLinkActionState,
  formData: FormData
): Promise<BotLinkActionState> {
  const session = await requireOrgSession()
  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) return { ok: false, error: "Admin role required." }

  const id = formData.get("id")
  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, error: "Missing bot-link id." }
  }

  const updated = await updateOrgBotLink({
    organizationId: session.organizationId,
    id,
    displayName:
      typeof formData.get("displayName") === "string"
        ? String(formData.get("displayName"))
        : undefined,
    externalWorkspaceId:
      typeof formData.get("externalWorkspaceId") === "string"
        ? String(formData.get("externalWorkspaceId"))
        : undefined,
    externalRepository:
      typeof formData.get("externalRepository") === "string"
        ? String(formData.get("externalRepository"))
        : undefined,
    externalInstallationId:
      typeof formData.get("externalInstallationId") === "string"
        ? String(formData.get("externalInstallationId"))
        : undefined,
  })
  if (!updated) return { ok: false, error: "Bot link not found." }

  void writeIamAuditEventFromNextHeaders({
    action: "org.integration.endpoint.update",
    organizationId: session.organizationId,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "integration.bot_link",
    resourceId: id,
  })

  revalidateIntegrationsPage()
  return { ok: true }
}

export async function toggleOrgBotLinkEnabledAction(
  _prev: BotLinkActionState,
  formData: FormData
): Promise<BotLinkActionState> {
  const session = await requireOrgSession()
  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) return { ok: false, error: "Admin role required." }

  const id = formData.get("id")
  const enabled = formData.get("enabled") === "1"
  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, error: "Missing bot-link id." }
  }
  const updated = await setOrgBotLinkEnabled({
    organizationId: session.organizationId,
    id,
    enabled,
  })
  if (!updated) return { ok: false, error: "Bot link not found." }

  void writeIamAuditEventFromNextHeaders({
    action: "org.integration.endpoint.update",
    organizationId: session.organizationId,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "integration.bot_link",
    resourceId: id,
    metadata: { enabled },
  })

  revalidateIntegrationsPage()
  return { ok: true }
}

export async function testOrgBotLinkAction(
  _prev: BotLinkActionState,
  formData: FormData
): Promise<BotLinkActionState> {
  const session = await requireOrgSession()
  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) return { ok: false, error: "Admin role required." }

  const id = formData.get("id")
  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, error: "Missing bot-link id." }
  }

  await recordOrgBotLinkTestResult({
    organizationId: session.organizationId,
    id,
    status: "pending",
  })

  try {
    const runtime = createLynxOperatorRuntime({
      organizationId: session.organizationId,
      executionMode: "background",
    })
    if (!runtime) {
      throw new Error("Lynx runtime unavailable")
    }
    const providerOptions = await resolveLynxTruthStreamProviderOptionsForOrg(
      session.organizationId
    )
    const stream = await runtime.stream({
      prompt: "Health-check: reply with exactly 'ok'.",
      maxOutputTokens: 16,
      ...(providerOptions ? { providerOptions } : {}),
    })
    for await (const chunk of stream.textStream) {
      void chunk
      // Consume stream to validate end-to-end execution.
    }

    await recordOrgBotLinkTestResult({
      organizationId: session.organizationId,
      id,
      status: "ok",
    })

    void writeIamAuditEventFromNextHeaders({
      action: "org.integration.endpoint.ping",
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "integration.bot_link",
      resourceId: id,
    })
    revalidateIntegrationsPage()
    return { ok: true }
  } catch (error) {
    logUnexpectedServerError("org_bot_link_test_failed", error, {
      scope: "action.knowledge.bot_link",
      "erp.module": "knowledge",
      organizationId: session.organizationId,
      botLinkId: id,
    })
    await recordOrgBotLinkTestResult({
      organizationId: session.organizationId,
      id,
      status: "error",
      error: error instanceof Error ? error.message : "Test failed",
    })
    revalidateIntegrationsPage()
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Test failed",
    }
  }
}

/** Native `<form action>` entry — progressive enhancement without `useActionState`. */
export async function createOrgBotLinkFormAction(
  formData: FormData
): Promise<void> {
  void (await createOrgBotLinkAction(undefined, formData))
}

export async function deleteOrgBotLinkFormAction(
  formData: FormData
): Promise<void> {
  void (await deleteOrgBotLinkAction(undefined, formData))
}

export async function updateOrgBotLinkFormAction(
  formData: FormData
): Promise<void> {
  void (await updateOrgBotLinkAction(undefined, formData))
}

export async function toggleOrgBotLinkEnabledFormAction(
  formData: FormData
): Promise<void> {
  void (await toggleOrgBotLinkEnabledAction(undefined, formData))
}

export async function testOrgBotLinkFormAction(
  formData: FormData
): Promise<void> {
  void (await testOrgBotLinkAction(undefined, formData))
}
