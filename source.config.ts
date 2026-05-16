import { applyMdxPreset, defineConfig, defineDocs } from "fumadocs-mdx/config"
import jsonSchema from "fumadocs-mdx/plugins/json-schema"
import lastModified from "fumadocs-mdx/plugins/last-modified"
import type { RehypeCodeOptions } from "fumadocs-core/mdx-plugins"
import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins"
import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins/rehype-code"
import { metaSchema, pageSchema } from "fumadocs-core/source/schema"
import { remarkTypeScriptToJavaScript } from "fumadocs-docgen/remark-ts2js"
import { transformerTwoslash } from "fumadocs-twoslash"
import { createFileSystemTypesCache } from "fumadocs-twoslash/cache-fs"
import {
  createFileSystemGeneratorCache,
  createGenerator,
  remarkAutoTypeTable,
} from "fumadocs-typescript"
import { z } from "zod"

/**
 * `BuildEnvironment` is an internal type in fumadocs-mdx not re-exported from the
 * public config surface. Derive it structurally from the `applyMdxPreset` return
 * signature rather than reaching into an internal module or using `any`.
 *
 * applyMdxPreset(opts) → (environment: BuildEnvironment) → Promise<ProcessorOptions>
 * Parameters<ReturnType<...>>[0]  →  'bundler' | 'runtime'
 */
type MdxBuildEnvironment = Parameters<ReturnType<typeof applyMdxPreset>>[0]

const typescriptGenerator = createGenerator({
  cache: createFileSystemGeneratorCache(".next/fumadocs-typescript"),
})

const twoslashTypesCache = createFileSystemTypesCache()

/** Locale routing for ask-docs lives in `askDocsI18n` (`lib/ask-docs-source.ts`); fumadocs-mdx `defineDocs` has no `i18n` field in v15. */
export const docs = defineDocs({
  dir: "content/ask-docs",
  docs: {
    schema: pageSchema.extend({
      audience: z.enum(["admin", "employee", "developer"]).optional(),
      status: z.enum(["draft", "beta", "stable"]).default("stable"),
      lastReviewedAt: z.iso.date().optional(),
    }),
    postprocess: {
      includeProcessedMarkdown: true,
      extractLinkReferences: true,
    },
    async: true,
    async mdxOptions(environment: MdxBuildEnvironment) {
      const { remarkSteps } =
        await import("fumadocs-core/mdx-plugins/remark-steps")
      const rehypeCodeOptions: RehypeCodeOptions = {
        inline: "tailing-curly-colon",
        themes: {
          light: "catppuccin-latte",
          dark: "catppuccin-mocha",
        },
        transformers: [
          ...(rehypeCodeDefaultOptions.transformers ?? []),
          transformerTwoslash({
            typesCache: twoslashTypesCache,
          }),
        ],
      }
      return applyMdxPreset({
        rehypeCodeOptions,
        remarkCodeTabOptions: {
          parseMdx: true,
        },
        remarkNpmOptions: {
          persist: {
            id: "package-manager",
          },
        },
        remarkImageOptions: {
          placeholder: "blur",
        },
        remarkPlugins: [
          remarkMdxMermaid,
          [remarkAutoTypeTable, { generator: typescriptGenerator }],
          remarkTypeScriptToJavaScript,
          remarkSteps,
        ],
      })(environment)
    },
  },
  meta: {
    schema: metaSchema,
  },
})

export default defineConfig({
  // Reads git history to populate `page.data.lastModified` (Date | undefined) for each document.
  plugins: [lastModified(), jsonSchema({ insert: true })],
})
