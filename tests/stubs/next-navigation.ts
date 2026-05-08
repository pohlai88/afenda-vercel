/** Stub for `next/navigation` used by Vitest's Node environment. */
export const useRouter = () => ({
  push: () => undefined,
  replace: () => undefined,
  prefetch: () => undefined,
  back: () => undefined,
  forward: () => undefined,
  refresh: () => undefined,
})
export const usePathname = () => "/"
export const useSearchParams = () => new URLSearchParams()
export const useParams = () => ({})
export const redirect = (url: string): never => {
  throw new Error(`redirect: ${url}`)
}
export const notFound = (): never => {
  throw new Error("notFound")
}
export const permanentRedirect = (url: string): never => {
  throw new Error(`permanentRedirect: ${url}`)
}
export const useSelectedLayoutSegment = () => null
export const useSelectedLayoutSegments = () => []
