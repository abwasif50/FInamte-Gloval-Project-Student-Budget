import { useEffect, useMemo, useRef, useState } from 'react'
import { destinations, exchangeRates, expenseLabels, rateApi } from './data'
import { convertFromBase, convertToBase, fetchFrankfurterRates } from './rates'

const initial = { tuition: 1200, rent: 680, food: 280, transport: 65, insurance: 125, other: 170 }
const STORAGE_KEY = 'finmate-global-budget-v1'
const FUNDS_KEY = 'finmate-global-study-funds-v1'
const MAX_EXPENSE = 100000000
const sections = [
  ['overview', 'Overview', 'O'],
  ['compare', 'Compare destinations', 'C'],
  ['budget', 'My budget', 'B'],
  ['insights', 'Insights', 'I'],
  ['assistant', 'AI assistant', 'A'],
  ['settings', 'Settings', 'S'],
]
const money = (n, currency = 'BDT') => new Intl.NumberFormat('en-BD', {
  style: 'currency', currency, maximumFractionDigits: 0,
}).format(n)

function readSavedBudget() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return initial
    const saved = JSON.parse(raw)
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return initial
    return Object.fromEntries(Object.keys(initial).map(key => {
      const value = saved[key]
      return [key, typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? Math.min(value, MAX_EXPENSE)
        : initial[key]]
    }))
  } catch {
    return initial
  }
}

function readSavedFunds() {
  try {
    const raw = window.localStorage.getItem(FUNDS_KEY)
    if (raw === null) return null
    const value = JSON.parse(raw)
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
  } catch { return null }
}

function destinationsForQuestion(message, selected) {
  const named = destinations.filter(item => message.toLowerCase().includes(item.name.toLowerCase())).map(item => item.name)
  if (named.length) return named
  if (/\b(which|compare|fits|best|among)\b/i.test(message)) return destinations.map(item => item.name)
  return [selected]
}
function chartGradient(costs, total) {
  let position = 0
  const slices = expenseLabels.map(item => {
    const start = position
    position += total ? costs[item.key] / total * 100 : 0
    return `${item.color} ${start}% ${position}%`
  })
  return `conic-gradient(${slices.join(',')})`
}

function currencyAmount(value, currency) {
  return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

function sourceDateText(dataset) {
  return `${dataset.sourceDate} Checked ${dataset.checkedOn}.`
}

function DestinationCard({ destination, selected, onSelect, liveRates }) {
  const living = destination.living
  const tuition = destination.tuition
  const livingRate = liveRates?.[living.currency] ?? exchangeRates[living.currency]
  const tuitionRate = liveRates?.[tuition.currency] ?? exchangeRates[tuition.currency]
  const isLivingLive = Number.isFinite(liveRates?.[living.currency])
  const isTuitionLive = Number.isFinite(liveRates?.[tuition.currency])
  const bdtRange = (data, rate) => data.max === data.min
    ? currencyAmount(convertToBase(data.min, rate), 'BDT')
    : `${currencyAmount(convertToBase(data.min, rate), 'BDT')} - ${currencyAmount(convertToBase(data.max, rate), 'BDT')}`
  return <article className={`destination ${selected ? 'selected' : ''}`}>
    <button className="destination-select" onClick={onSelect} aria-pressed={selected}>
      <b>{destination.flag} {destination.name}</b><small>{destination.city} | {destination.currency}</small>
    </button>
    <div className="estimate-block"><strong>Living costs</strong><b>{currencyAmount(living.min, living.currency)}{living.max !== living.min && ` - ${currencyAmount(living.max, living.currency)}`} <small>/ month</small></b>
      <span className="converted">Approx. {bdtRange(living, livingRate)} BDT / month ({isLivingLive ? 'live rate' : 'illustrative fallback rate'})</span>
      <small>{living.summary}</small><small>Includes: {living.includes.slice(0, 4).join(', ')}{living.includes.length > 4 ? ', and other listed items' : ''}.</small>
      <small>Excludes: {living.excludes.join(', ')}.</small>
      <a href={living.sourceUrl} target="_blank" rel="noreferrer">Living-cost source</a><small>{sourceDateText(living)}</small>
    </div>
    <div className="estimate-block tuition-block"><strong>Tuition</strong>{tuition.amount == null ? <p>{tuition.summary}</p> : <><b>{currencyAmount(tuition.min, tuition.currency)} - {currencyAmount(tuition.max, tuition.currency)} <small>/ year</small></b><span className="converted">Approx. {bdtRange(tuition, tuitionRate)} BDT / year ({isTuitionLive ? 'live rate' : 'illustrative fallback rate'})</span><p>{tuition.summary}</p></>}
      <small>{tuition.additionalFees}</small><small>Other costs not included: {tuition.excludes.join(', ')}.</small>
      <a href={tuition.sourceUrl} target="_blank" rel="noreferrer">Tuition and fee source</a><small>{sourceDateText(tuition)}</small>
    </div>
  </article>
}

function App() {
  const [costs, setCosts] = useState(readSavedBudget)
  const [availableFundsBdt, setAvailableFundsBdt] = useState(readSavedFunds)
  const [selected, setSelected] = useState('Germany')
  const [currency, setCurrency] = useState('EUR')
  const [amount, setAmount] = useState('10000')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [assistantStatus, setAssistantStatus] = useState('idle')
  const [assistantMode, setAssistantMode] = useState('idle')
  const [assistantError, setAssistantError] = useState('')
  const assistantRequest = useRef(false)
  const [activeSection, setActiveSection] = useState('overview')
  const [saveStatus, setSaveStatus] = useState('saved')
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [liveRates, setLiveRates] = useState(null)
  const [rateDate, setRateDate] = useState('')
  const [rateState, setRateState] = useState('loading')
  const [rateError, setRateError] = useState('')

  const total = useMemo(() => Object.values(costs).reduce((sum, value) => sum + value, 0), [costs])
  const annual = total * 12
  const currentRate = liveRates?.[currency] ?? exchangeRates[currency]
  const converted = convertFromBase(Number(amount) || 0, currentRate)

  async function refreshRates() {
    setRateState('loading')
    setRateError('')
    setLiveRates(null)
    try {
      const result = await fetchFrankfurterRates()

      setLiveRates(Object.keys(result.rates).length ? result.rates : null)
      setRateDate(result.date)
      if (result.unsupported.length) {
        setRateState('unsupported')
        setRateError(`Unsupported by Frankfurter: ${result.unsupported.join(', ')}. Unsupported currencies use illustrative fallback rates.`)
      } else {
        setRateState('live')
      }
    } catch (error) {
      setLiveRates(null)
      setRateState('error')
      setRateError(error instanceof Error ? error.message : 'Unable to load exchange rates.')
    }
  }
  useEffect(() => { refreshRates() }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(costs))
      setSaveStatus('saved')
      setStorageAvailable(true)
    } catch {
      setSaveStatus('not saved')
      setStorageAvailable(false)
    }
  }, [costs])

  useEffect(() => {
    try {
      if (availableFundsBdt === null) window.localStorage.removeItem(FUNDS_KEY)
      else window.localStorage.setItem(FUNDS_KEY, JSON.stringify(availableFundsBdt))
    } catch { setStorageAvailable(false); setSaveStatus('not saved') }
  }, [availableFundsBdt])

  const update = (key, rawValue) => {
    if (rawValue === '') {
      setCosts(current => ({ ...current, [key]: 0 }))
      return
    }
    const value = Number(rawValue)
    if (!Number.isFinite(value) || value < 0) return
    setCosts(current => ({ ...current, [key]: Math.min(value, MAX_EXPENSE) }))
  }

  const navigate = id => {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const resetBudget = () => {
    if (!window.confirm('Reset all monthly expenses to the demo values? Your saved budget will be replaced.')) return
    setCosts({ ...initial })
    setAvailableFundsBdt(null)
    setSaveStatus('saved')
  }

  const demoResponse = () => `Demo response: Your current expense plan is ${money(total)} per month. A reliable affordability comparison also needs your first-year study funds and the destination's unpriced costs. Add available funds in My budget; the demo cannot verify financial outcomes.`

  const ask = async (value = question) => {
    const submittedQuestion = value.trim()
    if (!submittedQuestion || assistantRequest.current) return
    assistantRequest.current = true
    setQuestion(value)
    setAssistantStatus('loading')
    setAssistantError('')
    setAnswer('')
    const fxRates = Object.fromEntries(['EUR', 'PLN', 'MYR'].map(code => [code, {
      rate: liveRates?.[code] ?? exchangeRates[code], isLive: Number.isFinite(liveRates?.[code]),
    }]))
    const hasLiveRates = Object.values(fxRates).some(item => item.isLive)
    const requestContext = {
      budget: { categories: costs, availableFundsBdt },
      selectedDestination: selected,
      destinationNames: destinationsForQuestion(submittedQuestion, selected),
      exchange: { base: 'BDT', date: hasLiveRates ? rateDate || null : null,
        source: hasLiveRates ? 'Frankfurter API' : 'Illustrative fallback rate; potentially outdated', rates: fxRates },
    }
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: submittedQuestion, context: requestContext }),
      })
      const payload = await response.json().catch(() => ({}))
      if (response.status === 503 && payload.demoMode) {
        setAnswer(demoResponse())
        setAssistantMode('demo')
        setAssistantStatus('demo')
        setAssistantError(payload.error || 'Configure GEMINI_API_KEY in server/.env and restart the backend to enable AI responses.')
        return
      }
      if (!response.ok) {
        const failure = new Error(payload.error || `Assistant request failed (${response.status}).`)
        failure.demoFallback = response.status === 429 || response.status >= 500
        throw failure
      }
      if (typeof payload.answer !== 'string' || !payload.answer.trim()) throw new Error('The assistant returned an empty response.')
      setAnswer(payload.answer)
      setAssistantMode('ai')
      setAssistantStatus('success')
    } catch (error) {
      const backendUnavailable = error instanceof TypeError && error.message.toLowerCase().includes('fetch')
      const showDemo = backendUnavailable || error?.demoFallback === true
      setAnswer(showDemo ? demoResponse() : '')
      setAssistantMode(showDemo ? 'demo' : 'ready')
      setAssistantStatus('error')
      const detail = backendUnavailable
        ? 'The backend could not be reached. Start it with npm run server.'
        : (error instanceof Error ? error.message : 'The assistant is unavailable.')
      setAssistantError(detail)
    } finally {
      assistantRequest.current = false
    }
  }
  return <div className="shell">
    <aside className="sidebar">
      <a className="brand" href="#overview" onClick={event => { event.preventDefault(); navigate('overview') }}><b>f<span>.</span></b> finmate<small>global</small></a>
      <p className="nav-title">WORKSPACE</p>
      <nav aria-label="Main navigation">
        {sections.slice(0, 5).map(([id, label, icon]) => <button key={id} className={`nav ${activeSection === id ? 'active' : ''}`} aria-current={activeSection === id ? 'page' : undefined} aria-label={label} title={label} onClick={() => navigate(id)}>
          {icon}<span>{label}</span>{id === 'assistant' && <small>NEW</small>}
        </button>)}
      </nav>
      <div className="side-bottom">
        <button className={`nav ${activeSection === 'settings' ? 'active' : ''}`} aria-current={activeSection === 'settings' ? 'page' : undefined} aria-label="Settings" title="Settings" onClick={() => navigate('settings')}>S <span>Settings</span></button>
        <div className="profile"><b>AR</b><span><strong>Ayesha Rahman</strong><small>Student account</small></span></div>
      </div>
    </aside>

    <main>
      <header><span>Workspace / <b>{sections.find(([id]) => id === activeSection)?.[1]}</b></span><span>Need help? <b className="avatar">AR</b></span></header>
      <div className="content">
        <div className="welcome" id="overview">
          <div><div className="eyebrow">STUDENT FINANCE SNAPSHOT | YOUR FINANCE SNAPSHOT</div><h1>Good morning, Ayesha</h1><p>Your study abroad journey, one smart decision at a time.</p></div>
          <button className="primary" onClick={() => navigate('budget')}>+ Plan my budget</button>
        </div>

        <section className="stats" aria-label="Budget overview">
          <article><i className="lav">B</i><small>Estimated monthly cost</small><strong>{money(total)}</strong><p><b>Current plan</b> based on your saved expenses</p></article>
          <article><i className="mint">A</i><small>Estimated annual cost</small><strong>{money(annual)}</strong><p>Based on your current monthly budget</p></article>
          <article><i className="peach">D</i><small>Your top destination</small><strong>Germany</strong><p>Berlin | Public university</p></article>
        </section>

        <div className="columns">
          <div>
            <section className="panel" id="compare">
              <div className="panel-head"><div><h2>Compare destinations</h2><p>Explore sample monthly costs</p></div><a href="#compare" onClick={event => { event.preventDefault(); navigate('compare') }}>Destination estimates</a></div>
              <div className="destinations">{destinations.map(destination => <DestinationCard key={destination.name} destination={destination} selected={selected === destination.name} onSelect={() => setSelected(destination.name)} liveRates={liveRates} />)}</div>              <div className="note">Sample destination costs are illustrative and do not change when you edit your personal budget.</div>
              <div className="current-plan"><span>Your {selected} plan, using your budget</span><strong>{money(total)} BDT / month</strong></div>
            </section>

            <section className="panel" id="budget">
              <div className="panel-head"><div><h2>Build your monthly budget</h2><p>Edit sample expenses to make them yours</p></div><span className="chip">BDT</span></div>
              <div className="budget">{expenseLabels.map(item => <label key={item.key}><i style={{ color: item.color, background: `${item.color}18` }}>{item.icon}</i><span>{item.label}</span><div className="input"><b>BDT</b><input type="number" min="0" max={MAX_EXPENSE} step="100" value={costs[item.key]} aria-label={`${item.label} monthly cost in BDT`} onChange={event => update(item.key, event.target.value)} /></div></label>)}</div>              <label className="funds-row"><span>Funds available for first year (optional)</span><div className="input"><b>BDT</b><input type="number" min="0" max="1000000000000" step="1000" value={availableFundsBdt ?? ''} aria-label="Available funds for first year in BDT" onChange={event => { const raw = event.target.value; if (raw === '') setAvailableFundsBdt(null); else if (Number.isFinite(Number(raw)) && Number(raw) >= 0) setAvailableFundsBdt(Math.min(Number(raw), 1000000000000)) }} /></div></label>
              <div className="fine">Optional. Saved only in this browser; blank means unknown, not zero funds.</div>
              <div className="total"><div>Monthly estimate<small>Annual estimate: {money(annual)}</small></div><strong>{money(total)}</strong></div>
              <div className="fine">Blank values count as zero. Negative values are ignored; each expense is capped at BDT 100,000,000.</div>
              <div className={`save-status ${storageAvailable ? 'ok' : 'error'}`} role="status">{storageAvailable ? `Budget ${saveStatus} in this browser.` : 'Browser storage is unavailable. Your budget will not persist after closing this page.'}</div>
            </section>
          </div>

          <div>
            <section className="panel" id="converter">
              <div className="panel-head"><div><h2>Currency converter</h2><p>Quickly estimate your exchange</p></div><b className="convert-icon">EX</b></div>
              <label className="label">YOU SEND<div className="convert"><b>BDT</b><input type="number" min="0" max="1000000000" aria-label="Amount in BDT" value={amount} onChange={event => { const value = event.target.value; if (value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0)) setAmount(value) }} /><strong>BDT</strong></div></label>
              <div className="down">to</div>
              <label className="label">YOU GET<div className="convert"><b>{currency === 'EUR' ? 'EUR' : currency}</b><output>{converted.toLocaleString('en-US', { maximumFractionDigits: 2 })}</output><select aria-label="Destination currency" value={currency} onChange={event => setCurrency(event.target.value)}><option>EUR</option><option>PLN</option><option>MYR</option></select></div></label>
                            <div className={`rate-panel ${rateState}`}>
                {rateState === 'loading' && <p role="status">Loading current Frankfurter reference rates...</p>}
                {rateState === 'live' && <p role="status">Live reference rate date: {rateDate || 'not provided'} | Source: <a href={rateApi.sourceUrl} target="_blank" rel="noreferrer">Frankfurter</a></p>}
                {rateState === 'unsupported' && <p role="status">{rateError} {liveRates && rateDate ? <>Supported quotes dated {rateDate} | Source: <a href={rateApi.sourceUrl} target="_blank" rel="noreferrer">Frankfurter</a></> : ''}</p>}
                {rateState === 'error' && <p role="status">Live rates unavailable. {rateError}</p>}
                <p>1 BDT = {currentRate} {currency} <strong>{Number.isFinite(liveRates?.[currency]) ? 'Live reference rate' : 'Illustrative fallback rate; potentially outdated'}</strong></p>
                {!Number.isFinite(liveRates?.[currency]) && <small>Fallback estimate only; never a live rate.</small>}
                {rateError && <button className="retry-button" type="button" onClick={refreshRates}>Retry rate lookup</button>}
                <button className="retry-button" type="button" onClick={refreshRates} disabled={rateState === 'loading'}>{rateState === 'loading' ? 'Refreshing...' : 'Refresh rates'}</button>
              </div>
            </section>

            <section className="panel" id="insights">
              <div className="panel-head"><div><h2>Expense breakdown</h2><p>Your estimated monthly spend</p></div><span className="chip">Monthly</span></div>
              <div className="chart"><div className="donut" role="img" aria-label="Monthly expense proportions" style={{ background: chartGradient(costs, total) }}><div><b>{money(total)}</b><small>per month</small></div></div>
                <div className="legend">{expenseLabels.map(item => <div key={item.key}><i style={{ background: item.color }}></i>{item.label}<b>{total ? Math.round(costs[item.key] / total * 100) : 0}%</b></div>)}</div>
              </div><div className="annual"><span>12-month estimate</span><b>{money(annual)}</b></div>
            </section>

            <section className="panel assistant" id="assistant">
              <div className="panel-head"><div><h2>FinMate assistant</h2><p>Guidance based on your budget and sourced estimates</p></div><span className="demo">{assistantMode === 'ai' ? 'AI RESPONSE' : assistantMode === 'demo' ? 'DEMO MODE' : 'READY'}</span></div>
              <div className="message"><i>FM</i><p><b>FinMate | {assistantMode === 'ai' ? 'AI assistant' : assistantMode === 'demo' ? 'Demo assistant' : 'Assistant'}</b><br/>I use deterministic cost calculations and sourced estimates to explain your options. Your saved budget stays in this browser until you submit a question.</p></div>
              {answer && <div className="answer"><b>{assistantMode === 'ai' ? 'AI response' : 'Demo response'}</b><p>{answer}</p></div>}
              {assistantStatus === 'loading' && <div className="assistant-status" role="status">Calculating your figures and contacting the assistant...</div>}
              {assistantError && <div className="assistant-error" role="alert"><p>{assistantError}</p>{assistantStatus !== 'loading' && <button type="button" onClick={() => ask(question)}>Retry</button>}</div>}
              <div className="suggestions"><button disabled={assistantStatus === 'loading'} onClick={() => ask('How can I save on rent?')}>How can I save on rent?</button><button disabled={assistantStatus === 'loading'} onClick={() => ask('What should I budget for?')}>What should I budget for?</button></div>
              <form onSubmit={event => { event.preventDefault(); ask() }} className="ask"><input disabled={assistantStatus === 'loading'} aria-label="Ask the student finance assistant" maxLength={1200} placeholder="Ask about affordability, costs, or scenarios..." value={question} onChange={event => setQuestion(event.target.value)} /><button disabled={assistantStatus === 'loading'} aria-label="Send question">{assistantStatus === 'loading' ? '...' : 'Send'}</button></form>
              <div className="fine center">Indicative estimates only, not financial advice</div>
            </section>

            <section className="panel settings-panel" id="settings">
              <div className="panel-head"><div><h2>Settings</h2><p>Manage this browser's saved budget</p></div></div>
              <p className="settings-copy">Your editable expense values are stored locally in this browser. Destination comparison data stays as the original demo sample.</p>
              <button className="reset-button" onClick={resetBudget}>Reset budget to demo values</button>
            </section>
          </div>
        </div>
        <footer>FinMate Global | Student finance planner <span>Illustrative sample data | Rates are not live</span></footer>
      </div>
    </main>
  </div>
}

export default App
