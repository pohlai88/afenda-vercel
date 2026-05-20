import { configure } from "@testing-library/dom"

import "./vitest.setup.shared"

configure({ asyncUtilTimeout: 10_000 })

/**
 * jsdom does not implement `window.matchMedia` — shadcn `useIsMobile` and any
 * other media-query consumer must work in `*.dom.test.tsx` files.
 *
 * @see https://github.com/jsdom/jsdom/issues/3522
 */
if (typeof globalThis.window !== "undefined" && !globalThis.window.matchMedia) {
  Object.defineProperty(globalThis.window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
