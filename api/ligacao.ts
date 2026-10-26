import { allowed, json } from './_gemini.js'

// Cria um token temporário para a ligação de voz com o Prof (Gemini Live).
// O navegador conecta direto no Google com esse token; a chave de verdade nunca sai do servidor.

export const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live'

export async function POST(req: Request): Promise<Response> {
  if (!allowed(req)) return json({ error: 'origem não permitida' }, 403)
  const key = process.env.GEMINI_API_KEY
  if (!key) return json({ error: 'GEMINI_API_KEY não configurada' }, 503)
  const now = Date.now()
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      uses: 1,
      expireTime: new Date(now + 30 * 60_000).toISOString(),
      newSessionExpireTime: new Date(now + 2 * 60_000).toISOString(),
    }),
  })
  const text = await r.text()
  if (!r.ok) return json({ error: `token: ${r.status} ${text.slice(0, 300)}` }, r.status === 429 ? 429 : 502)
  const data = JSON.parse(text)
  return json({ token: data.name, model: LIVE_MODEL })
}
