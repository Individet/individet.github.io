// @ts-check
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import { readFileSync } from 'node:fs'
import { join, basename } from 'node:path'

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildFigureHtml(img) {
  return [
    '<figure>',
    `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(
      img.alt
    )}" loading="lazy">`,
    `<figcaption>${escapeHtml(img.attribution)} — ${escapeHtml(
      img.license
    )}</figcaption>`,
    '</figure>',
  ].join('\n')
}

function walkMdast(node, parent, idx, inlineMap) {
  if (node.type === 'image' && parent !== null && idx !== null) {
    const img = inlineMap.get(node.url)
    if (img) {
      parent.children[idx] = { type: 'html', value: buildFigureHtml(img) }
    }
  }
  if (Array.isArray(node.children)) {
    for (let i = node.children.length - 1; i >= 0; i--) {
      walkMdast(node.children[i], node, i, inlineMap)
    }
  }
}

/** @returns {import('unified').Plugin} */
function remarkArticleImages() {
  return function (tree, file) {
    const mdPath = file.history?.[0] ?? file.path ?? ''
    if (!mdPath.includes('/content/articles/')) return

    const slug = basename(mdPath, '.md')
    const jsonPath = join(
      process.cwd(),
      'src',
      'assets',
      'articles',
      `${slug}.json`
    )

    let images
    try {
      images = JSON.parse(readFileSync(jsonPath, 'utf-8'))
    } catch {
      return
    }

    const inlineMap = new Map((images.inline ?? []).map((img) => [img.id, img]))
    walkMdast(tree, null, null, inlineMap)
  }
}

// https://astro.build/config
export default defineConfig({
  site: 'https://www.individet.no',
  trailingSlash: 'always',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkArticleImages],
  },
})
