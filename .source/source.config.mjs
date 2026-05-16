// source.config.ts
import { applyMdxPreset, defineConfig, defineDocs } from "fumadocs-mdx/config";
import jsonSchema from "fumadocs-mdx/plugins/json-schema";
import lastModified from "fumadocs-mdx/plugins/last-modified";
import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins";
import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins/rehype-code";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { remarkTypeScriptToJavaScript } from "fumadocs-docgen/remark-ts2js";
import { transformerTwoslash } from "fumadocs-twoslash";
import { createFileSystemTypesCache } from "fumadocs-twoslash/cache-fs";
import {
  createFileSystemGeneratorCache,
  createGenerator,
  remarkAutoTypeTable
} from "fumadocs-typescript";
import { z } from "zod";
var typescriptGenerator = createGenerator({
  cache: createFileSystemGeneratorCache(".next/fumadocs-typescript")
});
var twoslashTypesCache = createFileSystemTypesCache();
var docs = defineDocs({
  dir: "content/ask-docs",
  docs: {
    schema: pageSchema.extend({
      audience: z.enum(["admin", "employee", "developer"]).optional(),
      status: z.enum(["draft", "beta", "stable"]).default("stable"),
      lastReviewedAt: z.iso.date().optional()
    }),
    postprocess: {
      includeProcessedMarkdown: true,
      extractLinkReferences: true
    },
    async: true,
    async mdxOptions(environment) {
      const { remarkSteps } = await import("fumadocs-core/mdx-plugins/remark-steps");
      const rehypeCodeOptions = {
        inline: "tailing-curly-colon",
        themes: {
          light: "catppuccin-latte",
          dark: "catppuccin-mocha"
        },
        transformers: [
          ...rehypeCodeDefaultOptions.transformers ?? [],
          transformerTwoslash({
            typesCache: twoslashTypesCache
          })
        ]
      };
      return applyMdxPreset({
        rehypeCodeOptions,
        remarkCodeTabOptions: {
          parseMdx: true
        },
        remarkNpmOptions: {
          persist: {
            id: "package-manager"
          }
        },
        remarkImageOptions: {
          placeholder: "blur"
        },
        remarkPlugins: [
          remarkMdxMermaid,
          [remarkAutoTypeTable, { generator: typescriptGenerator }],
          remarkTypeScriptToJavaScript,
          remarkSteps
        ]
      })(environment);
    }
  },
  meta: {
    schema: metaSchema
  }
});
var source_config_default = defineConfig({
  // Reads git history to populate `page.data.lastModified` (Date | undefined) for each document.
  plugins: [lastModified(), jsonSchema({ insert: true })]
});
export {
  source_config_default as default,
  docs
};
