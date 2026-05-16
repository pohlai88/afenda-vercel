import type { getHelpDocsSource } from "#lib/help-docs-source"

type HelpDocsSource = ReturnType<typeof getHelpDocsSource>
type HelpDocsPage = HelpDocsSource["$inferPage"]

export async function getLLMText(page: HelpDocsPage): Promise<string> {
  const processed = await page.data.getText("processed")
  return `# ${page.data.title} (${page.url})\n\n${processed}`
}
