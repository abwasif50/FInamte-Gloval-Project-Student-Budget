# FinMate Global assistant backend

## Setup

Requires Node.js 22.12 or newer. From the project root, copy `server/.env.example` to `server/.env` and set `GEMINI_API_KEY` there. Keep that real file private; it is ignored by Git. `GEMINI_MODEL` defaults to the currently documented stable `gemini-3.8-flash` and can be changed to another model available to your API key.

## Start locally

Use two terminals in the project root:

```powershell
npm run server
```

```powershell
npm run dev
```

Open the Vite URL printed by the second command. Vite forwards `/api` requests to the local Express server on port 3030. The backend also supports `PORT` in `server/.env`.

Without a key, the backend remains up and returns setup guidance; the browser assistant shows its labelled demo response. The Gemini API has provider quotas, availability, and terms that can change. Do not assume a free tier or unlimited use.

## Checks

```powershell
npm test
npm run check:rates
npm run build
```

The server does not retain conversations or log user questions, budget values, or API keys. Its in-memory rate limit is per process and resets when the server restarts.
