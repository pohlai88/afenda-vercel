import { Suspense } from "react"

import { AuthPageFrame } from "#components2/auth/auth-page-frame"

import { ResetPasswordSection } from "#components2/auth/reset-password-form.client"

export default function ResetPasswordPage() {
  return (
    <AuthPageFrame>
      <Suspense fallback={null}>
        <ResetPasswordSection />
      </Suspense>
    </AuthPageFrame>
  )
}
