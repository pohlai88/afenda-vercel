"use server"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { neonAuthMember } from "#lib/db/schema-neon-auth"
import {
  messengerMessage,
  messengerRoom,
  messengerRoomMember,
} from "#lib/db/schema"
import { requireOrgSession } from "#lib/auth"

import { MESSENGER_ROOM_MEMBER_LIMIT } from "../constants"
import { MESSENGER_AUDIT_ACTIONS } from "../messenger.contract"
import {
  createMessengerGroupRoomSchema,
  markMessengerRoomReadSchema,
  sendMessengerMessageSchema,
} from "../schemas/messenger.schema"
import { publishMessengerOrgEvent } from "../data/messenger.ably-server"
import {
  assertMessengerRoomMembership,
  listMessengerMessagesForRoom,
  listMessengerRoomsForUser,
} from "../data/messenger.queries.server"

import type {
  MessengerCreateRoomResult,
  MessengerListMessagesResult,
  MessengerListRoomsResult,
  MessengerMarkReadResult,
  MessengerMessageSummary,
  MessengerSendMessageResult,
} from "../types"

export async function listMessengerRoomsAction(): Promise<MessengerListRoomsResult> {
  const org = await requireOrgSession()
  const rooms = await listMessengerRoomsForUser({
    organizationId: org.organizationId,
    userId: org.userId,
  })
  return { ok: true, rooms }
}

export async function listMessengerMessagesAction(input: {
  roomId: string
}): Promise<MessengerListMessagesResult> {
  const org = await requireOrgSession()
  const ok = await assertMessengerRoomMembership({
    organizationId: org.organizationId,
    userId: org.userId,
    roomId: input.roomId,
  })
  if (!ok) return { ok: false, error: "Room not found" }

  const messages = await listMessengerMessagesForRoom({
    organizationId: org.organizationId,
    roomId: input.roomId,
  })
  return { ok: true, messages }
}

export async function createMessengerGroupRoomAction(
  raw: unknown
): Promise<MessengerCreateRoomResult> {
  const org = await requireOrgSession()
  const parsed = createMessengerGroupRoomSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: "Invalid room payload" }
  }

  const memberIds = [...new Set([org.userId, ...parsed.data.memberUserIds])]
  if (memberIds.length > MESSENGER_ROOM_MEMBER_LIMIT) {
    return { ok: false, error: "Too many members" }
  }

  const members = await db
    .select({ userId: neonAuthMember.userId })
    .from(neonAuthMember)
    .where(eq(neonAuthMember.organizationId, org.organizationId))

  const allowed = new Set(members.map((m) => m.userId))
  if (!memberIds.every((id) => allowed.has(id))) {
    return { ok: false, error: "Members must belong to this organization" }
  }

  const now = new Date()
  let roomId = ""
  await db.transaction(async (tx) => {
    const [room] = await tx
      .insert(messengerRoom)
      .values({
        organizationId: org.organizationId,
        kind: "group",
        name: parsed.data.name,
        createdByUserId: org.userId,
        createdAt: now,
        updatedAt: now,
        lastMessageAt: now,
      })
      .returning({ id: messengerRoom.id })

    roomId = room.id

    await tx.insert(messengerRoomMember).values(
      memberIds.map((userId) => ({
        roomId: room.id,
        userId,
        joinedAt: now,
        lastReadAt: userId === org.userId ? now : null,
      }))
    )
  })

  await writeIamAuditEventFromNextHeaders({
    action: MESSENGER_AUDIT_ACTIONS.roomCreate,
    actorUserId: org.userId,
    actorSessionId: org.sessionId,
    organizationId: org.organizationId,
    resourceType: "messenger_room",
    resourceId: roomId,
    metadata: { memberCount: memberIds.length },
  })

  await publishMessengerOrgEvent(org.organizationId, {
    kind: "room.created",
    roomId,
  }).catch(() => {})

  return { ok: true, roomId }
}

export async function sendMessengerMessageAction(
  raw: unknown
): Promise<MessengerSendMessageResult> {
  const org = await requireOrgSession()
  const parsed = sendMessengerMessageSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: "Invalid message" }
  }

  const ok = await assertMessengerRoomMembership({
    organizationId: org.organizationId,
    userId: org.userId,
    roomId: parsed.data.roomId,
  })
  if (!ok) return { ok: false, error: "Room not found" }

  const now = new Date()
  const [inserted] = await db
    .insert(messengerMessage)
    .values({
      roomId: parsed.data.roomId,
      organizationId: org.organizationId,
      authorUserId: org.userId,
      body: parsed.data.body,
      createdAt: now,
    })
    .returning({
      id: messengerMessage.id,
      roomId: messengerMessage.roomId,
      organizationId: messengerMessage.organizationId,
      authorUserId: messengerMessage.authorUserId,
      body: messengerMessage.body,
      createdAt: messengerMessage.createdAt,
    })

  await db
    .update(messengerRoom)
    .set({ lastMessageAt: now, updatedAt: now })
    .where(
      and(
        eq(messengerRoom.id, parsed.data.roomId),
        eq(messengerRoom.organizationId, org.organizationId)
      )
    )

  const message: MessengerMessageSummary = {
    id: inserted.id,
    roomId: inserted.roomId,
    organizationId: inserted.organizationId,
    authorUserId: inserted.authorUserId,
    body: inserted.body,
    createdAt: inserted.createdAt.toISOString(),
  }

  await writeIamAuditEventFromNextHeaders({
    action: MESSENGER_AUDIT_ACTIONS.messageCreate,
    actorUserId: org.userId,
    actorSessionId: org.sessionId,
    organizationId: org.organizationId,
    resourceType: "messenger_message",
    resourceId: message.id,
    metadata: { roomId: parsed.data.roomId },
  })

  await publishMessengerOrgEvent(org.organizationId, {
    kind: "message.created",
    roomId: parsed.data.roomId,
    message: {
      id: message.id,
      authorUserId: message.authorUserId,
      body: message.body,
      createdAt: message.createdAt,
    },
  })

  return { ok: true, message }
}

export async function markMessengerRoomReadAction(
  raw: unknown
): Promise<MessengerMarkReadResult> {
  const org = await requireOrgSession()
  const parsed = markMessengerRoomReadSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: "Invalid room" }
  }

  const ok = await assertMessengerRoomMembership({
    organizationId: org.organizationId,
    userId: org.userId,
    roomId: parsed.data.roomId,
  })
  if (!ok) return { ok: false, error: "Room not found" }

  await db
    .update(messengerRoomMember)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(messengerRoomMember.roomId, parsed.data.roomId),
        eq(messengerRoomMember.userId, org.userId)
      )
    )

  return { ok: true }
}
