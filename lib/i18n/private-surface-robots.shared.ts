import type { Metadata } from "next"

/**
 * Auth (`/(auth)`) and signed-in IAM shells should not be indexed as standalone landing URLs.
 * Compose into `generateMetadata` / `metadata` exports (Metadata API merges down the tree).
 *
 * @see https://nextjs.org/docs/app/getting-started/metadata-and-og-images
 */
export const PRIVATE_SURFACE_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
}
