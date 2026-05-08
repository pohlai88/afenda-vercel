/**
 * Client-safe Lynx surface — import from here in `"use client"` modules and
 * dashboard chrome so the module barrel (`#features/lynx`) never pulls
 * server-only graphs into the browser bundle.
 */

export { LYNX_ERP_HTTP_ROUTES } from "./lynx.contract"
export {
  parseLynxTruthMarkdown,
  type LynxParsedTruth,
} from "./schemas/truth-markdown"
export type {
  LynxOperatorNdjsonMeta,
  LynxTruthEvidenceDTO,
} from "./types"
