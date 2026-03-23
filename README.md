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
- npm run sync-profile-images

## Eksempel

Rapportene ligger i:

content/isi/

Og publiseres som:

/isi/[rapport-slug]/

## Profilbilder for ISI-aktører

Profilbildedata lagres i `src/assets/profilbilder.json`, mens selve bildefilene
lastes ned til `public/generated/profilbilder/` ved `npm run dev` og
`npm run build`.

For å lete opp nye kandidater for aktører som mangler bilde, kjør:

- `npm run sync-profile-images`

Scriptet søker primært i Wikimedia Commons/Wikidata, skriver URL + lisensdata
til JSON-filen og logger hver ny oppføring i konsollen. Hvis et forslag ikke er
ønsket, kan oppføringen slettes eller justeres manuelt i JSON-filen.

Hvis du vil låse en aktør til stand-in-bilde og stoppe videre autosøk, kan du
legge inn en oppføring som denne i `images`:

```json
"actor-slug": {
  "status": "none",
  "note": "Ingen egnet fri profilkilde funnet ennå."
}
```
