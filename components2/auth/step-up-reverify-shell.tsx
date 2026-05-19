import type { Route } from "next"

import { AuthPageFrame } from "./auth-page-frame"
import { SignInForm } from "./sign-in-form.client"

export function StepUpReverifyShell({
  title,
  subtitle,
  postAuthPath,
  formKey,
  enabledSocialProviders,
}: {
  title: string
  subtitle: string
  postAuthPath: Route
  formKey: string
  enabledSocialProviders: string[]
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <AuthPageFrame>
        <SignInForm
          key={formKey}
          postAuthPath={postAuthPath}
          stepUp
          enabledSocialProviders={[...enabledSocialProviders]}
          initialMode="sign-in"
        />
      </AuthPageFrame>
    </div>
  )
}
