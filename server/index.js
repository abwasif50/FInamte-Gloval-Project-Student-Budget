import { fileURLToPath } from 'node:url'
import { createAssistantApp } from './app.js'

try {
  process.loadEnvFile(fileURLToPath(new URL('./.env', import.meta.url)))
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}

const port = Number(process.env.PORT) || 3030
const app = createAssistantApp()
app.listen(port, '127.0.0.1', () => {
  process.stdout.write(`FinMate assistant backend listening at http://127.0.0.1:${port}\n`)
})
