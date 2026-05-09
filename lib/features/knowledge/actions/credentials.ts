"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import {
  canActInOrganization,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { toLocaleOrgAdminRevalidatePattern } from "#lib/i18n/locales.shared"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/tenant"

import {
  deleteOrgProviderCredential,
  setOrgProviderCredentialState,
  upsertOrgProviderCredential,
} from "../data/credential.mutations.server"

const BYOK_AUDIT_ACTIONS = {
  create: "org.integration.byok.create",
  rotate: "org.integration.byok.rotate",
  update: "org.integration.byok.update",
  delete: "org.integration.byok.delete",
} as const

export type CredentialActionState =
  | undefined
  | { ok: true; secretShown?: string }
  | { ok: false; error: string }

function integrationsPathPattern() {
  return toLocaleOrgAdminRevalidatePattern("/integrations")
}

async function requireAdminOrgSession() {
  const session = await requireOrgSession()
  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) throw new Error("Admin role required.")
  return session
}

export async function createKnowledgeCredentialAction(
  _prev: CredentialActionState,
  formData: FormData
): Promise<CredentialActionState> {
  let organizationId: string | undefined
  let providerForLog: string | undefined
  try {
    const session = await requireAdminOrgSession()
    organizationId = session.organizationId
    const provider = String(formData.get("provider") ?? "").trim()
    providerForLog = provider || undefined
    const secret = String(formData.get("secret") ?? "").trim()
    if (!provider || !secret) {
      return { ok: false, error: "Provider and secret are required." }
    }
    await upsertOrgProviderCredential({
      organizationId: session.organizationId,
      provider,
      plaintext: secret,
      createdByUserId: session.userId,
    })
    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: BYOK_AUDIT_ACTIONS.create,
        organizationId: session.organizationId,
        actorUserId: session.userId,
        actorSessionId: session.sessionId,
        resourceType: "integration.byok",
        resourceId: provider,
      })
    )
    revalidatePath(integrationsPathPattern(), "page")
    return { ok: true, secretShown: secret }
  } catch (error) {
    logUnexpectedServerError("knowledge_byok_create_failed", error, {
      scope: "action.knowledge.credentials",
      "erp.module": "knowledge",
      ...(organizationId !== undefined ? { organizationId } : {}),
      ...(providerForLog !== undefined ? { provider: providerForLog } : {}),
    })
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not save credential.",
    }
  }
}

export async function rotateKnowledgeCredentialAction(
  _prev: CredentialActionState,
  formData: FormData
): Promise<CredentialActionState> {
  let organizationId: string | undefined
  let providerForLog: string | undefined
  try {
    const session = await requireAdminOrgSession()
    organizationId = session.organizationId
    const provider = String(formData.get("provider") ?? "").trim()
    providerForLog = provider || undefined
    const secret = String(formData.get("secret") ?? "").trim()
    if (!provider || !secret) {
      return { ok: false, error: "Provider and secret are required." }
    }
    await setOrgProviderCredentialState({
      organizationId: session.organizationId,
      provider,
      state: "rotating",
      enabled: true,
    })
    await upsertOrgProviderCredential({
      organizationId: session.organizationId,
      provider,
      plaintext: secret,
      createdByUserId: session.userId,
    })
    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: BYOK_AUDIT_ACTIONS.rotate,
        organizationId: session.organizationId,
        actorUserId: session.userId,
        actorSessionId: session.sessionId,
        resourceType: "integration.byok",
        resourceId: provider,
      })
    )
    revalidatePath(integrationsPathPattern(), "page")
    return { ok: true, secretShown: secret }
  } catch (error) {
    logUnexpectedServerError("knowledge_byok_rotate_failed", error, {
      scope: "action.knowledge.credentials",
      "erp.module": "knowledge",
      ...(organizationId !== undefined ? { organizationId } : {}),
      ...(providerForLog !== undefined ? { provider: providerForLog } : {}),
    })
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not rotate credential.",
    }
  }
}

export async function toggleKnowledgeCredentialAction(
  _prev: CredentialActionState,
  formData: FormData
): Promise<CredentialActionState> {
  let organizationId: string | undefined
  let providerForLog: string | undefined
  try {
    const session = await requireAdminOrgSession()
    organizationId = session.organizationId
    const provider = String(formData.get("provider") ?? "").trim()
    providerForLog = provider || undefined
    const enabled = formData.get("enabled") === "1"
    if (!provider) return { ok: false, error: "Provider is required." }
    const state = enabled ? "active" : "disabled"
    const updated = await setOrgProviderCredentialState({
      organizationId: session.organizationId,
      provider,
      state,
      enabled,
    })
    if (!updated) return { ok: false, error: "Credential not found." }
    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: BYOK_AUDIT_ACTIONS.update,
        organizationId: session.organizationId,
        actorUserId: session.userId,
        actorSessionId: session.sessionId,
        resourceType: "integration.byok",
        resourceId: provider,
        metadata: { enabled },
      })
    )
    revalidatePath(integrationsPathPattern(), "page")
    return { ok: true }
  } catch (error) {
    logUnexpectedServerError("knowledge_byok_toggle_failed", error, {
      scope: "action.knowledge.credentials",
      "erp.module": "knowledge",
      ...(organizationId !== undefined ? { organizationId } : {}),
      ...(providerForLog !== undefined ? { provider: providerForLog } : {}),
    })
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not update credential.",
    }
  }
}

export async function deleteKnowledgeCredentialAction(
  _prev: CredentialActionState,
  formData: FormData
): Promise<CredentialActionState> {
  let organizationId: string | undefined
  let providerForLog: string | undefined
  try {
    const session = await requireAdminOrgSession()
    organizationId = session.organizationId
    const provider = String(formData.get("provider") ?? "").trim()
    providerForLog = provider || undefined
    if (!provider) return { ok: false, error: "Provider is required." }
    const deleted = await deleteOrgProviderCredential({
      organizationId: session.organizationId,
      provider,
    })
    if (!deleted) return { ok: false, error: "Credential not found." }
    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: BYOK_AUDIT_ACTIONS.delete,
        organizationId: session.organizationId,
        actorUserId: session.userId,
        actorSessionId: session.sessionId,
        resourceType: "integration.byok",
        resourceId: provider,
      })
    )
    revalidatePath(integrationsPathPattern(), "page")
    return { ok: true }
  } catch (error) {
    logUnexpectedServerError("knowledge_byok_delete_failed", error, {
      scope: "action.knowledge.credentials",
      "erp.module": "knowledge",
      ...(organizationId !== undefined ? { organizationId } : {}),
      ...(providerForLog !== undefined ? { provider: providerForLog } : {}),
    })
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not delete credential.",
    }
  }
}

export async function createKnowledgeCredentialFormAction(
  formData: FormData
): Promise<void> {
  void (await createKnowledgeCredentialAction(undefined, formData))
}

export async function rotateKnowledgeCredentialFormAction(
  formData: FormData
): Promise<void> {
  void (await rotateKnowledgeCredentialAction(undefined, formData))
}

export async function toggleKnowledgeCredentialFormAction(
  formData: FormData
): Promise<void> {
  void (await toggleKnowledgeCredentialAction(undefined, formData))
}

export async function deleteKnowledgeCredentialFormAction(
  formData: FormData
): Promise<void> {
  void (await deleteKnowledgeCredentialAction(undefined, formData))
}
