# Human resources (`lib/features/hrm`)

This module uses three public import doors:

- **`#features/hrm`** (`index.ts`) — RSC-facing pages, constants, shared schemas, and types. Safe from Server Components and route files; avoid from Client Components when the barrel re-exports async server panels.
- **`#features/hrm/server`** (`server.ts`) — `server-only` queries, payroll engines, cron drivers, and other Node-only graphs. Use from layouts, Server Actions, and cron entrypoints only.
- **`#features/hrm/client`** (`client.ts`) — Server Actions plus narrow client-safe types and constants. This is the only HRM barrel intended for `"use client"` islands.

Cross-module callers must not deep-import `lib/features/hrm/**` from outside the module except via `#features/hrm`, `#features/hrm/server`, or `#features/hrm/client`.

Internal-only folders: `_module-governance/` (mutation guards), `_internal-cross-cutting/` (rail, snapshot, Nexus export). See each folder’s README.
