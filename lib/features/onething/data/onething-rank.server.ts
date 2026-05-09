/**
 * Plan parity entrypoint — deterministic ranking lives in `onething-rank.shared.ts`
 * so Vitest can import pure logic without a `server-only` boundary.
 */
export type { RankedOneThing } from "./onething-rank.shared"
export {
  buildWhyNow,
  computeOneThingRankScore,
  formatHorizon,
  rankOneThingForCanvas,
} from "./onething-rank.shared"
