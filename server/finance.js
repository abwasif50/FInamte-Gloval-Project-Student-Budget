import { destinations, exchangeRates as fallbackRates, expenseLabels } from '../src/data.js'

const CATEGORIES = expenseLabels.map(item => item.key)
const MAX_CATEGORY_BDT = 100_000_000
const MAX_FUNDS_BDT = 1_000_000_000_000

function asAmount(value, max = MAX_CATEGORY_BDT) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max ? value : null
}

export function validateAssistantRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Request body must be a JSON object.' }
  if (typeof body.message !== 'string') return { error: 'Message must be text.' }
  const message = body.message.trim()
  if (message.length < 1 || message.length > 1200) return { error: 'Message must be between 1 and 1,200 characters.' }

  const context = body.context
  if (!context || typeof context !== 'object' || Array.isArray(context)) return { error: 'Finance context is required.' }
  const budget = context.budget
  if (!budget || typeof budget !== 'object' || Array.isArray(budget)) return { error: 'Budget values are required.' }
  const categoryInput = budget.categories
  if (!categoryInput || typeof categoryInput !== 'object' || Array.isArray(categoryInput)) return { error: 'Expense categories are required.' }
  const categories = {}
  for (const key of CATEGORIES) {
    const value = asAmount(categoryInput[key])
    if (value === null) return { error: `Budget value for ${key} must be a non-negative number.` }
    categories[key] = value
  }
  const availableFundsBdt = budget.availableFundsBdt == null ? null : asAmount(budget.availableFundsBdt, MAX_FUNDS_BDT)
  if (budget.availableFundsBdt != null && availableFundsBdt === null) return { error: 'Available study funds must be a non-negative number.' }

  if (!destinations.some(item => item.name === context.selectedDestination)) return { error: 'Selected destination is invalid.' }
  if (!Array.isArray(context.destinationNames) || context.destinationNames.length < 1 || context.destinationNames.length > destinations.length || context.destinationNames.some(name => !destinations.some(item => item.name === name))) {
    return { error: 'Destination reference selection is invalid.' }
  }

  const fx = context.exchange
  if (!fx || fx.base !== 'BDT' || typeof fx.rates !== 'object' || Array.isArray(fx.rates)) return { error: 'Exchange-rate context is invalid.' }
  const rates = {}
  for (const code of ['EUR', 'PLN', 'MYR']) {
    const item = fx.rates[code]
    if (!item || !Number.isFinite(item.rate) || item.rate <= 0 || typeof item.isLive !== 'boolean') return { error: `Exchange-rate value for ${code} is invalid.` }
    rates[code] = { rate: item.rate, isLive: item.isLive }
  }
  if (fx.date != null && (typeof fx.date !== 'string' || fx.date.length > 20)) return { error: 'Exchange-rate date is invalid.' }

  return {
    value: {
      message,
      context: {
        budget: { categories, availableFundsBdt },
        selectedDestination: context.selectedDestination,
        destinationNames: [...new Set(context.destinationNames)],
        exchange: { base: 'BDT', date: fx.date ?? null, source: fx.source === 'Frankfurter API' ? fx.source : 'Illustrative fallback rate; potentially outdated', rates },
      },
    },
  }
}

function toBdt(amount, currency, rates) {
  const rate = rates[currency]?.rate ?? fallbackRates[currency]
  return Number.isFinite(amount) && Number.isFinite(rate) && rate > 0 ? amount / rate : null
}

function convertedRange(min, max, currency, rates) {
  const low = toBdt(min, currency, rates)
  const high = toBdt(max, currency, rates)
  if (low === null || high === null) return null
  return { minBdt: low, maxBdt: high }
}

function calculateDestination(destination, rates, availableFundsBdt) {
  const livingMonthly = convertedRange(destination.living.min, destination.living.max, destination.living.currency, rates)
  const livingAnnual = livingMonthly && { minBdt: livingMonthly.minBdt * 12, maxBdt: livingMonthly.maxBdt * 12 }
  const tuition = Number.isFinite(destination.tuition.min) && Number.isFinite(destination.tuition.max)
    ? convertedRange(destination.tuition.min, destination.tuition.max, destination.tuition.currency, rates)
    : null
  const firstYearKnown = livingAnnual && (tuition
    ? { minBdt: livingAnnual.minBdt + tuition.minBdt, maxBdt: livingAnnual.maxBdt + tuition.maxBdt }
    : { ...livingAnnual })
  const missing = [...destination.living.excludes, ...destination.tuition.excludes]
  if (!tuition) missing.push('program-specific annual tuition amount')
  if (destination.tuition.additionalFees?.toLowerCase().includes('semester')) missing.push('semester contribution total for the academic year')
  const uniqueMissing = [...new Set(missing)]
  let fundingComparison = { status: 'not-calculable', reason: 'Available first-year study funds were not provided.' }
  if (availableFundsBdt !== null && firstYearKnown) {
    fundingComparison = {
      status: availableFundsBdt >= firstYearKnown.maxBdt ? 'covers-priced-estimate' : availableFundsBdt < firstYearKnown.minBdt ? 'below-priced-estimate' : 'within-priced-range',
      availableFundsBdt,
      remainingAfterPricedHighBdt: availableFundsBdt - firstYearKnown.maxBdt,
      gapToPricedLowBdt: Math.max(0, firstYearKnown.minBdt - availableFundsBdt),
      caveat: 'Compares funds only with the priced items shown; excluded or unspecified costs can increase the actual first-year amount.',
    }
  }
  return {
    name: destination.name,
    living: {
      monthlyOriginal: { min: destination.living.min, max: destination.living.max, currency: destination.living.currency },
      monthlyBdt: livingMonthly,
      annualBdt: livingAnnual,
      includes: destination.living.includes,
      notIncludedOrUnspecified: destination.living.excludes,
      source: { url: destination.living.sourceUrl, date: destination.living.sourceDate, checkedOn: destination.living.checkedOn },
    },
    tuition: {
      annualOriginal: tuition ? { min: destination.tuition.min, max: destination.tuition.max, currency: destination.tuition.currency } : null,
      annualBdt: tuition,
      description: destination.tuition.summary,
      source: { url: destination.tuition.sourceUrl, date: destination.tuition.sourceDate, checkedOn: destination.tuition.checkedOn },
    },
    firstYearKnownPricedItemsBdt: firstYearKnown,
    unpricedOrExcludedCosts: uniqueMissing,
    fundingComparison,
  }
}

export function calculateFinanceContext({ message, context }) {
  const categories = context.budget.categories
  const monthlyTotalBdt = CATEGORIES.reduce((sum, key) => sum + categories[key], 0)
  const monthlyLivingBdt = ['rent', 'food', 'transport', 'insurance', 'other'].reduce((sum, key) => sum + categories[key], 0)
  const annualLivingBdt = monthlyLivingBdt * 12
  const annualExpensePlanBdt = monthlyTotalBdt * 12
  const requestedPercent = message.match(/(\d+(?:\.\d+)?)\s*%/)
  const rentIncreasePercent = message.toLowerCase().includes('rent') && /increase|raise|rise|higher|what if/.test(message.toLowerCase())
    ? Math.min(Number(requestedPercent?.[1] ?? 15), 1000)
    : 15
  const rentIncreaseMonthlyBdt = categories.rent * rentIncreasePercent / 100
  const changedMonthlyTotalBdt = monthlyTotalBdt + rentIncreaseMonthlyBdt
  const changedAnnualExpensePlanBdt = changedMonthlyTotalBdt * 12
  const categoriesBySpend = [...CATEGORIES].sort((a, b) => categories[b] - categories[a]).slice(0, 3)
  const rates = context.exchange.rates
  const selected = context.destinationNames.map(name => destinations.find(item => item.name === name)).filter(Boolean)

  return {
    personalBudget: {
      currency: 'BDT',
      monthlyByCategoryBdt: categories,
      monthlyTotalBdt,
      annualExpensePlanBdt,
      annualLivingExpensePlanBdt: annualLivingBdt,
      availableFirstYearStudyFundsBdt: context.budget.availableFundsBdt,
      largestMonthlyCategories: categoriesBySpend.map(key => ({ category: key, amountBdt: categories[key] })),
    },
    whatIf: {
      scenario: `rent increased by ${rentIncreasePercent}%`,
      additionalMonthlyBdt: rentIncreaseMonthlyBdt,
      newMonthlyExpensePlanBdt: changedMonthlyTotalBdt,
      newAnnualExpensePlanBdt: changedAnnualExpensePlanBdt,
    },
    exchange: {
      base: 'BDT', date: context.exchange.date, source: context.exchange.source,
      ratesToForeignCurrency: rates,
      note: 'Rates are foreign-currency units per BDT. Convert foreign costs to BDT by dividing by the corresponding rate. Illustrative rates are not live.',
    },
    destinationEstimates: selected.map(destination => calculateDestination(destination, rates, context.budget.availableFundsBdt)),
    limitations: [
      'This assistant compares an expense plan with published estimates; an expense plan is not proof of available funds.',
      'A true affordability assessment needs verified income, savings, scholarship, and family-support information, which this prototype does not collect.',
      'Figures are indicative, depend on university, program, city, and personal circumstances, and do not guarantee visa approval, scholarships, employment, or financial outcomes.',
      'Never add amounts in different currencies before conversion. Do not treat unspecified costs as zero.',
    ],
  }
}
