import { describe, expect, it } from "vitest"

import {
  PUBLIC_LYNX_METHOD_NOT_ALLOWED_ERROR,
  createPublicLynxMethodNotAllowedResponse,
} from "#lib/ask-docs/public-lynx.shared"

describe("createPublicLynxMethodNotAllowedResponse", () => {
  it("returns a 405 JSON body for non-POST probes", async () => {
    const response = createPublicLynxMethodNotAllowedResponse()
    expect(response.status).toBe(405)
    await expect(response.json()).resolves.toEqual({
      error: PUBLIC_LYNX_METHOD_NOT_ALLOWED_ERROR,
    })
  })
})
