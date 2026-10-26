// Áudio do navegador: voz sintetizada (ouvir) e reconhecimento de fala (falar).
// Tudo gratuito, usando as vozes do próprio celular/computador.

type Lang = 'zh-CN' | 'pt-BR'

let voices: SpeechSynthesisVoice[] = []

function loadVoices() {
  if (!('speechSynthesis' in window)) return
  voices = window.speechSynthesis.getVoices()
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices()
  window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices)
}

function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  if (!voices.length) loadVoices()
  const norm = (l: string) => l.replace('_', '-').toLowerCase()
  if (lang === 'zh-CN') {
    const mandarin = voices.filter((v) => ['zh-cn', 'cmn-cn', 'zh-hans-cn', 'cmn-hans-cn'].includes(norm(v.lang)))
    const nice = mandarin.find((v) => /google|xiaoxiao|tingting|yaoyao|huihui|natural/i.test(v.name))
    return nice ?? mandarin[0] ?? voices.find((v) => norm(v.lang) === 'zh-tw')
  }
  const br = voices.filter((v) => norm(v.lang) === 'pt-br')
  return br.find((v) => /google|luciana|francisca|natural/i.test(v.name)) ?? br[0] ?? voices.find((v) => norm(v.lang).startsWith('pt'))
}

export const ttsSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export function hasChineseVoice(): boolean {
  return !!pickVoice('zh-CN')
}

let rate = 0.85
export function setSpeechRate(r: number) {
  rate = r
}

/** Fala o texto e resolve quando terminar (ou depois de um tempo limite). */
export function speak(text: string, lang: Lang = 'zh-CN', customRate?: number): Promise<void> {
  return new Promise((resolve) => {
    if (!ttsSupported() || !text) return resolve()
    const synth = window.speechSynthesis
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    const v = pickVoice(lang)
    if (v) u.voice = v
    u.rate = customRate ?? (lang === 'zh-CN' ? rate : 1)
    let done = false
    const finish = () => {
      if (!done) {
        done = true
        resolve()
      }
    }
    u.onend = finish
    u.onerror = finish
    setTimeout(finish, 1500 + text.length * 450)
    synth.speak(u)
  })
}

export function stopSpeaking() {
  if (ttsSupported()) window.speechSynthesis.cancel()
}

/** Chamado num toque do usuário para liberar o áudio no iPhone. */
export function unlockAudio() {
  if (ttsSupported()) {
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    window.speechSynthesis.speak(u)
  }
}

// ---------- Reconhecimento de fala ----------

interface RecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

function recognitionCtor(): (new () => RecognitionLike) | undefined {
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => RecognitionLike) | undefined
}

export const recognitionSupported = () => typeof window !== 'undefined' && !!recognitionCtor()

export interface ListenHandle {
  result: Promise<string[]>
  stop: () => void
}

/** Escuta a fala em chinês e devolve as transcrições possíveis. */
export function listen(lang = 'zh-CN', timeoutMs = 7000): ListenHandle {
  const Ctor = recognitionCtor()
  if (!Ctor) return { result: Promise.reject(new Error('unsupported')), stop: () => {} }
  const rec = new Ctor()
  rec.lang = lang
  rec.interimResults = false
  rec.maxAlternatives = 5
  rec.continuous = false
  let timer = 0
  const result = new Promise<string[]>((resolve, reject) => {
    let got: string[] = []
    rec.onresult = (e) => {
      got = []
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]
        for (let j = 0; j < r.length; j++) got.push(r[j].transcript)
      }
    }
    rec.onerror = (e) => {
      window.clearTimeout(timer)
      if (e.error === 'no-speech') resolve([])
      else reject(new Error(e.error))
    }
    rec.onend = () => {
      window.clearTimeout(timer)
      resolve(got)
    }
    try {
      rec.start()
    } catch (err) {
      reject(err as Error)
    }
    timer = window.setTimeout(() => rec.stop(), timeoutMs)
  })
  return { result, stop: () => rec.stop() }
}

const clean = (s: string) => s.replace(/[\s，。！？、,.!?;；：:"'“”‘’（）()]/g, '')

function levenshtein(a: string[], b: string[]): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length][b.length]
}

/** Semelhança de 0 a 1 entre o que foi dito e o esperado (por caractere). */
export function similarity(said: string, expected: string): number {
  const a = [...clean(said)]
  const b = [...clean(expected)]
  if (!b.length) return 0
  if (a.join('').includes(b.join(''))) return 1
  return Math.max(0, 1 - levenshtein(a, b) / Math.max(a.length, b.length))
}

/** Homófonos comuns que o reconhecimento costuma trocar. */
const SAME_SOUND: string[][] = [['他', '她', '它'], ['吗', '嘛', '妈'], ['在', '再'], ['的', '得', '地'], ['是', '事', '市', '十']]

export function bestMatch(alternatives: string[], expected: string): number {
  const norm = (s: string) => {
    let out = s
    for (const group of SAME_SOUND) for (const ch of group.slice(1)) out = out.replaceAll(ch, group[0])
    return out
  }
  return alternatives.reduce((best, alt) => Math.max(best, similarity(norm(alt), norm(expected))), 0)
}
