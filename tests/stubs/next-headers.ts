/** Stub for `next/headers` used by Vitest's Node environment. */
export const headers = () => Promise.resolve(new Headers())
export const cookies = () =>
  Promise.resolve({
    get: () => undefined,
    getAll: () => [],
    has: () => false,
  })
export const draftMode = () => Promise.resolve({ isEnabled: false })
