export type {
  TrustActivationRule,
  TrustBoundaryStatement,
  TrustCommitment,
  TrustControlSurfaceProps,
  TrustEvidenceItem,
  TrustPostureSignal,
  TrustSurfaceDefinition,
  TrustSurfaceItem,
  TrustSurfaceState,
} from "./types"

export {
  buildOpenStatusFeedUrl,
  fallbackOpenStatusSnapshot,
  normalizeOpenStatusFeed,
  normalizeOpenStatusState,
  type OpenStatusComponent,
  type OpenStatusEvent,
  type OpenStatusPublicSnapshot,
  type OpenStatusPublicState,
} from "./data/openstatus-status.shared"

export {
  STATUS_ROUTE,
  buildTrustPageMetadata,
  publicTrustIndexableRoutes,
  publicTrustOwnerRoutes,
  securityTxtExpiresAt,
  securityTxtHref,
  trustSurfaceDefinition,
  trustSurfaceDefinitionResolved,
  trustSurfaceLastUpdatedLabel,
} from "./data/trust-surface.fixture.shared"
