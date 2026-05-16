/** Stub for `next-intl/navigation` in Vitest (avoids nested `next/navigation` peer resolution). */
export function createNavigation() {
  return {
    Link: ({ children }: { children?: unknown }) => children,
    redirect: () => undefined,
    usePathname: () => "/",
    useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
    getPathname: () => "/",
  }
}
