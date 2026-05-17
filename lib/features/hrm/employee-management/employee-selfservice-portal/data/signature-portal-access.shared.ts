import type { EmployeePortalContext } from "./employee-portal-access.shared"

export function signaturePartyMatchesPortalSession(
  party: {
    readonly signerEmployeeId: string | null
    readonly signerEmail: string
  },
  context: EmployeePortalContext
): boolean {
  if (party.signerEmployeeId) {
    return party.signerEmployeeId === context.employee.id
  }

  const sessionEmail = context.portal.user.email?.trim().toLowerCase()
  if (!sessionEmail) {
    return false
  }

  return party.signerEmail.trim().toLowerCase() === sessionEmail
}
