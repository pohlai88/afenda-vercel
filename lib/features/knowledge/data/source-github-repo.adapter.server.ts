import "server-only"

import { z } from "zod"

import type { KnowledgeSourceAdapter } from "./source-adapter.server"

const MAX_DOCS_PER_SYNC = 300
const DEFAULT_REF = "HEAD"
const ALLOWED_EXTENSIONS = [".md", ".mdx", ".txt"]

const githubRepoConfigSchema = z.object({
  owner: z.string().trim().min(1),
  repo: z.string().trim().min(1),
  ref: z.string().trim().min(1).optional(),
  includePaths: z.array(z.string().trim().min(1)).optional(),
  excludePaths: z.array(z.string().trim().min(1)).optional(),
})

type GitHubTreeResponse = {
  tree?: Array<{ path?: string; type?: string; sha?: string }>
}

type GitHubBlobResponse = {
  content?: string
  encoding?: string
}

function isAllowedFilePath(path: string): boolean {
  const lower = path.toLowerCase()
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

function pathIncluded(
  path: string,
  includePaths: readonly string[] | undefined,
  excludePaths: readonly string[] | undefined
): boolean {
  const included =
    !includePaths?.length ||
    includePaths.some((prefix) => path.startsWith(prefix))
  if (!included) return false
  const excluded =
    excludePaths?.length &&
    excludePaths.some((prefix) => path.startsWith(prefix))
  return !excluded
}

function githubHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN?.trim()
  if (!token) return { Accept: "application/vnd.github+json" }
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
  }
}

async function getGitTree(args: {
  owner: string
  repo: string
  ref: string
}): Promise<GitHubTreeResponse> {
  const url = `https://api.github.com/repos/${args.owner}/${args.repo}/git/trees/${args.ref}?recursive=1`
  const res = await fetch(url, { headers: githubHeaders(), cache: "no-store" })
  if (!res.ok) {
    throw new Error(`GitHub tree fetch failed (${res.status})`)
  }
  return (await res.json()) as GitHubTreeResponse
}

async function getBlob(args: {
  owner: string
  repo: string
  sha: string
}): Promise<string> {
  const url = `https://api.github.com/repos/${args.owner}/${args.repo}/git/blobs/${args.sha}`
  const res = await fetch(url, { headers: githubHeaders(), cache: "no-store" })
  if (!res.ok) {
    throw new Error(`GitHub blob fetch failed (${res.status})`)
  }
  const body = (await res.json()) as GitHubBlobResponse
  if (!body.content || body.encoding !== "base64") {
    throw new Error("GitHub blob response missing base64 content")
  }
  return Buffer.from(body.content, "base64").toString("utf8")
}

export const githubRepoSourceAdapter: KnowledgeSourceAdapter<
  z.infer<typeof githubRepoConfigSchema>
> = {
  id: "github_repo",
  configSchema: githubRepoConfigSchema,
  async *listDocuments(_ctx, config) {
    const ref = config.ref ?? DEFAULT_REF
    const tree = await getGitTree({
      owner: config.owner,
      repo: config.repo,
      ref,
    })
    const fileNodes = (tree.tree ?? []).filter(
      (node) =>
        node.type === "blob" &&
        Boolean(node.path) &&
        Boolean(node.sha) &&
        isAllowedFilePath(node.path!) &&
        pathIncluded(node.path!, config.includePaths, config.excludePaths)
    )

    for (const node of fileNodes.slice(0, MAX_DOCS_PER_SYNC)) {
      const path = node.path!
      const sha = node.sha!
      const body = await getBlob({
        owner: config.owner,
        repo: config.repo,
        sha,
      })
      const title = path.split("/").pop() ?? path
      yield {
        externalId: `${config.owner}/${config.repo}/${path}@${sha}`,
        title,
        body,
        mimeType: "text/plain",
        metadata: {
          repo: `${config.owner}/${config.repo}`,
          path,
          ref,
          sha,
        },
      }
    }
  },
}
