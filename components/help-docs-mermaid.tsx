import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock"
import { renderMermaidSVG } from "beautiful-mermaid"

/**
 * Server Component — renders a Mermaid diagram as an inline SVG using Fumadocs
 * design tokens (`--color-fd-background`, `--color-fd-foreground`).
 *
 * Falls back to a plain code block when the chart string is invalid so a
 * rendering error never breaks the full page.
 *
 * Registered as `Mermaid` in `help-docs-mdx.tsx` and auto-wired by
 * `remarkMdxMermaid` in `source.config.ts` so authors can write plain
 * fenced code blocks:
 *
 * ```mermaid
 * flowchart LR
 *   A --> B
 * ```
 */
export async function Mermaid({ chart }: { chart: string }) {
  let svg: string | null = null
  try {
    svg = renderMermaidSVG(chart, {
      bg: "var(--color-fd-background)",
      fg: "var(--color-fd-foreground)",
      interactive: true,
      transparent: true,
    })
  } catch {
    // Invalid chart syntax — fall through to code block fallback.
  }

  if (svg !== null) {
    return <div dangerouslySetInnerHTML={{ __html: svg }} />
  }

  return (
    <CodeBlock title="Mermaid">
      <Pre>{chart}</Pre>
    </CodeBlock>
  )
}
