# Vitest coverage on Windows via WSL

On **Windows**, `pnpm test:ci` runs Vitest with **`--coverage`** in **serial mode** (`maxWorkers: 1`) because V8 coverage temp files race on NTFS. That is correct for stability but slow for a full local pre-push run.

**`pnpm test:fast`** stays on Windows and uses parallel workers (no coverage).

## When to use WSL

Use WSL2 when you need **local coverage + thresholds** before push and do not want to wait for CI:

- Full `pnpm test:ci` with parallel coverage (`maxWorkers: 4` on Linux)
- Or three terminal shards (same as CI) — see below

## One-time setup

1. Install [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) (Ubuntu recommended).
2. Clone or access the repo on the **Linux filesystem** (`~/afenda-vercel`), not `/mnt/c/...` — I/O on `/mnt/c` is much slower for `node_modules`.
3. In WSL:

```bash
corepack enable
cd ~/afenda-vercel
pnpm install
pnpm env:sync   # if you use .env.config locally
```

## Run coverage in WSL

```bash
# Full suite + thresholds (parallel coverage on Linux)
pnpm test:ci

# Faster iteration without coverage (same as Windows test:fast)
pnpm test:fast

# Single project
pnpm test:fast:node
pnpm test:fast:pure    # *.pure.test.ts only (isolate: false)
pnpm test:fast:dom     # happy-dom
```

## Local multi-shard (optional, high-core CPU)

When one Vitest process saturates the main Vite thread:

```bash
pnpm test:local-shards
# SHARD_TOTAL=4 VITEST_MAX_WORKERS=7 pnpm test:local-shards
```

See [erp-test-scale-strategy.md](./erp-test-scale-strategy.md).

## Optional: match CI sharding locally

```bash
SHARD=1/3 pnpm test:ci:shard
SHARD=2/3 pnpm test:ci:shard
SHARD=3/3 pnpm test:ci:shard
pnpm test:ci:merge
```

## Speed / cache (local `test:fast`)

| Mechanism | What it does |
| --- | --- |
| `.artifacts/vitest-vite/` | Vite transform cache between runs (`cacheDir`) |
| `experimental.fsModuleCache` | On for `test:fast` reruns; off for `--coverage`. Set `VITEST_FS_CACHE=0` if NTFS races appear |
| `pool: threads` | Default for `test:fast` (faster than forks on large suites) |
| `unit-pure` + `isolate: false` | Only `**/*.pure.test.ts` — no `vi.mock` |
| `unit-node` / `unit-dom` `isolate: true` | Required for mock / RTL suites |
| `pnpm test:changed` | Git-changed tests only — fastest edit loop |
| `VITEST_MAX_WORKERS=N` | Cap parallelism on high-core machines |
| `VITEST_POOL=forks` | Override if `threads` misbehaves |

Second consecutive `pnpm test:fast` should be noticeably faster than the first (warm Vite + fs module cache).

## Import slow-path audit

From Windows or WSL:

```bash
pnpm test:analyze:imports              # print top slow imports
pnpm test:analyze:imports:report       # write .artifacts/vitest-import-durations.txt
pnpm test:analyze:imports -- tests/unit/hrm
```

Trim heavy barrels (`#features/<module>` server index) in hot test files when imports rank high.

## Related

- ADR-0008 — Vitest configuration
- `.config/vitest.config.ts` — `unit-node` / `unit-dom` projects
- `.cursor/rules/testing.mdc` — script reference
