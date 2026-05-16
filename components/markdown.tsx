"use client"

import {
  Children,
  type ComponentProps,
  Fragment,
  type ReactElement,
  type ReactNode,
  Suspense,
  use,
  useDeferredValue,
} from "react"
import { jsx, jsxs } from "react/jsx-runtime"
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock"
import defaultMdxComponents from "fumadocs-ui/mdx"
import { toJsxRuntime } from "hast-util-to-jsx-runtime"
import { remark } from "remark"
import remarkGfm from "remark-gfm"
import remarkRehype from "remark-rehype"
import { visit } from "unist-util-visit"
import type { ElementContent, Root, RootContent } from "hast"

const MARKDOWN_CACHE_MAX_ENTRIES = 64

export interface Processor {
  process: (content: string) => Promise<ReactNode>
}

export function rehypeWrapWords() {
  return (tree: Root) => {
    visit(tree, ["text", "element"], (node, index, parent) => {
      if (node.type === "element" && node.tagName === "pre") return "skip"
      if (node.type !== "text" || !parent || index === undefined) return

      const words = node.value.split(/(?=\s)/)

      const newNodes: ElementContent[] = words.flatMap((word: string) => {
        if (word.length === 0) return []

        return {
          type: "element",
          tagName: "span",
          properties: {
            class: "animate-fd-fade-in",
          },
          children: [{ type: "text", value: word }],
        }
      })

      Object.assign(node, {
        type: "element",
        tagName: "span",
        properties: {},
        children: newNodes,
      } satisfies RootContent)
      return "skip"
    })
  }
}

function createProcessor(): Processor {
  const processor = remark()
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeWrapWords)

  return {
    async process(content) {
      const nodes = processor.parse({ value: content })
      const hast = await processor.run(nodes)

      return toJsxRuntime(hast, {
        development: false,
        jsx,
        jsxs,
        Fragment,
        components: {
          ...defaultMdxComponents,
          pre: Pre,
          img: undefined,
        },
      })
    },
  }
}

function Pre(props: ComponentProps<"pre">) {
  const code = Children.only(props.children) as ReactElement
  const codeProps = code.props as ComponentProps<"code">
  const content = codeProps.children
  if (typeof content !== "string") return null

  let lang =
    codeProps.className
      ?.split(" ")
      .find((v) => v.startsWith("language-"))
      ?.slice("language-".length) ?? "text"

  if (lang === "mdx") lang = "md"

  return <DynamicCodeBlock lang={lang} code={content.trimEnd()} />
}

const processor = createProcessor()
const renderCache = new Map<string, Promise<ReactNode>>()

function getCachedRender(text: string): Promise<ReactNode> {
  const cached = renderCache.get(text)
  if (cached) return cached

  const pending = processor.process(text).catch((error: unknown) => {
    renderCache.delete(text)
    throw error
  })

  if (renderCache.size >= MARKDOWN_CACHE_MAX_ENTRIES) {
    const oldestKey = renderCache.keys().next().value
    if (oldestKey !== undefined) renderCache.delete(oldestKey)
  }

  renderCache.set(text, pending)
  return pending
}

export function Markdown({ text }: { text: string }) {
  const deferredText = useDeferredValue(text)

  return (
    <Suspense fallback={<p className="invisible">{text}</p>}>
      <Renderer text={deferredText} />
    </Suspense>
  )
}

function Renderer({ text }: { text: string }) {
  return use(getCachedRender(text))
}
