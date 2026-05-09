import "server-only"

import type { KnowledgeSourceKind } from "#features/knowledge/constants"

import type { KnowledgeSourceAdapter } from "./source-adapter.server"
import { githubRepoSourceAdapter } from "./source-github-repo.adapter.server"
import { onethingSourceAdapter } from "./source-onething.adapter.server"

type AnyKnowledgeSourceAdapter = KnowledgeSourceAdapter<Record<string, unknown>>

const SOURCES: Partial<Record<KnowledgeSourceKind, AnyKnowledgeSourceAdapter>> =
  {
    github_repo:
      githubRepoSourceAdapter as unknown as AnyKnowledgeSourceAdapter,
    onething: onethingSourceAdapter as unknown as AnyKnowledgeSourceAdapter,
  }

export function getKnowledgeSourceAdapter(
  kind: KnowledgeSourceKind
): KnowledgeSourceAdapter<Record<string, unknown>> | null {
  return SOURCES[kind] ?? null
}
