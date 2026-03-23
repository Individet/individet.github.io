/**
 * Finds missing reusable profile images for ISI actors and stores them in
 * src/assets/profilbilder.json for later approval and download.
 *
 * Usage:
 *   node scripts/sync-profile-images.mjs
 *   node scripts/sync-profile-images.mjs --actor=bjornar-moxnes
 */

import {
  getIsiActors,
  inferFileExtension,
  isSupportedImageExtension,
  normalizeForMatch,
  readPortraitManifest,
  stripHtml,
  writePortraitManifest,
} from './profile-images-lib.mjs'

function getCliActorFilter() {
  const argument = process.argv.find((value) => value.startsWith('--actor='))

  return argument ? argument.slice('--actor='.length).trim() : null
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))]
}

function getActorSearchTerms(actor) {
  const withoutParentheses = actor.actorName
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .trim()

  return uniq([
    actor.actorName,
    withoutParentheses,
    actor.actorSlug.replace(/-/g, ' '),
    actor.actorId?.replace(/-/g, ' '),
  ])
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent':
        'individet-profile-image-sync/1.0 (+https://www.individet.no)',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fra ${url}`)
  }

  return response.json()
}

function scoreWikidataCandidate(actor, candidate) {
  const actorName = normalizeForMatch(actor.actorName)
  const actorBaseName = normalizeForMatch(
    actor.actorName.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
  )
  const actorSlug = normalizeForMatch(actor.actorSlug.replace(/-/g, ' '))
  const label = normalizeForMatch(candidate.label ?? '')
  const description = normalizeForMatch(candidate.description ?? '')
  const aliases = (candidate.aliases ?? []).map((value) =>
    normalizeForMatch(value)
  )

  let score = 0

  if (label === actorName || label === actorBaseName) {
    score += 120
  }

  if (aliases.includes(actorName) || aliases.includes(actorBaseName)) {
    score += 100
  }

  if (label.includes(actorBaseName) || actorBaseName.includes(label)) {
    score += 40
  }

  if (aliases.some((alias) => alias.includes(actorBaseName))) {
    score += 30
  }

  if (label.includes(actorSlug)) {
    score += 10
  }

  for (const hint of [
    actor.actorType,
    actor.actorCountry,
    actor.actorAffiliation,
  ].filter(Boolean)) {
    if (description.includes(normalizeForMatch(hint))) {
      score += 8
    }
  }

  return score
}

async function searchWikidata(actor) {
  let bestCandidate = null

  for (const term of getActorSearchTerms(actor)) {
    const url = new URL('https://www.wikidata.org/w/api.php')
    url.searchParams.set('action', 'wbsearchentities')
    url.searchParams.set('format', 'json')
    url.searchParams.set('language', 'no')
    url.searchParams.set('uselang', 'no')
    url.searchParams.set('type', 'item')
    url.searchParams.set('limit', '6')
    url.searchParams.set('search', term)

    const payload = await fetchJson(url)

    for (const candidate of payload.search ?? []) {
      const score = scoreWikidataCandidate(actor, candidate)

      if (!bestCandidate || score > bestCandidate.score) {
        bestCandidate = { score, candidate }
      }
    }

    if (bestCandidate?.score >= 120) {
      return bestCandidate.candidate
    }
  }

  return bestCandidate?.candidate ?? null
}

async function getWikidataEntityImage(entityId) {
  const payload = await fetchJson(
    `https://www.wikidata.org/wiki/Special:EntityData/${entityId}.json`
  )
  const entity = payload.entities?.[entityId]
  const imageClaim = entity?.claims?.P18?.[0]

  return imageClaim?.mainsnak?.datavalue?.value ?? null
}

async function getCommonsImageDetails(fileTitle) {
  const url = new URL('https://commons.wikimedia.org/w/api.php')
  url.searchParams.set('action', 'query')
  url.searchParams.set('format', 'json')
  url.searchParams.set('formatversion', '2')
  url.searchParams.set('prop', 'imageinfo')
  url.searchParams.set('iiprop', 'url|size|extmetadata')
  url.searchParams.set('titles', fileTitle)

  const payload = await fetchJson(url)
  const page = payload.query?.pages?.[0]
  const imageInfo = page?.imageinfo?.[0]

  if (!imageInfo?.url) {
    return null
  }

  const fileExtension = inferFileExtension(imageInfo.url, fileTitle)

  if (!isSupportedImageExtension(fileExtension)) {
    return null
  }

  const extmetadata = imageInfo.extmetadata ?? {}

  return {
    fileTitle,
    imageUrl: imageInfo.url,
    sourcePageUrl: imageInfo.descriptionurl ?? null,
    width: imageInfo.width ?? null,
    height: imageInfo.height ?? null,
    fileExtension,
    license: stripHtml(extmetadata.LicenseShortName?.value ?? ''),
    licenseUrl: extmetadata.LicenseUrl?.value ?? null,
    author: stripHtml(extmetadata.Artist?.value ?? ''),
    credit: stripHtml(extmetadata.Credit?.value ?? ''),
    description: stripHtml(extmetadata.ImageDescription?.value ?? ''),
  }
}

function scoreCommonsFile(actor, title) {
  const actorName = normalizeForMatch(actor.actorName)
  const actorBaseName = normalizeForMatch(
    actor.actorName.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
  )
  const normalizedTitle = normalizeForMatch(title.replace(/^File:/i, ''))

  let score = 0

  if (normalizedTitle.includes(actorName)) {
    score += 100
  }

  if (normalizedTitle.includes(actorBaseName)) {
    score += 80
  }

  if (
    normalizedTitle.includes(
      normalizeForMatch(actor.actorSlug.replace(/-/g, ' '))
    )
  ) {
    score += 15
  }

  if (/\bportrait\b|\bheadshot\b|\bpress\b/.test(normalizedTitle)) {
    score += 10
  }

  return score
}

async function searchCommonsFiles(actor) {
  let best = null

  for (const term of getActorSearchTerms(actor)) {
    const url = new URL('https://commons.wikimedia.org/w/api.php')
    url.searchParams.set('action', 'query')
    url.searchParams.set('format', 'json')
    url.searchParams.set('list', 'search')
    url.searchParams.set('srnamespace', '6')
    url.searchParams.set('srlimit', '6')
    url.searchParams.set('srsearch', term)

    const payload = await fetchJson(url)

    for (const result of payload.query?.search ?? []) {
      const score = scoreCommonsFile(actor, result.title)

      if (!best || score > best.score) {
        best = { score, title: result.title }
      }
    }

    if (best?.score >= 100) {
      return best.title
    }
  }

  return best?.title ?? null
}

async function findPortraitForActor(actor) {
  const wikidataCandidate = await searchWikidata(actor)

  if (wikidataCandidate?.id) {
    const wikidataImage = await getWikidataEntityImage(wikidataCandidate.id)

    if (wikidataImage) {
      const commonsImage = await getCommonsImageDetails(`File:${wikidataImage}`)

      if (commonsImage?.imageUrl) {
        return {
          status: 'approved',
          actorName: actor.actorName,
          source: 'Wikimedia Commons',
          foundVia: 'wikidata-p18',
          wikidataId: wikidataCandidate.id,
          wikidataLabel: wikidataCandidate.label ?? actor.actorName,
          ...commonsImage,
          addedAt: new Date().toISOString(),
        }
      }
    }
  }

  const commonsTitle = await searchCommonsFiles(actor)

  if (!commonsTitle) {
    return null
  }

  const commonsImage = await getCommonsImageDetails(commonsTitle)

  if (!commonsImage?.imageUrl) {
    return null
  }

  return {
    status: 'approved',
    actorName: actor.actorName,
    source: 'Wikimedia Commons',
    foundVia: 'commons-search',
    wikidataId: wikidataCandidate?.id ?? null,
    wikidataLabel: wikidataCandidate?.label ?? null,
    ...commonsImage,
    addedAt: new Date().toISOString(),
  }
}

function printNewMatch(actor, portrait) {
  console.log(`\n✓ Fant bilde for ${actor.actorName} (${actor.actorSlug})`)
  console.log(`  Kilde: ${portrait.source} via ${portrait.foundVia}`)
  console.log(`  Filside: ${portrait.sourcePageUrl ?? 'ukjent'}`)
  console.log(`  Bilde-URL: ${portrait.imageUrl}`)
  console.log(
    `  Lisens: ${portrait.license || 'ukjent'} ${
      portrait.licenseUrl ?? ''
    }`.trim()
  )

  if (portrait.author) {
    console.log(`  Fotograf/opphav: ${portrait.author}`)
  }

  if (portrait.credit) {
    console.log(`  Kreditering: ${portrait.credit}`)
  }
}

function shouldSkipAutosync(portraitRecord) {
  return portraitRecord?.status === 'none'
}

const actorFilter = getCliActorFilter()
const actors = await getIsiActors()
const manifest = await readPortraitManifest()

const actorsToProcess = actors.filter((actor) => {
  if (manifest.images[actor.actorSlug]) {
    if (shouldSkipAutosync(manifest.images[actor.actorSlug])) {
      console.log(
        `• Hopper over ${actor.actorName} (${actor.actorSlug}) fordi profilbilder.json sier status=none`
      )
    }

    return false
  }

  if (!actorFilter) {
    return true
  }

  return [actor.actorSlug, actor.actorName].some((value) =>
    value.toLowerCase().includes(actorFilter.toLowerCase())
  )
})

let added = 0
let missing = 0

for (const actor of actorsToProcess) {
  try {
    const portrait = await findPortraitForActor(actor)

    if (!portrait) {
      console.warn(
        `\n⚠ Fant ikke egnet bilde for ${actor.actorName} (${actor.actorSlug})`
      )
      missing++
      continue
    }

    manifest.images[actor.actorSlug] = portrait
    printNewMatch(actor, portrait)
    added++
  } catch (error) {
    console.warn(
      `\n⚠ Kunne ikke hente bilde for ${actor.actorName} (${actor.actorSlug}): ${error.message}`
    )
    missing++
  }
}

manifest.generatedAt = new Date().toISOString()
await writePortraitManifest(manifest)

console.log(
  `\nFerdig. Nye oppføringer: ${added}, uten treff eller med feil: ${missing}, eksisterende beholdt: ${
    Object.keys(manifest.images).length - added
  }`
)
