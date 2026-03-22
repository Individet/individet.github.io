/**
 * Syncs missing YAML frontmatter in content/isi/reports/ files.
 *
 * For each report file that lacks a YAML frontmatter block, this script
 * finds the matching ISI score file in content/isi/ and copies the
 * `created`, `lastUpdated`, and `author` fields from its frontmatter.
 *
 * Usage: node scripts/sync-report-frontmatter.mjs
 */

import { readdir, readFile, writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const contentRoot = join(__dirname, '..', 'content', 'isi')
const reportsDir = join(contentRoot, 'reports')

function hasFrontmatter(content) {
  return content.trimStart().startsWith('---')
}

function extractFields(content, fields) {
  const normalized = content.replace(/\r\n/g, '\n')
  const match = normalized.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return null

  const result = {}
  for (const field of fields) {
    const fieldMatch = match[1].match(new RegExp(`^${field}:(.+)$`, 'm'))
    if (fieldMatch) {
      result[field] = fieldMatch[1].trim()
    }
  }
  return result
}

function buildFrontmatter(fields) {
  const lines = ['---']
  for (const [key, value] of Object.entries(fields)) {
    lines.push(`${key}: ${value}`)
  }
  lines.push('---')
  return lines.join('\n') + '\n'
}

const reportFiles = (await readdir(reportsDir)).filter((f) => f.endsWith('.md'))

let fixed = 0
let skipped = 0
let missing = 0

for (const filename of reportFiles) {
  const reportPath = join(reportsDir, filename)
  const reportContent = await readFile(reportPath, 'utf-8')

  if (hasFrontmatter(reportContent)) {
    skipped++
    continue
  }

  const sourcePath = join(contentRoot, filename)
  let sourceContent
  try {
    sourceContent = await readFile(sourcePath, 'utf-8')
  } catch {
    console.warn(`⚠  No matching ISI file found for ${filename} — skipping`)
    missing++
    continue
  }

  const fields = extractFields(sourceContent, [
    'created',
    'lastUpdated',
    'author',
  ])
  if (!fields || Object.keys(fields).length === 0) {
    console.warn(
      `⚠  Could not extract frontmatter fields from ${filename} — skipping`
    )
    missing++
    continue
  }

  const frontmatter = buildFrontmatter(fields)
  await writeFile(reportPath, frontmatter + '\n' + reportContent, 'utf-8')
  console.log(`✓  Fixed ${filename}`)
  fixed++
}

console.log(
  `\nDone. Fixed: ${fixed}, already had frontmatter: ${skipped}, could not fix: ${missing}`
)
