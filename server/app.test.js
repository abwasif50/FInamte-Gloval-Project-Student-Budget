import test from 'node:test'
import assert from 'node:assert/strict'
import { createAssistantApp } from './app.js'
import vercelAssistantApp from '../api/[...path].js'

const categories = { tuition: 1200, rent: 680, food: 280, transport: 65, insurance: 125, other: 170 }
const requestBody = {
  message: 'Can I afford Poland?',
  context: {
    budget: { categories, availableFundsBdt: 1000000 },
    selectedDestination: 'Poland', destinationNames: ['Poland'],
    exchange: {
      base: 'BDT', date: '2026-10-12', source: 'Frankfurter API',
      rates: { EUR: { rate: 0.00725, isLive: true }, PLN: { rate: 0.03178, isLive: true }, MYR: { rate: 0.03316, isLive: true } },
    },
  },
}

async function withServer(app, callback) {
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  const address = server.address()
  try { await callback(`http://127.0.0.1:${address.port}`) }
  finally { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())) }
}

test('returns demo configuration guidance when API key is missing', async () => {
  await withServer(createAssistantApp({ apiKey: '', limit: 20 }), async base => {
    const response = await fetch(`${base}/api/assistant`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(requestBody) })
    const payload = await response.json()
    assert.equal(response.status, 503)
    assert.equal(payload.code, 'AI_NOT_CONFIGURED')
    assert.equal(payload.demoMode, true)
  })
})

test('rejects invalid and oversized requests', async () => {
  await withServer(createAssistantApp({ apiKey: '', limit: 20 }), async base => {
    const invalid = await fetch(`${base}/api/assistant`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: '', context: {} }) })
    assert.equal(invalid.status, 400)
    const oversized = { ...requestBody, message: 'x'.repeat(17000) }
    const large = await fetch(`${base}/api/assistant`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(oversized) })
    assert.equal(large.status, 413)
  })
})

test('returns generated text with deterministic calculations and sources', async () => {
  await withServer(createAssistantApp({ apiKey: 'test-placeholder', generateText: async input => {
    assert.equal(input.calculations.personalBudget.monthlyTotalBdt, 2520)
    assert.ok(input.sources.some(source => source.url.includes('study.gov.pl')))
    return 'A safe, indicative response.'
  }, limit: 20 }), async base => {
    const response = await fetch(`${base}/api/assistant`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(requestBody) })
    const payload = await response.json()
    assert.equal(response.status, 200)
    assert.equal(payload.answer, 'A safe, indicative response.')
  })
})

test('maps provider errors and enforces per-client rate limits', async () => {
  await withServer(createAssistantApp({ apiKey: 'test-placeholder', generateText: async () => { const error = new Error('private provider detail'); error.status = 429; throw error }, limit: 1 }), async base => {
    const first = await fetch(`${base}/api/assistant`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(requestBody) })
    assert.equal(first.status, 429)
    assert.equal((await first.json()).code, 'GEMINI_QUOTA_ERROR')
    const second = await fetch(`${base}/api/assistant`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(requestBody) })
    assert.equal(second.status, 429)
    assert.equal((await second.json()).code, 'RATE_LIMITED')
  })
})

test('reports access failures clearly and logs only provider name, status, and code', async () => {
  const logs = []
  await withServer(createAssistantApp({ apiKey: 'test-placeholder', logger: { error: line => logs.push(JSON.parse(line)) }, generateText: async () => {
    const error = new Error(JSON.stringify({ error: { code: 403, status: 'PERMISSION_DENIED', message: 'private provider detail' } }))
    error.name = 'ApiError'
    error.status = 403
    throw error
  } }), async base => {
    const response = await fetch(`${base}/api/assistant`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(requestBody) })
    const payload = await response.json()
    assert.equal(response.status, 502)
    assert.equal(payload.code, 'GEMINI_ACCESS_ERROR')
    assert.match(payload.error, /configured key|project does not have access/i)
    assert.doesNotMatch(payload.error, /private provider detail/)
    assert.deepEqual(logs, [{ name: 'ApiError', status: 403, code: 'PERMISSION_DENIED' }])
  })
})

test('identifies outbound network failures without exposing provider details', async () => {
  const logs = []
  await withServer(createAssistantApp({ apiKey: 'test-placeholder', logger: { error: line => logs.push(JSON.parse(line)) }, generateText: async () => {
    const error = new TypeError('private network detail')
    error.cause = Object.assign(new Error('private cause'), { code: 'EACCES' })
    throw error
  } }), async base => {
    const response = await fetch(`${base}/api/assistant`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(requestBody) })
    const payload = await response.json()
    assert.equal(response.status, 502)
    assert.equal(payload.code, 'GEMINI_NETWORK_ERROR')
    assert.match(payload.error, /outbound internet access/i)
    assert.deepEqual(logs, [{ name: 'TypeError', status: null, code: 'EACCES' }])
  })
})

test('serves health through the Vercel API function entry point', async () => {
  await withServer(vercelAssistantApp, async base => {
    const response = await fetch(base + '/api/health')
    assert.equal(response.status, 200)
    assert.equal((await response.json()).ok, true)
  })
})
