import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

const targets = [
  {
    dest: "components2/metadata/renderers/list-surface.renderer.tsx",
    src: "scripts/temp-wave-a-list-surface.renderer.tsx",
  },
  {
    dest: "lib/features/contacts/components/contacts-page.tsx",
    src: "scripts/temp-wave-a-contacts-page.tsx",
  },
]

for (const { dest, src } of targets) {
  const destPath = path.join(root, dest)
  const srcPath = path.join(root, src)
  if (!fs.existsSync(srcPath)) {
    console.error(`missing source: ${src}`)
    continue
  }
  try {
    fs.copyFileSync(srcPath, destPath)
    console.log(`ok: ${dest}`)
  } catch (err) {
    console.error(`fail: ${dest}`, err.message)
  }
}
