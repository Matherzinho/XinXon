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

/** Tenta os modelos em ordem até um responder (nomes mudam com o tempo; alguns ficam sobrecarregados). */
export async function generate(models: string[], body: Record<string, any>, perModelMs = 20000): Promise<any> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new GeminiError('GEMINI_API_KEY não configurada', 503)
  let last: GeminiError | null = null
  const errors: string[] = []
  const started = Date.now()
  for (const model of models) {
    if (Date.now() - started > 45000) break
    let payload = body
    for (let attempt = 0; attempt < 2; attempt++) {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), perModelMs)
      try {
        const r = await fetch(`${BASE}/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        })
        if (r.ok) return r.json()
        const text = await r.text()
        last = new GeminiError(`${model}: ${r.status} ${text.slice(0, 300)}`, r.status)
        errors.push(last.message.slice(0, 160))
        // Modelo que não aceita a configuração de "pensamento": tenta de novo sem ela.
        if (r.status === 400 && /thinking/i.test(text) && payload.generationConfig?.thinkingConfig) {
          const { thinkingConfig: _drop, ...gen } = payload.generationConfig
          payload = { ...payload, generationConfig: gen }
          continue
        }
        if (![400, 403, 404, 429, 500, 503].includes(r.status)) throw last
      } catch (e) {
        if (e instanceof GeminiError && ![400, 403, 404, 429, 500, 503].includes(e.status)) throw e
        if (!(e instanceof GeminiError)) {
          last = new GeminiError(`${model}: demorou demais`, 504)
          errors.push(last.message)
        }
      } finally {
        clearTimeout(timer)
      }
      break
    }
  }
  throw new GeminiError(errors.join(' | ') || 'sem modelos', last?.status ?? 500)
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
