import type { Metadata } from "next"

import {
  generateIamProfileIdentityMetadata,
  IamProfileIdentityPage,
} from "#features/iam-profile/server"

export default IamProfileIdentityPage

export async function generateMetadata(props: {
  params: Promise<{ locale: string; orgSlug: string }>
}): Promise<Metadata> {
  return generateIamProfileIdentityMetadata(props)
}
