# Next.js template

This is a Next.js template with shadcn/ui.

## Agents & IDE (AI-assisted / Cursor)

- **Operating contract:** [`AGENTS.md`](./AGENTS.md) — start with the **IDE & AI quickstart** table, then jump via **Contents**.
- **Workspace editor defaults:** [`.editorconfig`](./.editorconfig) (cross-editor) · [`.vscode/settings.json`](./.vscode/settings.json) (Prettier + ESLint on save, Tailwind v4 CSS entry) · [`.vscode/tasks.json`](./.vscode/tasks.json) (`pnpm: lint`, `typecheck`, `smoke`).
- **Install recommended extensions** when prompted (EditorConfig, ESLint, Prettier, Tailwind IntelliSense, Pretty TypeScript Errors).

## Quality & testing

Full command list and directory rules: **[`AGENTS.md`](./AGENTS.md)** (section 2 and **Testing directory contract**).

| Command                      | Purpose                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `pnpm test` / `pnpm test:ci` | Vitest unit tests (`tests/unit`, Node by default)                                                             |
| `pnpm test:e2e`              | Playwright — starts **`pnpm dev`** on **3001** by default ( **`pnpm dev`** for the app can stay on **3000** ) |
| `pnpm test:e2e:ci`           | `pnpm build` then Playwright against **`next start`** (production-shaped); ensure port **3001** is free       |

Optional: `PLAYWRIGHT_BASE_URL` (see [`.env.config.example`](./.env.config.example) section G).

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
