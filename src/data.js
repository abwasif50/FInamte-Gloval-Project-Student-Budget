// Illustrative values are retained only as a clearly labelled offline fallback.
export const exchangeRates = { EUR: 0.0077, PLN: 0.0332, MYR: 0.0358 }
export const rateApi = {
  source: 'Frankfurter API',
  currenciesUrl: 'https://api.frankfurter.dev/v2/currencies',
  ratesUrl: 'https://api.frankfurter.dev/v2/rates?base=BDT&quotes=EUR,PLN,MYR',
  sourceUrl: 'https://frankfurter.dev/',
}

const checkedOn = '2026-10-12'
export const destinations = [
  {
    name: 'Germany', flag: 'DE', city: 'Berlin', currency: 'EUR',
    tuition: {
      amount: null, currency: 'EUR', cadence: 'year', semesterContribution: { min: 70, max: 430, currency: 'EUR', cadence: 'semester' },
      summary: 'Often no tuition at state institutions for most bachelor\'s and master\'s programs; exceptions depend on state, institution, and program.',
      additionalFees: 'Semester contribution: EUR 70-430 per semester. Tuition and semester contributions are separate.',
      includes: [], excludes: ['semester contribution', 'program-specific tuition', 'visa', 'travel', 'deposit'],
      sourceUrl: 'https://www.daad.de/en/studying-in-germany/living-in-germany/finances/',
      sourceDate: 'Page states blocked-account figure as of 2025-01-01; tuition and fee ranges have no separate date stated.', checkedOn,
    },
    living: {
      min: 900, max: 1200, currency: 'EUR', cadence: 'month',
      summary: 'DAAD planning range for living expenses; varies by location.',
      includes: ['accommodation', 'food', 'travel', 'clothing', 'learning materials', 'health insurance', 'phone and internet', 'radio and TV licence fees', 'recreation'],
      excludes: ['tuition', 'semester contribution (EUR 70-430 per semester)', 'visa fees', 'initial travel', 'deposit'],
      sourceUrl: 'https://www.daad.de/en/studying-in-germany/living-in-germany/finances/',
      sourceDate: 'No publication date stated for this range; DAAD also cites 2023 social-survey averages.', checkedOn,
    },
  },
  {
    name: 'Poland', flag: 'PL', city: 'Warsaw', currency: 'PLN',
    tuition: {
      min: 2000, max: 6000, currency: 'EUR', cadence: 'year',
      summary: 'Study.gov.pl gives EUR 2,000-6,000 per year for tuition, varying by institution and program; MBA may be higher.',
      additionalFees: 'Use the university fee schedule for the chosen course. Eligibility for tuition-free study depends on status and program language.',
      includes: [], excludes: ['living costs', 'insurance', 'visa', 'travel', 'deposit'],
      sourceUrl: 'https://study.gov.pl/tuition-fees', sourceDate: 'No publication date stated.', checkedOn,
    },
    living: {
      min: 1500, max: 2000, currency: 'PLN', cadence: 'month',
      summary: 'Study.gov.pl student living-cost estimate; city affects the total.',
      includes: ['student dormitory', 'public transport', 'health insurance', 'phone and internet', 'groceries', 'entertainment'],
      excludes: ['tuition', 'visa fees', 'initial travel', 'deposit'],
      sourceUrl: 'https://study.gov.pl/cost-living-poland', sourceDate: 'No publication date stated.', checkedOn,
    },
  },
  {
    name: 'Malaysia', flag: 'MY', city: 'Kuala Lumpur', currency: 'MYR',
    tuition: {
      min: 20000, max: 50000, currency: 'MYR', cadence: 'year',
      summary: 'Education Malaysia example for UK/Australia-based branch-campus degrees; not a universal fee range.',
      additionalFees: 'Program, institution, and campus determine actual tuition; confirm with the university.',
      includes: [], excludes: ['living costs', 'insurance', 'student-pass and visa costs', 'travel', 'deposit'],
      sourceUrl: 'https://mycas.educationmalaysia.gov.my/why-malaysia.html/',
      sourceDate: 'No publication date stated.', checkedOn,
    },
    living: {
      min: 1100, max: 1100, currency: 'MYR', cadence: 'month',
      summary: 'Education Malaysia approximate monthly living-cost estimate for international students.',
      includes: ['food', 'accommodation', 'other daily expenses'],
      excludes: ['tuition', 'insurance unless covered under daily expenses (not specified)', 'student-pass and visa fees', 'travel', 'deposit'],
      sourceUrl: 'https://mycas.educationmalaysia.gov.my/why-malaysia.html/',
      sourceDate: 'No publication date stated.', checkedOn,
    },
  },
]

export const expenseLabels = [
  { key: 'tuition', label: 'Tuition', icon: 'T', color: '#5469d4' },
  { key: 'rent', label: 'Rent and utilities', icon: 'R', color: '#2ba889' },
  { key: 'food', label: 'Food', icon: 'F', color: '#e4a346' },
  { key: 'transport', label: 'Transport', icon: 'M', color: '#8068ca' },
  { key: 'insurance', label: 'Insurance', icon: 'I', color: '#df7182' },
  { key: 'other', label: 'Other', icon: '+', color: '#75a8c6' },
]
