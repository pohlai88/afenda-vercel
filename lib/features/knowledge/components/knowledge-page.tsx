import { ModulePageHeader } from "#features/governed-surface"
import { requireOrgSession } from "#lib/auth"

import { listRecentKnowledgeChunks } from "../data/knowledge-chunk.queries"
import { AddKnowledgeChunkForm } from "./add-chunk-form"
import { SearchKnowledgeChunksForm } from "./search-chunks-form"

export async function KnowledgePage() {
  const org = await requireOrgSession()
  const recent = await listRecentKnowledgeChunks(org.organizationId, 12)

  return (
    <div className="space-y-8">
      <ModulePageHeader
        title="Knowledge"
        description="Add text chunks and search by meaning with pgvector embeddings."
        eyebrow="RAG MVP"
      />

      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
        <h2 className="font-medium">Add chunk</h2>
        <p className="text-sm text-muted-foreground">
          Embeddings use openai/text-embedding-3-small (1536 dimensions) routed
          through Vercel AI Gateway.
        </p>
        <AddKnowledgeChunkForm />
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
        <h2 className="font-medium">Similarity search</h2>
        <p className="text-sm text-muted-foreground">
          Cosine distance over stored vectors — results are scoped to your
          organization only.
        </p>
        <SearchKnowledgeChunksForm />
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Recent chunks</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No chunks yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {recent.map((row) => (
              <li key={row.id} className="rounded-lg border bg-card px-3 py-2">
                <span className="font-medium">{row.title}</span>
                <p className="line-clamp-2 text-muted-foreground">{row.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
