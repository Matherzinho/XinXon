import { hasRecording, playFile, speak } from './speech'

// Conversa com o Prof. Zhonghua (IA) via /api/prof, e voz dinâmica via /api/voz.

export interface ZhPart {
  tipo: 'zh'
  hanzi: string
  pinyin: string
  pt: string
}
export interface PtPart {
  tipo: 'pt'
  texto: string
}
export type Part = ZhPart | PtPart
export interface Suggestion {
  hanzi: string
  pinyin: string
  pt: string
}

export interface ChatMsg {
  id: string
  role: 'user' | 'prof'
  text?: string
  parts?: Part[]
  suggestions?: Suggestion[]
}

export class ProfError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** Como uma mensagem do Prof aparece no histórico enviado de volta para a IA. */
function asText(m: ChatMsg): string {
  if (m.role === 'user') return m.text ?? ''
  return (m.parts ?? []).map((p) => (p.tipo === 'zh' ? `${p.hanzi} (${p.pinyin}) = ${p.pt}` : p.texto)).join('\n')
}

export async function askProf(history: ChatMsg[], known: string[], name: string): Promise<{ parts: Part[]; suggestions: Suggestion[] }> {
  const r = await fetch('/api/prof', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history: history.map((m) => ({ role: m.role, text: asText(m) })), known, name }),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new ProfError(data.error ?? `erro ${r.status}`, r.status)
  const parts: Part[] = (data.partes ?? [])
    .map((p: Record<string, string>) =>
      p.tipo === 'zh' && p.hanzi
        ? { tipo: 'zh', hanzi: p.hanzi, pinyin: p.pinyin ?? '', pt: p.pt ?? '' }
        : { tipo: 'pt', texto: p.texto ?? p.pt ?? '' },
    )
    .filter((p: Part) => (p.tipo === 'zh' ? p.hanzi : p.texto))
  return { parts, suggestions: (data.sugestoes ?? []).slice(0, 3) }
}

const voiceCache = new Map<string, string>()
let voiceBroken = false

/** Fala chinês de qualquer frase: áudio gravado → voz da IA → voz do navegador. */
export async function speakZh(text: string, veryslow = false): Promise<void> {
  if (hasRecording(text)) return speak(text, 'zh-CN', { veryslow })
  const key = `${veryslow ? 's' : 'n'}:${text}`
  if (!voiceBroken) {
    try {
      let url = voiceCache.get(key)
      if (!url) {
        const r = await fetch('/api/voz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, slow: veryslow }),
        })
        if (r.status === 503) voiceBroken = true
        if (!r.ok) throw new Error(String(r.status))
        url = URL.createObjectURL(await r.blob())
        voiceCache.set(key, url)
      }
      if (await playFile(url)) return
    } catch {
      /* cai para a voz do navegador */
    }
  }
  return speak(text, 'zh-CN', { veryslow })
}

const storeKey = (profileId: string) => `xinxon-prof-${profileId}`

export function loadChat(profileId: string): ChatMsg[] {
  try {
    return JSON.parse(localStorage.getItem(storeKey(profileId)) ?? '[]')
  } catch {
    return []
  }
}

export function saveChat(profileId: string, msgs: ChatMsg[]) {
  try {
    localStorage.setItem(storeKey(profileId), JSON.stringify(msgs.slice(-60)))
  } catch {
    /* sem espaço: tudo bem */
  }
}
