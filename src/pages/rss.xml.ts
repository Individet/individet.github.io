import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import { SITE } from '../lib/seo'

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10)
}

function stripMarkdown(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[\*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function getHeadlineAndSummary(markdown: string, fallbackTitle: string) {
  const lines = markdown.split(/\r?\n/)
  const headingLine = lines.find((line) => /^#\s+/.test(line))
  const title = headingLine?.replace(/^#\s+/, '').trim() || fallbackTitle

  const textAfterHeading = headingLine
    ? lines.slice(lines.indexOf(headingLine) + 1).join('\n')
    : markdown

  const plainText = stripMarkdown(textAfterHeading)
  const summary = plainText.slice(0, 280)

  return {
    title,
    summary: summary.length < plainText.length ? `${summary}...` : summary,
  }
}

export async function GET(context: { site?: URL }) {
  const isiEntries = await getCollection('isi')
  const reportEntries = await getCollection('isiReports')

  const items = [
    ...isiEntries.map((entry) => ({
      id: entry.id,
      body: entry.body,
      created: entry.data.created,
      lastUpdated: entry.data.lastUpdated,
      urlPath: `/isi/${entry.id.replace(/\.md$/, '')}/`,
    })),
    ...reportEntries.map((entry) => ({
      id: entry.id,
      body: entry.body,
      created: entry.data.created,
      lastUpdated: entry.data.lastUpdated,
      urlPath: `/isi/reports/${entry.id.replace(/\.md$/, '')}/`,
    })),
  ]

  const feedItems = items.flatMap((entry) => {
    const { title, summary } = getHeadlineAndSummary(
      entry.body ?? '',
      entry.id.replace(/\.md$/, '')
    )
    const baseItem = {
      title,
      link: entry.urlPath,
      description: summary,
      pubDate: entry.created,
    }

    const hasUpdateEntry =
      toDateOnly(entry.created) !== toDateOnly(entry.lastUpdated)

    if (!hasUpdateEntry) {
      return [baseItem]
    }

    return [
      baseItem,
      {
        title: `Oppdatert! ${title}`,
        link: entry.urlPath,
        description: `Oppdatert ${toDateOnly(entry.lastUpdated)}. ${summary}`,
        pubDate: entry.lastUpdated,
      },
    ]
  })

  feedItems.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())

  return rss({
    title: 'Individet RSS',
    description: 'Nye og oppdaterte ISI-analyser fra Individet.',
    site: context.site ?? SITE.url,
    items: feedItems,
    customData: '<language>nb-no</language>',
  })
}
