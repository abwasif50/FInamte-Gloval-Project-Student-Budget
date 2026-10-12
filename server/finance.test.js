import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateFinanceContext, validateAssistantRequest } from './finance.js'

const categories = { tuition: 1200, rent: 680, food: 280, transport: 65, insurance: 125, other: 170 }
const rates = {
  EUR: { rate: 0.01, isLive: true },
  PLN: { rate: 0.02, isLive: true },
  MYR: { rate: 0.1, isLive: false },
}
const context = (overrides = {}) => ({
  budget: { categories, availableFundsBdt: null }, selectedDestination: 'Poland', destinationNames: ['Poland'],
  exchange: { base: 'BDT', date: '2026-10-12', source: 'Frankfurter API', rates }, ...overrides,
})

test('calculates monthly, annual living, total annual plan, and rent increase deterministically', () => {
  const result = calculateFinanceContext({ message: 'What if my rent increases by 15%?', context: context() })
  assert.equal(result.personalBudget.monthlyTotalBdt, 2520)
  assert.equal(result.personalBudget.annualExpensePlanBdt, 30240)
  assert.equal(result.personalBudget.annualLivingExpensePlanBdt, 15840)
  assert.equal(result.whatIf.additionalMonthlyBdt, 102)
  assert.equal(result.whatIf.newMonthlyExpensePlanBdt, 2622)
  assert.equal(result.whatIf.newAnnualExpensePlanBdt, 31464)
})

test('converts Poland living and tuition separately before adding BDT ranges', () => {
  const result = calculateFinanceContext({ message: 'Can I plan for Poland?', context: context({
    budget: { categories, availableFundsBdt: 1200000 },
  }) })
  const poland = result.destinationEstimates[0]
  assert.equal(poland.living.annualBdt.minBdt, 900000)
  assert.equal(poland.living.annualBdt.maxBdt, 1200000)
  assert.equal(poland.tuition.annualBdt.minBdt, 200000)
  assert.equal(poland.tuition.annualBdt.maxBdt, 600000)
  assert.equal(poland.firstYearKnownPricedItemsBdt.minBdt, 1100000)
  assert.equal(poland.firstYearKnownPricedItemsBdt.maxBdt, 1800000)
  assert.equal(poland.fundingComparison.status, 'within-priced-range')
  assert.equal(poland.living.source.url, 'https://study.gov.pl/cost-living-poland')
  assert.equal(poland.tuition.source.url, 'https://study.gov.pl/tuition-fees')
})

test('does not treat unspecified Germany tuition or semester fees as zero', () => {
  const result = calculateFinanceContext({ message: 'How much for Germany?', context: context({
    selectedDestination: 'Germany', destinationNames: ['Germany'],
  }) })
  const germany = result.destinationEstimates[0]
  assert.equal(germany.tuition.annualBdt, null)
  assert.equal(germany.firstYearKnownPricedItemsBdt.minBdt, 1080000)
  assert.ok(germany.unpricedOrExcludedCosts.includes('program-specific annual tuition amount'))
  assert.ok(germany.unpricedOrExcludedCosts.includes('semester contribution total for the academic year'))
  assert.equal(germany.fundingComparison.status, 'not-calculable')
})

test('validates shape, categories, currencies, and message length', () => {
  const valid = validateAssistantRequest({ message: 'Question', context: context() })
  assert.ok(valid.value)
  assert.equal(validateAssistantRequest({ message: ' '.repeat(1300), context: context() }).error.includes('1,200'), true)
  assert.equal(validateAssistantRequest({ message: 'test', context: context({ budget: { categories: {}, availableFundsBdt: null } }) }).error.includes('tuition'), true)
  assert.equal(validateAssistantRequest(null).error.includes('JSON object'), true)
})
