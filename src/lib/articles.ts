export interface ImageMeta {
  id: string
  url: string
  license: string
  attribution: string
  alt: string
}

export interface ArticleImages {
  hero: ImageMeta
  inline: ImageMeta[]
}

export function formatArticleDate(date: Date): string {
  return date.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
