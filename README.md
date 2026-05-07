# Next.js template

This is a Next.js template with shadcn/ui.

## Agents & IDE (AI-assisted / Cursor)

- **Operating contract:** [`AGENTS.md`](./AGENTS.md) — start with the **IDE & AI quickstart** table, then jump via **Contents**.
- **Workspace editor defaults:** [`.editorconfig`](./.editorconfig) (cross-editor) · [`.vscode/settings.json`](./.vscode/settings.json) (Prettier + ESLint on save, Tailwind v4 CSS entry) · [`.vscode/tasks.json`](./.vscode/tasks.json) (`pnpm: lint`, `typecheck`, `smoke`).
- **Install recommended extensions** when prompted (EditorConfig, ESLint, Prettier, Tailwind IntelliSense, Pretty TypeScript Errors).

## Quality & testing

Full command list and directory rules: **[`AGENTS.md`](./AGENTS.md)** (section 2 and **Testing directory contract**).

| Command                      | Purpose                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test` / `pnpm test:ci` | Vitest unit tests (`tests/unit`, Node by default)                                                                                     |
| `pnpm test:e2e`              | **`pnpm build`** then Playwright — default **`http://127.0.0.1:3001`** + **`next start`** (leave **`pnpm dev`** on **3000**)          |
| `pnpm test:e2e:ci`           | Same as **`pnpm test:e2e`** (prod-shaped E2E); ensure port **3001** is free unless you set **`PLAYWRIGHT_BASE_URL`** / **`BASE_URL`** |

Optional: `PLAYWRIGHT_BASE_URL` (see [`.env.config.example`](./.env.config.example) section G).

## Database (Neon + Drizzle + pgvector)

Production-shaped Postgres is **Neon** (see **[`AGENTS.md`](./AGENTS.md)** §5 — [**Neon + Vercel + pgvector checklist**](./AGENTS.md#neon--vercel--pgvector-checklist)). After connecting the **Vercel Marketplace Neon** integration and setting **`DATABASE_URL`**, run **`pnpm db:migrate:local`** (or migrate against each Neon branch you deploy). Knowledge / vector search also needs **`OPENAI_API_KEY`** on Vercel.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "#components/ui/button"
```
