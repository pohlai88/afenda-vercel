import { z } from "zod"

/** Row contract for the `member_invite` ingestion adapter. */
export const memberInviteRowSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  role: z.enum(["member", "admin"]).default("member"),
})

export type MemberInviteRow = z.infer<typeof memberInviteRowSchema>
