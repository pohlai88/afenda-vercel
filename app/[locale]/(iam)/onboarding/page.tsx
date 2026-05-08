import { AuthPageFrame } from "#components/auth/auth-page-frame"
import { prepareOrganizationSlugAction } from "#features/org-admin"
import { requireAuthShellSignedInSession } from "#lib/auth"

import { OnboardingForm } from "./onboarding-form"
import { OnboardingPendingInvites } from "./onboarding-pending-invites"

export default async function OnboardingPage() {
  const session = await requireAuthShellSignedInSession()

  return (
    <AuthPageFrame>
      <OnboardingPendingInvites userEmail={session.user.email} />
      <OnboardingForm prepareSlugAction={prepareOrganizationSlugAction} />
    </AuthPageFrame>
  )
}
