import "server-only"

import { z } from "zod"

import {
  countContactsForOrganization,
  listRecentContactsForOrganization,
} from "#features/contacts"
import {
  embedKnowledgeText,
  findSimilarKnowledgeChunks,
  listRecentKnowledgeChunks,
} from "#features/knowledge"
import { countActiveImportJobsForOrganization } from "#features/org-admin"

import { LYNX_TRUTH_TOP_K } from "../constants"
import type { LynxOperatorEvidenceHit } from "../types"
import type { LynxOperatorToolRegistry } from "./operator-tool-registry.server"

function excerptBody(body: string, maxLen: number): string {
  if (body.length <= maxLen) return body
  return `${body.slice(0, maxLen)}…`
}

const orgRecentContactsInputSchema = z.object({
  limit: z.number().int().min(1).max(20).optional(),
})

const orgRecentKnowledgeChunksInputSchema = z.object({
  limit: z.number().int().min(1).max(24).optional(),
})

const orgSearchKnowledgeInputSchema = z.object({
  query: z.string().min(1).max(2000),
  topK: z.number().int().min(1).max(20).optional(),
})

const emptyOperatorToolInputSchema = z.object({})

function toEvidenceHit(row: {
  id: string
  title: string
  body: string
  distance: number
  createdAt: Date
}): LynxOperatorEvidenceHit {
  return {
    id: row.id,
    title: row.title,
    excerpt: excerptBody(row.body, 300),
    distance: row.distance,
    sourceType: "knowledge_chunk",
    sourceId: row.id,
    updatedAt: row.createdAt.toISOString(),
  }
}

/**
 * Tenant-bound governed registry — `organizationId` must come from the session, never from model args.
 * Tool order and ids must match `LYNX_OPERATOR_TOOL_IDS` (enforced by unit tests).
 */
export function createLynxOperatorToolRegistry(
  organizationId: string
): LynxOperatorToolRegistry {
  return [
    {
      id: "org_contact_count",
      description:
        "Returns the total number of contacts in this organization's directory. Use when the user asks how many contacts they have or needs that count to reason about workload.",
      risk: "low",
      category: "contacts",
      access: "read",
      dataSensitivity: "none",
      audit: "silent",
      schema: emptyOperatorToolInputSchema,
      execute: async (input: unknown) => {
        emptyOperatorToolInputSchema.parse(input)
        const totalContacts = await countContactsForOrganization(organizationId)
        return { totalContacts }
      },
    },
    {
      id: "org_recent_contacts",
      description:
        "Returns the most recently created contacts (name, email, id). Use for 'what did we add recently' or sample records.",
      risk: "low",
      category: "contacts",
      access: "read",
      dataSensitivity: "medium",
      audit: "record",
      schema: orgRecentContactsInputSchema,
      execute: async (input: unknown) => {
        const { limit: rawLimit } = orgRecentContactsInputSchema.parse(input)
        const limit = rawLimit ?? 5
        const rows = await listRecentContactsForOrganization(
          organizationId,
          limit
        )
        return {
          contacts: rows.map((r) => ({
            id: r.id,
            name: r.name,
            email: r.email,
            createdAt: r.createdAt.toISOString(),
          })),
        }
      },
    },
    {
      id: "org_recent_knowledge_chunks",
      description:
        "Returns recent knowledge chunks stored for this organization (title and excerpt). Use to see what evidence exists before deeper search.",
      risk: "low",
      category: "knowledge",
      access: "read",
      dataSensitivity: "low",
      audit: "silent",
      schema: orgRecentKnowledgeChunksInputSchema,
      execute: async (input: unknown) => {
        const { limit: rawLimit } =
          orgRecentKnowledgeChunksInputSchema.parse(input)
        const limit = rawLimit ?? 8
        const rows = await listRecentKnowledgeChunks(organizationId, limit)
        return {
          chunks: rows.map((r) => ({
            id: r.id,
            title: r.title,
            excerpt: excerptBody(r.body, 240),
            createdAt: r.createdAt.toISOString(),
          })),
        }
      },
    },
    {
      id: "org_search_knowledge",
      description:
        "Semantic search over stored knowledge chunks for this organization. Use when the user asks policy/process questions grounded in written evidence.",
      risk: "low",
      category: "knowledge",
      access: "read",
      dataSensitivity: "low",
      audit: "record",
      schema: orgSearchKnowledgeInputSchema,
      execute: async (input: unknown) => {
        if (!process.env.OPENAI_API_KEY?.trim()) {
          throw new Error("EMBED_UNAVAILABLE")
        }
        const parsed = orgSearchKnowledgeInputSchema.parse(input)
        const topK = parsed.topK ?? LYNX_TRUTH_TOP_K
        const queryEmbedding = await embedKnowledgeText(parsed.query)
        const rows = await findSimilarKnowledgeChunks(
          organizationId,
          queryEmbedding,
          topK
        )
        return {
          hits: rows.map((r) => toEvidenceHit(r)),
        }
      },
    },
    {
      id: "org_active_import_jobs",
      description:
        "Returns how many CSV import jobs are still in progress (uploaded or running) for this organization.",
      risk: "low",
      category: "operations",
      access: "read",
      dataSensitivity: "low",
      audit: "silent",
      schema: emptyOperatorToolInputSchema,
      execute: async (input: unknown) => {
        emptyOperatorToolInputSchema.parse(input)
        const activeImportJobs =
          await countActiveImportJobsForOrganization(organizationId)
        return { activeImportJobs }
      },
    },
  ]
}
