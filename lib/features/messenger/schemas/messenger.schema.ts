import { z } from "zod"

import { MESSENGER_ROOM_MEMBER_LIMIT } from "../constants"

export const createMessengerGroupRoomSchema = z.object({
  name: z.string().trim().min(1).max(140),
  memberUserIds: z
    .array(z.string().min(1))
    .min(1)
    .max(MESSENGER_ROOM_MEMBER_LIMIT - 1),
})

export const sendMessengerMessageSchema = z.object({
  roomId: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
})

export const markMessengerRoomReadSchema = z.object({
  roomId: z.string().min(1),
})

export const ablyMessengerAuthBodySchema = z
  .object({
    /** Reserved for per-room capability narrowing. */
    roomId: z.string().min(1).optional(),
  })
  .strict()
