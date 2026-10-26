// Chamadas ao Google Gemini (camada gratuita) usadas pelo Prof. Zhonghua.
// A chave fica só no servidor (variável de ambiente GEMINI_API_KEY na Vercel).

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export const TEXT_MODELS = [process.env.GEMINI_MODEL, 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'].filter(
  Boolean,
) as string[]
export const TTS_MODELS = [process.env.GEMINI_TTS_MODEL, 'gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts', 'gemini-2.5-flash-preview-tts'].filter(
  Boolean,
) as string[]

export class GeminiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** Tenta os modelos em ordem até um responder (nomes mudam com o tempo). */
export async function generate(models: string[], body: unknown): Promise<any> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new GeminiError('GEMINI_API_KEY não configurada', 503)
  let last: GeminiError | null = null
  for (const model of models) {
    const r = await fetch(`${BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
    })
    if (r.ok) return r.json()
    const text = await r.text()
    last = new GeminiError(`${model}: ${r.status} ${text.slice(0, 300)}`, r.status)
    // Modelo inexistente ou sem acesso: tenta o próximo. Outros erros param aqui.
    if (![400, 403, 404].includes(r.status)) break
  }
  throw last ?? new GeminiError('sem modelos', 500)
}

/** Só aceita chamadas do próprio app (evita que outros sites gastem a cota). */
export function allowed(req: Request): boolean {
  const origin = req.headers.get('origin') ?? req.headers.get('referer') ?? ''
  if (!origin) return true
  try {
    const host = new URL(origin).hostname
    return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app') || host === (process.env.APP_HOST ?? '')
  } catch {
    return false
  }
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } })
