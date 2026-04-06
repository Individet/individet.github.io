/**
 * Analyzes correlations between freedom indices and wellbeing outcomes
 * across years and countries. Outputs Pearson r and trend direction.
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataPath = join(__dirname, '../public/data/freedom-scatter-ts.json')
const ts = JSON.parse(readFileSync(dataPath, 'utf-8'))

const X_KEYS = ['hf_score', 'hs', 'ef_hfi', 'pf_score', 'pf_rol']
const Y_KEYS = ['gdp_real', 'le', 'cm', 'whr_happiness']

function pearson(pairs) {
  const n = pairs.length
  if (n < 3) return null
  const mx = pairs.reduce((s, p) => s + p[0], 0) / n
  const my = pairs.reduce((s, p) => s + p[1], 0) / n
  let num = 0,
    dx2 = 0,
    dy2 = 0
  for (const [x, y] of pairs) {
    num += (x - mx) * (y - my)
    dx2 += (x - mx) ** 2
    dy2 += (y - my) ** 2
  }
  if (dx2 === 0 || dy2 === 0) return null
  return num / Math.sqrt(dx2 * dy2)
}

function getVal(d, key) {
  return d[key] ?? null
}

// Per-year correlations
function corrForYear(year, xKey, yKey) {
  const rows = ts.byYear[String(year)] ?? []
  const pairs = rows
    .map((d) => [getVal(d, xKey), getVal(d, yKey)])
    .filter(([x, y]) => x != null && y != null)
  return pearson(pairs)
}

// Pooled correlation over all years
function corrPooled(xKey, yKey) {
  const pairs = []
  for (const yr of ts.years) {
    for (const d of ts.byYear[String(yr)] ?? []) {
      const x = getVal(d, xKey)
      const y = getVal(d, yKey)
      if (x != null && y != null) pairs.push([x, y])
    }
  }
  return pearson(pairs)
}

// Trend: slope of correlation over time (late years vs early)
function trendInCorr(xKey, yKey) {
  const yearCorrs = ts.years
    .map((yr) => ({ yr, r: corrForYear(yr, xKey, yKey) }))
    .filter(({ r }) => r != null)
  if (yearCorrs.length < 4) return null
  const mid = Math.floor(yearCorrs.length / 2)
  const early = yearCorrs.slice(0, mid).reduce((s, { r }) => s + r, 0) / mid
  const late =
    yearCorrs.slice(mid).reduce((s, { r }) => s + r, 0) /
    (yearCorrs.length - mid)
  return late - early
}

// Per-year mean of both variables (to see if means change)
function meanTrend(keys, yKey) {
  const result = {}
  for (const yr of [
    ts.years[0],
    ts.years[Math.floor(ts.years.length / 2)],
    ts.years[ts.years.length - 1],
  ]) {
    const rows = ts.byYear[String(yr)] ?? []
    const yVals = rows.map((d) => getVal(d, yKey)).filter((v) => v != null)
    result[yr] =
      yVals.length > 0
        ? (yVals.reduce((s, v) => s + v, 0) / yVals.length).toFixed(2)
        : null
  }
  return result
}

console.log('\n=== POOLED CORRELATIONS (all years combined) ===\n')
const header = [''].concat(Y_KEYS).join('\t')
console.log('X \\ Y\t' + Y_KEYS.join('\t\t'))
for (const xKey of X_KEYS) {
  const row = [xKey]
  for (const yKey of Y_KEYS) {
    const r = corrPooled(xKey, yKey)
    row.push(r != null ? r.toFixed(3) : 'n/a')
  }
  console.log(row.join('\t\t'))
}

console.log(
  '\n=== TREND: change in correlation over time (late - early years) ===\n'
)
console.log('X \\ Y\t' + Y_KEYS.join('\t\t'))
for (const xKey of X_KEYS) {
  const row = [xKey]
  for (const yKey of Y_KEYS) {
    const t = trendInCorr(xKey, yKey)
    row.push(t != null ? (t > 0 ? '+' : '') + t.toFixed(3) : 'n/a')
  }
  console.log(row.join('\t\t'))
}

console.log('\n=== MEAN Y VALUES over time (first / middle / last year) ===\n')
const years = ts.years
const sampleYrs = [
  years[0],
  years[Math.floor(years.length / 2)],
  years[years.length - 1],
]
console.log(`Years: ${sampleYrs.join(' / ')}`)
for (const yKey of Y_KEYS) {
  const trend = meanTrend(X_KEYS, yKey)
  console.log(`${yKey}: ${Object.values(trend).join(' / ')}`)
}

console.log('\n=== PER-YEAR CORRELATION EXAMPLES (first / middle / last) ===\n')
for (const xKey of X_KEYS) {
  for (const yKey of Y_KEYS) {
    const vals = sampleYrs.map((yr) => {
      const r = corrForYear(yr, xKey, yKey)
      return r != null ? r.toFixed(3) : 'n/a'
    })
    console.log(`${xKey} × ${yKey}: ${vals.join(' / ')}`)
  }
}

// Extreme countries analysis for most recent year
console.log(
  '\n=== TOP/BOTTOM countries in most recent year (gdp_real vs hf_score) ===\n'
)
const lastYr = years[years.length - 1]
const lastRows = (ts.byYear[String(lastYr)] ?? [])
  .filter((d) => d.hf_score != null && d.gdp_real != null)
  .sort((a, b) => b.hf_score - a.hf_score)
console.log('Top 5 by hf_score:')
lastRows
  .slice(0, 5)
  .forEach((d) =>
    console.log(
      `  ${d.name}: hf_score=${
        d.hf_score
      }, gdp_real=${d.gdp_real?.toLocaleString()}`
    )
  )
console.log('Bottom 5 by hf_score:')
lastRows
  .slice(-5)
  .forEach((d) =>
    console.log(
      `  ${d.name}: hf_score=${
        d.hf_score
      }, gdp_real=${d.gdp_real?.toLocaleString()}`
    )
  )
