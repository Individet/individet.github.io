# individet.github.io

Astro-basert nettsted og publiseringsarkiv for Individet pa www.individet.no.

## URL-prinsipp (Obsidian-vennlig)

Publiserte sider bruker sti-format med trailing slash:

- /isi/vegard_martinsen/

Filnavn i `content/isi/` blir en del av URL-en, noe som gir forutsigbar kobling mellom filer og lenker.

## Innholdsflyt

1. Legg en markdown-fil i `content/isi/`
2. Bruk ISI-frontmatter som rapportene i mappen allerede følger
3. Bygg eller start dev-server for publisering
4. Oversikten på `/isi/` oppdateres automatisk med aktørnavn og total ISI-score

## Kommandoer

- npm install
- npm run dev
- npm run build
- npm run preview

## Eksempel

Rapportene ligger i:

content/isi/

Og publiseres som:

/isi/[rapport-slug]/
