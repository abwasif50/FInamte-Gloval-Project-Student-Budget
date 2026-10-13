# Competition submission guide

## Browser acceptance checklist

This checklist is a manual runbook. **It has not been executed in a browser during this review** because no browser surface was available. Mark each box only after running it in the target browser.

### Startup and navigation

- [ ] Start `npm.cmd run server` and `npm.cmd run dev` in separate terminals; open the Vite URL.
- [ ] Confirm the dashboard renders without a console error and the initial active navigation item is Overview.
- [ ] Select Compare destinations, My budget, Insights, AI assistant, and Settings; confirm each scrolls to a real section and active navigation follows.
- [ ] Resize to a narrow/mobile viewport; confirm cards, inputs, navigation, chart, and assistant remain usable without horizontal overflow.

### Budget and reset persistence

- [ ] Change rent and tuition; confirm monthly and annual totals, chart proportions, and current personal-plan total update.
- [ ] Reload; confirm edited expenses remain.
- [ ] Enter optional first-year funds; reload and confirm the value remains. Clear the field and confirm blank means unknown.
- [ ] Choose Reset budget to demo values and cancel; confirm values stay unchanged.
- [ ] Choose reset again and confirm; verify all six categories return to demo values, optional funds clear, then reload and confirm reset values persisted.
- [ ] Check negative and invalid input behavior: negative values should not replace a valid value; an empty category should count as zero.

### Currency and destination references

- [ ] On successful rate lookup, confirm a date and Frankfurter source appear and change the currency selector among EUR, PLN, and MYR.
- [ ] Use a known value to check direction: BDT to foreign currency multiplies by the quote; foreign reference values to BDT divide by it.
- [ ] Disconnect/block the rate endpoint, reload, and confirm the dashboard remains usable, fallback is explicitly illustrative/potentially outdated, and retry works after restoring access.
- [ ] Check that Germany living and tuition/semester contribution are shown separately, Poland living and tuition are separate, and Malaysia's tuition is described as a branch-campus example.
- [ ] Open each source link and verify it corresponds to the displayed category.

### Assistant modes and privacy

- [ ] With the backend running but no key, submit a prompt; confirm a clearly labelled demo response and key setup guidance appear.
- [ ] Stop the backend and submit; confirm a demo response and backend-unavailable state appear without breaking budget/navigation.
- [ ] After deployment, submit one simple question and confirm the endpoint returns a non-empty AI response. A successful local Gemini request was verified during troubleshooting; the production request still needs to be checked.
- [ ] Confirm invalid or oversized API inputs are rejected, the request limit returns 429 after the configured threshold, and server errors never echo the API key.
- [ ] Verify assistant questions do not send conversation history; inspect one request and confirm it contains only the current question and required finance context.

## Three-minute competition demo

Use the running local app. Do not describe the demo response as AI. If a live key and successful provider request are available, identify that response as AI-generated and still point out its source/estimate limits.

| Time | Presenter action and narration |
|---|---|
| 0:00-0:25 | Open the overview. “FinMate Global is a study-abroad finance planning prototype for students planning from Bangladesh. It brings personal budget planning, cross-country cost references, and currency conversion into one place.” |
| 0:25-0:55 | Open Compare destinations. Show Germany, Poland, and Malaysia. “These are sourced planning estimates, not promises. Tuition and living costs are separated, source links are visible, and several fees still depend on the university or city.” |
| 0:55-1:25 | Open the currency converter. Show the quote date/source or the illustrative fallback state. “Frankfurter provides reference quotes. If that request is unavailable, the fallback stays labelled illustrative; it is not represented as a live bank rate.” |
| 1:25-1:55 | Change rent or food in My budget. Show totals/chart update. “The six expense categories are personal inputs. Totals and the chart update in JavaScript, and values persist in this browser.” |
| 1:55-2:25 | Enter optional first-year funds, then explain that it compares only to priced costs. “This does not establish visa eligibility or prove funds. Missing tuition, travel, deposits, and other costs remain explicit.” |
| 2:25-2:50 | Ask the assistant a simple question. State whether this is demo mode or an actual AI response before reading it. “The totals are calculated deterministically; the assistant explains them. It is not a replacement for official sources.” |
| 2:50-3:00 | Close with Reset and privacy. “Budget stays in local browser storage. If a question is submitted, its finance context is sent to the backend and Gemini when configured.” |

## Slide outline (7 slides)

1. **FinMate Global** — Cross-border student finance planning; prototype status and team/presenter names supplied by the team (do not imply partnerships).
2. **The planning problem** — Students compare costs across countries/currencies while key costs vary by program, city, and student status.
3. **The product** — Dashboard, destination comparison, editable budget, converter, chart, assistant demo/AI modes.
4. **How calculations work** — Six-category sum, annualization, BDT-base quote direction, independent currency conversion, what-if calculation.
5. **Trust and source limits** — DAAD, Study.gov.pl, Education Malaysia, Frankfurter; dated source fields; unknown costs not zero; estimates not guarantees.
6. **Architecture and privacy** — React/Vite, Express, deterministic finance module, optional Gemini server integration; localStorage and server-side secret handling.
7. **Validation and next milestones** — Automated checks that passed, browser checklist still to execute, live Gemini test pending, deployment plan, highest-priority next work.

Do not add unverified user counts, impact metrics, partnerships, customer quotes, or claims of completed browser/live-model testing.

## Vercel deployment (prepared, not yet published)

The repository has no GitHub Pages build workflow, and its source `index.html` loads `/src/main.jsx` directly; Pages does not run Vite to compile JSX. If Pages is instead serving a built `dist`, Vite's default `/` asset base also points at the domain root rather than this repository URL's subpath. This is the source evidence for the blank page; the GitHub Pages build setting itself could not be inspected here. GitHub Pages also serves static files only and cannot run the Express/Gemini backend. This project instead targets Vercel at the domain root, where `base: '/'` is correct.

The deployment uses Vercel's Vite static output plus a Node.js Function at `api/[...path].js` that exports the existing Express app. Requests stay same-origin at `/api/health` and `/api/assistant`; the frontend does not contain a localhost URL. Because the frontend and API share an origin, CORS configuration is not needed. The local Vite proxy continues to forward `/api` to port 3030.

### Vercel dashboard settings

1. Import the existing GitHub repository `abwasif50/FInamte-Gloval-Project-Student-Budget`.
2. Set Root Directory to the repository root (`./`) and Framework Preset to Vite.
3. Use Install Command `npm install`, Build Command `npm run build`, and Output Directory `dist`. These are also recorded in `vercel.json`.
4. Choose Node.js 22.12 or later.
5. Under Project Settings → Environment Variables, add `GEMINI_API_KEY` as a server-side Production secret. Optionally add `GEMINI_MODEL` with value `gemini-3.8-flash` (the backend default). Do not add a Vite-prefixed key or `PORT`. Redeploy after saving.
6. Check `https://<your-vercel-domain>/api/health`; expected JSON has `ok: true` and `aiConfigured: true`. Submit one question and verify an AI response. A public deployment has not been created or verified yet; the owner must authorize the repository import and add the secret in Vercel.

### Security and deployment checks

- `server/.env` is ignored by Git; `server/.env.example` contains a blank key field only. The key is read by the function from Vercel's server environment and is not bundled into Vite assets.
- Health status only confirms that a key value is configured. A real assistant request is required to validate key access and quota. Provider/network errors are categorized and logged with only a sanitized name, status, and code.
- The in-memory rate limit is per function instance and is not a durable public abuse-control system. Monitor Gemini quota and set provider usage limits where available.
- No custom client-side router is used, so no SPA rewrite is required.

### Local verification (2026-10-13)

- `npm.cmd test` — 11 tests passed, including the Vercel API entry-point health test.
- `npm.cmd run build` — passed with Vite 8.3.4.
- `npm.cmd run check:rates` — passed.
- `npm.cmd audit` — 0 known vulnerabilities.
- The API entry point was exercised through Express in the automated test suite. A Vercel preview/public deployment and browser-based desktop/mobile acceptance checks have not been run because the owner must authorize the Vercel project import first.
