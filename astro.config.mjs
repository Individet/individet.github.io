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

function applyHvemEierBarnetTextFixes(text) {
  return text
    .replaceAll(
      'Foreldrenes makt er derfor en plikt til å oppdra barnet til selvstendighet',
      'Foreldrenes makt er derfor en forpliktelse til å oppdra barnet til selvstendighet'
    )
    .replaceAll('de plikter å gjøre det tilgjengelig', 'de forplikter seg til å gjøre det tilgjengelig')
    .replaceAll('påtar seg positive plikter — omsorg, fostring, og oppdragelse til myndig selvstendighet.', 'forplikter seg til å gi omsorg, fostring og oppdragelse til myndig selvstendighet.')
    .replaceAll(
      'Det er en plikt som springer direkte fra menneskets natur',
      'Det er en forpliktelse som springer direkte fra menneskets natur'
    )
    .replaceAll('Plikten er reell.', 'Forpliktelsen er reell.')
    .replaceAll(
      'Hvis foreldre har plikt til å oppdra barnet til selvstendighet',
      'Hvis foreldre har en forpliktelse til å oppdra barnet til selvstendighet'
    )
    .replaceAll('positive plikter', 'positive forpliktelser')
    .replaceAll(
      'Foreldre har reelle, håndhevbare plikter overfor sine barn',
      'Foreldre har reelle, håndhevbare forpliktelser overfor sine barn'
    )
    .replaceAll('De plikter å oppdra barnet', 'De forplikter seg til å oppdra barnet')
    .replaceAll('sinnets komprakikoser', 'sinnets comprachicos')
    .replaceAll('Victor Hugos komprakikoser', 'Victor Hugos comprachicos')
}

function walkMdastText(node) {
  if (node.type === 'text') {
    node.value = applyHvemEierBarnetTextFixes(node.value)
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      walkMdastText(child)
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

    if (slug === 'hvem-eier-barnet') {
      walkMdastText(tree)
    }
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
