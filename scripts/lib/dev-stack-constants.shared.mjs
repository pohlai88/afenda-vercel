/**
 * Shared constants for the local multi-port dev stack (UI 3000 + workflow 3002).
 * Team/project defaults match AGENTS.md §5 and Vercel MCP project metadata.
 */

export const AFENDA_DEV_UI_PORT = 3000
export const AFENDA_DEV_WORKFLOW_PORT = 3002

export const AFENDA_VERCEL_TEAM_SLUG = "jacks-projects-7b3cfe94"
export const AFENDA_VERCEL_TEAM_ID = "team_Ymg16AtjGxrKyjaZk5Z52IYc"
export const AFENDA_VERCEL_PROJECT_NAME = "afenda-vercel"
export const AFENDA_VERCEL_PROJECT_ID = "prj_f4xLKgSiQsOEXnk24ZKlwlKrwqui"

export const AFENDA_DEV_UI_DIST = ".next-ui"
export const AFENDA_DEV_WORKFLOW_DIST = ".next-workflow"

/** Use localhost — on Windows Next often binds `::`; 127.0.0.1 probes can hang. */
export const AFENDA_DEV_UI_ORIGIN = `http://localhost:${AFENDA_DEV_UI_PORT}`
export const AFENDA_DEV_WORKFLOW_ORIGIN = `http://localhost:${AFENDA_DEV_WORKFLOW_PORT}`

/** Env keys whose values are rewritten 3000 → workflow port in sync-env-workflow.mjs */
export const AFENDA_WORKFLOW_ENV_URL_KEYS = [
  "BETTER_AUTH_URL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_AUTH_URL",
  "NEXT_PUBLIC_BETTER_AUTH_URL",
]
