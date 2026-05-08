import { AuthPageFrame } from "#components/auth/auth-page-frame"
import { requireSignedInSession } from "#lib/auth-v2"

import { OnboardingForm } from "./onboarding-form"
import { OnboardingPendingInvites } from "./onboarding-pending-invites"

export default async function OnboardingPage() {
  const session = await requireSignedInSession()

  return (
    <AuthPageFrame>
      <OnboardingPendingInvites userEmail={session.user.email} />
      <OnboardingForm />
    </AuthPageFrame>
  )
}
