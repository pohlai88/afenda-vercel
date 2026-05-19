/**
 * Client-safe IAM profile surface: types, invitation actions, security session actions.
 * Import from `"use client"` modules — not `#features/iam-profile` (server barrel).
 */
export type { SafeLinkedAccount } from "./schemas/accounts.types.shared"
export type { AcceptInviteActionState } from "./actions/accept-invitation.actions"
export type { ChangePasswordResult } from "./actions/security.actions"
export type { IamProfileActionResult } from "./actions/identity.actions"
export {
  acceptOrganizationInvitationAction,
  rejectOrganizationInvitationAction,
} from "./actions/accept-invitation.actions"
export {
  revokeSessionAction,
  revokeOtherSessionsAction,
  changePasswordAction,
} from "./actions/security.actions"
export {
  sendVerificationEmailAction,
  updateDisplayNameAction,
} from "./actions/identity.actions"
export {
  leaveOrganizationAction,
  setActiveOrganizationAction,
} from "./actions/membership.actions"
export { deleteAccountAction } from "./actions/account-lifecycle.actions"
