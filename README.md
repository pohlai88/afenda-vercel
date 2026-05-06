# Next.js template

This is a Next.js template with shadcn/ui.

## Agents & IDE (AI-assisted / Cursor)

- **Operating contract:** [`AGENTS.md`](./AGENTS.md) — start with the **IDE & AI quickstart** table, then jump via **Contents**.
- **Workspace editor defaults:** [`.vscode/settings.json`](./.vscode/settings.json) (Prettier + ESLint on save, Tailwind v4 CSS entry).
- **Install recommended extensions** when prompted (ESLint, Prettier, Tailwind IntelliSense, Pretty TypeScript Errors).

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "#components/ui/button";
```
