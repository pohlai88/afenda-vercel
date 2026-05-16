import type { AskDocsPage } from "#lib/ask-docs-source"

export async function getLLMText(page: AskDocsPage): Promise<string> {
  const processed = await page.data.getText("processed")
  return `# ${page.data.title} (${page.url})\n\n${processed}`
}
