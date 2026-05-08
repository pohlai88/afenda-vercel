import { Suspense } from "react"

import { AuthPageFrame } from "#components/auth/auth-page-frame"

import { ResetPasswordSection } from "./reset-password-form"

export default function ResetPasswordPage() {
  return (
    <AuthPageFrame>
      <Suspense fallback={null}>
        <ResetPasswordSection />
      </Suspense>
    </AuthPageFrame>
  )
}
