import type { Metadata } from "next"

import {
  generateIamProfileSecurityMetadata,
  IamProfileSecurityPage,
} from "#features/iam-profile/server"

export default IamProfileSecurityPage

export async function generateMetadata(props: {
  params: Promise<{ locale: string; orgSlug: string }>
}): Promise<Metadata> {
  return generateIamProfileSecurityMetadata(props)
}
