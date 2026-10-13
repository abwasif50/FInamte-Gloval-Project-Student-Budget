import { createAssistantApp } from '../server/app.js'

// Vercel serves the Vite build as static files and routes /api/* here.
// Exporting the Express app lets the same validated API run as a function.
const app = createAssistantApp()

export default app
