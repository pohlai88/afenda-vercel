import type { ComponentProps, ElementType, ReactNode } from "react"
import defaultMdxComponents from "fumadocs-ui/mdx"
import { Accordion, Accordions } from "fumadocs-ui/components/accordion"
import { File, Files, Folder } from "fumadocs-ui/components/files"
import { ImageZoom } from "fumadocs-ui/components/image-zoom"
import { Tab, Tabs } from "fumadocs-ui/components/tabs"
import { TypeTable } from "fumadocs-ui/components/type-table"
import {
  createFileSystemGeneratorCache,
  createGenerator,
} from "fumadocs-typescript"
import { AutoTypeTable, type AutoTypeTableProps } from "fumadocs-typescript/ui"
import type { MDXComponents } from "mdx/types"
import {
  HelpDocsBanner,
  HelpDocsCallout,
  HelpDocsCard,
  HelpDocsCards,
  HelpDocsStep,
  HelpDocsSteps,
} from "#components/help-docs-mdx-blocks"
import { Mermaid } from "#components/help-docs-mermaid"

/**
 * Separate generator instance for AutoTypeTable RSC.
 * source.config.ts has its own instance for the remarkAutoTypeTable build-time plugin —
 * these are different execution contexts and cannot share a module-level singleton.
 * Both point at the same cache directory so TypeScript compilation is deduplicated on disk.
 */
const autoTypeTableGenerator = createGenerator({
  cache: createFileSystemGeneratorCache(".next/fumadocs-typescript"),
})

export function useMDXComponents(components?: MDXComponents) {
  const docAnchor = components?.a as
    | ElementType<{ href: string; children?: ReactNode; className?: string }>
    | undefined

  return {
    ...defaultMdxComponents,
    ...components,
    /** Zoomable images — wraps every `![…](…)` in an interactive zoom overlay. */
    img: (props) => <ImageZoom {...(props as ComponentProps<typeof ImageZoom>)} />,
    /**
     * Build-time type table output — compiled from `<auto-type-table />` tags via
     * `remarkAutoTypeTable` in `source.config.ts`. Path is relative to the MDX file.
     * Example MDX: `<auto-type-table path="./types.ts" name="MyProps" />`
     */
    TypeTable,
    /**
     * Runtime RSC type table — renders TypeScript definitions at request time.
     * Path is relative to the project root (cwd), not the MDX file.
     * Example MDX: `<AutoTypeTable path="lib/features/contacts/types.ts" name="ContactRecord" />`
     * Prefer the build-time `<auto-type-table />` for static docs; use this for live type references.
     */
    AutoTypeTable: (props: Partial<AutoTypeTableProps>) => (
      <AutoTypeTable {...props} generator={autoTypeTableGenerator} />
    ),
    /** Step-by-step guide — shadcn-aligned layout (`flex` + `gap-*`). */
    Step: HelpDocsStep,
    Steps: HelpDocsSteps,
    /** Tabbed content panels. */
    Tab,
    Tabs,
    /** Expandable accordion sections (FAQ, collapsible details). */
    Accordion,
    Accordions,
    /** Announcement strip — uses `Alert` from the design system shelf. */
    Banner: HelpDocsBanner,
    /** Navigation / category cards — `Card` + `CardHeader` from `#components2/ui`. */
    Card: (props: ComponentProps<typeof HelpDocsCard>) => (
      <HelpDocsCard {...props} DocLink={docAnchor} />
    ),
    Cards: HelpDocsCards,
    /** Contextual notes — maps to `Alert` + semantic warning/destructive tokens. */
    Callout: HelpDocsCallout,
    /**
     * Directory/file tree visualisation. Generate the tree with:
     *   `pnpm dlx @fumadocs/cli tree ./my-dir ./output.tsx`
     * Then paste the JSX into MDX or import as a component.
     * Example MDX:
     *   <Files>
     *     <Folder name="app"><File name="layout.tsx" /></Folder>
     *   </Files>
     */
    File,
    Files,
    Folder,
    /** Mermaid diagrams — wired by `remarkMdxMermaid`; authors write plain ```mermaid fences. */
    Mermaid,
  } satisfies MDXComponents
}

declare global {
  type MDXProvidedComponents = ReturnType<typeof useMDXComponents>
}
