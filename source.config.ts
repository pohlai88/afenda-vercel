import { defineConfig, defineDocs } from "fumadocs-mdx/config"
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

const typescriptGenerator = createGenerator({
  cache: createFileSystemGeneratorCache(".next/fumadocs-typescript"),
})

const twoslashTypesCache = createFileSystemTypesCache()

export const docs = defineDocs({
  dir: "content/help-docs",
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
  },
  meta: {
    schema: metaSchema,
  },
})

export default defineConfig({
  // Reads git history to populate `page.data.lastModified` (Date | undefined) for each document.
  plugins: [lastModified(), jsonSchema({ insert: true })],
  mdxOptions: {
    remarkPlugins: [
      remarkMdxMermaid,
      [remarkAutoTypeTable, { generator: typescriptGenerator }],
      remarkTypeScriptToJavaScript,
    ],
    // Blur-up placeholder for images referenced in MDX (Next.js only).
    // The built-in remarkImage plugin transforms `![](./img.png)` into next/image imports;
    // `placeholder: "blur"` pre-generates a low-quality placeholder at build time.
    remarkImageOptions: {
      placeholder: "blur",
    },
    // Enable inline code syntax highlighting.
    // Syntax: `value{:lang}` e.g. `const x = 1{:ts}` or `SELECT *{:sql}`
    // Without the `{:lang}` suffix, inline code renders as plain text (backward-compatible).
    rehypeCodeOptions: {
      ...rehypeCodeDefaultOptions,
      inline: "tailing-curly-colon",
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        transformerTwoslash({
          typesCache: twoslashTypesCache,
        }),
      ],
    } as RehypeCodeOptions,
  },
})
