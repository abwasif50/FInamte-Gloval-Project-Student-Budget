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
- [ ] With a valid `server/.env` key, submit one simple question and confirm the endpoint returns a non-empty response. This is the live integration test; it has not been done in this review.
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

## Deployment recommendation (not performed)

For a controlled competition demo, use one low-cost Linux VM with a domain, Caddy for HTTPS/static frontend delivery, and the Node backend bound to loopback. This keeps `/api/assistant` same-origin, matches the current frontend's relative fetch path, and avoids adding CORS configuration. A free-tier split frontend/backend can work but requires a configurable API origin, CORS policy, and provider availability checks; that is not currently configured.

### Exact single-VM deployment sequence

1. Provision an Ubuntu LTS VM, DNS name, and firewall rules for SSH plus HTTP/HTTPS. Do not expose port 3030 publicly.
2. Install Node.js 22 LTS, npm, and Caddy using their official installation instructions. Configure SSH keys and routine OS security updates.
3. Copy the project to the VM through a private Git repository or secure file transfer. Do not copy a developer `.env` file.
4. In the project directory run `npm ci`, then `npm run build`.
5. Create `server/.env` on the VM with `GEMINI_API_KEY`, optional `GEMINI_MODEL=gemini-3.8-flash`, and `PORT=3030`; restrict it to the service user (for example `chmod 600 server/.env`). Never put the key in `dist/`, a Vite variable, source control, screenshots, or presentation material.
6. Run `npm test` and `npm run check:rates` on the VM before opening the demo.
7. Configure a systemd service with project directory as `WorkingDirectory`, command `/usr/bin/node server/index.js`, a dedicated unprivileged user, and restart-on-failure. The service loads `server/.env` itself and listens on `127.0.0.1:3030`.
8. Configure Caddy for the chosen domain: serve the project's `dist/` directory as static files, reverse proxy `/api/*` to `127.0.0.1:3030`, and enable SPA fallback to `index.html`. Caddy provisions TLS for a valid DNS name.
9. Confirm HTTPS page load, `/api/health`, no-key behavior, then a controlled Gemini request after adding the secret. Inspect browser/network logs and server logs for accidental request-body or secret output.
10. Set provider usage limits/alerts where available, add edge request throttling, monitor service health without logging prompt/budget bodies, and rehearse the demo. Do not rely on the app's per-process limiter as the only production control.

Exact package install commands, host policies, and firewall setup vary by provider; use the chosen OS/provider's current official docs. No host, account, service, domain, or deployment was created for this project.

### Example service and Caddy configuration

Replace the example domain and directory with the real VM values. Keep `server/.env` readable only by the service account.

`/etc/systemd/system/finmate.service`:

```ini
[Unit]
Description=FinMate Global API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=finmate
Group=finmate
WorkingDirectory=/srv/finmate/current
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /srv/finmate/current/server/index.js
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

`/etc/caddy/Caddyfile`:

```caddy
finmate.example.com {
	encode zstd gzip
	handle /api/* {
		reverse_proxy 127.0.0.1:3030
	}
	handle {
		root * /srv/finmate/current/dist
		try_files {path} /index.html
		file_server
	}
}
```

After installing both files, run `sudo systemctl daemon-reload`, `sudo systemctl enable --now finmate`, and `sudo systemctl reload caddy`. Confirm service status with `sudo systemctl status finmate` and `sudo journalctl -u finmate` (without logging request bodies). Set ownership so the `finmate` service user can read the app and `server/.env`; it does not need write access to the project directory.

## Review checks and issues

Checks run for this review:

- `npm.cmd run build` — passed.
- `npm.cmd test` — 8 tests passed, 0 failed.
- `npm.cmd run check:rates` — passed supported/unsupported quote/base, API error, and both conversion direction cases using mocked API responses.

These are automated checks, not a browser acceptance run or live Frankfurter connectivity test. The rate checker uses mocked API payloads.

The current install is Vite 5.4.21 with esbuild in its development dependency tree. The last successful npm audit reported one moderate and one high vulnerability, with fixes requiring a Vite major upgrade. The audit command during this review could not reach the npm registry, so its advisory list could not be refreshed. No dependency upgrade was made. Re-run `npm.cmd audit` from a network-enabled terminal and plan a tested Vite/plugin upgrade separately; avoid `npm audit fix --force` for the submission build.

Google's current documentation lists `gemini-3.8-flash` as stable. The code path was reviewed, but no API key was configured, so a live Gemini request has not succeeded or been tested.
