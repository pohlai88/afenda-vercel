import "server-only"

import { and, desc, eq, inArray, sql } from "drizzle-orm"

import { db } from "#lib/db"
import {
  messengerMessage,
  messengerRoom,
  messengerRoomMember,
} from "#lib/db/schema"

import type {
  MessengerMessageSummary,
  MessengerRoomKind,
  MessengerRoomSummary,
} from "../types"

export async function listMessengerRoomsForUser(input: {
  organizationId: string
  userId: string
}): Promise<MessengerRoomSummary[]> {
  const rows = await db
    .select({
      id: messengerRoom.id,
      organizationId: messengerRoom.organizationId,
      kind: messengerRoom.kind,
      name: messengerRoom.name,
      lastMessageAt: messengerRoom.lastMessageAt,
    })
    .from(messengerRoom)
    .innerJoin(
      messengerRoomMember,
      and(
        eq(messengerRoomMember.roomId, messengerRoom.id),
        eq(messengerRoomMember.userId, input.userId)
      )
    )
    .where(eq(messengerRoom.organizationId, input.organizationId))
    .orderBy(desc(messengerRoom.lastMessageAt))

  if (rows.length === 0) return []

  const roomIds = rows.map((r) => r.id)
  const previewRows = await db
    .select({
      roomId: messengerMessage.roomId,
      body: messengerMessage.body,
      createdAt: messengerMessage.createdAt,
    })
    .from(messengerMessage)
    .where(
      and(
        inArray(messengerMessage.roomId, roomIds),
        eq(messengerMessage.organizationId, input.organizationId),
        sql`${messengerMessage.deletedAt} is null`
      )
    )
    .orderBy(desc(messengerMessage.createdAt))

  const previewByRoom = new Map<string, string>()
  for (const pr of previewRows) {
    if (!previewByRoom.has(pr.roomId)) {
      previewByRoom.set(pr.roomId, pr.body)
    }
  }

  return rows.map((r) => ({
    id: r.id,
    organizationId: r.organizationId,
    kind: r.kind as MessengerRoomKind,
    name: r.name,
    lastMessageAt: r.lastMessageAt.toISOString(),
    lastMessagePreview: previewByRoom.get(r.id) ?? null,
  }))
}

export async function assertMessengerRoomMembership(input: {
  organizationId: string
  userId: string
  roomId: string
}): Promise<boolean> {
  const [row] = await db
    .select({ id: messengerRoomMember.id })
    .from(messengerRoomMember)
    .innerJoin(messengerRoom, eq(messengerRoomMember.roomId, messengerRoom.id))
    .where(
      and(
        eq(messengerRoomMember.roomId, input.roomId),
        eq(messengerRoomMember.userId, input.userId),
        eq(messengerRoom.organizationId, input.organizationId)
      )
    )
    .limit(1)

  return Boolean(row)
}

export async function listMessengerMessagesForRoom(input: {
  organizationId: string
  roomId: string
  limit?: number
}): Promise<MessengerMessageSummary[]> {
  const take = Math.min(input.limit ?? 200, 500)
  const rows = await db
    .select({
      id: messengerMessage.id,
      roomId: messengerMessage.roomId,
      organizationId: messengerMessage.organizationId,
      authorUserId: messengerMessage.authorUserId,
      body: messengerMessage.body,
      createdAt: messengerMessage.createdAt,
    })
    .from(messengerMessage)
    .where(
      and(
        eq(messengerMessage.roomId, input.roomId),
        eq(messengerMessage.organizationId, input.organizationId),
        sql`${messengerMessage.deletedAt} is null`
      )
    )
    .orderBy(messengerMessage.createdAt)
    .limit(take)

  return rows.map((r) => ({
    id: r.id,
    roomId: r.roomId,
    organizationId: r.organizationId,
    authorUserId: r.authorUserId,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
  }))
}
