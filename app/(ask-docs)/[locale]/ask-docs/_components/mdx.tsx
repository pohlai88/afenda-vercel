import type { ComponentProps } from "react"
import defaultMdxComponents from "fumadocs-ui/mdx"
import { Accordion, Accordions } from "fumadocs-ui/components/accordion"
import { Banner } from "fumadocs-ui/components/banner"
import { File, Files, Folder } from "fumadocs-ui/components/files"
import { ImageZoom } from "fumadocs-ui/components/image-zoom"
import { Step, Steps } from "fumadocs-ui/components/steps"
import { Tab, Tabs } from "fumadocs-ui/components/tabs"
import { TypeTable } from "fumadocs-ui/components/type-table"
import {
  createFileSystemGeneratorCache,
  createGenerator,
} from "fumadocs-typescript"
import { AutoTypeTable, type AutoTypeTableProps } from "fumadocs-typescript/ui"
import type { MDXComponents } from "mdx/types"

import { Mermaid } from "#components/ask-docs-mermaid"

const autoTypeTableGenerator = createGenerator({
  cache: createFileSystemGeneratorCache(".next/fumadocs-typescript"),
})

/** Vanilla Fumadocs MDX shelf — no Afenda design-system wrappers. */
export function useMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ...components,
    img: (props) => (
      <ImageZoom {...(props as ComponentProps<typeof ImageZoom>)} />
    ),
    TypeTable,
    AutoTypeTable: (props: Partial<AutoTypeTableProps>) => (
      <AutoTypeTable {...props} generator={autoTypeTableGenerator} />
    ),
    Step,
    Steps,
    Tab,
    Tabs,
    Accordion,
    Accordions,
    Banner,
    File,
    Files,
    Folder,
    Mermaid,
  } satisfies MDXComponents
}
