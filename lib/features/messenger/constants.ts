/** Max operators per messenger room (matches coordination envelope). */
export const MESSENGER_ROOM_MEMBER_LIMIT = 8

/** Ably private channel per org — clients subscribe for realtime message fan-out. */
export function messengerOrgPrivateChannelName(organizationId: string): string {
  return `private-messenger:${organizationId}`
}
