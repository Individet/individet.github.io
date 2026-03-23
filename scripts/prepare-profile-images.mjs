/**
 * Downloads approved profile images from src/assets/profilbilder.json into a
 * generated public directory so Astro can use them in dev and build without
 * committing binaries to the repository.
 *
 * Usage:
 *   node scripts/prepare-profile-images.mjs
 */

import { access, readFile, writeFile } from 'fs/promises'
import sharp from 'sharp'
import {
  buildPortraitCardDiskPath,
  buildPortraitCardFilename,
  buildPortraitDetailDiskPath,
  buildPortraitDetailFilename,
  ensureGeneratedPortraitsDir,
  inferFileExtension,
  isSupportedImageExtension,
  readPortraitManifest,
  removeStaleGeneratedPortraits,
} from './profile-images-lib.mjs'

async function pathExists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function downloadBinary(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent':
        'individet-profile-image-cache/1.0 (+https://www.individet.no)',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fra ${url}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

async function buildCardThumbnail(imageBuffer) {
  return sharp(imageBuffer, { animated: false })
    .resize(192, 192, {
      fit: 'cover',
      position: 'center',
      withoutEnlargement: true,
    })
    .webp({
      quality: 82,
    })
    .toBuffer()
}

async function buildDetailPortrait(imageBuffer) {
  const image = sharp(imageBuffer, { animated: false })
  const metadata = await image.metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error('Kunne ikke lese bildedimensjoner')
  }

  const squareSize = Math.min(metadata.width, metadata.height)
  const left = Math.floor((metadata.width - squareSize) / 2)
  const top = Math.floor((metadata.height - squareSize) / 2)
  const outputSize = Math.min(squareSize, 600)

  return image
    .extract({
      left,
      top,
      width: squareSize,
      height: squareSize,
    })
    .resize(outputSize, outputSize, {
      fit: 'fill',
      withoutEnlargement: true,
    })
    .jpeg({
      quality: 86,
      mozjpeg: true,
    })
    .toBuffer()
}

const manifest = await readPortraitManifest()
const skippedUnsupported = []
const entries = Object.entries(manifest.images)
  .filter(([, portrait]) => portrait?.status !== 'none')
  .map(([actorSlug, portrait]) => {
    const fileExtension = portrait.fileExtension
      ? portrait.fileExtension
      : inferFileExtension(portrait.imageUrl, portrait.sourcePageUrl)

    if (!portrait.imageUrl || !fileExtension) {
      throw new Error(
        `Oppføringen for ${actorSlug} mangler imageUrl eller fileExtension i src/assets/profilbilder.json`
      )
    }

    if (!isSupportedImageExtension(fileExtension)) {
      skippedUnsupported.push(`${actorSlug}.${fileExtension}`)
      return null
    }

    return {
      actorSlug,
      portrait,
      fileExtension,
      detailFilename: buildPortraitDetailFilename(actorSlug),
      detailOutputPath: buildPortraitDetailDiskPath(actorSlug),
      cardFilename: buildPortraitCardFilename(actorSlug),
      cardOutputPath: buildPortraitCardDiskPath(actorSlug),
    }
  })
  .filter(Boolean)
  .sort((left, right) => left.actorSlug.localeCompare(right.actorSlug, 'no'))

await ensureGeneratedPortraitsDir()
await removeStaleGeneratedPortraits(
  entries.flatMap((entry) => [entry.detailFilename, entry.cardFilename])
)

if (entries.length === 0) {
  console.log(
    'Ingen godkjente profilbilder registrert i src/assets/profilbilder.json.'
  )
  process.exit(0)
}

if (skippedUnsupported.length > 0) {
  console.warn(
    `Hopper over ikke-bildefiler i profilbilder.json: ${skippedUnsupported.join(
      ', '
    )}`
  )
}

let downloaded = 0
let reused = 0
const failures = []

for (const entry of entries) {
  const hadCachedDetailFile = await pathExists(entry.detailOutputPath)
  const hadCachedCardFile = await pathExists(entry.cardOutputPath)

  try {
    const imageBuffer = await downloadBinary(entry.portrait.imageUrl)
    const detailBuffer = await buildDetailPortrait(imageBuffer)
    const cardBuffer = await buildCardThumbnail(detailBuffer)
    const existingDetailBuffer = hadCachedDetailFile
      ? await readFile(entry.detailOutputPath)
      : null
    const existingCardBuffer = hadCachedCardFile
      ? await readFile(entry.cardOutputPath)
      : null

    const detailUnchanged =
      existingDetailBuffer &&
      Buffer.compare(existingDetailBuffer, detailBuffer) === 0
    const cardUnchanged =
      existingCardBuffer && Buffer.compare(existingCardBuffer, cardBuffer) === 0

    if (detailUnchanged && cardUnchanged) {
      reused++
      console.log(`• Uendret profilbilde for ${entry.actorSlug}`)
      continue
    }

    await writeFile(entry.detailOutputPath, detailBuffer)
    await writeFile(entry.cardOutputPath, cardBuffer)
    downloaded++
    console.log(`✓ Klargjorde profilbilde for ${entry.actorSlug}`)
  } catch (error) {
    if (hadCachedDetailFile && hadCachedCardFile) {
      reused++
      console.warn(
        `⚠ Kunne ikke oppdatere ${entry.actorSlug}, bruker eksisterende cache: ${error.message}`
      )
      continue
    }

    failures.push(`${entry.actorSlug}: ${error.message}`)
  }
}

if (failures.length > 0) {
  throw new Error(
    `Kunne ikke laste ned alle profilbilder:\n${failures
      .map((failure) => `- ${failure}`)
      .join('\n')}`
  )
}

console.log(
  `Ferdig. Nye eller oppdaterte filer: ${downloaded}, gjenbrukte filer: ${reused}.`
)
