import Link from "next/link"

import { AfendaBrandLockup } from "#components/afenda-brand"

import { OnboardingForm } from "./onboarding-form"

export default function OnboardingPage() {
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
      <OnboardingForm />
    </div>
  )
}
