import { rateApi } from './data.js'

const TARGETS = ['EUR', 'PLN', 'MYR']

export async function fetchFrankfurterRates(fetcher = globalThis.fetch) {
  const currenciesResponse = await fetcher(rateApi.currenciesUrl)
  if (!currenciesResponse.ok) throw new Error(`Currency list request failed (${currenciesResponse.status}).`)
  const currencyList = await currenciesResponse.json()
  if (!Array.isArray(currencyList)) throw new Error('Frankfurter returned an unexpected currency list.')
  const supported = new Set(currencyList.map(item => item.iso_code))
  const unsupported = ['BDT', ...TARGETS].filter(code => !supported.has(code))
  if (!supported.has('BDT')) return { rates: {}, date: '', unsupported: [...new Set(['BDT', ...unsupported])] }
  const availableTargets = TARGETS.filter(code => supported.has(code))
  if (!availableTargets.length) return { rates: {}, date: '', unsupported }

  const query = new URLSearchParams({ base: 'BDT', quotes: availableTargets.join(',') })
  const response = await fetcher(`https://api.frankfurter.dev/v2/rates?${query}`)
  if (!response.ok) throw new Error(`Rate request failed (${response.status}).`)
  const rows = await response.json()
  if (!Array.isArray(rows)) throw new Error('Frankfurter returned an unexpected rate response.')
  const rates = Object.fromEntries(rows
    .filter(row => availableTargets.includes(row.quote) && Number.isFinite(row.rate) && row.rate > 0)
    .map(row => [row.quote, row.rate]))
  const missingQuotes = availableTargets.filter(code => !Number.isFinite(rates[code]))
  return {
    rates,
    date: rows.find(row => rates[row.quote])?.date ?? '',
    unsupported: [...new Set([...unsupported, ...missingQuotes])],
  }
}

export function convertFromBase(amount, quoteRate) {
  if (!Number.isFinite(Number(amount)) || Number(amount) < 0 || !Number.isFinite(quoteRate) || quoteRate <= 0) return 0
  return Number(amount) * quoteRate
}

export function convertToBase(amount, quoteRate) {
  if (!Number.isFinite(Number(amount)) || Number(amount) < 0 || !Number.isFinite(quoteRate) || quoteRate <= 0) return 0
  return Number(amount) / quoteRate
}
