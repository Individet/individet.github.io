# individet.github.io

Hjemmesiden til **Tankesmia Individet** – publisert på [www.individet.no](https://www.individet.no).

Siden er bygget med [Astro](https://astro.build) og genererer statiske sider fra Markdown-innhold. Den viktigste innholdstypen er ISI-analyser (Individets Suverenitetsindeks), som rangerer offentlige personer og institusjoner på seks dimensjoner knyttet til individets suverenitet (selveierskap).

## Sammenheng med `tankesmia`

Dette repoet er den ene halvdelen av et todelt arbeidsopplegg:

- **`tankesmia/`** – definerer metode, prinsipper og AI-skills som brukes til å produsere analyser.
- **`individet.github.io/`** (dette repoet) – publiserer de ferdigstilte analysene som statiske nettsider.

Analyseutkast skrives ved hjelp av skills og dokumentasjon i `tankesmia/`. Når et utkast er godkjent, legges det til som en Markdown-fil under `content/isi/` og publiseres automatisk via GitHub Pages.

## Utviklingsprosess

```bash
cd individet.github.io
npm install
npm run dev      # lokal utviklingsserver
npm run build    # bygg statisk site
npm run preview  # forhåndsvis build lokalt
```

Krever Node `>=22.12.0`.

Innhold legges til under `content/` som Markdown-filer med frontmatter. Astro leser innholdsdefinisjonen i `src/content.config.ts` og genererer sider automatisk basert på filstruktur.

## Bidra

Vi tar imot bidrag i form av:

- **Faktakorreksjoner** – åpne et issue eller en pull request med kildehenvisning.
- **Tips til nye ISI-analyser** – Disse genereres med en omstendelig skill-fil med Claude Opus 6.4 i Deep Research-modus, altså en relativt dyr affære.
- **Tekniske forbedringer** – buggfikser, tilgjengelighet, ytelse. Sjekk at `npm run build` går feilfritt før du sender PR.

All innhold under `content/` er redaksjonelt materiale og endres bare etter redaksjonell vurdering.
