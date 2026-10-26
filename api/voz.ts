import { allowed, generate, GeminiError, json, TTS_MODELS } from './_gemini.js'

/** Embrulha áudio PCM 16-bit mono num arquivo WAV. */
function wav(pcm: Uint8Array, sampleRate = 24000): ArrayBuffer {
  const out = new Uint8Array(44 + pcm.length)
  const v = new DataView(out.buffer)
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF')
  v.setUint32(4, 36 + pcm.length, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  str(36, 'data')
  v.setUint32(40, pcm.length, true)
  out.set(pcm, 44)
  return out.buffer
}

/** Fala um texto em chinês (mandarim) com a voz do Gemini. */
export async function POST(req: Request): Promise<Response> {
  if (!allowed(req)) return json({ error: 'origem não permitida' }, 403)
  const { text, slow } = (await req.json().catch(() => ({}))) as { text?: string; slow?: boolean }
  const t = String(text ?? '').slice(0, 200)
  if (!t) return json({ error: 'texto vazio' }, 400)
  try {
    const data = await generate(TTS_MODELS, {
      contents: [{ parts: [{ text: `${slow ? 'Say this very slowly and clearly in standard Mandarin, for a beginner: ' : 'Say this clearly and naturally in standard Mandarin: '}${t}` }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    })
    const part = data?.candidates?.[0]?.content?.parts?.find((p: { inlineData?: { data: string; mimeType?: string } }) => p.inlineData)
    if (!part) return json({ error: 'sem áudio' }, 502)
    const raw = Uint8Array.from(atob(part.inlineData.data), (c) => c.charCodeAt(0))
    const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType ?? '')?.[1] ?? 24000)
    return new Response(wav(raw, rate), { headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'public, max-age=31536000, immutable' } })
  } catch (e) {
    const status = e instanceof GeminiError ? e.status : 500
    const msg = (e as Error).message
    return json({ error: msg }, msg.includes('GEMINI_API_KEY') ? 503 : status === 429 || status === 503 ? 429 : 502)
  }
}
