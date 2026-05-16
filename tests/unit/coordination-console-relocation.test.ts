import { describe, expect, it } from "vitest"

describe("coordination console relocation", () => {
  it("exposes OperationalCoordinationConsole from the coordination client barrel", async () => {
    const mod = await import("#features/coordination/client")
    expect(mod.OperationalCoordinationConsole).toBeTypeOf("function")
    expect(mod.buildCoordinationUploadPath).toBeTypeOf("function")
  })
})
