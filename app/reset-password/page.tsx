import Link from "next/link"

import { AfendaBrandLockup } from "#components/afenda-brand"

import { ResetPasswordSection } from "./reset-password-form"

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-6 px-4">
      <div className="flex justify-center">
        <Link
          href="/"
          className="rounded-md outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <AfendaBrandLockup priority />
        </Link>
      </div>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Set a new password
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose a strong password you have not used here before.
        </p>
      </div>
      <ResetPasswordSection />
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/sign-in" className="underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
