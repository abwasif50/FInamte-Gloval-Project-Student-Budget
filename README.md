# FinMate Global

FinMate Global is a competition prototype for students planning study abroad from Bangladesh. It helps a student organize an estimated budget, compare sourced cost references for Germany, Poland, and Malaysia, and ask an educational finance assistant for an explanation of the resulting figures.

## Problem and intended users

Students and families often need to compare tuition, day-to-day expenses, and exchange-rate effects across countries before they have selected a university. Public estimates use different currencies and may omit initial or program-specific charges. FinMate puts those numbers in one planning view while showing what each estimate includes, its source, and what remains unknown.

The prototype is intended for early planning and competition demonstration. It is not a bank, remittance product, visa eligibility checker, scholarship decision system, or financial adviser.

## What is implemented

- Editable monthly expense plan for tuition, rent, food, transport, insurance, and other expenses.
- Browser-local persistence for the budget and optional first-year funds; reset requires confirmation.
- Monthly and annual totals, a visual category breakdown, and BDT conversions.
- Destination reference cards for Germany, Poland, and Malaysia. Personal inputs are separate from published reference estimates.
- Exchange-rate lookup on initial load and on user request. Unsupported currencies and lookup errors use clearly labelled illustrative fallback values.
- Assistant UI with clearly labelled demo responses when the backend/key is unavailable.
- Express endpoint for deterministic calculations and optional Gemini-generated explanations.

## Architecture and stack

```text
React + Vite browser app
  ├─ Frankfurter public API (exchange quotes)
  └─ /api/assistant (same-origin in production; Vite proxy in local development)
       └─ Express backend
            ├─ validates input and calculates totals using JavaScript
            └─ optional Google Gemini API request; key stays on the server
```

The UI is React with JavaScript and plain CSS. The server uses Node.js and Express. `@google/genai` is used only by the server. No database, login, paid API, or backend persistence is included. Budget data is stored in this browser's `localStorage`.

## Calculations and assumptions

- Personal monthly total is the sum of the six editable BDT categories. Annual plan is monthly total multiplied by 12. Annual living plan omits the tuition category.
- The expense chart shows each category as a share of that monthly total. Empty expense fields count as zero; invalid or negative edits are rejected by the UI, and the server independently validates assistant requests.
- Frankfurter is queried with BDT as the base and EUR, PLN, and MYR as quotes. If `1 BDT = r foreign units`, foreign amounts are converted to BDT by dividing by `r`; BDT amounts convert to foreign currency by multiplying by `r`.
- An offline fallback rate is illustrative, may be outdated, and is never described as live. No API source/date is shown for that fallback.
- Destination living estimates are monthly. Tuition is annual where the source offers a figure. Destination comparisons are not derived from a student's personal budget.
- First-year priced subtotals add annual living costs and annual tuition only where both are available, after converting each currency separately. Unknown tuition and semester contributions remain unpriced rather than being treated as zero. The result excludes items listed on the cards and is not a visa-funds requirement.
- The optional funds comparison covers only the priced estimate shown. It is not proof of funds or a full affordability assessment.

## Reference data and limitations

The figures are estimates, not guarantees. Sources do not provide publication dates for all current displayed values; the app records a checked-on date and explicitly says when the source date is not stated. Confirm current costs with the institution and source page before making a decision.

- Germany: [DAAD costs of education and living](https://www.daad.de/en/studying-in-germany/living-in-germany/finances/). Its current page states EUR 900-1,200 monthly living costs and EUR 70-430 semester contributions; tuition depends on state, institution, and program. The prototype does not invent a universal tuition figure.
- Poland: [Study.gov.pl cost of living](https://study.gov.pl/cost-living-poland) and [tuition fees](https://study.gov.pl/tuition-fees). Figures vary by city, institution, program, and student status.
- Malaysia: [Education Malaysia - Why Malaysia](https://mycas.educationmalaysia.gov.my/why-malaysia.html/). Its tuition example describes UK/Australia-based branch-campus degrees; it is not a universal tuition range.
- Exchange data: [Frankfurter API](https://frankfurter.dev/), queried at `https://api.frankfurter.dev/v2/currencies` and `https://api.frankfurter.dev/v2/rates?base=BDT&quotes=EUR,PLN,MYR`. The API describes daily reference rates; these are not necessarily a card, bank, or remittance provider's rate.

All sources were opened for this review on 2026-10-12. Source content can change; recheck before a public submission.

## AI and demo mode

The server calculates totals and destination conversions deterministically before asking Gemini for an explanation. The model is instructed not to invent costs, rates, dates, or sources. AI text can still be wrong; check the displayed source links and calculations. If no `GEMINI_API_KEY` is configured, the API returns setup guidance and the browser displays a clearly labelled demo response. A successful live Gemini request has not been verified as part of this project review.

The configured model is `gemini-3.8-flash`, which Google's current model documentation lists as stable. The backend calls the Google GenAI JavaScript SDK's `models.generateContent` method. Gemini 3 model guidance says not to send the legacy `temperature` sampling parameter; it has been removed from this request configuration.

## Privacy and security

- Never place a Gemini key in frontend code, a `VITE_*` variable, or a committed file. Store it in `server/.env`; `.gitignore` excludes `.env` and `.env.*` while allowing the placeholder `server/.env.example`.
- Expense values and optional funds are stored in browser `localStorage`. When a student submits an assistant question, the current budget, optional available funds, selected destination(s), and exchange-rate snapshot are sent to this backend and then included in the Gemini request. Do not enter names, account numbers, passport details, or other sensitive identifiers.
- The backend does not persist chats or log questions, budgets, or API keys. Rate limiting is in-memory, per process, and limited to 8 accepted requests per minute per observed client address; it resets on restart and is not a production abuse-control system.
- The server listens on `127.0.0.1` for local development. In deployment, put it behind a TLS reverse proxy, keep the API key in the host's secret store, and add durable edge rate limits and monitoring without recording request bodies.
- The browser sends its exchange-rate snapshot to the assistant endpoint. The backend validates its shape but does not independently fetch or authenticate that quote; a caller who manually crafts an API request can alter their own submitted snapshot. Do not treat assistant output as a verified financial quote.

## Requirements and local run

Requires Node.js 22.9 or newer and npm. From the project folder:

1. Copy `server/.env.example` to `server/.env` and enter a Gemini API key there only if live AI is needed. The demo works without a key.
2. In terminal 1, run `npm.cmd run server`.
3. In terminal 2, run `npm.cmd run dev`.
4. Open the local URL printed by Vite. Vite proxies `/api` to `http://127.0.0.1:3030`.

Checks:

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run check:rates
```

For a production build, run `npm.cmd run build`; it creates `dist/`. See [competition demo and acceptance guide](docs/competition-submission.md) for the browser checklist, demo narrative, slide outline, and deployment procedure.

## Known issues

- No actual Gemini request, browser UI session, or deployment was performed for this review.
- The latest `npm.cmd audit` attempt could not reach the npm registry. The last successful audit recorded one moderate and one high finding in the existing Vite/esbuild tree. The project keeps its current dependency versions; see the submission guide for the exact status and remediation decision.
- Sample destination data requires periodic source review. Exchange rates and institutional costs are estimates and can change.
