/**
 * Port hard-deleted `components/**` from git HEAD into `components2/**` without
 * recreating repo-root `components/`. Rewrites internal #components/* imports.
 *
 * Usage: node scripts/port-git-components-to-components2.mjs [--apply]
 */
import fs from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"

const APPLY = process.argv.includes("--apply")
const root = path.join(import.meta.dirname, "..")

/** @param {string} repoPath e.g. components/auth/foo.tsx */
function targetPath(repoPath) {
  const rel = repoPath.replace(/^components\//, "")
  if (rel.startsWith("ui/")) return null
  if (rel.startsWith("workbench/")) {
    const tail = rel.slice("workbench/".length)
    if (tail.startsWith("left-nav-rail/")) {
      return path.join(
        "components2",
        "app-shell",
        "left-rail-bar",
        tail.replace(
          /^left-nav-rail\/workbench-rail/,
          "appshell-primary-left-rail"
        )
      )
    }
    if (tail.startsWith("utility-bar/")) {
      return path.join(
        "components2",
        "app-shell",
        "top-utils-bar",
        tail.slice("utility-bar/".length).replace(/^workbench-/, "appshell-")
      )
    }
    return path.join(
      "components2",
      "app-shell",
      tail.replace(/^workbench-/, "appshell-")
    )
  }
  if (rel === "module-page-header.tsx") {
    return path.join(
      "lib",
      "features",
      "governed-surface",
      "components",
      "module-page-header.tsx"
    )
  }
  if (rel === "route-envelope-context.tsx") {
    return path.join("components2", "route-envelope-context.client.tsx")
  }
  if (
    rel === "nexus-route-loading.tsx" ||
    rel === "segment-route-spinner.tsx" ||
    rel.startsWith("employee-portal-route-loading")
  ) {
    return path.join("components2", "route-loading", path.basename(rel))
  }
  if (
    rel === "route-error-primitives.tsx" ||
    rel === "route-error-retry-button.tsx" ||
    rel === "use-report-route-error.ts"
  ) {
    return path.join("components2", "route-error", path.basename(rel))
  }
  if (rel === "mode-toggle.tsx") {
    return path.join("components2", "providers", "mode-toggle.client.tsx")
  }
  if (rel === "theme-provider.tsx") {
    return null
  }
  if (rel.startsWith("marketing/")) {
    return path.join("components2", "marketing", rel.slice("marketing/".length))
  }
  return path.join("components2", rel)
}

function rewriteImports(content) {
  return content
    .replaceAll('from "#components/ui/', 'from "#components2/ui/')
    .replaceAll('from "#components/workbench/', 'from "#app-shell/')
    .replaceAll('from "#components/', 'from "#components2/')
    .replaceAll('import("#components/ui/', 'import("#components2/ui/')
    .replaceAll('import("#components/', 'import("#components2/')
}

function listGitComponentFiles() {
  const out = execSync("git ls-tree -r HEAD --name-only components", {
    cwd: root,
    encoding: "utf8",
  })
  return out
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("components/") && /\.(tsx?|css)$/.test(l))
}

const files = listGitComponentFiles()
let skipped = 0
let planned = 0

for (const repoPath of files) {
  const destRel = targetPath(repoPath)
  if (!destRel) {
    skipped++
    continue
  }
  const destAbs = path.join(root, destRel)
  const content = execSync(`git show HEAD:${repoPath.replace(/\\/g, "/")}`, {
    cwd: root,
    encoding: "utf8",
  })
  const next = rewriteImports(content)
  planned++
  if (APPLY) {
    fs.mkdirSync(path.dirname(destAbs), { recursive: true })
    if (fs.existsSync(destAbs)) {
      const existing = fs.readFileSync(destAbs, "utf8")
      if (existing === next) continue
    }
    fs.writeFileSync(destAbs, next, "utf8")
  } else {
    console.log(`${repoPath} -> ${destRel}`)
  }
}

if (!APPLY) {
  console.log(
    `\nDry run: ${planned} file(s), ${skipped} skipped. Pass --apply to write.`
  )
} else {
  console.log(`Wrote ${planned} file(s), skipped ${skipped}.`)
}
