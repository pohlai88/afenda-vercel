export type MessengerRoomKind = "direct" | "group"

export type MessengerRoomSummary = {
  id: string
  organizationId: string
  kind: MessengerRoomKind
  name: string | null
  lastMessageAt: string
  lastMessagePreview: string | null
}

export type MessengerMessageSummary = {
  id: string
  roomId: string
  organizationId: string
  authorUserId: string
  body: string
  createdAt: string
}

export type MessengerActionError = {
  ok: false
  error: string
}

export type MessengerListRoomsResult =
  | { ok: true; rooms: MessengerRoomSummary[] }
  | MessengerActionError

export type MessengerListMessagesResult =
  | { ok: true; messages: MessengerMessageSummary[] }
  | MessengerActionError

export type MessengerCreateRoomResult =
  | { ok: true; roomId: string }
  | MessengerActionError

export type MessengerSendMessageResult =
  | { ok: true; message: MessengerMessageSummary }
  | MessengerActionError

export type MessengerMarkReadResult = { ok: true } | MessengerActionError
