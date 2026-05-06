import Link from "next/link"

import { AfendaBrandLockup } from "#components/afenda-brand"
import { resolvePostAuthCallbackUrl } from "#lib/auth/callback-path"

import { SignInForm } from "./sign-in-form"

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string | string[] | undefined
    stepUp?: string | string[] | undefined
  }>
}) {
  const sp = await searchParams
  const raw = sp.callbackUrl
  const q =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined
  const postAuthPath = resolvePostAuthCallbackUrl(q)
  const stepRaw = sp.stepUp
  const stepUp =
    stepRaw === "1" ||
    stepRaw === "true" ||
    (Array.isArray(stepRaw) && stepRaw.some((v) => v === "1" || v === "true"))
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
      <SignInForm postAuthPath={postAuthPath} stepUp={stepUp} />
    </div>
  )
}
