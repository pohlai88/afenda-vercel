/**
 * Plan parity entrypoint — deterministic ranking lives in `todo-rank.shared.ts`
 * so Vitest can import pure logic without a `server-only` boundary.
 */
export type { RankedTodo } from "./todo-rank.shared"
export {
  buildWhyNow,
  computeTodoRankScore,
  formatHorizon,
  rankTodosForCanvas,
} from "./todo-rank.shared"
