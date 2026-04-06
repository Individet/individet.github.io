/**
 * fetch-freedom-data.ts
 *
 * Henter og merger data fra tre kilder:
 *   A. World Bank (BNP per capita, PPP, alle år 1995–2026) + land-metadata
 *   B. Heritage Foundation Index of Economic Freedom (CSV fra scripts/data/)
 *   C. Human Freedom Index / Fraser EFW (tankesmia/data/raw/2025-human-freedom-index.json)
 *
 * Output:
 *   public/data/freedom-scatter-ts.json   — tidsserie for animert scatter (alle land, alle år)
 *
 * Kjør med:
 *   npx tsx scripts/fetch-freedom-data.ts
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ─── Konstanter ───────────────────────────────────────────────────────────────

const WB_AGGREGATE_IDS = new Set([
  '1W',
  'EUU',
  'LCN',
  'NAC',
  'OED',
  'SSA',
  'ECS',
  'MEA',
  'SAS',
  'EAP',
  'WLD',
  'HIC',
  'MIC',
  'LMC',
  'UMC',
  'LIC',
  'AFW',
  'AFE',
  'TSA',
  'TSS',
  'OSS',
  'PSS',
  'PST',
  'SST',
  'CSS',
  'ARB',
  'INX',
])

const HERITAGE_NAME_OVERRIDES: Record<string, string> = {
  Burma: 'MMR',
  'Democratic Republic of Congo': 'COD',
  Eswatini: 'SWZ',
  Iran: 'IRN',
  Kosovo: 'XKX',
  'Kyrgyz Republic': 'KGZ',
  Laos: 'LAO',
  Micronesia: 'FSM',
  Moldova: 'MDA',
  'North Korea': 'PRK',
  'North Macedonia': 'MKD',
  'Republic of Congo': 'COG',
  Russia: 'RUS',
  'São Tomé and Príncipe': 'STP',
  'South Korea': 'KOR',
  Syria: 'SYR',
  Taiwan: 'TWN',
  Tanzania: 'TZA',
  'The Bahamas': 'BHS',
  'The Gambia': 'GMB',
  'The Philippines': 'PHL',
  Türkiye: 'TUR',
  'United Kingdom': 'GBR',
  'United States': 'USA',
  Venezuela: 'VEN',
  Vietnam: 'VNM',
}

const WHR_NAME_OVERRIDES: Record<string, string> = {
  'Taiwan Province of China': 'TWN',
  'Viet Nam': 'VNM',
  'Lao PDR': 'LAO',
  'Republic of Korea': 'KOR',
  'Republic of Moldova': 'MDA',
  'Russian Federation': 'RUS',
  'Hong Kong SAR of China': 'HKG',
  'DR Congo': 'COD',
  Congo: 'COG',
  'State of Palestine': 'PSE',
  Kosovo: 'XKX',
  Türkiye: 'TUR',
  "Côte d'Ivoire": 'CIV',
  'North Macedonia': 'MKD',
  'Bosnia and Herzegovina': 'BIH',
  Kyrgyzstan: 'KGZ',
}

// Minimum antall år med data for at et land tas med i trajektorie-output
const MIN_TRAJECTORY_YEARS = 5

// ─── Typer ────────────────────────────────────────────────────────────────────

interface WbMeta {
  name: string
  region: string
}

interface ScatterEntry {
  iso3: string
  name: string
  hs: number // Heritage Overall Score
  // Heritage sub-pillars
  hs_prop_rights?: number
  hs_gov_integrity?: number
  hs_judicial?: number
  hs_tax_burden?: number
  hs_gov_spending?: number
  hs_fiscal_health?: number
  hs_business?: number
  hs_labor?: number
  hs_monetary?: number
  hs_trade?: number
  hs_investment?: number
  hs_financial?: number
  // HFI per-year
  hf_score?: number
  pf_score?: number
  ef_hfi?: number
  pf_expression?: number
  pf_assembly?: number
  pf_rol?: number
  // World Bank
  gdp: number // GDP PPP (current)
  gdp_real?: number // GDP PPP (constant 2021 USD, inflasjonsjustert)
  le?: number // Forventet levealder
  cm?: number // Barnedødelighet per 1000
  // World Happiness Report
  whr_happiness?: number // Livstilfredshet (3-årig snitt)
  region: string
}

interface FreedomProsperityEntry {
  iso3: string
  name: string
  gdp_ppp: number
  heritage_score: number
  hfi_score: number | null
  pf_score: number | null
  ef_score: number | null
  region: string
}

interface TrajectoryPoint {
  year: number
  gdp: number
  freedom: number // Heritage score
}

interface HfiJson {
  year: Record<string, number>
  iso: Record<string, string>
  hf_score: Record<string, number>
  pf_score: Record<string, number>
  ef_score: Record<string, number>
  pf_expression: Record<string, number>
  pf_assembly: Record<string, number>
  pf_rol: Record<string, number>
}

// ─── A. World Bank ────────────────────────────────────────────────────────────

async function fetchWorldBankMeta(): Promise<Map<string, WbMeta>> {
  console.log('Henter World Bank land-metadata...')
  const url = 'https://api.worldbank.org/v2/country?format=json&per_page=20000'
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`WB metadata feilet: ${resp.status}`)

  const [, entries] = (await resp.json()) as [
    unknown,
    Array<{
      id: string
      name: string
      region: { value: string }
    }>,
  ]

  const map = new Map<string, WbMeta>()
  for (const c of entries ?? []) {
    if (c.id)
      map.set(c.id, { name: c.name, region: c.region?.value ?? 'Unknown' })
  }
  console.log(`  → ${map.size} land i metadata`)
  return map
}

async function fetchWorldBankIndicator(
  indicator: string,
  label: string,
  round: (v: number) => number = Math.round,
): Promise<Map<string, Map<number, number>>> {
  console.log(`Henter World Bank ${label} (alle år 1995–2026)...`)
  const result = new Map<string, Map<number, number>>()

  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const url =
      `https://api.worldbank.org/v2/country/all/indicator/${indicator}` +
      `?format=json&per_page=20000&date=1995:2026&page=${page}`

    const resp = await fetch(url)
    if (!resp.ok)
      throw new Error(`WB ${label} feilet side ${page}: ${resp.status}`)

    const [meta, entries] = (await resp.json()) as [
      { page: number; pages: number; total: number },
      Array<{
        country: { id: string }
        countryiso3code: string
        date: string
        value: number | null
      }>,
    ]

    totalPages = meta.pages
    if (page === 1)
      console.log(
        `  Totalt ${meta.total} ${label}-datapunkter (${totalPages} side(r))`,
      )
    page++

    for (const entry of entries ?? []) {
      const id = entry.country?.id
      if (!id) continue
      if (/^\d/.test(id) || WB_AGGREGATE_IDS.has(id)) continue
      if (entry.value == null) continue

      const iso3 = entry.countryiso3code
      const year = parseInt(entry.date, 10)
      if (!iso3 || isNaN(year)) continue

      if (!result.has(iso3)) result.set(iso3, new Map())
      result.get(iso3)!.set(year, round(entry.value))
    }
  }

  console.log(`  → ${label}-data for ${result.size} land`)
  return result
}

// ─── B. Heritage Foundation ───────────────────────────────────────────────────

interface HeritageYearEntry {
  overall: number
  prop_rights?: number
  gov_integrity?: number
  judicial?: number
  tax_burden?: number
  gov_spending?: number
  fiscal_health?: number
  business?: number
  labor?: number
  monetary?: number
  trade?: number
  investment?: number
  financial?: number
}

interface HeritageData {
  /** iso3 → år → Heritage scores */
  byIsoYear: Map<string, Map<number, HeritageYearEntry>>
  /** iso3 → landnavn (fra Heritage) */
  isoToName: Map<string, string>
}

function findHeritageCsvFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().includes('heritage') && f.endsWith('.csv'))
    .map((f) => path.join(dir, f))
}

function loadHeritageAllYears(scriptsDataDir: string): HeritageData | null {
  const files = findHeritageCsvFiles(scriptsDataDir)
  if (files.length === 0) {
    console.warn('  ⚠ Ingen Heritage CSV funnet i scripts/data/.')
    return null
  }

  console.log(`Laster Heritage data fra ${files.length} fil(er)...`)

  const iso3166 = require('iso-3166-1') as {
    all: () => Array<{ country: string; alpha3: string }>
  }
  const nameToAlpha3 = new Map(
    iso3166.all().map((c) => [c.country.toLowerCase(), c.alpha3]),
  )

  const byIsoYear = new Map<string, Map<number, HeritageYearEntry>>()
  const isoToName = new Map<string, string>()

  for (const file of files.sort()) {
    const raw = fs.readFileSync(file, 'utf-8')
    const lines = raw.split('\n')
    const headerIdx = lines.findIndex((l) => l.startsWith('Country,'))
    if (headerIdx === -1) continue

    const headers = lines[headerIdx].split(',')
    const countryIdx = headers.indexOf('Country')
    const yearIdx = headers.indexOf('Index Year')
    const scoreIdx = headers.indexOf('Overall Score')
    if (countryIdx === -1 || yearIdx === -1 || scoreIdx === -1) continue

    // Sub-pillar column indices
    const colIdx = (name: string) => {
      const i = headers.indexOf(name)
      return i === -1 ? null : i
    }
    const propRightsIdx = colIdx('Property Rights')
    const govIntegrityIdx = colIdx('Government Integrity')
    const judicialIdx = colIdx('Judicial Effectiveness')
    const taxBurdenIdx = colIdx('Tax Burden')
    const govSpendingIdx = colIdx('Government Spending')
    const fiscalHealthIdx = colIdx('Fiscal Health')
    const businessIdx = colIdx('Business Freedom')
    const laborIdx = colIdx('Labor Freedom')
    const monetaryIdx = colIdx('Monetary Freedom')
    const tradeIdx = colIdx('Trade Freedom')
    const investmentIdx = colIdx('Investment Freedom')
    const financialIdx = colIdx('Financial Freedom')

    const parseCol = (
      parts: string[],
      idx: number | null,
    ): number | undefined => {
      if (idx === null) return undefined
      const v = parseFloat(parts[idx]?.trim() ?? '')
      return isNaN(v) ? undefined : Math.round(v * 10) / 10
    }

    let loaded = 0
    for (const line of lines.slice(headerIdx + 1).filter((l) => l.trim())) {
      const parts = line.split(',')
      const name = parts[countryIdx]?.trim() ?? ''
      const year = parseInt(parts[yearIdx]?.trim() ?? '', 10)
      const score = parseFloat(parts[scoreIdx]?.trim() ?? '')
      if (!name || isNaN(year) || isNaN(score)) continue

      const iso3 =
        HERITAGE_NAME_OVERRIDES[name] ??
        nameToAlpha3.get(name.toLowerCase()) ??
        null
      if (!iso3) continue

      if (!byIsoYear.has(iso3)) byIsoYear.set(iso3, new Map())
      byIsoYear.get(iso3)!.set(year, {
        overall: Math.round(score * 10) / 10,
        prop_rights: parseCol(parts, propRightsIdx),
        gov_integrity: parseCol(parts, govIntegrityIdx),
        judicial: parseCol(parts, judicialIdx),
        tax_burden: parseCol(parts, taxBurdenIdx),
        gov_spending: parseCol(parts, govSpendingIdx),
        fiscal_health: parseCol(parts, fiscalHealthIdx),
        business: parseCol(parts, businessIdx),
        labor: parseCol(parts, laborIdx),
        monetary: parseCol(parts, monetaryIdx),
        trade: parseCol(parts, tradeIdx),
        investment: parseCol(parts, investmentIdx),
        financial: parseCol(parts, financialIdx),
      })
      isoToName.set(iso3, name)
      loaded++
    }
    console.log(`  → ${path.basename(file)}: ${loaded} rader`)
  }

  const validCountries = [...byIsoYear.values()].filter(
    (m) => m.size > 0,
  ).length
  console.log(`  → Totalt ${validCountries} land fra Heritage`)
  return { byIsoYear, isoToName }
}

// ─── C. World Happiness Report ──────────────────────────────────────────────

function loadWhrAllYears(
  scriptsDataDir: string,
): Map<string, Map<number, number>> {
  const files = fs
    .readdirSync(scriptsDataDir)
    .filter((f) => f.toLowerCase().includes('whr') && f.endsWith('.csv'))
    .map((f) => path.join(scriptsDataDir, f))

  if (files.length === 0) {
    console.warn('  ⚠ Ingen WHR CSV funnet i scripts/data/.')
    return new Map()
  }

  console.log(`Laster WHR data fra ${files.length} fil(er)...`)

  const iso3166 = require('iso-3166-1') as {
    all: () => Array<{ country: string; alpha3: string }>
  }
  const nameToAlpha3 = new Map(
    iso3166.all().map((c) => [c.country.toLowerCase(), c.alpha3]),
  )

  const result = new Map<string, Map<number, number>>()

  for (const file of files.sort()) {
    const raw = fs.readFileSync(file, 'utf-8')
    const lines = raw.split('\n').filter((l) => l.trim())
    if (lines.length < 2) continue

    const headers = lines[0].split(',').map((h) => h.trim())
    const yearIdx = headers.indexOf('Year')
    const countryIdx = headers.indexOf('Country name')
    const scoreIdx = headers.indexOf('Life evaluation (3-year average)')
    if (yearIdx === -1 || countryIdx === -1 || scoreIdx === -1) {
      console.warn(`  ⚠ Mangler kolonner i ${path.basename(file)}`)
      continue
    }

    let loaded = 0
    for (const line of lines.slice(1)) {
      const parts = line.split(',')
      const countryName = parts[countryIdx]?.trim() ?? ''
      const year = parseInt(parts[yearIdx]?.trim() ?? '', 10)
      const score = parseFloat(parts[scoreIdx]?.trim() ?? '')
      if (!countryName || isNaN(year) || isNaN(score)) continue

      const iso3 =
        WHR_NAME_OVERRIDES[countryName] ??
        nameToAlpha3.get(countryName.toLowerCase()) ??
        null
      if (!iso3) continue

      if (!result.has(iso3)) result.set(iso3, new Map())
      result.get(iso3)!.set(year, Math.round(score * 1000) / 1000)
      loaded++
    }
    console.log(`  → ${path.basename(file)}: ${loaded} rader`)
  }

  console.log(`  → WHR-data for ${result.size} land`)
  return result
}

// ─── D. Human Freedom Index ───────────────────────────────────────────────────

interface HfiRecord {
  hf_score: number
  pf_score: number
  ef_score: number
  pf_expression?: number
  pf_assembly?: number
  pf_rol?: number
}

function loadHfiAllYears(): Map<string, Map<number, HfiRecord>> {
  const hfiFile = path.resolve(
    ROOT,
    '../tankesmia/data/raw/2025-human-freedom-index.json',
  )
  if (!fs.existsSync(hfiFile)) {
    console.warn('  ⚠ HFI JSON mangler')
    return new Map()
  }

  console.log('Laster Human Freedom Index (alle år)...')
  const raw = JSON.parse(fs.readFileSync(hfiFile, 'utf-8')) as HfiJson
  const indices = Object.keys(raw.year)

  const result = new Map<string, Map<number, HfiRecord>>()
  for (const i of indices) {
    const iso3 = raw.iso[i]
    const year = raw.year[i]
    const hf = raw.hf_score[i]
    const pf = raw.pf_score[i]
    const ef = raw.ef_score[i]
    if (!iso3 || hf == null) continue

    if (!result.has(iso3)) result.set(iso3, new Map())
    const r: HfiRecord = { hf_score: hf, pf_score: pf, ef_score: ef }
    const expr = raw.pf_expression?.[i]
    const assm = raw.pf_assembly?.[i]
    const rol = raw.pf_rol?.[i]
    if (expr != null) r.pf_expression = Math.round(expr * 100) / 100
    if (assm != null) r.pf_assembly = Math.round(assm * 100) / 100
    if (rol != null) r.pf_rol = Math.round(rol * 100) / 100
    result.get(iso3)!.set(year, r)
  }

  console.log(`  → ${result.size} land fra HFI`)
  return result
}

// ─── Hjelpefunksjoner ─────────────────────────────────────────────────────────

function gdpForYear(gdpMap: Map<number, number>, year: number): number | null {
  let gdp = gdpMap.get(year)
  if (gdp != null) return gdp
  for (let offset = 1; offset <= 3; offset++) {
    gdp = gdpMap.get(year - offset) ?? gdpMap.get(year + offset)
    if (gdp != null) return gdp
  }
  return null
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const scriptsDataDir = path.join(__dirname, 'data')
  const outDir = path.join(ROOT, 'public', 'data')
  fs.mkdirSync(outDir, { recursive: true })

  const wbMeta = await fetchWorldBankMeta()
  const [wbGdpAllYears, wbGdpRealAllYears, wbLeAllYears, wbCmAllYears] =
    await Promise.all([
      fetchWorldBankIndicator('NY.GDP.PCAP.PP.CD', 'GDP PPP (current)'),
      fetchWorldBankIndicator('NY.GDP.PCAP.PP.KD', 'GDP PPP (constant)'),
      fetchWorldBankIndicator(
        'SP.DYN.LE00.IN',
        'forventet levealder',
        (v) => Math.round(v * 10) / 10,
      ),
      fetchWorldBankIndicator(
        'SH.DYN.MORT',
        'barnedødelighet',
        (v) => Math.round(v * 10) / 10,
      ),
    ])
  const heritageData = loadHeritageAllYears(scriptsDataDir)
  const hfiAllYears = loadHfiAllYears()
  const whrAllYears = loadWhrAllYears(scriptsDataDir)

  if (!heritageData) {
    console.error('Ingen Heritage-data tilgjengelig. Avbryter.')
    process.exit(1)
  }

  // ─── Scatter timeseries ──────────────────────────────────────────────────────
  console.log('\nBygger scatter-tidsserie...')

  const allYearsSet = new Set<number>()
  for (const yearMap of heritageData.byIsoYear.values()) {
    for (const y of yearMap.keys()) allYearsSet.add(y)
  }
  const sortedYears = [...allYearsSet].sort((a, b) => a - b)

  const byYear: Record<number, ScatterEntry[]> = {}

  for (const year of sortedYears) {
    const entries: ScatterEntry[] = []
    for (const [iso3, yearMap] of heritageData.byIsoYear) {
      const hsEntry = yearMap.get(year)
      if (hsEntry == null) continue

      const gdpMap = wbGdpAllYears.get(iso3)
      if (!gdpMap) continue
      const gdp = gdpForYear(gdpMap, year)
      if (gdp == null) continue

      const name =
        heritageData.isoToName.get(iso3) ?? wbMeta.get(iso3)?.name ?? iso3
      const region = wbMeta.get(iso3)?.region ?? 'Unknown'

      const le =
        wbLeAllYears.get(iso3) != null
          ? gdpForYear(wbLeAllYears.get(iso3)!, year)
          : null
      const cm =
        wbCmAllYears.get(iso3) != null
          ? gdpForYear(wbCmAllYears.get(iso3)!, year)
          : null
      const gdpReal =
        wbGdpRealAllYears.get(iso3) != null
          ? gdpForYear(wbGdpRealAllYears.get(iso3)!, year)
          : null

      // HFI per-year (with ±1 year fallback)
      const hfiYearMap = hfiAllYears.get(iso3)
      let hfiEntry: HfiRecord | undefined
      if (hfiYearMap) {
        hfiEntry =
          hfiYearMap.get(year) ??
          hfiYearMap.get(year - 1) ??
          hfiYearMap.get(year + 1)
      }

      const scatterEntry: ScatterEntry = {
        iso3,
        name,
        hs: hsEntry.overall,
        gdp,
        region,
      }
      // Heritage sub-pillars
      if (hsEntry.prop_rights != null)
        scatterEntry.hs_prop_rights = hsEntry.prop_rights
      if (hsEntry.gov_integrity != null)
        scatterEntry.hs_gov_integrity = hsEntry.gov_integrity
      if (hsEntry.judicial != null) scatterEntry.hs_judicial = hsEntry.judicial
      if (hsEntry.tax_burden != null)
        scatterEntry.hs_tax_burden = hsEntry.tax_burden
      if (hsEntry.gov_spending != null)
        scatterEntry.hs_gov_spending = hsEntry.gov_spending
      if (hsEntry.fiscal_health != null)
        scatterEntry.hs_fiscal_health = hsEntry.fiscal_health
      if (hsEntry.business != null) scatterEntry.hs_business = hsEntry.business
      if (hsEntry.labor != null) scatterEntry.hs_labor = hsEntry.labor
      if (hsEntry.monetary != null) scatterEntry.hs_monetary = hsEntry.monetary
      if (hsEntry.trade != null) scatterEntry.hs_trade = hsEntry.trade
      if (hsEntry.investment != null)
        scatterEntry.hs_investment = hsEntry.investment
      if (hsEntry.financial != null)
        scatterEntry.hs_financial = hsEntry.financial
      // WB indicators
      if (le != null) scatterEntry.le = le
      if (cm != null) scatterEntry.cm = cm
      if (gdpReal != null) scatterEntry.gdp_real = gdpReal
      // WHR: livstilfredshet med ±1 år fallback
      const whrYearMap = whrAllYears.get(iso3)
      if (whrYearMap) {
        const whrScore =
          whrYearMap.get(year) ??
          whrYearMap.get(year - 1) ??
          whrYearMap.get(year + 1)
        if (whrScore != null) scatterEntry.whr_happiness = whrScore
      }
      // HFI per-year scores
      if (hfiEntry) {
        scatterEntry.hf_score = Math.round(hfiEntry.hf_score * 100) / 100
        scatterEntry.pf_score = Math.round(hfiEntry.pf_score * 100) / 100
        scatterEntry.ef_hfi = Math.round(hfiEntry.ef_score * 100) / 100
        if (hfiEntry.pf_expression != null)
          scatterEntry.pf_expression = hfiEntry.pf_expression
        if (hfiEntry.pf_assembly != null)
          scatterEntry.pf_assembly = hfiEntry.pf_assembly
        if (hfiEntry.pf_rol != null) scatterEntry.pf_rol = hfiEntry.pf_rol
      }
      entries.push(scatterEntry)
    }
    if (entries.length > 0) byYear[year] = entries
  }

  const validYears = sortedYears.filter((y) => byYear[y])
  const scatterTs = {
    years: validYears,
    byYear: Object.fromEntries(validYears.map((y) => [String(y), byYear[y]])),
  }

  const scatterTsFile = path.join(outDir, 'freedom-scatter-ts.json')
  fs.writeFileSync(scatterTsFile, JSON.stringify(scatterTs))
  console.log(
    `Skrevet: ${scatterTsFile}` +
      ` (${validYears.length} år, ~${Math.round(validYears.reduce((s, y) => s + byYear[y].length, 0) / validYears.length)} land/år gjennom.)`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
