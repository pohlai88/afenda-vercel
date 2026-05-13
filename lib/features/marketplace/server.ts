import "server-only"

/**
 * Capability Registry — server-only re-exports.
 *
 * Imports from this barrel MUST come from Server Components, route
 * handlers, server actions, or other `server-only` modules. Anything
 * here may transitively pull in `lib/db`, `next/headers`, or
 * `unstable_cache` that crash inside a Client Component bundle.
 *
 * Use this barrel from RSC pages and layouts to compose:
 *
 *   - resolver:    `resolveCapabilitiesForViewer`
 *   - queries:     `listOrgCapabilityPolicy`, `listUserCapabilityPreferences`
 *   - metrics:     `getCapabilityChainMetrics`
 */

export {
  resolveCapabilitiesForViewer,
  type ResolveInput,
} from "./data/capability-resolver.server"

export { buildCapabilityViewerContext } from "./data/viewer-context.server"

export {
  listOrgCapabilityPolicy,
  countOrgPoliciesByCapability,
} from "./data/org-policy.queries.server"

export {
  listUserCapabilityPreferences,
  countUserPreferencesByCapability,
  countOrgsAdoptingCapability,
} from "./data/user-preference.queries.server"

export {
  getCapabilityChainMetrics,
  CAPABILITY_METRICS_TAG,
  capabilityMetricsTag,
} from "./data/marketplace-metrics.server"
