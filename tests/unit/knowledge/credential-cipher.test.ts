import { describe, expect, it } from "vitest"

import {
  decryptCredential,
  encryptCredential,
} from "#features/knowledge/data/credential-cipher.server"

describe("credential-cipher", () => {
  it("round-trips plaintext", () => {
    process.env.KNOWLEDGE_BYOK_KEY = Buffer.alloc(32, 7).toString("base64")
    const encrypted = encryptCredential("secret-key")
    expect(decryptCredential(encrypted)).toBe("secret-key")
  })

  it("rejects tampered ciphertext", () => {
    process.env.KNOWLEDGE_BYOK_KEY = Buffer.alloc(32, 9).toString("base64")
    const encrypted = encryptCredential("secret-key")
    encrypted.cipherTag = Buffer.alloc(encrypted.cipherTag.length, 0)
    expect(() => decryptCredential(encrypted)).toThrow()
  })
})
