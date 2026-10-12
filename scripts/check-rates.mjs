import assert from 'node:assert/strict'
import { convertFromBase, convertToBase, fetchFrankfurterRates } from '../src/rates.js'

const response = body => ({ ok: true, json: async () => body })
const all = ['BDT', 'EUR', 'PLN', 'MYR'].map(iso_code => ({ iso_code }))
const calls = []
const result = await fetchFrankfurterRates(async url => {
  calls.push(String(url))
  return response(calls.length === 1 ? all : [
    { date: '2026-10-12', base: 'BDT', quote: 'EUR', rate: 0.00725 },
    { date: '2026-10-12', base: 'BDT', quote: 'PLN', rate: 0.03178 },
    { date: '2026-10-12', base: 'BDT', quote: 'MYR', rate: 0.03316 },
  ])
})
assert.deepEqual(result.unsupported, [])
assert.equal(result.date, '2026-10-12')
assert.equal(calls.length, 2)
assert.match(calls[1], /base=BDT/)
assert.equal(convertFromBase(10000, result.rates.EUR), 72.5)
assert.equal(Number(convertToBase(100, result.rates.EUR).toFixed(2)), 13793.1)

const unsupported = await fetchFrankfurterRates(async url => String(url).includes('/currencies')
  ? response(all.filter(item => item.iso_code !== 'MYR'))
  : response([{ date: '2026-10-12', base: 'BDT', quote: 'EUR', rate: 0.00725 }, { date: '2026-10-12', base: 'BDT', quote: 'PLN', rate: 0.03178 }]))
assert.deepEqual(unsupported.unsupported, ['MYR'])
assert.equal(unsupported.rates.EUR, 0.00725)

const unsupportedBase = await fetchFrankfurterRates(async () => response(all.filter(item => item.iso_code !== 'BDT')))
assert.ok(unsupportedBase.unsupported.includes('BDT'))
assert.equal(Object.keys(unsupportedBase.rates).length, 0)

await assert.rejects(() => fetchFrankfurterRates(async () => ({ ok: false, status: 503 })), /503/)
let requestCount = 0
await assert.rejects(() => fetchFrankfurterRates(async url => {
  requestCount += 1
  return String(url).includes('/currencies') ? response(all) : { ok: false, status: 502 }
}), /502/)
assert.equal(convertFromBase(100, 0), 0)
assert.equal(convertToBase(-1, 0.5), 0)
console.log('Rate checks passed: supported quotes, unsupported quote/base, API error, and both conversion directions.')
