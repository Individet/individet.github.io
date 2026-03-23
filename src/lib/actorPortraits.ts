import { extname } from 'node:path'
import portraitManifest from '../assets/profilbilder.json'

interface ActorPortraitRecord {
  status?: 'approved' | 'none'
  note?: string
  actorName?: string
  imageUrl?: string
  source?: string
  sourcePageUrl?: string | null
  license?: string
  licenseUrl?: string | null
  author?: string
  credit?: string
  description?: string
  fileExtension?: string
  width?: number | null
  height?: number | null
}

interface ActorPortraitBase {
  actorSlug: string
  actorName: string
  alt: string
}

export interface ActorPortraitImage extends ActorPortraitBase {
  kind: 'image'
  src: string
  cardSrc: string
  source: string
  sourcePageUrl: string | null
  license: string
  licenseUrl: string | null
  author: string
  credit: string
  description: string
  width: number | null
  height: number | null
  cardWidth: number
  cardHeight: number
}

export interface ActorPortraitFallback extends ActorPortraitBase {
  kind: 'fallback'
  initials: string
  accent: string
  accentSoft: string
}

export type ActorPortrait = ActorPortraitImage | ActorPortraitFallback

const supportedImageExtensions = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'avif',
  'svg',
])

function inferFileExtension(imageUrl?: string, sourcePageUrl?: string | null) {
  for (const candidate of [imageUrl, sourcePageUrl]) {
    if (!candidate) {
      continue
    }

    try {
      const extension = extname(new URL(candidate).pathname).replace(/^\./, '')

      if (extension) {
        return extension.toLowerCase()
      }
    } catch {}
  }

  return null
}

function isSupportedImageExtension(extension?: string | null) {
  if (!extension) {
    return false
  }

  return supportedImageExtensions.has(
    extension.replace(/^\./, '').toLowerCase()
  )
}

function buildInitials(actorName: string) {
  const cleanName = actorName.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
  const words = cleanName.split(/\s+/).filter(Boolean)

  if (words.length === 0) {
    return '?'
  }

  if (words.length === 1) {
    const word = words[0].replace(/[^A-Za-z0-9ÆØÅæøå]/g, '')

    if (word.length <= 4) {
      return word.toUpperCase()
    }

    return word.slice(0, 2).toUpperCase()
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
}

function buildAccentFromSlug(actorSlug: string) {
  const hash = [...actorSlug].reduce(
    (value, character) => value + character.charCodeAt(0),
    0
  )
  const hue = hash % 360

  return {
    accent: `hsl(${hue} 42% 34%)`,
    accentSoft: `hsl(${hue} 46% 86%)`,
  }
}

function getSquareDetailSize(portrait?: ActorPortraitRecord) {
  if (!portrait?.width || !portrait?.height) {
    return 600
  }

  return Math.min(portrait.width, portrait.height, 600)
}

export function getActorPortrait(actorSlug: string, actorName: string) {
  const portrait = portraitManifest.images?.[actorSlug] as
    | ActorPortraitRecord
    | undefined

  if (!portrait?.imageUrl || portrait.status === 'none') {
    return {
      kind: 'fallback',
      actorSlug,
      actorName,
      alt: `Stand-in profilbilde for ${actorName}`,
      initials: buildInitials(actorName),
      ...buildAccentFromSlug(actorSlug),
    }
  }

  const fileExtension = portrait.fileExtension
    ? portrait.fileExtension.replace(/^\./, '').toLowerCase()
    : inferFileExtension(portrait.imageUrl, portrait.sourcePageUrl)

  if (!fileExtension || !isSupportedImageExtension(fileExtension)) {
    return {
      kind: 'fallback',
      actorSlug,
      actorName,
      alt: `Stand-in profilbilde for ${actorName}`,
      initials: buildInitials(actorName),
      ...buildAccentFromSlug(actorSlug),
    }
  }

  const detailSize = getSquareDetailSize(portrait)

  const actorPortrait: ActorPortraitImage = {
    kind: 'image',
    actorSlug,
    actorName,
    alt: `Profilbilde av ${actorName}`,
    src: `/generated/profilbilder/${actorSlug}-detail.jpg`,
    cardSrc: `/generated/profilbilder/${actorSlug}-card.webp`,
    source: portrait.source ?? 'Ukjent kilde',
    sourcePageUrl: portrait.sourcePageUrl ?? null,
    license: portrait.license ?? '',
    licenseUrl: portrait.licenseUrl ?? null,
    author: portrait.author ?? '',
    credit: portrait.credit ?? '',
    description: portrait.description ?? '',
    width: detailSize,
    height: detailSize,
    cardWidth: Math.min(detailSize, 192),
    cardHeight: Math.min(detailSize, 192),
  }

  return actorPortrait
}
