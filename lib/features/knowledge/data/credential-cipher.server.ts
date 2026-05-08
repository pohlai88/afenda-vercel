import "server-only"

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const IV_BYTES = 12
const AUTH_TAG_BYTES = 16

function keyByVersion(version: number): Buffer {
  if (version !== 1) {
    throw new Error(`Unsupported keyVersion ${version}`)
  }

  const raw = process.env.KNOWLEDGE_BYOK_KEY?.trim()
  if (!raw) {
    throw new Error("KNOWLEDGE_BYOK_KEY is required for BYOK operations")
  }
  const key = Buffer.from(raw, "base64")
  if (key.length !== 32) {
    throw new Error("KNOWLEDGE_BYOK_KEY must decode to 32 bytes")
  }
  return key
}

export function encryptCredential(plaintext: string): {
  cipherText: Buffer
  cipherIv: Buffer
  cipherTag: Buffer
  keyVersion: number
} {
  const keyVersion = 1
  const key = keyByVersion(keyVersion)
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  if (tag.length !== AUTH_TAG_BYTES) {
    throw new Error("Unexpected auth tag length")
  }
  return {
    cipherText: ciphertext,
    cipherIv: iv,
    cipherTag: tag,
    keyVersion,
  }
}

export function decryptCredential(record: {
  cipherText: Buffer
  cipherIv: Buffer
  cipherTag: Buffer
  keyVersion: number
}): string {
  const key = keyByVersion(record.keyVersion)
  const decipher = createDecipheriv("aes-256-gcm", key, record.cipherIv)
  decipher.setAuthTag(record.cipherTag)
  const plaintext = Buffer.concat([
    decipher.update(record.cipherText),
    decipher.final(),
  ])
  return plaintext.toString("utf8")
}
