/*
 * Validates every markdown file's frontmatter:
 *   1. The YAML block parses (a stray unquoted `: ` once red-lined the
 *      public deploy for two days — see iran-imperialism-crisis).
 *   2. `category`, when present, is a canonical key from
 *      settings/labels.json — never a localized display value typed by
 *      hand (so the public site always resolves it by key).
 *
 * Run by .github/workflows/check-frontmatter.yml on every push/PR, and
 * locally via `bun scripts/check-frontmatter.mjs`. Exits non-zero on
 * the first failing class so a bad commit never reaches the deploy.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'

const labels = JSON.parse(readFileSync('settings/labels.json', 'utf8'))
const keys = new Set(labels.map((l) => l.key))

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === 'node_modules' || e.name.startsWith('.')) return []
    const p = join(dir, e.name)
    return e.isDirectory() ? walk(p) : e.name.endsWith('.md') ? [p] : []
  })

const frontmatterOf = (src) => {
  if (!src.startsWith('---')) return undefined
  const end = src.indexOf('\n---', 3)
  return end < 0 ? undefined : src.slice(3, end)
}

const errors = []
for (const file of walk('.')) {
  const fm = frontmatterOf(readFileSync(file, 'utf8'))
  if (fm === undefined) continue
  let data
  try {
    data = parse(fm)
  } catch (e) {
    errors.push(`${file}: invalid YAML — ${String(e).split('\n')[0]}`)
    continue
  }
  const category = data?.category
  if (typeof category === 'string' && !keys.has(category)) {
    errors.push(
      `${file}: category "${category}" is not a canonical key ` +
        `(expected one of: ${[...keys].join(', ')})`,
    )
  }
}

if (errors.length > 0) {
  console.error(`✗ frontmatter check failed (${errors.length}):`)
  for (const e of errors) console.error(`  ${e}`)
  process.exit(1)
}
console.log('✓ all frontmatter valid')
