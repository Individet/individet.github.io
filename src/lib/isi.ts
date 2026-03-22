import type { CollectionEntry } from 'astro:content'

type IsiEntry = CollectionEntry<'isi'>

export const isiClassLabels = [
  'Sterkt suverenitetsfremmende',
  'Suverenitetsfremmende',
  'Blandet profil',
  'Suverenitetshemmende',
  'Sterkt suverenitetshemmende',
] as const

export type IsiClassLabel = typeof isiClassLabels[number]

export function getIsiRawScore(entry: IsiEntry) {
  const { d1, d2, d3, d4, d5, d6 } = entry.data.scores

  return d1.total + d2.total + d3.total + d4.total + d5.total + d6.total
}

export function getIsiScore(entry: IsiEntry) {
  const rawScore = getIsiRawScore(entry)

  return Math.round(((rawScore + 52) / 104) * 100)
}

export function getIsiClassFromScore(score: number): IsiClassLabel {
  if (score >= 80) {
    return 'Sterkt suverenitetsfremmende'
  }

  if (score >= 60) {
    return 'Suverenitetsfremmende'
  }

  if (score >= 40) {
    return 'Blandet profil'
  }

  if (score >= 20) {
    return 'Suverenitetshemmende'
  }

  return 'Sterkt suverenitetshemmende'
}

export function getIsiClass(entry: IsiEntry) {
  return getIsiClassFromScore(getIsiScore(entry))
}
