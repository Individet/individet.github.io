/**
 * Shared logic for prepare-profile-images.mjs and generate-profile-images.mjs
 */
import { mkdir, readFile, readdir, rm, writeFile } from 'fs/promises'
import { dirname, extname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const repoRoot = join(__dirname, '..')
export const contentDir = join(repoRoot, 'content', 'isi')
export const portraitManifestPath = join(
  repoRoot,
  'src',
  'assets',
  'profilbilder.json'
)
export const generatedPortraitsDir = join(
  repoRoot,
  'public',
  'generated',
  'profilbilder'
)

export const supportedImageExtensions = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'avif',
  'svg',
])

const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---/

function stripWrappingQuotes(value) {
  return value.replace(/^['"]/, '').replace(/['"]$/, '').trim()
}

function extractFrontmatterField(frontmatter, field) {
  const match = frontmatter.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'))

  if (!match) {
    return null
  }

  return stripWrappingQuotes(match[1].trim())
}

export function normalizeForMatch(value) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .toLowerCase()
    .trim()
}

export function stripHtml(value) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

export function sanitizeFileExtension(value) {
  return value.replace(/^\./, '').toLowerCase()
}

export function inferFileExtension(imageUrl, fallbackUrl) {
  const candidates = [imageUrl, fallbackUrl].filter(Boolean)

  for (const candidate of candidates) {
    try {
      const { pathname } = new URL(candidate)
      const extension = sanitizeFileExtension(extname(pathname))

      if (extension) {
        return extension
      }
    } catch {}
  }

  return null
}

export function isSupportedImageExtension(extension) {
  if (!extension) {
    return false
  }

  return supportedImageExtensions.has(sanitizeFileExtension(extension))
}

export function buildPortraitFilename(actorSlug, fileExtension) {
  return `${actorSlug}.${sanitizeFileExtension(fileExtension)}`
}

export function buildPortraitCardFilename(actorSlug) {
  return `${actorSlug}-card.webp`
}

export function buildPortraitDetailFilename(actorSlug) {
  return `${actorSlug}-detail.jpg`
}

export function buildPortraitPublicPath(actorSlug, fileExtension) {
  return `/generated/profilbilder/${buildPortraitFilename(
    actorSlug,
    fileExtension
  )}`
}

export function buildPortraitDiskPath(actorSlug, fileExtension) {
  return join(
    generatedPortraitsDir,
    buildPortraitFilename(actorSlug, fileExtension)
  )
}

export function buildPortraitCardDiskPath(actorSlug) {
  return join(generatedPortraitsDir, buildPortraitCardFilename(actorSlug))
}

export function buildPortraitDetailDiskPath(actorSlug) {
  return join(generatedPortraitsDir, buildPortraitDetailFilename(actorSlug))
}

export async function ensureGeneratedPortraitsDir() {
  await mkdir(generatedPortraitsDir, { recursive: true })
}

export async function removeStaleGeneratedPortraits(expectedFilenames) {
  await ensureGeneratedPortraitsDir()

  const currentFiles = await readdir(generatedPortraitsDir)
  const expected = new Set(expectedFilenames)

  await Promise.all(
    currentFiles
      .filter((filename) => !expected.has(filename))
      .map((filename) =>
        rm(join(generatedPortraitsDir, filename), { force: true })
      )
  )
}

export async function readPortraitManifest() {
  try {
    const raw = await readFile(portraitManifestPath, 'utf-8')
    const parsed = JSON.parse(raw)

    return {
      version: parsed.version ?? 1,
      generatedAt: parsed.generatedAt ?? null,
      images:
        parsed.images && typeof parsed.images === 'object' ? parsed.images : {},
    }
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {
        version: 1,
        generatedAt: null,
        images: {},
      }
    }

    throw error
  }
}

export async function writePortraitManifest(manifest) {
  const sortedImages = Object.fromEntries(
    Object.entries(manifest.images).sort(([left], [right]) =>
      left.localeCompare(right, 'no')
    )
  )

  await writeFile(
    portraitManifestPath,
    JSON.stringify(
      {
        version: manifest.version ?? 1,
        generatedAt: manifest.generatedAt ?? null,
        images: sortedImages,
      },
      null,
      2
    ) + '\n',
    'utf-8'
  )
}

export async function getIsiActors() {
  const filenames = (await readdir(contentDir)).filter((filename) =>
    filename.endsWith('.md')
  )

  const actors = await Promise.all(
    filenames.map(async (filename) => {
      const filePath = join(contentDir, filename)
      const content = await readFile(filePath, 'utf-8')
      const match = content.match(frontmatterPattern)

      if (!match) {
        throw new Error(`Fant ikke YAML-frontmatter i ${filename}`)
      }

      const frontmatter = match[1]
      const actorName = extractFrontmatterField(frontmatter, 'actorName')
      const actorSlug = extractFrontmatterField(frontmatter, 'actorSlug')
      const actorId = extractFrontmatterField(frontmatter, 'actorId')
      const actorType = extractFrontmatterField(frontmatter, 'actorType')
      const actorAffiliation = extractFrontmatterField(
        frontmatter,
        'actorAffiliation'
      )
      const actorCountry = extractFrontmatterField(frontmatter, 'actorCountry')

      if (!actorName || !actorSlug) {
        throw new Error(
          `Mangler actorName eller actorSlug i frontmatter for ${filename}`
        )
      }

      return {
        actorName,
        actorSlug,
        actorId,
        actorType,
        actorAffiliation,
        actorCountry,
      }
    })
  )

  return actors.sort((left, right) =>
    left.actorName.localeCompare(right.actorName, 'no')
  )
}
